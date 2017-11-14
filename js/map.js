require([
    'esri/views/2d/draw/Draw',
    'esri/Map',
    'esri/Basemap',
    'esri/views/MapView',
    'esri/layers/GroupLayer',
    'esri/Graphic',
    'esri/geometry/Polygon',
    'esri/geometry/Circle',
    'esri/layers/GraphicsLayer',
    'esri/layers/FeatureLayer',
    'esri/layers/TileLayer',
    'esri/tasks/RouteTask',
    'esri/tasks/support/RouteParameters',
    'esri/tasks/ClosestFacilityTask',
    'esri/tasks/support/ClosestFacilityParameters',
    'esri/tasks/support/DataFile',
    'esri/tasks/support/FeatureSet',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/Color',
    "esri/widgets/Legend",
    'esri/PopupTemplate',
    'esri/core/urlUtils',
    'esri/widgets/ScaleBar',
    'esri/geometry/geometryEngine',
    'esri/widgets/LayerList',
    'esri/widgets/Search',
    'esri/widgets/Expand',
    'esri/widgets/Compass',
    'dojo/on',
    'dojo/domReady!'
], function (
    Draw,
    Map,
    Basemap,
    MapView,
    GroupLayer,
    Graphic,
    Polygon,
    Circle,
    GraphicsLayer,
    FeatureLayer,
    TileLayer,
    RouteTask,
    RouteParameters,
    ClosestFacilityTask,
    ClosestFacilityParameters,
    DataFile,
    FeatureSet,
    SimpleMarkerSymbol,
    SimpleLineSymbol,
    SimpleFillSymbol,
    Color,
    Legend,
    PopupTemplate,
    urlUtils,
    Scalebar,
    geometryEngine,
    LayerList,
    Search,
    Expand,
    Compass,
    on
) {
    'use strict';
    //声明图层及View

    var mylayer = new TileLayer({
        url: "http://localhost:6080/arcgis/rest/services/baseMianYang/MapServer/"
    });

    var customBasemap = new Basemap({
        baseLayers: mylayer,
        title: "MianYang Basemap",
        id: "myBasemap"
    });

    var map = new Map({
        basemap: customBasemap
    });

    var view = new MapView({
        container: "map",
        map: map,
        zoom: 4
    });

    //添加设施点图层
    var hospitalLayer = new FeatureLayer({
        url: "http://localhost:6080/arcgis/rest/services/Facility/MapServer/0",
        title: "医疗",
        outFields: ["*"],
        popupEnabled: true,
        displayField: "名称",
        labelsVisible: true
    });
    var fireControlLayer = new FeatureLayer({
        url: "http://localhost:6080/arcgis/rest/services/Facility/MapServer/1",
        title: "消防",
        outFields: ["*"],
        popupEnabled: true,
        displayField: "名称"
    });

    //设置图层组
    var emergencyResourcesLayer = new GroupLayer({
        title: "应急资源",
        visible: true,
        visibilityMode: "independent",
        layers: [hospitalLayer]
    });
    var fireSuppliesLayer = new GroupLayer({
        title: "消防储备物资",
        visible: true,
        visibilityMode: "independent",
        layers: [fireControlLayer]
    });

    map.layers.add(emergencyResourcesLayer, 2);
    map.layers.add(fireSuppliesLayer, 1);

    //添加企业图层
    var companyLayer = new FeatureLayer({
        url: "http://localhost:6080/arcgis/rest/services/Company/FeatureServer/0",
        title: "企业",
        outFields: ["*"],
        popupEnabled: true,
        displayField: "名称",
        labelsVisible: true
    });
    map.add(companyLayer, 3);

    //添加查询结果图层
    var queryLayer = new GraphicsLayer({
        title: "查询结果",
        listMode: "hide"
    });
    map.add(queryLayer);

    //添加事故模拟图层
    var modelLayer = new GraphicsLayer({
        title: "事故模拟",
        listMOde: 'hide'
    });
    map.add(modelLayer);

    //设置图层的Popup
    var companyPopup = {
        title: "{名称}",
        content: [{
            type: "fields",
            fieldInfos: [{
                    fieldName: "地址"
                },
                {
                    fieldName: "电话"
                },
                {
                    fieldName: "类别"
                }
            ]
        }],
        actions: [{
            id: "deleteCompany",
            title: "删除该企业"
        }]
    };
    companyLayer.popupTemplate = companyPopup;

    var otherPopup = new PopupTemplate({
        title: "{名称}",
        content: [{
            type: "fields",
            fieldInfos: [{
                    fieldName: "地址"
                },
                {
                    fieldName: "电话"
                },
                {
                    fieldName: "类别"
                }
            ]
        }]
    });
    hospitalLayer.popupTemplate = otherPopup;
    fireControlLayer.popupTemplate = otherPopup;

    //添加比例尺
    var scalebar = new Scalebar({
        view: view,
        style: "ruler",
        unit: "metric"
    });
    view.ui.add(scalebar, {
        position: "bottom-right"
    });

    //添加图层列表
    var layerList = new LayerList({
        container: document.getElementById('layerListDialog'),
        view: view,
        listItemCreatedFunction: defineActions
    });

    function defineActions(event) {
        var item = event.item;
        if (item.title === "企业") {
            item.actionsSections = [
                [{
                    title: "企业列表",
                    className: "esri-icon-table",
                    id: "enterpriseDetail"
                }]
            ];
        }
        if (item.title === "事故模拟") {
            item.actionsSections = [
                [{
                    title: "删除",
                    className: "esri-icon-trash",
                    id: "deleteModelLayer"
                }]
            ];
        }
    }

    layerList.on("trigger-action", function (event) {
        var id = event.action.id;
        if (id === "enterpriseDetail") {
            $('#enterpriseDetailModal').modal('show');
        } else if (id === "deleteModelLayer") {
            event.item.layer.removeAll();
            map.layers.remove(event.item.layer);
        }
    });

    //添加搜索框
    var searchWidget = new Search({
        view: view,
        allPlaceholder: "查找企业或设施点",
        suggestionsEnabled: true,
        sources: [{
            featureLayer: companyLayer,
            searchFields: ["名称", "地址"],
            displayField: "名称",
            outFields: ["*"],
            name: "企业",
            placeholder: "查找企业",
            maxResults: 6,
            maxSuggestions: 6,
            suggestionsEnabled: true,
            minSuggestCharacters: 1
        }, {
            featureLayer: fireControlLayer,
            searchFields: ["名称", "地址"],
            displayField: "名称",
            outFields: ["*"],
            name: "消防点",
            placeholder: "查找消防点",
            maxResults: 6,
            maxSuggestions: 6,
            suggestionsEnabled: true,
            minSuggestCharacters: 1
        }, {
            featureLayer: hospitalLayer,
            searchFields: ["名称", "地址"],
            displayField: "名称",
            outFields: ["*"],
            name: "医疗",
            placeholder: "查找医疗点",
            maxResults: 6,
            maxSuggestions: 6,
            suggestionsEnabled: true,
            minSuggestCharacters: 1
        }]
    });
    view.ui.add(searchWidget, {
        position: "top-left",
        index: 0
    });

    //添加指北针
    var compass = new Compass({
        view: view
    });
    view.ui.add(compass, "top-right");

    //查询信息展示
    view.ui.add("infoDiv", "top-right");

    //画框查询按钮
    view.ui.add("draw-polygon", "top-left");

    //声明样式
    var stopSymbol = new SimpleMarkerSymbol({
        style: "cross",
        size: 15,
        outline: {
            width: 4
        }
    });

    var modelSymbol = new SimpleMarkerSymbol({
        style: "circle",
        size: 7,
        color: "red",
        outline: {
            width: 1
        }
    });

    //事件绑定
    $('#ljfx').click(function () {
        routerAnalysis();
        $('#map').css("cursor", "crosshair");
    });

    $('#ssdfx').click(function () {
        closestFacilityAnalysis();
        $('#map').css("cursor", "crosshair");
    });

    //绑定模型确定按钮事件
    var modelClickListen;
    $('.modelSubmit').click(function (event) {
        var modelType = $(event.target).attr("id");
        var modalName = $(event.target).attr('data-modal');
        if (ValidateInput(modalName) == false) return;
        switch (modelType) {
            case "cxxl":
                $('#whqtcxks').modal('hide');
                //选取点
                $('#map').css("cursor", "crosshair");
                modelClickListen = on(view, "click", addPlumeModelDot);
                break;
            case "ssxl":
                $('#whqtsxks').modal('hide');
                //选取点
                $('#map').css("cursor", "crosshair");
                modelClickListen = on(view, "click", addPuffModelDot);
                break;
            case "zqy":
                //选取点
                $('#map').css("cursor", "crosshair");
                $('#zqymx').modal('hide');
                modelClickListen = on(view, "click", addSteamCloudDot);
                break;
            case "chz":
                $('#map').css("cursor", "crosshair");
                $('#chzModal').modal('hide');
                modelClickListen = on(view, "click", addPoolFireDot);
                break;
        }
        map.add(modelLayer, 0);
    });

    view.then(function (evt) {
        var draw = new Draw({
            view: view
        });
        $('#draw-polygon').click(function () {
            view.graphics.removeAll();
            $('#infoDiv').html('');
            $('#infoDiv').css('display', 'none');
            enableCreatePolygon(draw, view);
            queryLayer.removeAll();
        });
    });

    //函数
    function enableCreatePolygon(draw, view) {
        var action = draw.create("polygon");
        view.focus();
        action.on("vertex-add", drawPolygon);
        action.on("cursor-update", drawPolygon);
        action.on("vertex-remove", drawPolygon);
        action.on("draw-complete", queryFeaturesInLayers);
    }

    function drawPolygon(evt) {
        var vertices = evt.vertices;
        view.graphics.removeAll();
        var polygon = createPolygon(vertices);
        var graphic = createGraphic(polygon);
        view.graphics.add(graphic);
    }

    function createPolygon(vertices) {
        return new Polygon({
            rings: vertices,
            spatialReference: view.spatialReference
        });
    }

    function createGraphic(polygon) {
        var graphic = new Graphic({
            geometry: polygon,
            symbol: {
                type: "simple-fill",
                color: [178, 102, 234, 0.8],
                style: "solid",
                outline: {
                    color: [0, 0, 0],
                    width: 2
                }
            }
        });
        return graphic;
    }

    function queryFeaturesInLayers(evt) {
        var vertices = evt.vertices;
        var polygon = createPolygon(vertices);
        var queryLayerList = [fireControlLayer, hospitalLayer];
        view.graphics.removeAll();
        $('#infoDiv').html('');
        $('#infoDiv').css('display', 'block');
        queryLayerList.forEach(function (layer) {
            queryFeaturesInTheLayer(layer, polygon)
                .then(selectAllFeature)
                .then(FlushInfoDiv);
        });
    }

    function queryFeaturesInTheLayer(layer, polygon) {
        var query = layer.createQuery();
        query.geometry = polygon;
        query.spatialRelationship = "intersects";

        return layer.queryFeatures(query);
    }

    function selectAllFeature(results) {
        var features = results.features.map(function (graphic) {
            graphic.symbol = selectionSymbol;
            return graphic;
        });
        queryLayer.addMany(features);
        return features;
    }

    function FlushInfoDiv(features) {
        var layerName = features[0].layer.title;
        var htmlString = '<ul>';
        $('#infoDiv').append('<h3>' + layerName + '</h3>');
        $('#infoDiv').append('<p>查询到' + features.length + '条数据</p>');
        features.forEach(function (feature) {
            htmlString += '<li>' + feature.attributes.名称 + '</li>';
        });
        htmlString += '</ul>';
        $('#infoDiv').append(htmlString);
    }

    function ValidateInput(modalName) {
        var conctrols = $('#' + modalName + ' input[type=text]');
        var radioInput = $('input[name=' + modalName + '_radio]');
        var selectedValue = $('input[name="' + modalName + '_radio"]:checked').val();
        if (radioInput.length > 0 && selectedValue == undefined) {
            alert("请选择参数");
            return false;
        }
        conctrols.each(function () {
            var value = $(this).val
            if (value == undefined || value.isNaN) {
                alert("输入有误，请检查输入");
                return false;
            }
        });
        return true;
    }

    function ClearInput(modalName) {
        var conctrols = $('#' + modalName + ' input');
        conctrols.val('');
    }


    /**
     * 四个模型的地图处理
     * 
     * 1. add...() 在地图上添加事故点标志
     * 2. solve....()  调用模型的函数，将处理结果加至 事故处理图层
     */

    function addPlumeModelDot(event) {
        if (event.button == 0) {
            var modelDot = new Graphic({
                geometry: event.mapPoint,
                symbol: modelSymbol
            });
            modelLayer.add(modelDot);
            solvePlumeModel(event.mapPoint);
        }
    }

    function addPuffModelDot(event) {
        if (event.button == 0) {
            var modelDot = new Graphic({
                geometry: event.mapPoint,
                symbol: modelSymbol
            });
            modelLayer.add(modelDot);
            solvePuffModel(event.mapPoint);
        }
    }

    function addSteamCloudDot(event) {
        if (event.button == 0) {
            var modelDot = new Graphic({
                geometry: event.mapPoint,
                symbol: modelSymbol
            });
            modelLayer.add(modelDot);
            solveSteamCloud(event.mapPoint);
        }
    }

    function addPoolFireDot(event) {
        if (event.button == 0) {
            var modelDot = new Graphic({
                geometry: event.mapPoint,
                symbol: modelSymbol
            });
            modelLayer.add(modelDot);
            solvePoolFire(event.mapPoint);
        }
    }

    function solvePlumeModel(mapPoint) {
        var windSpeed = $('#fs-cx').val();
        var source = $('#xlyq-cx').val();
        var angle = $('#fx-cx').val();
        var level = $("input[name='whqtcxks_radio']:checked").attr('value');
        var concentration = $('#jsnd-cx').val();
        var plume = new PlumeModel(concentration, mapPoint.x, mapPoint.y, level, windSpeed, 5, source, 2, angle);
        var ring = plume.getRings();
        var fillSymbol = new SimpleFillSymbol({
            color: [227, 139, 79, 0.8],
            outline: {
                color: [255, 255, 255],
                width: 1
            }
        });
        var plumePloygon = new Polygon({
            hasZ: true,
            hasM: true,
            spatialReference: {
                wkid: 3857
            },
            rings: [
                ring
            ]
        });

        var polygonGraphic = new Graphic({
            geometry: plumePloygon,
            symbol: fillSymbol
        });
        modelLayer.add(polygonGraphic);

        //清空编辑的数据
        ClearInput("whqtcxks");
        $('#map').css("cursor", "default");
        modelClickListen.remove();
    }

    function solvePuffModel(mapPoint) {
        var windSpeed = $('#ssfs').val();
        var source = $('#ssxlyq').val();
        var angle = $('#ssfx').val();
        var level = $("input[name='whqtsxks_radio']:checked").attr('value');
        var concentration = $('#jsnd-ss').val();
        var puff = new PuffModel(mapPoint.x, mapPoint.y, 5, 2, windSpeed, concentration, level, source, 30, angle);
        var ring = puff.GetPuffRings();
        var fillSymbol = new SimpleFillSymbol({
            color: [227, 139, 79, 0.8],
            outline: {
                color: [255, 255, 255],
                width: 1
            }
        });

        var puffPloygon = new Polygon({
            hasZ: true,
            hasM: true,
            spatialReference: {
                wkid: 3857
            },
            rings: [
                ring
            ]
        });

        var polygonGraphic = new Graphic({
            geometry: puffPloygon,
            symbol: fillSymbol
        });
        modelLayer.add(polygonGraphic);

        //清空编辑的数据
        ClearInput('whqtsxks');
        $('#map').css("cursor", "default");
        modelClickListen.remove();
    }

    function solveSteamCloud(mapPoint) {
        var Wf = $('#rlrsr_zqy').val();
        var Qf = $('#trqzl').val();
        var steamCloud = new SteamCloud(Wf, Qf);
        var deathRadius = steamCloud.deathRadius();
        var SeriouslyInjuredRadius = steamCloud.SeriouslyInjuredRadius();
        var MinorInhuredRadius = steamCloud.MinorInhuredRadius();

        var deathCircle = new Circle({
            hasZ: false,
            hasM: false,
            radiusUnit: 'meters',
            spatialReference: {
                wkid: 3857
            },
            center: mapPoint,
            radius: deathRadius
        });

        var SeriouslyInjuredCircle = new Circle({
            hasZ: false,
            hasM: false,
            radiusUnit: 'meters',
            spatialReference: {
                wkid: 3857
            },
            center: mapPoint,
            radius: SeriouslyInjuredRadius
        });

        var MinorInhuredCircle = new Circle({
            hasZ: false,
            hasM: false,
            radiusUnit: 'meters',
            spatialReference: {
                wkid: 3857
            },
            center: mapPoint,
            radius: MinorInhuredRadius
        });

        var deathSymbol = new SimpleFillSymbol({
            color: [255, 0, 25, 0.9],
            outline: {
                width: 1
            }
        });

        var SeriouslyInjuredSymbol = new SimpleFillSymbol({
            color: [255, 0, 80, 0.6],
            outline: {
                width: 1
            }
        });

        var MinorInhuredSymbol = new SimpleFillSymbol({
            color: [255, 0, 150, 0.3],
            outline: {
                width: 1
            }
        });

        var SeriouslyInjuredGraphic = new Graphic({
            geometry: SeriouslyInjuredCircle,
            symbol: SeriouslyInjuredSymbol
        });

        var deathGraphic = new Graphic({
            geometry: deathCircle,
            symbol: deathSymbol
        });

        var MinorInhuredGraphic = new Graphic({
            geometry: MinorInhuredCircle,
            symbol: MinorInhuredSymbol
        });

        modelLayer.addMany([deathGraphic, SeriouslyInjuredGraphic, MinorInhuredGraphic]);

        //清空编辑的数据
        ClearInput('zqymx');
        $('#map').css("cursor", "default");
        modelClickListen.remove();
    }

    function solvePoolFire(mapPoint) {
        var combustionHeat = $('#combustionHeat').val();
        var cp = $('#cp').val();
        var tb = $('#tb').val();
        var to = $('#to').val();
        var vaporizationHeat = $('#vaporizationHeat').val();
        var poolRadius = $('#poolRadius').val();
        var airDensity = $('#airDensity').val();

        var poolFire = new PoolFire(combustionHeat, cp, tb, to, vaporizationHeat, poolRadius, airDensity);
        var radius = poolFire.getRadius();
        var tmpPoolFireCircle, tmpPoolFireSymbol, tmpPoolFireGraphic;
        var transparency;
        var redColor;
        for (var i = 0; i < radius.length; i++) {
            tmpPoolFireCircle = new Circle({
                hasZ: false,
                hasM: false,
                radiusUnit: 'meters',
                spatialReference: {
                    wkid: 3857
                },
                center: mapPoint,
                radius: radius[i]
            });

            transparency = 1 - i * 0.2;
            redColor = 255 - i * 45;
            tmpPoolFireSymbol = new SimpleFillSymbol({
                color: [redColor, 0, 25, transparency],
                outline: {
                    width: 1
                }
            });

            tmpPoolFireGraphic = new Graphic({
                geometry: tmpPoolFireCircle,
                symbol: tmpPoolFireSymbol
            });

            modelLayer.add(tmpPoolFireGraphic);
        }
        
        ClearInput('chzModal');
        $('#map').css("cursor", "default");
        modelClickListen.remove();
    }

    function routerAnalysis() {
        var clickListen = on(view, "click", addStop);
        var routeTask = new RouteTask({
            url: "http://localhost:6080/arcgis/rest/services/NetWork_MianYang/NAServer/Route"
        });
        var routeLyr = new GraphicsLayer({
            listMode: "hide"
        });
        map.add(routeLyr);

        var routeParams = new RouteParameters({
            stops: new FeatureSet(),
            outSpatialReference: {
                wkid: 3857
            }
        });

        var routeSymbol = new SimpleLineSymbol({
            color: [24, 12, 43, 0.7],
            width: 3
        });

        function addStop(event) {
            if (event.button == 0) {
                var stop = new Graphic({
                    geometry: event.mapPoint,
                    symbol: stopSymbol
                });
                routeLyr.add(stop);
                routeParams.stops.features.push(stop);
                if (routeParams.stops.features.length >= 2) {
                    routeTask.solve(routeParams).then(showRoute);
                }
            }

            if (event.button == 2) {
                clickListen.remove();
                map.remove(routeLyr);
                $('#map').css("cursor", "default");
            }
        }

        function showRoute(data) {
            var routeResult = data.routeResults[0].route;
            routeResult.symbol = routeSymbol;
            routeLyr.add(routeResult);
        }
    }

    function closestFacilityAnalysis() {
        var clickListen = on(view, "click", addIncidents);
        var closestFireControl = new ClosestFacilityTask({
            url: "http://localhost:6080/arcgis/rest/services/NetWork_MianYang/NAServer/ClosestFireControl"
        });
        var closestHospital = new ClosestFacilityTask({
            url: "http://localhost:6080/arcgis/rest/services/NetWork_MianYang/NAServer/ClosestHospital"
        });
        closestFireControl.forlayer = fireControlLayer;
        closestHospital.forlayer = hospitalLayer;

        var routeLyr = new GraphicsLayer({
            listMode: "hide"
        });

        map.add(routeLyr);
        var closestParams = new ClosestFacilityParameters({
            incidents: new FeatureSet(),
            defaultCutoff: 300000,
            returnFacilities: false,
            returnIncidents: false,
            returnRoutes: true,
            outSpatialReference: {
                wkid: 3857
            }
        });
        var routeSymbol = new SimpleLineSymbol({
            color: [24, 12, 43, 0.7],
            width: 3
        });

        function addIncidents(event) {
            if (event.button == 0) {
                var incidents = new Graphic({
                    geometry: event.mapPoint,
                    symbol: stopSymbol
                });
                routeLyr.add(incidents);

                closestParams.incidents.features.push(incidents);
                var closestTask = [closestFireControl, closestHospital];
                closestTask.forEach(function (task) {
                    closestParams.facilities = task.forlayer;
                    task.solve(closestParams).then(showRoute, function (error) {
                        console.log(error);
                    })
                }, this);
            }
            clickListen.remove();
            $('#map').css("cursor", "default");

            //右键删除事件监听，删除图层
            if (event.button == 2)
                map.remove(routeLyr);
        }

        function showRoute(data) {
            console.log(data);
            data.routes.forEach(function (route) {
                route.symbol = routeSymbol;
                routeLyr.add(route);
            }, this);
        }
    }

    //四个模型

    /**
     * 根据以下参数，计算对应位置的烟团模型的等值线  -->瞬时扩散
     * 
     * @param {number} x 泄漏发生点的X坐标
     * @param {number} y 泄漏发生点的Y坐标
     * @param {number} z 泄漏发生点的高度 为简化直接带入5
     * @param {number} h 泄漏容器的高度，为简化直接带入2
     * @param {any} windspeed 风速m/s
     * @param {any} concentration 需要计算等值面的浓度值
     * @param {any} level 环境稳定因素的等级，界面的单选 A\B...
     * @param {any} souceStrong 泄漏的源强 指总共泄漏的量 mg
     * @param {any} time 需要计算的时间 s
     * @param {any} angle 风向
     */
    function PuffModel(x, y, z, h, windspeed, concentration, level, souceStrong, time, angle) {
        this.X = x;  
        this.Y = y;  
        this.Z = z;  
        this.H = h;
        this.level = level; 
        this.windspeed = windspeed;
        this.concentration = concentration; 
        this.time = time;
        this.angle = angle;
        this.souceStrong = souceStrong;

        //计算横向扩散系数
        this.ChangeGammaY = function (stability, x) {
            return x / 4.3;
        };

        //计算垂直扩散系数
        this.ChangeGammaZ = function (stability, x) {
            return 5 / 2.15;
        };

        //计算等值线的坐标， 返回坐标[[x1, y1],[x2, y2]]的数组
        this.GetPuffRings = function () {
            var points = [
                [this.X, this.Y]
            ];
            var relativeYlArayy = [];
            relativeYlArayy[0] = 0;
            var i;
            var x1;
            var tmp;
            var x2, y2;
            for (i = 1; i < 3000; i += 1) {
                x1 = 0.5 * i;
                tmp = this.RelativeY(this.concentration, this.time, x1, this.Z, this.H, this.level, this.windspeed, this.souceStrong);
                if (!(tmp == 0 || isNaN(tmp))) {
                    x2 = Math.cos(x1) + Math.sin(tmp);
                    y2 = Math.cos(tmp) - Math.sin(x1);
                    relativeYlArayy.push(tmp);
                    points.push([this.X + x1, this.Y + tmp]);
                }
            }
            var count = points.length;
            for (i = 1; i < count; i += 1) {
                points.push([points[count - i][0], this.Y - relativeYlArayy[count - i]]);
            }
            points.push(points[0]);
            return points;
        };

        //根据参数,被GetPuffRings()以0.5m的步进循环调用，计算当前步长(x)的Y的相对位置
        this.RelativeY = function (concentration, time, xCoodinate, zCoodinate, high, stability, windSpeed, souceStrong) {
            var sigmaY = this.ChangeGammaY(stability, xCoodinate) * time;
            var sigmaZ = this.ChangeGammaZ(stability, xCoodinate) * time;
            var tmp = (concentration * Math.pow(2 * Math.PI, 2 / 3) * sigmaY * sigmaY * sigmaZ) /
                (2 * souceStrong * Math.exp(Math.pow((xCoodinate - windSpeed * time) / sigmaY, 2) / -2) * Math.exp(Math.pow(zCoodinate / sigmaZ, 2) / -2));
            var squreY = -2 * Math.pow(sigmaY, 2) * Math.log(tmp);
            var Y = Math.sqrt(squreY);
            return Y;
        };
    }

    /**
     * 根据以下参数，计算对应位置的烟羽模型的等值线  -->持续扩散
     * 
     * @param {any} concentration 需要计算的等值线的浓度值
     * @param {any} x 泄漏点的X坐标
     * @param {any} y 泄露点的Y坐标
     * @param {any} level 环境稳定因素等级 界面表中单选框 A-B-C...
     * @param {any} WindSpeed 风速 m/s
     * @param {any} Z 泄漏点的高度
     * @param {any} SouceStrong 源强 泄漏的量 mg
     * @param {any} H 容器的高度
     * @param {any} angle  风向
     */
    function PlumeModel(concentration, x, y, level, WindSpeed, Z, SouceStrong, H, angle) {
        this.x = x;
        this.y = y;
        this.Z = Z;
        this.concentration = concentration;
        this.SouceStrong = SouceStrong; 
        this.WindSpeed = WindSpeed;
        this.level = level;
        this.angle = angle;
        this.H = H;

        //根据环境稳定度 计算X轴方向的扩散系数
        function ChangeGammaY(stability, x) {
            switch (stability) {
                case 'A':
                    return Math.pow(1 + 0.0004 * x, -0.5) * 0.32 * x;
                case 'B':
                    return Math.pow(1 + 0.0004 * x, -0.5) * 0.32 * x;
                case 'C':
                    return Math.pow(1 + 0.0004 * x, -0.5) * 0.22 * x;
                case 'D':
                    return Math.pow(1 + 0.0004 * x, -0.5) * 0.16 * x;
                case 'E':
                    return Math.pow(1 + 0.0004 * x, -0.5) * 0.11 * x;
                case 'F':
                    return Math.pow(1 + 0.0004 * x, -0.5) * 0.11 * x;
            }
        }

        //根据环境稳定度， 计算竖直方向的扩散系数
        function ChangeGammaZ(stability, x) {
            switch (stability) {
                case 'A':
                    return Math.pow(1 + 0.0001 * x, -0.5) * 0.24 * x;
                case 'B':
                    return Math.pow(1 + 0.0001 * x, -0.5) * 0.24 * x;
                case 'C':
                    return 0.2 * x;
                case 'D':
                    return Math.pow(1 + 0.0003 * x, -0.5) * 0.14 * x;
                case 'E':
                    return Math.pow(1 + 0.0015 * x, -0.5) * 0.08 * x;
                case 'F':
                    return Math.pow(1 + 0.0015 * x, -0.5) * 0.08 * x;
            }
        }

        //被循环调用，计算每个步进X坐标下的等值线的相对的Y坐标
        function GetGaussYCoordinate(concentration, X, Z, H, stability, WindSpeed, SouceStrong) {
            var sigmaY = ChangeGammaY(stability, X);
            var sigmaZ = ChangeGammaZ(stability, X);

            var S = (2 * Math.PI * WindSpeed * sigmaY * sigmaZ * concentration) /
                (SouceStrong * (Math.exp(Math.pow((Z - H) / sigmaY, 2) / (-2)) +
                    Math.exp(Math.pow((Z + H) / sigmaY, 2) / (-2))));
            var tmp = Math.log(S);
            y = (Math.sqrt(-2 * tmp) * sigmaY);
            if (isNaN(y) || y < 0) {
                return 0;
            } else {
                return y;
            }
        }

        //计算该等值线的坐标值，生产数组返回
        this.getRings = function getGaussRings() {
            var points = [];
            var ys = [];
            points[0] = [this.x, this.y];
            ys[0] = 0;
            var i = 0.5;
            var x2;
            var y2;
            for (var i = 1; i < 3000; i++) {
                var x1 = 0.5 * i;
                var tmpY = GetGaussYCoordinate(this.concentration, x1, this.Z, this.H, this.level, this.WindSpeed, this.SouceStrong);
                if (i != 0 && (tmpY == 0 || isNaN(tmpY))) {
                    continue;
                }
                x2 = x1 * Math.cos(angle) + tmpY * Math.sin(angle);
                y2 = tmpY * Math.cos(angle) - x1 * Math.sin(angle);
                ys.push(y2);
                points.push([this.x + x2, this.y + y2]);
            }
            var count = points.length;
            for (var i = 1; i < count; i++) {
                points.push([(points[count - i][0]), this.y - ys[count - i]]);
            }
            return points;
        }
    }

    /**
     *  计算给定条件的蒸汽云爆炸范围 可参照http://www.doc88.com/p-949564165922.html
     * 
     * @param {any} Wf 液化石油气形成的蒸汽云中参与爆炸的燃料的质量 参考值 792
     * @param {any} Qf 燃料的燃烧热 参考值 482700
     */
    function SteamCloud(Wf, Qf) {
        this.wf = Wf;
        this.qf = Qf;
        this.Wt = (1.8 * 0.04 * this.wf * this.qf) / 4520000;

        this.deathRadius = function Radius0() //死亡区
        {
            var R0 = Math.round(13.6 * Math.pow(this.Wt / 1000, 0.37));
            return R0;
        }
        this.SeriouslyInjuredRadius = function Radius1() //重伤区
        {
            var R1 = Math.round(0.996 * Math.pow(1.8 * 0.04 * this.wf * this.qf / 101325, 0.33));
            return R1;
        }
        this.MinorInhuredRadius = function Radius2() //轻伤区
        {
            var R2 = Math.round(1.672 * Math.pow(1.8 * 0.04 * this.wf * this.qf / 101325, 0.33));
            return R2;
        }
    }

    /**
     * 根据参数，计算对应池火灾的影响范围 参照 http://www.docin.com/p-660747352.html
     * 
     * @param {any} combustionHeat 液体的燃烧热
     * @param {any} cp 表示液体的比定压热容
     * @param {any} tb 表示液体的沸点
     * @param {any} to 表示环境温度
     * @param {any} VaporizationHeat 表示液体的汽化热
     * @param {any} poolRadius 池子的半径
     * @param {any} airDensity 空气密度
     */
    function PoolFire(combustionHeat, cp, tb, to, VaporizationHeat, poolRadius, airDensity) {

        var fireSpeed = 0.001 * combustionHeat / (cp * (tb - to) + VaporizationHeat);
        var fireHeight = 84 * poolRadius * Math.pow(fireSpeed / (airDensity * Math.pow(2 * 9.8 * poolRadius, 0.5)), 0.6);
        var Q = (Math.PI * (Math.pow(poolRadius, 2) + 2 * Math.PI * poolRadius * fireHeight)) * fireSpeed * 0.25 * combustionHeat / (72 * Math.pow(fireSpeed, 0.6) + 1);
        var grade = [37.5, 25, 12.5, 4, 1.6];   //表示造成不同程度的损失的热辐射强度
        var radius = [];

        //根据不同的强度的热辐射生成不同的半径，放入数组中 返回
        this.getRadius = function () {
            for (var i = 0, max = grade.length; i < max; i++) {
                var tmpRadius = Math.sqrt(4 * Math.PI * grade[i] / Q);
                radius.push(tmpRadius);
            }
            return radius;
        }
    }
});