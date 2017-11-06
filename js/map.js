require([
  "esri/views/2d/draw/Draw",
  "esri/Map",
  "esri/Basemap",
  "esri/views/MapView",
  "esri/layers/GroupLayer",
  "esri/Graphic",
  "esri/geometry/Polygon",
  "esri/geometry/Circle",
  "esri/layers/GraphicsLayer",
  "esri/layers/FeatureLayer",
  "esri/layers/TileLayer",
  "esri/tasks/RouteTask",
  "esri/tasks/support/RouteParameters",
  "esri/tasks/ClosestFacilityTask",
  "esri/tasks/support/ClosestFacilityParameters",
  "esri/tasks/support/DataFile",
  "esri/tasks/support/FeatureSet",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/Color",
  "esri/PopupTemplate",
  "esri/core/urlUtils",
  "esri/widgets/ScaleBar",
  "esri/geometry/geometryEngine",
  "esri/widgets/LayerList",
  "esri/widgets/Search",
  "esri/widgets/Expand",
  "esri/widgets/Compass",
  "dojo/on",
  "dojo/domReady!"
], function (
  Draw, Map, Basemap, MapView, GroupLayer, Graphic, Polygon, Circle, GraphicsLayer, FeatureLayer, TileLayer, RouteTask, RouteParameters, ClosestFacilityTask, ClosestFacilityParameters, DataFile,
  FeatureSet, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color, PopupTemplate, urlUtils, Scalebar, geometryEngine, LayerList, Search, Expand, Compass, on
) {

  'use strict';
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

  //加载瓦片底图
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

  var tmpPopup = new PopupTemplate({
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

  //添加设施点图层
  var hospitalLayer = new FeatureLayer({
    url: "http://localhost:6080/arcgis/rest/services/Facility/MapServer/0",
    title: "医疗",
    outFields: ["*"],
    popupEnabled: true,
    displayField: "名称",
    labelsVisible: true,
    popupTemplate: tmpPopup
  });
  var fireControlLayer = new FeatureLayer({
    url: "http://localhost:6080/arcgis/rest/services/Facility/MapServer/1",
    title: "消防",
    outFields: ["*"],
    popupEnabled: true,
    displayField: "名称",
    popupTemplate: tmpPopup
  });

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
    popupTemplate: {
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
    }
  });

  map.add(companyLayer, 3);

  //删除企业
  var popup = view.popup;
  popup.viewModel.on("trigger-action", function (event) {
    if (event.action.id === "deleteCompany") {
      var edits = {
        deleteFeatures: [editFeature]
      };
      applyEdits(edits);
    }
  });

  function applyEdits(params) {
    unselectFeature();
    var promise = companyLayer.applyEdits(params);
    editResultsHandler(promise);
  }

  function editResultsHandler(promise) {
    promise
      .then(function (editsResult) {
        console.log(editsResult);
        var extractObjectId = function (result) {
          return result.objectId;
        };

        // get the objectId of the newly added feature
        if (editsResult.addFeatureResults.length > 0) {
          var adds = editsResult.addFeatureResults.map(extractObjectId);
          var newIncidentId = adds[0];
          selectFeature(newIncidentId);
        }
      })
      .otherwise(function (error) {
        console.log("===============================================");
        console.error("[ applyEdits ] FAILURE: ", error.code, error.name,
          error.message);
        console.log("error = ", error);
      });
  }

  var hitTest = view.on("click", function (e) {
    if (e.button == 0) {
      unselectFeature();
      view.hitTest(e).then(function (response) {
        if (response.results.length > 0 && response.results[0].graphic) {
          var feature = response.results[0].graphic;
          selectFeature(feature.attributes[companyLayer.objectIdField]);
        }
      });
    }
  });

  var editFeature;

  // symbol for the selected feature on the view
  var selectionSymbol = new SimpleMarkerSymbol({
    color: [0, 0, 0, 0],
    style: "square",
    size: "20px",
    text: "{名称}",
    outline: {
      color: [255, 5, 55, 1],
      width: "3px"
    }
  });

  function selectFeature(objectId) {

    var query = companyLayer.createQuery();
    query.where = companyLayer.objectIdField + " = " + objectId;

    companyLayer.queryFeatures(query).then(function (results) {
      if (results.features.length > 0) {
        editFeature = results.features[0];
        editFeature.symbol = selectionSymbol;
        view.graphics.add(editFeature);
      }
    });
  }

  function unselectFeature() {
    view.graphics.removeAll();
  }

  //新增企业
  function addFeature(geometry) {
    var attributes = {};
    attributes['attributeName'] = "attributeValue";

    var editedFeature = new Graphic({
      geometry: geometry,
      attributes: attributes
    });

    var promise = {
      addFeatures: [editedFeature]
    }
    applyEdits(promise);
  }

  //添加比例尺
  var scalebar = new Scalebar({
    view: view,
    style: "ruler",
    unit: "metric"
  });
  view.ui.add(scalebar, {
    position: "bottom-right"
  });

  //添加折叠的图层控制器
  var layerList = new LayerList({
    container: document.getElementById('layerListDialog'),
    view: view,
    //给列表项添加功能
    listItemCreatedFunction: defineActions
  });

  function defineActions(event) {
    var item = event.item;
    if (item.title == "企业") {
      item.actionsSections = [
        [{
          title: "企业列表",
          className: "esri-icon-table",
          id: "enterpriseDetail"
        }]
      ];
    }
    if (item.title == "事故模拟") {
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

  view.ui.add("infoDiv", "top-right");

  //空间分析模块点击
  $('#ljfx').click(function () {
    routerAnalysis();
    $('#map').css("cursor", "crosshair");
  });

  $('#ssdfx').click(function () {
    closestFacilityAnalysis();
    $('#map').css("cursor", "crosshair");
  });

  //画框查询
  view.ui.add("draw-polygon", "top-left");

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

  function enableCreatePolygon(draw, view) {
    // create() will return a reference to an instance of PolygonDrawAction
    var action = draw.create("polygon");

    // focus the view to activate keyboard shortcuts for drawing polygons
    view.focus();

    // listen to vertex-add event on the action
    action.on("vertex-add", drawPolygon);

    // listen to cursor-update event on the action
    action.on("cursor-update", drawPolygon);

    // listen to vertex-remove event on the action
    action.on("vertex-remove", drawPolygon);

    // *******************************************
    // listen to draw-complete event on the action
    // *******************************************
    action.on("draw-complete", queryFeaturesInLayers);
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

  function queryFeaturesInTheLayer(layer, polygon) {
    var query = layer.createQuery();
    query.geometry = polygon;
    query.spatialRelationship = "intersects";

    return layer.queryFeatures(query);
  }

  var queryLayer = new GraphicsLayer({
    title: "查询结果",
    listMode: "hide"
  });
  map.add(queryLayer);

  function selectAllFeature(results) {
    var features = results.features.map(function (graphic) {
      graphic.symbol = selectionSymbol;
      return graphic;
    });
    queryLayer.addMany(features);
    return features;
  }

  // this function is called from the polygon draw action events
  // to provide a visual feedback to users as they are drawing a polygon
  function drawPolygon(evt) {
    var vertices = evt.vertices;

    //remove existing graphic
    view.graphics.removeAll();

    // create a new polygon
    var polygon = createPolygon(vertices);

    // create a new graphic representing the polygon, add it to the view
    var graphic = createGraphic(polygon);
    view.graphics.add(graphic);
  }

  // create a polygon using the provided vertices
  function createPolygon(vertices) {
    return new Polygon({
      rings: vertices,
      spatialReference: view.spatialReference
    });
  }

  // create a new graphic representing the polygon that is being drawn on the view
  function createGraphic(polygon) {
    var graphic = new Graphic({
      geometry: polygon,
      symbol: {
        type: "simple-fill", // autocasts as SimpleFillSymbol
        color: [178, 102, 234, 0.8],
        style: "solid",
        outline: { // autocasts as SimpleLineSymbol
          color: [0, 0, 0],
          width: 2
        }
      }
    });
    return graphic;
  }

  //Label polyon with its area
  function labelAreas(geom, area) {
    var graphic = new Graphic({
      geometry: geom.centroid,
      symbol: {
        type: "text",
        color: "white",
        haloColor: "black",
        haloSize: "1px",
        text: area.toFixed(2) + " acres",
        xoffset: 3,
        yoffset: 3,
        font: { // autocast as Font
          size: 14,
          family: "sans-serif"
        }
      }
    });
    view.graphics.add(graphic);
  }

  //声明事故模拟图层
  var modelLayer = new GraphicsLayer({
    title: "事故模拟",
    listMOde: 'hide'
  });

  //绑定模型确定按钮事件
  var modelClickListen;
  $('.modelSubmit').click(function (event) {
    var modelType = $(event.target).attr("id");
    var windSpeed,
      source,
      angle,
      concentration,
      level,
      combustionHeat,
      cp,
      tb,
      to,
      vaporizationHeat,
      poolRadius,
      airDensity,
      sum;
    switch (modelType) {
      case "cxxl":
        windSpeed = $('#fs-cx').val();
        source = $('#xlyq-cx').val();
        angle = $('#fx-cx').val();
        concentration = $('#jsnd-cx').val();
        level = $("input[name='cxxl_radio']:checked").attr('value');
        if ((windSpeed == "" && isNaN(windSpeed)) ||
          (source == "" && isNaN(source)) ||
          (angle == "" && isNaN(angle)) ||
          (concentration == "" && isNaN(concentration)) ||
          level == undefined) {
          alert('请确认输入数据不为空，且格式正确！');
          return;
        }
        $('#whqtcxks').modal('hide');
        //选取点
        $('#map').css("cursor", "crosshair");
        modelClickListen = on(view, "click", addPlumeModelDot);
        break;
      case "ssxl":
        windSpeed = $('#ssfs').val();
        source = $('#ssxlyq').val();
        angle = $('#ssfx').val();
        concentration = $('#jsnd-ss').val();
        level = $("input[name='ssxl_radio']:checked").attr('value');
        if ((windSpeed == "" && isNaN(windSpeed)) ||
          (source == "" && isNaN(source)) ||
          (angle == "" && isNaN(angle)) ||
          (concentration == "" && isNaN(concentration)) ||
          level == undefined) {
          alert('请确认输入数据不为空，且格式正确！');
          return;
        }
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
        combustionHeat = $('#combustionHeat').val();
        cp = $('#cp').val();
        tb = $('#tb').val();
        to = $('#to').val();
        vaporizationHeat = $('#vaporizationHeat').val();
        poolRadius = $('#poolRadius').val();
        airDensity = $('#airDensity').val();
        sum = combustionHeat * cp * tb * to * vaporizationHeat * poolRadius * airDensity;
        if (isNaN(sum) || sum <= 0) {
          alert("参数输入错误");
          return;
        }
        $('#map').css("cursor", "crosshair");
        $('#chzModal').modal('hide');
        modelClickListen = on(view, "click", addPoolFireDot);
        break;
    }
    map.add(modelLayer, 0);
  });


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
    var level = $("input[name='cxxl_radio']:checked").attr('value');
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
    $('#fs-cx').val('');
    $('#xlyq-cx').val('');
    $('#fx-cx').val('');
    $("input[name='cxxl_radio']:checked").val('');
    $('#jsnd-cx').val('');
    $('#map').css("cursor", "default");
    modelClickListen.remove();
  }

  function solvePuffModel(mapPoint) {
    var windSpeed = $('#ssfs').val();
    var source = $('#ssxlyq').val();
    var angle = $('#ssfx').val();
    var level = $("input[name='ssxl_radio']:checked").attr('value');
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
    $('#ssfs').val('');
    $('#ssxlyq').val('');
    $('#jsnd-ss').val('');
    $('#ssfx').val('');
    $("input[name='ssxl_radio']:checked").attr('checked', false);
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
      color: [255, 0, 25, 0.6],
      outline: {
        width: 1
      }
    });

    var MinorInhuredSymbol = new SimpleFillSymbol({
      color: [255, 0, 25, 0.3],
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
    $('#fs-ss').val('');
    $('#xlyq-ss').val('');
    $('#fx-ss').val('');
    $("#form2 input[name='radio']").attr('checked', false);
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

      $('#combustionHeat').val('');
      $('#cp').val('');
      $('#tb').val('');
      $('#to').val('');
      $('#vaporizationHeat').val('');
      $('#poolRadius').val('');
      $('#airDensity').val('');
      modelLayer.add(tmpPoolFireGraphic);
      $('#map').css("cursor", "default");
      modelClickListen.remove();
    }

    $('#combustionHeat').val('');
    $('#cp').val('');
    $('#tb').val('');
    $('#to').val('');
    $('#VaporizationHeat').val('');
    $('#poolRadius').val('');
    $('#tairDensityb').val('');
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
    var clickListen = on(view, "click", addStop);
    var closetTask = new ClosestFacilityTask({
      url: "http://localhost:6080/arcgis/rest/services/NetWork_MianYang/NAServer/ClosestFireControl"
    });
    var routeLyr = new GraphicsLayer({
      listMode: "hide"
    });
    map.add(routeLyr);
    var closestParams = new ClosestFacilityParameters({
      incidents: new FeatureSet(),
      defaultCutoff: 300,
      returnFacilities: true,
      returnIncidents: false,
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
        var incidents = new Graphic({
          geometry: event.mapPoint,
          symbol: stopSymbol
        });

        closestParams.facilities = fireControlLayer;
        closestParams.incidents.features.push(incidents)
        closetTask.solve(closestParams).then(showRoute, function (error) {
          console.log(error);
        })
      }
      clickListen.remove();
      $('#map').css("cursor", "default");

      //右键删除事件监听，删除图层
      if (event.button == 2) {
        map.remove(routeLyr);
      }
    }

    function showRoute(data) {
      console.log(data.routes);
      array.forEach(data.routes, function (route, index) {
        routeLyr.add(route);
      }, this);
    }
  }

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

    this.ChangeGammaY = function (stability, x) {
      return x / 4.3;
    };

    this.ChangeGammaZ = function (stability, x) {
      return 5 / 2.15;
    };

    this.GetPuffRings = function () {
      var points = [
        [this.X, this.Y]
      ];
      var relativeYlArayy = [];
      relativeYlArayy[0] = 0;
      var i;
      var x1;
      var tmp;
      for (i = 1; i < 3000; i += 1) {
        x1 = 0.5 * i;
        tmp = this.RelativeY(this.concentration, this.time, x1, this.Z, this.H, this.level, this.windspeed, this.souceStrong);
        if (!(tmp == 0 || isNaN(tmp))) {
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

  function PlumeModel(concentration, x, y, level, WindSpeed, Z, SouceStrong, H, angle) {
    this.x = x;
    this.y = y;
    this.Z = Z;
    this.concentration = concentration;
    this.SouceStrong = SouceStrong; //大气源强 指瞬时排放的物料质量
    this.WindSpeed = WindSpeed; //风速
    this.level = level;
    this.angle = angle; //指与X轴正方向的夹角
    this.H = H; //指罐高

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

    function GetGaussYCoordinate(concentration, X, Z, H, stability, WindSpeed, SouceStrong) {
      var sigmaY = ChangeGammaY(stability, X);
      var sigmaZ = ChangeGammaZ(stability, X);

      // console.log(WindSpeed)
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

    this.getRings = function getGaussRings() {
      var points = [];
      var y1 = [];
      points[0] = [this.x, this.y];
      y1[0] = 0;
      var i = 0.5;
      for (var i = 1; i < 3000; i++) {
        var x1 = 0.5 * i;
        var tmpY = GetGaussYCoordinate(this.concentration, x1, this.Z, this.H, this.level, this.WindSpeed, this.SouceStrong);
        if (i != 0 && (tmpY == 0 || isNaN(tmpY))) {
          continue;
        }
        y1.push(tmpY);
        points.push([this.x + x1, this.y + tmpY]);
      }
      var count = points.length;
      for (var i = 1; i < count; i++) {
        points.push([(points[count - i][0]), this.y - y1[count - i]]);
      }
      return points;
    }
  }

  function SteamCloud(Wf, Qf) {
    this.wf = Wf;
    this.qf = Qf;

    this.Wt = function Wtnt() //TNT当量
    {
      var wt = (1.8 * 0.04 * this.wf * this.qf) / 4520;
      return wt;
    }
    this.deathRadius = function Radius0() //死亡区
    {
      var R0 = Math.round(13.6 * Math.pow(this.Wt() / 1000, 0.37));
      return R0;
    }
    this.SeriouslyInjuredRadius = function Radius1() //重伤区
    {
      var R1 = Math.round(3.784 * Math.pow(this.Wt() / 1000, 0.33));
      return R1;
    }
    this.MinorInhuredRadius = function Radius2() //轻伤区
    {
      var R2 = Math.round(5.964 * Math.pow(this.Wt() / 1000, 0.33));
      return R2;
    }
  }

  function PoolFire(combustionHeat, cp, tb, to, VaporizationHeat, poolRadius, airDensity) {

    var fireSpeed = 0.001 * combustionHeat / (cp * (tb - to) + VaporizationHeat);
    var fireHeight = 84 * poolRadius * Math.pow(fireSpeed / (airDensity * Math.pow(2 * 9.8 * poolRadius, 0.5)), 0.6);
    var Q = (Math.PI * (Math.pow(poolRadius, 2) + 2 * Math.PI * poolRadius * fireHeight)) * fireSpeed * 0.25 * combustionHeat / (72 * Math.pow(fireSpeed, 0.6) + 1);
    var grade = [37.5, 25, 12.5, 4, 1.6];
    var radius = [];

    this.getRadius = function () {
      for (var i = 0, max = grade.length; i < max; i++) {
        var tmpRadius = Math.sqrt(4 * Math.PI * grade[i] / Q);
        radius.push(tmpRadius);
      }
      return radius;
    }
  }
});