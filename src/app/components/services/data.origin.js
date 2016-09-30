'use strict';
angular.module('matrizOdSube').factory('DataOrigin', ['$http', '$q','LeafletServices',DataOrigin]);


function DataOrigin($http, $q,LeafletServices) {

    $http.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';

    //var urlZones  = 'assets/zonas.geojson';
    //var urlZones  = 'assets/disolve_by_locate_depart.geojson';
    //var urlZones  = 'assets/zonas.g.geojson';
    var urlZones       = 'assets/data/departamentos.geojson';
    var urlDiccionario = 'assets/data/diccionario.json';
    var urlMatriz      = 'assets/data/matriz.json';

    var urlColectivos  = 'assets/data/bondies.geojson';
    var urlTrenes      = 'assets/data/train.geojson';
    var urlSubte       = 'assets/data/subway.geojson';

    //helpers
    function getId(prov,depto){
        function pad(num, size) {
            var s = "000000000" + num;
            return s.substr(s.length-size);
        }

        return  ""+prov+pad(depto,3);
    }

    //var urlMatriz = 'assets/subedatos.json';

    var bigTable = [] ; 
    var model = {
        departamentos : [],
        matriz : [] ,
        medias : {
            atributo : 0,
            transbordo : 0 
        },
        totales:{
            transbordo : 0, 
            colectivo : 0,
            atributo : 0,
            subte : 0,
            total : 0,
            tren : 0
        },
        max:{
            colectivo : 0,
            subte : 0,
            total : 0,
            tren : 0,
            atributo : 0,
            transbordo : 0 
        },
        min:{
            colectivo : 1000000000,
            subte : 1000000000,
            total : 1000000000,
            tren : 1000000000,
            atributo : 10000000000,
            transbordo : 10000000000 
        },
        colors:{
            white:{
                r:255,
                g:255,
                b:255
            },
            max : {
                r:245,
                g:85,
                b:54
            },
            med : {
                r:255,
                g:163,
                b:74
            },
            min : {
                r:250,
                g:218,
                b:156
            },
            tren: {
                r:120,
                g:120,
                b:10
            },
            // tren: {
            //     r:22,
            //     g:186,
            //     b:197
            // },
            colectivo: {
                r:104,
                g:216,
                b:214
            },
            subte: {
                r:156,
                g:234,
                b:60
            },
            transbordo:{
                r:194,
                g:148,
                b:138
            },
            atributo:{
                r:188,
                g:124,
                b:156
            }
        }
    };

    var HourRegister = function (){

        function oneHour (id) {
            this.hora = id ;
            this.total = 0;
            this.tren = 0;
            this.subte = 0;
            this.colectivo = 0;
            this.atributo = 0 ;
            this.transbordo = 0 ;

            this.update =function (data){
                this.total += data.cantidad_total;
                this.tren += data.cantidad_tren;
                this.subte += data.cantidad_subte;
                this.colectivo += data.cantidad_bus;
                this.atributo += data.cantidad_as ;
                this.transbordo += data.cantidad_transbordo ;
            }
        }

        this.horasTable = [] ;

        

        for (var i = 0; i <= 23; i++) {
            this.horasTable[i] = new oneHour(i);
        }


        this.update = function (data){
            this.horasTable[data.hora_inicio].update(data);
        };

        this.get = function(id){
            return this.horasTable[id];
        };

    }

    var RegisterDetail = function (){

        function DestinationRegister (data){

            this.atributo = data.cantidad_as ;
            this.colectivo = data.cantidad_bus ;
            this.subte = data.cantidad_subte ;
            this.transbordo = data.cantidad_transbordo ;
            this.tren = data.cantidad_tren ;
            this.total =  data.cantidad_bus + data.cantidad_subte + data.cantidad_tren ;
            this.departamento = parseInt(data.depto_destino);
            
            this.add = function (data){
                this.atributo += data.cantidad_as ;
                this.colectivo += data.cantidad_bus ;
                this.subte += data.cantidad_subte ;
                this.transbordo += data.cantidad_transbordo ;
                this.tren += data.cantidad_tren ;
                this.total +=  data.cantidad_bus + data.cantidad_subte + data.cantidad_tren ;    
                 this.updatePorcentajes() ;           
            };

            this.porcentaje = {
                colectivo : 0,
                subte : 0,
                tren : 0
            };
            this.updatePorcentajes = function (){
                this.porcentaje.tren = parseInt((this.tren*100)/this.total);
                this.porcentaje.colectivo = parseInt((this.colectivo*100)/this.total);
                this.porcentaje.subte = parseInt((this.subte*100)/this.total);
            };

        }
        this.destinationsByHour = [] ;
        this.destination = {};
        this.destinationID = [];
        this.destinationSortedByID = [] ;
        this.update = function (data){
            if (this.destination[parseInt(data.depto_destino)] === undefined){
                this.destination[parseInt(data.depto_destino)] = new DestinationRegister(data);  
                this.destinationID.push(parseInt(data.depto_destino));
            }
            else{
                this.destination[parseInt(data.depto_destino)].add(data);
           }
       }
    }



    var ODRegister = function (data,diccionario){
        var self = this;
        this.atributo = data.cantidad_as ;
        this.colectivo = data.cantidad_bus ;
        this.subte = data.cantidad_subte ;
        this.transbordo = data.cantidad_transbordo ;
        this.tren = data.cantidad_tren ;
        this.departamento = data.depto_origen ;
        this.id = getId(data.prov_origen,data.depto_origen) ; 
        this.nombre = diccionario[this.id].lbl ; 
       // this.hora_incio = data.hora_incio ;
       // this.pobl2010_destino = data.pobl2010_destino ;
       // this.pobl2010_origen = data.pobl2010_origen ;
       // this.prov_destino = data.prov_destino ;
        this.provincia = data.prov_origen ;
        this.total =  data.cantidad_bus+data.cantidad_subte +data.cantidad_tren;
        this.total_porcentaje = 0 ;

        //this.detail = [] ; 
        //this.detail.push(data);
        this.style = {};
        this.detail = new RegisterDetail();
        this.hour = new HourRegister();
        // this.destinations = [] ;
        // this.destinations[data.depto_destino] = 0 ;

        this.porcentaje = {
            colectivo : 0,
            subte : 0,
            tren : 0,
            transbordo: 0,
            atributo: 0,

        };
        this.updatePorcentajes = function (){
            this.porcentaje.tren = ((this.tren*100)/this.total);
            this.porcentaje.colectivo = ((this.colectivo*100)/this.total);
            this.porcentaje.subte = ((this.subte*100)/this.total);
        };
        //this.updatePorcentajes();
        this.add = function (data){
            this.atributo += data.cantidad_as ;
            this.colectivo += data.cantidad_bus ;
            this.subte += data.cantidad_subte ;
            this.transbordo += data.cantidad_transbordo ;
            this.tren += data.cantidad_tren ;
            //this.detail.push(data);
            this.total += data.cantidad_bus+data.cantidad_subte +data.cantidad_tren ;
            //this.destinations[data.depto_destino] =  0 ;
            this.updatePorcentajes();

            this.detail.update(data);
            this.hour.update(data);

        };
        // this.setPorcentaje = function(key,value){
        //     this.porcentaje[key] = value;
        // }


        //comportamiento



        this.calcEdges = function calcEdges(){
            var origin = LeafletServices.polygons[this.departamento].centroid;
            var collection = this.detail.destinationSortedByID ; 

            var i = 0 ;
            var top = 5 ;
            var edges = [] ;
            var radiusMax = 20 ;
            var radiusMin = 15 ;
            var maxWeight = 40 ;
            var minWeight = 5  ;

            var total =0 ;
            var h = 0 ;
            while (h < top && h <  collection.length-1) {
                h++;
                total += this.detail.destination[collection[h]].total;
            }


            function calcWeight(destination,totalWeight,type){

                if (type == 'white')
                    {return totalWeight + 6;}
                else
                    {return  (totalWeight * destination.porcentaje[type])/100.0;}
            }

            function calcOffset(destination,weigth,type){
                var out = 0;
                var base = -(weigth*.5);
                //var base = 0;

                if ( type == 'white' ){
                      out =  0; 
                }else if ( type == 'colectivo' ){
                    out =  base + ( calcWeight(destination,weigth,'colectivo')*.5) ; 
                }else if ( type == 'subte' ){
                    //out=30;
                    out = base +( calcWeight(destination,weigth,'colectivo') +calcWeight(destination,weigth,'subte')*.5 +1);
                }else{
                    out = base + (calcWeight(destination,weigth,'colectivo') + calcWeight(destination,weigth,'subte') +calcWeight(destination,weigth,'tren')*.5 )+1;   
                }

                return out;
            }

            function map_range(value, low1, high1, low2, high2) {
                return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
            }

            function getTypification(destination){
                var out = "";
                if (destination.colectivo >= destination.tren  ){
                    if(destination.colectivo >= destination.subte){
                       out = 'colectivo' ;
                    }else{
                        out  =  'subte' ;
                    }
                }else{
                    if(destination.tren >= destination.subte){
                        out = 'tren';
                    }
                    else{
                        out='subte';
                    }
                }
                return out;
            }
            function getColor(type){
                var  col  =  model.colors[type] ;
                return 'rgb('+col.r+','+col.g+','+col.b+')'
            }

            function map(current,total,min,max) {
                var val = ((current*100)/total); 
                return map_range(val,0,100,min,max);
            }

            function circleStyle(destination,total){
                return {
                    color: getColor(getTypification(destination)),
                    fillColor: getColor(getTypification(destination)),
                    fillOpacity: 0.8,
                    strokeOpacity:1,
                    radius : map(destination.total,total,radiusMin,radiusMax),
                    className:'circle '+getTypification(destination)
                }
            }



            function edgeStyle(destination,total,type){

                var totalWeight =  map(destination.total,total,minWeight,maxWeight);
                var computedStyle = {
                    color: getColor(type),
                    fillColor: getColor(type),
                    fillOpacity: 1,
                    weight:calcWeight(destination,totalWeight,type),
                    className:'edge '+type,
                    offset: calcOffset(destination,totalWeight,type)
                }; 
                return  computedStyle ;
            }
            var circle = '';
            while (i < top && i <  collection.length-1) {
                var destination = LeafletServices.polygons[collection[i]].centroid ; 
                var destination_record = this.detail.destination[collection[i]];


           
                //colectivo
                    //ancho = 
                //tren

                //subte
                if (origin === destination){
                    
                    circle = {
                        points:[origin,destination],
                        style:circleStyle(destination_record,total) 
                    }
                }else{


                     edges.push({points:[origin,destination],style: edgeStyle(destination_record,total,'white') }); 
                    edges.push({points:[origin,destination],style: edgeStyle(destination_record,total,'colectivo') }); 
                    edges.push({points:[origin,destination],style: edgeStyle(destination_record,total,'subte') }); 
                    edges.push({points:[origin,destination],style: edgeStyle(destination_record,total,'tren') }); 
                }



                i++;
            }

            edges.push(circle);
            return edges;  
        }

        this.highlight = function () {
            console.log("highlight" + this.departamento);
            LeafletServices.drawPairs(this.calcEdges());
            model.departamentos.forEach(paintPolygons);
            function paintPolygons(element,index){
                var style = {} ; 
                var current = LeafletServices.polygons[element] ; 
                    if ( self.detail.destination[element] !== undefined)
                        {
                            style = self.detail.destination[element].style;
                            current.highlight('destination',style);
                            current.restoreIcon();
                         }
                    else
                        {
                            style ={
                                weight: 2,
                                color: 'rgb(230,230,230)',
                                fillOpacity: 0.95,
                                strokeOpacity:1
                            };
                            current.highlight('destination',style);
                            current.setHiddenIcon();
                    }
            }

        };



        this.unHighlight = function (current) {
            //if ( (current !== undefined) &&(id !== current.departamento )){
                model.departamentos.forEach(normalizePolygons);
                LeafletServices.clearPairs();
                function normalizePolygons(element,index){
                    LeafletServices.polygons[element].unHighlight();
                    LeafletServices.polygons[element].restoreIcon();
                }
            }

    };
    function prepararDiccionario(dicc){
        var out = [] ;

        dicc.forEach(recorrer);
        function recorrer(element,index){
            //{"Cod_depto":882,"Departamento":"Z�rate","id":6882,"Provincia":"Buenos Aires","Cod_prov":6}
            out[element.id] =  {
                dpto : element.Cod_depto,
                prov : element.Cod_prov,
                  id : element.id,
                lbl  : element.Departamento,
            };
        }

        return out;
    }

    function cookOD(data,diccionario){
        data.forEach( function(element, index) {
            //console.log(element.hora_inicio);
            if (bigTable[element.depto_origen] ==  undefined) { 

                    bigTable[element.depto_origen] = new ODRegister(element,diccionario);
                    model.matriz.push(bigTable[element.depto_origen]);
                    model.departamentos.push(element.depto_origen);
            }
            else {
                bigTable[element.depto_origen].add(element)
            }
            //console.log("record: "+element.depto_origen+" added");
        });

        console.log("departamentos: "+bigTable.length);
        
        //calcular totales
        model.matriz.forEach(countTotals);
        function countTotals(element,index){
            model.totales.transbordo += element.transbordo;
            model.totales.atributo += element.atributo;
            model.totales.colectivo += element.colectivo;
            model.totales.subte += element.subte;
            model.totales.tren += element.tren;
            model.totales.total += element.total;
        }

        model.matriz.forEach(recorrer);

        function storeMax(key,element){
            if(model.max[key] < element[key]){
                model.max[key] = element[key]
            }
        }

        function storeMin(key,element){
            if(model.min[key] > element[key]){
                model.min[key] = element[key]
            }
        }

        function recorrer(element,index){
            element.total_porcentaje = (element.total*100)/model.totales.total;

            storeMax('total',element);
            storeMax('subte',element);
            storeMax('colectivo',element);
            storeMax('tren',element);
            storeMax('transbordo',element);
            storeMax('atributo',element);

            storeMin('total',element);
            storeMin('subte',element);
            storeMin('colectivo',element);
            storeMin('tren',element);
            storeMin('transbordo',element);
            storeMin('atributo',element);
        }

        //calcular medias
        model.medias.atributo = parseInt( model.totales.atributo / model.matriz.length);
        model.medias.atributo_porcentaje = ( (model.medias.atributo*100)/model.totales.atributo);

        //porcentajs de medias para presentacion
        model.medias.transbordo = parseInt (model.totales.transbordo / model.matriz.length);
        model.medias.transbordo_porcentaje = ( (model.medias.transbordo*100)/model.totales.transbordo);


        model.matriz.forEach(calcPorcenjateAST);
        function calcPorcenjateAST(element,index){
            element.porcentaje.atributo  = (element.atributo*100)/model.totales.atributo;
            element.porcentaje.transbordo  = (element.transbordo*100)/model.totales.transbordo;
        }


        //calcular el color de cada depto en funcion de su valor total de viajes 
        model.matriz.forEach(paintRecord);

        function calcTotalColor(param,min,max){
            var lower,upper,r,g,b = 0 ;
            
            var module = max - min / 57; 

             if( param <= max*.5){
                r = parseInt((param/module).map(min/module,(max-min)/module,model.colors.min.r,model.colors.med.r));
                g = parseInt((param/module).map(min/module,(max-min)/module,model.colors.min.g,model.colors.med.g));
                b = parseInt((param/module).map(min/module,(max-min)/module,model.colors.min.b,model.colors.med.b));
            }else{
                r = parseInt((param/module).map(min/module,(max-min)/module,model.colors.med.r,model.colors.max.r));
                g = parseInt((param/module).map(min/module,(max-min)/module,model.colors.med.g,model.colors.max.g));
                b = parseInt((param/module).map(min/module,(max-min)/module,model.colors.med.b,model.colors.max.b));
            }
            return 'rgb('+r+','+g+','+b+')';
        }

        function paintRecord(element,index){

            element.style = {
                weight: 2,
                color: calcTotalColor(element.total,0,model.max.total),
                fillOpacity: 0.95,
                strokeOpacity:1,
                stroke:'red'
            };


            var totalDestinos = 0 ;
           // element.detail.destination.forEach(getMax);

            for (var key in element.detail.destination) {
              if (element.detail.destination.hasOwnProperty(key))
                getMax(element.detail.destination[key]);
            }


            //element.detail.destination.forEach(pintarDestinos);


            for (var key in element.detail.destination) {
              if (element.detail.destination.hasOwnProperty(key))
                pintarDestinos(element.detail.destination[key]);
            }

            function getMax(element,index){
                if (element.total > totalDestinos){
                    totalDestinos = element.total ;
                }
            };

            function pintarDestinos(element,index){
                element.style = {
                    weight: 2,
                    color: calcTotalColor(element.total,0,totalDestinos),
                    fillOpacity: 0.85,
                    strokeOpacity:1
                };
            };
        }

        //ordenar por totales la matriz
        model.matriz.sort(compareFunction)

        model.matriz.forEach(function(element){
                
            element.detail.destinationSortedByID = Object.keys(element.detail.destination).sort(sortObject);
            function sortObject(a,b){
                return element.detail.destination[b].total - element.detail.destination[a].total ;
            }
        })

        function compareFunction(a,b){
            return b.total - a.total ;
        }

        console.log(model);
        return model ; 
    };

    function getODData() {
        var promise = $q(function(success, reject) {
            var promises = [] ;

            promises.push($http.get(urlMatriz));
            promises.push($http.get(urlDiccionario));
            $q.all(promises).then(recordsHandler);
            function recordsHandler(data){
                success(cookOD(data[0].data,prepararDiccionario(data[1].data)));
            }
        });
        return promise;
    };

    function getZonas(){
        var promise = $q(function(success, reject) {
            $http.get(urlZones).success(function(res) {
                success(res.features);
            });
        });
        return promise;
    };

    function getDiccionario(){
        var promise = $q(function(success, reject) {
            $http.get(urlDiccionario).success(function(res) {
                success(res.features);
                //success(sortTheMotherfuckers(res,'depto'));
            });
        });
        return promise;
    };
    function getColectivos(){
                var promise = $q(function(success, reject) {
            $http.get(urlColectivos).success(function(res) {
                success(res.features);
                //success(sortTheMotherfuckers(res,'depto'));
            });
        });
        return promise;
    }

    function getSubtes(){
                var promise = $q(function(success, reject) {
            $http.get(urlSubte).success(function(res) {
                success(res.features);
                //success(sortTheMotherfuckers(res,'depto'));
            });
        });
        return promise;
    }

    function getTrenes(){
                var promise = $q(function(success, reject) {
            $http.get(urlTrenes).success(function(res) {
                success(res.features);
                //success(sortTheMotherfuckers(res,'depto'));
            });
        });
        return promise;
    }

    return {
        getColectivos  : getColectivos,
        getDiccionario : getDiccionario,
        getODData      : getODData,
        getSubtes      : getSubtes,
        getTrenes      : getTrenes,
        getZonas       : getZonas,
        record         : bigTable
    };
}

/*
cantidad_as
cantidad_bus
cantidad_subte
cantidad_transbordo
cantidad_tren
depto_destino
depto_origen
hora_incio
pobl2010_destino
pobl2010_origen
prov_destino
prov_origen
*/
