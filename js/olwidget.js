(function() {
var olwidget = {
    /*
     * WKT transformations
     */
    wktFormat: new OpenLayers.Format.WKT(),
    featureToEWKT: function(feature, proj) {
        // convert "EPSG:" in projCode to 'SRID='
        var srid = 'SRID=' + proj.projCode.substring(5) + ';';
        return srid + this.wktFormat.write(feature);
    },
    stripSRIDre: new RegExp("^SRID=\\d+;(.+)", "i"),
    ewktToFeature: function(wkt) {
        var match = this.stripSRIDre.exec(wkt);
        if (match) {
            wkt = match[1];
        }
        return this.wktFormat.read(wkt);
    },
    multiGeometryClasses: {
        'linestring': OpenLayers.Geometry.MultiLineString,
        'point': OpenLayers.Geometry.MultiPoint,
        'polygon': OpenLayers.Geometry.MultiPolygon,
        'collection': OpenLayers.Geometry.Collection
    },
    /*
     * Projection transformation
     */
    transformVector: function(vector, fromProj, toProj) {
        // Transform the projection of a feature vector or an array of feature
        // vectors (as used in a collection) between the given projections.
        if (fromProj.projCode == toProj.projCode) {
            return vector;
        }
        var transformed;
        if (vector.constructor == Array) {
            transformed = [];
            for (var i = 0; i < vector.length; i++) {
                transformed.push(this.transformVector(vector[i], fromProj, toProj));
            }
        } else {
            var cloned = vector.geometry.clone();
            transformed = new OpenLayers.Feature.Vector(cloned.transform(fromProj, toProj));
        }
        return transformed;
    },
    /*
     * Constructors for base (tile) layers.
     */
    wms: {
        map: function(type) {
            if (type === "map") {
                return new OpenLayers.Layer.WMS(
                        "OpenLayers WMS",
                        "http://labs.metacarta.com/wms/vmap0",
                        {layers: 'basic'}
                );
            } else if (type === "nasa") {
                return new OpenLayers.Layer.WMS(
                        "NASA Global Mosaic",
                        "http://t1.hypercube.telascience.org/cgi-bin/landsat7",
                        {layers: "landsat7"}
                );
            } else if (type === "blank") {
                return new OpenLayers.Layer("", {isBaseLayer: true});
            }
            return false;
        }
    },
    osm: {
        map: function(type) {
            return this[type]();
        },
        mapnik: function() {
            // Not using OpenLayers.Layer.OSM.Mapnik constructor because of
            // an IE6 bug.  This duplicates that constructor.
            return new OpenLayers.Layer.OSM("OpenStreetMap (Mapnik)",
                    [
                        "http://a.tile.openstreetmap.org/${z}/${x}/${y}.png",
                        "http://b.tile.openstreetmap.org/${z}/${x}/${y}.png",
                        "http://c.tile.openstreetmap.org/${z}/${x}/${y}.png"
                    ],
                    { numZoomLevels: 19 });
        },
        osmarender: function() {
            return new OpenLayers.Layer.OSM.Osmarender(
                    'OpenStreetMap (Osmarender)');
        }
    },
    google: {
        map: function(type) {
            return this[type]();
        },
        streets: function() {
            return new OpenLayers.Layer.Google("Google Streets",
                    {sphericalMercator: true, numZoomLevels: 20});
        },
        physical: function() {
            return new OpenLayers.Layer.Google("Google Physical",
                    {sphericalMercator: true, type: G_PHYSICAL_MAP});
        },
        satellite: function() {
            return new OpenLayers.Layer.Google("Google Satellite",
                    {sphericalMercator: true, type: G_SATELLITE_MAP,
                        numZoomLevels: 22});
        },
        hybrid: function() {
            return new OpenLayers.Layer.Google("Google Hybrid",
                    {sphericalMercator: true, type: G_HYBRID_MAP, numZoomLevels: 20});
        }
    },
    yahoo: {
        map: function(type) {
            return new OpenLayers.Layer.Yahoo("Yahoo",
                    {sphericalMercator: true, numZoomLevels: 20});
        }
    },
    ve: {
        map: function(type) {
            /* 
               VE does not play nice with vector layers at zoom level 1.
               Also, map may need "panMethod: OpenLayers.Easing.Linear.easeOut"
               to avoid drift.  See:

               http://openlayers.com/dev/examples/ve-novibrate.html

            */

            var typeCode = this.types[type]();
            return new OpenLayers.Layer.VirtualEarth("Microsoft VE (" + type + ")",
                {sphericalMercator: true, minZoomLevel: 2, type: typeCode });
        },
        types: {
            road: function() { return VEMapStyle.Road; },
            shaded: function() { return VEMapStyle.Shaded; },
            aerial: function() { return VEMapStyle.Aerial; },
            hybrid: function() { return VEMapStyle.Hybrid; }
        }
    },
    cloudmade: {
        map: function(type) {
            return new OpenLayers.Layer.CloudMade("CloudMade " + type, {
                styleId: type
            });
        }
    },
    /*
     * Utilities
     */

    // Takes any number of objects as arguments.  Working through its arguments
    // from left to right, deep-copies all properties of each argument onto the
    // left-most object, from left to right (so properties on objects to the
    // right will override properties on objects to the left).  Returns the
    // left-most object.
    //
    // Useful for nested preferences, e.g.:
    //    deepJoinOptions({}, defaults, overrides, superoverrides);
    deepJoinOptions: function() {
        var destination = arguments[0];
        if (destination === undefined) {
            destination = {};
        }
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            if (source) {
                for (var a in source) {
                    if (source[a] !== undefined && source[a] !== null) {
                        if (typeof source[a] === 'object' && source[a].constructor != Array) {
                            destination[a] = this.deepJoinOptions(destination[a], source[a]);
                        } else {
                            destination[a] = source[a];
                        }
                    }
                }
            }
        }
        return destination;
    }
};

/*
 * The Map.  Extends an OpenLayers map.
 */
olwidget.Map = OpenLayers.Class(OpenLayers.Map, {
    initialize: function(mapDivID, vectorLayers, options) {
        this.vectorLayers = vectorLayers;
        this.opts = this.initOptions(options);
        this.initMap(mapDivID, this.opts);
    },
    /*
     * Extend the passed in options with defaults, and create unserialized
     * objects for serialized options (such as projections).
     */
    initOptions: function(options) {
        var defaults = {
            // Constructor options
            mapOptions: {
                units: 'm',
                projection: "EPSG:900913",
                displayProjection: "EPSG:4326",
                maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
                controls: ['LayerSwitcher', 'Navigation', 'PanZoom', 'Attribution']
            },
            // Map div stuff
            mapDivClass: '',
            mapDivStyle: {
                width: '600px',
                height: '400px'
            },
            layers: ['osm.mapnik'],
            defaultLon: 0,
            defaultLat: 0,
            defaultZoom: 4,
            zoomToDataExtent: true,
            // Vector layer defaults (can be overridden by individual layers)
            overlayStyle: {
                fillColor: '#ff00ff',
                strokeColor: '#ff00ff',
                pointRadius: 6,
                fillOpacity: 0.5,
                strokeWidth: 2
            },
            selectOverlayStyle: {
                fillColor: '#9999ff',
                strokeColor: '#9999ff',
                pointRadius: 6,
                fillOpacity: 0.5,
                strokeWidth: 2
            }
        };

        // deep copy all options into "defaults".
        var opts = olwidget.deepJoinOptions(defaults, options);
        
        // construct objects for serialized options
        var me = opts.mapOptions.maxExtent;
        opts.mapOptions.maxExtent = new OpenLayers.Bounds(me[0], me[1], me[2], me[3]);
        opts.mapOptions.projection = new OpenLayers.Projection(opts.mapOptions.projection);
        opts.mapOptions.displayProjection = new OpenLayers.Projection(
            opts.mapOptions.displayProjection);
        opts.defaultCenter = new OpenLayers.LonLat(opts.defaultLon, opts.defaultLat);
        opts.defaultCenter.transform(opts.mapOptions.displayProjection,
                                     opts.mapOptions.projection);

        for (var i = 0; i < opts.mapOptions.controls.length; i++) {
            opts.mapOptions.controls[i] = new OpenLayers.Control[opts.mapOptions.controls[i]]();
        }
        return opts;
    },
    /*
     * Initialize the OpenLayers Map and add base layers
     */
    initMap: function(mapDivId, opts) {
        var mapDiv = document.getElementById(mapDivId);
        OpenLayers.Util.extend(mapDiv.style, opts.mapDivStyle);
        if (opts.mapDivClass) {
            mapDiv.className = opts.mapDivClass;
        }

        // Must have explicitly specified position for popups to work properly.
        if (!mapDiv.style.position) {
            mapDiv.style.position = 'relative';
        }

        var layers = [];
        for (var i = 0; i < opts.layers.length; i++) {
            var parts = opts.layers[i].split(".");
            layers.push(olwidget[parts[0]].map(parts[1]));

            // workaround for problems with Microsoft layers and vector layer drift
            // (see http://openlayers.com/dev/examples/ve-novibrate.html)
            if (parts[0] == "ve") {
                if (opts.mapOptions.panMethod === undefined) {
                    opts.mapOptions.panMethod = OpenLayers.Easing.Linear.easeOut;
                }
            }
        }
        
        // Map super constructor
        OpenLayers.Map.prototype.initialize.apply(this, [mapDiv.id, opts.mapOptions]);

        if (this.vectorLayers) {
            for (var i = 0; i < this.vectorLayers.length; i++) {
                layers.push(this.vectorLayers[i]);
            }
        } else {
            this.vectorLayers = [];
        }
        if (layers.length > 0) {
            this.addLayers(layers);
            this.initCenter();
        }
        this.selectControl = new OpenLayers.Control.SelectFeature(this.vectorLayers, {
            clickout: true, hover: false, toggle: false, multiple: false, 
            toggleKey: "ctrlKey", multipleKey: "shiftKey" });
        this.selectControl.events.register("featurehighlighted", this, 
            function(evt) { this.featureHighlighted(evt); });
        this.selectControl.events.register("featureunhighlighted", this,
            function(evt) { this.featureUnhighlighted(evt); });
        this.events.register("zoomend", this, function(evt) { this.zoomEnd(evt); });
        this.addControl(this.selectControl);
        this.selectControl.activate();
        this.addControl(new olwidget.EditableLayerSwitcher());
    },
    initCenter: function() {
        if (this.opts.zoomToDataExtent && this.vectorLayers.length > 0) {
            var extent = new OpenLayers.Bounds();
            for (var i = 0; i < this.vectorLayers.length; i++) {
                var vl = this.vectorLayers[i];
                if (vl.opts.cluster || this.opts.cluster) {
                    for (var j = 0; j < vl.features.length; j++) {
                        for (var k = 0; k < vl.features[j].cluster.length; k++) {
                            extent.extend(vl.features[j].cluster[k].geometry.getBounds());
                        }
                    }
                } else {
                    extent.extend(vl.getDataExtent());
                }
            }
            this.zoomToExtent(extent);
        } else {
            this.setCenter(this.opts.default_center, this.opts.defaultZoom);
        }
    },
    featureHighlighted: function(evt) {
        if (!this.editing) {
            this.createPopup(evt);
        }
    },
    featureUnhighlighted: function(evt) {
        if (!this.editing) {
            this.deleteAllPopups();
        }
    },
    zoomEnd: function(evt) {
        if (!this.editing) {
            this.deleteAllPopups();
        }
    },

    /**
     * Override parent to allow placement of popups outside viewport
     */
    addPopup: function(popup, exclusive) {
        if (exclusive) {
            //remove all other popups from screen
            for (var i = this.popups.length - 1; i >= 0; --i) {
                this.removePopup(this.popups[i]);
            }
        }

        popup.map = this;
        this.popups.push(popup);
        var popupDiv = popup.draw();
        if (popupDiv) {
            popupDiv.style.zIndex = this.Z_INDEX_BASE.Popup +
                                    this.popups.length;
            this.div.appendChild(popupDiv);
            // store a reference to this function so we can unregister on removal
            this.popupMoveFunc = function(event) {
                var px = this.getPixelFromLonLat(popup.lonlat);
                popup.moveTo(px);
            };
            this.events.register("move", this, this.popupMoveFunc);
            this.popupMoveFunc();
        }
    },
    /**
     * Override parent to allow placement of popups outside viewport
     */
    removePopup: function(popup) {
        OpenLayers.Util.removeItem(this.popups, popup);
        if (popup.div) {
            try {
                this.div.removeChild(popup.div);
                this.events.unregister("move", this, this.popupMoveFunc);
            } catch (e) { }
        }
        popup.map = null;
    },
    /**
     * Build a paginated popup
     */
    createPopup: function(evt) {
        var feature = evt.feature;
        var lonlat;
        if (feature.geometry.CLASS_NAME == "OpenLayers.Geometry.Point") {
            lonlat = feature.geometry.getBounds().getCenterLonLat();
        } else {
            lonlat = this.getLonLatFromViewPortPx(evt.object.handlers.feature.evt.xy);
        }

        var popupHTML = [];
        if (feature.cluster) {
            if (this.opts.clusterDisplay == 'list') {
                if (feature.cluster.length > 1) {
                    var html = "<ul class='olwidgetClusterList'>";
                    for (var i = 0; i < feature.cluster.length; i++) {
                        html += "<li>" + feature.cluster[i].attributes.html + "</li>";
                    }
                    html += "</ul>";
                    popupHTML.push(html);
                } else {
                    popupHTML.push(feature.cluster[0].attributes.html);
                }
            } else {
                for (var i = 0; i < feature.cluster.length; i++) {
                    popupHTML.push(feature.cluster[i].attributes.html);
                }
            }
        } else {
            if (feature.attributes.html) {
                popupHTML.push(feature.attributes.html);
            }
        }
        if (popupHTML.length > 0) {
            var infomap = this;
            var popup = new olwidget.Popup(null,
                    lonlat, null, popupHTML, null, true,
                    function() { infomap.selectControl.unselect(feature); },
                    this.opts.popupDirection,
                    this.opts.popupPaginationSeparator);
            if (this.opts.popupsOutside) {
               popup.panMapIfOutOfView = false;
            }
            this.addPopup(popup);
        }
    },
    deleteAllPopups: function() {
        // must clone this.popups array first; it's modified during iteration
        var popups = [];
        for (var i = 0; i < this.popups.length; i++) {
            popups.push(this.popups[i]);
        }
        for (var i = 0; i < popups.length; i++) {
            this.removePopup(popups[i]);
        }
        this.popups = [];
    },
    CLASS_NAME: "olwidget.Map"
});

olwidget.BaseVectorLayer = OpenLayers.Class(OpenLayers.Layer.Vector, {
    initialize: function(options) {
        this.opts = olwidget.deepJoinOptions({
           name: "data"
        }, options);
        layerOpts = {};
        OpenLayers.Layer.Vector.prototype.initialize.apply(this, 
               [this.opts.name, layerOpts]);
        if (this.opts.paging === true) {
            if (this.strategies === null) {
                this.strategies = [];
            }
            var paging = new OpenLayers.Strategy.Paging();
            paging.setLayer(this);
            this.strategies.push(paging);
            paging.activate();
        }
    },
    setMap: function(map) {
        OpenLayers.Layer.Vector.prototype.setMap.apply(this, [map]);
        if (map.CLASS_NAME == "olwidget.Map") {

            this.opts.overlayStyle = olwidget.deepJoinOptions(
                {}, map.opts.overlayStyle, this.opts.overlayStyle);
            this.opts.selectOverlayStyle = olwidget.deepJoinOptions(
                {}, 
                map.opts.selectOverlayStyle, 
                this.opts.selectOverlayStyle);
            this.opts.overlayStyleContext = olwidget.deepJoinOptions(
                {}, 
                map.opts.overlayStyleContext, 
                this.opts.overlayStyleContext);

            this.styleMap = new OpenLayers.StyleMap({
                "default": new OpenLayers.Style(this.opts.overlayStyle, 
                    {context: this.opts.overlayStyleContext}),
                "select": new OpenLayers.Style(this.opts.selectOverlayStyle, 
                   {context: this.opts.overlayStyleContext})
            });
            if (this.opts.cluster === true || map.opts.cluster === true) {
                if (this.strategies === null) {
                    this.strategies = [];
                }
                var cluster = new OpenLayers.Strategy.Cluster();
                cluster.setLayer(this);
                this.strategies.push(cluster);
            }
        }
    },
    CLASS_NAME: "olwidget.BaseVectorLayer"
});

olwidget.InfoLayer = OpenLayers.Class(olwidget.BaseVectorLayer, {
    initialize: function(info, options) {
        if (options === undefined) {
            options = {};
        }
        if (options.cluster) {
            var clusterStyle = {
                pointRadius: "${radius}",
                strokeWidth: "${width}",
                label: "${label}",
                labelSelect: true,
                fontSize: "11px",
                fontFamily: "Helvetica, sans-serif",
                fontColor: "#ffffff"
            };
            options.overlayStyle = olwidget.deepJoinOptions(
                {}, clusterStyle, options.overlayStyle)
            options.selectOverlayStyle = olwidget.deepJoinOptions(
                {}, clusterStyle, options.selectOverlayStyle);
            options.overlayStyleContext = olwidget.deepJoinOptions({
                    width: function(feature) {
                        return (feature.cluster) ? 2 : 1;
                    },
                    radius: function(feature) {
                        var n = feature.attributes.count;
                        var pix;
                        if (n == 1) {
                            pix = 6;
                        } else if (n <= 5) {
                            pix = 8;
                        } else if (n <= 25) {
                            pix = 10;
                        } else if (n <= 50) {
                            pix = 12;
                        } else {
                            pix = 14;
                        }
                        return pix;
                    },
                    label: function(feature) {
                        if (feature.cluster && feature.cluster.length > 1) {
                            return feature.cluster.length;
                        }
                        return '';
                    }
                }, options.overlayStyleContext);
        }
        olwidget.BaseVectorLayer.prototype.initialize.apply(this, [options]);
        this.info = info;
    },
    afterAdd: function() {
        olwidget.BaseVectorLayer.prototype.afterAdd.apply(this);
        var features = [];
        for (var i = 0; i < this.info.length; i++) {
            var feature = olwidget.ewktToFeature(this.info[i][0]);
            feature = olwidget.transformVector(feature,
                this.map.displayProjection, this.map.projection);

            if (feature.constructor != Array) {
                feature = [feature];
            }
            var htmlInfo = this.info[i][1];
            for (var k = 0; k < feature.length; k++) {
                if (typeof htmlInfo === "object") {
                    feature[k].attributes = htmlInfo;
                    if (typeof htmlInfo.style !== "undefined") {
                        feature[k].style = OpenLayers.Util.applyDefaults(
                            htmlInfo.style, this.opts.overlayStyle
                        );
                    }
                } else {
                    feature[k].attributes = { html: htmlInfo };
                }
                features.push(feature[k]);
            }
        }
        this.addFeatures(features);
    },
    CLASS_NAME: "olwidget.InfoLayer"
});

olwidget.EditableLayer = OpenLayers.Class(olwidget.BaseVectorLayer, {
    editable: true,
    initialize: function(textareaId, options) {
        this.opts = olwidget.deepJoinOptions({
            editable: true,
            geometry: 'point',
            hideTextarea: true,
            isCollection: false
        }, options);
        olwidget.BaseVectorLayer.prototype.initialize.apply(this, 
                                                            [this.opts]);

        this.textarea = document.getElementById(textareaId);
        if (this.opts.hideTextarea) {
            this.textarea.style.display = 'none';
        }
        this.buildControls();
    },
    buildControls: function() {
        var controls = [];
        var nav = new OpenLayers.Control.Navigation();
        controls.push(nav);

        // Drawing control(s)
        var geometries;
        if (this.opts.geometry.constructor == Array) {
            geometries = this.opts.geometry; 
        } else {
            geometries = [this.opts.geometry];
        }
        for (var i = 0; i < geometries.length; i++) {
            var drawControl;
            if (geometries[i] == 'linestring') {
                drawControl = new OpenLayers.Control.DrawFeature(this, 
                    OpenLayers.Handler.Path, 
                    {'displayClass': 'olControlDrawFeaturePath'});
            } else if (geometries[i] == 'polygon') {
                drawControl = new OpenLayers.Control.DrawFeature(this,
                    OpenLayers.Handler.Polygon,
                    {'displayClass': 'olControlDrawFeaturePolygon'});
            } else if (geometries[i] == 'point') {
                drawControl = new OpenLayers.Control.DrawFeature(this,
                    OpenLayers.Handler.Point,
                    {'displayClass': 'olControlDrawFeaturePoint'});
            }
            controls.push(drawControl);
        }
        // Modify feature control
        if (this.opts.geometry != 'point' || this.opts.isCollection) {
            var mod = new OpenLayers.Control.ModifyFeature(this, 
               {clickout: true});
            controls.push(mod);
        }

        // Clear all control
        var context = this;
        var del = new OpenLayers.Control.Button({
            displayClass: 'olControlClearFeatures', 
            trigger: function() {
                context.clearFeatures();
            }
        });
        controls.push(del);
        this.controls = controls;
        this.defaultControl = controls[1];
    },
    clearFeatures: function() {
        this.removeFeatures(this.features);
        this.destroyFeatures();
    },
    afterAdd: function() {
        olwidget.BaseVectorLayer.prototype.afterAdd.apply(this);
        // Read any initial WKT from the text field.  We assume that the
        // WKT uses the projection given in "displayProjection", and ignore
        // any initial SRID.

        var wkt = this.textarea.value;
        if (wkt) {
            // After reading into geometry, immediately write back to 
            // WKT <textarea> as EWKT (so the SRID is included if it wasn't
            // before).
            var geom = olwidget.ewktToFeature(wkt);
            geom = olwidget.transformVector(geom, this.map.displayProjection, 
                                            this.map.projection);

            var class_name = geom.geometry.CLASS_NAME;
            if (geom.constructor == Array || 
                    class_name === "OpenLayers.Geometry.MultiLineString" ||
                    class_name === "OpenLayers.Geometry.MultiPoint" ||
                    class_name === "OpenLayers.Geometry.MultiPolygon") {
                // extract geometries from MULTI<geom> types into individual
                // components (keeps the vector layer flat)
                if (typeof(geom.geometry) !== "undefined") {
                    var geoms = [];
                    for (var i = 0; i < geom.geometry.components.length; i++) {
                        geoms.push(
                            new OpenLayers.Feature.Vector(
                                geom.geometry.components[i])
                        );
                    }
                    this.addFeatures(geoms);
                } else {
                    this.addFeatures(geom);
                }
            } else {
                this.addFeatures([geom]);
            }
            this.numGeom = this.features.length;
        }
    },
    // Callback for openlayers "featureadded" 
    addWKT: function(event) {
        // This function will sync the contents of the `vector` layer with the
        // WKT in the text field.
        if (this.opts.isCollection) {
            this.featureToTextarea(this.features);
        } else {
            // Make sure to remove any previously added features.
            if (this.features.length > 1) {
                var old_feats = [this.features[0]];
                this.removeFeatures(old_feats);
                this.destroyFeatures(old_feats);
            }
            this.featureToTextarea(event.feature);
        }
    },
    // Callback for openlayers "featuremodified" 
    modifyWKT: function(event) {
        if (this.opts.isCollection){
            // OpenLayers adds points around the modified feature that we want
            // to strip.  So only take the features up to "numGeom", the number
            // of features counted when we last added.
            var feat = [];
            for (var i = 0; i < this.numGeom; i++) {
                feat.push(this.features[i].clone());
            }
            this.featureToTextarea(feat);
        } else {
            this.featureToTextarea(event.feature);
        }
    },
    featureToTextarea: function(feature) {
        if (this.opts.isCollection) {
            this.numGeom = feature.length;
        } else {
            this.numGeom = 1;
        }
        feature = olwidget.transformVector(feature, 
                this.map.projection, this.map.displayProjection);
        if (this.opts.isCollection) {
            // Convert to multi-geometry types if we are a collection.  Passing
            // arrays to the WKT formatter results in a "GEOMETRYCOLLECTION"
            // type, but if we have only one geometry, we should use a
            // "MULTI<geometry>" type.
            if (this.opts.geometry.constructor != Array) {
                var geoms = [];
                for (var i = 0; i < feature.length; i++) {
                    geoms.push(feature[i].geometry);
                }
                var GeoClass = olwidget.multiGeometryClasses[this.opts.geometry]; 
                feature = new OpenLayers.Feature.Vector(new GeoClass(geoms));
            } 
        }
        this.textarea.value = olwidget.featureToEWKT(
            feature, this.map.displayProjection);
    },
    CLASS_NAME: "olwidget.EditableLayer"
});


olwidget.EditableLayerSwitcher = OpenLayers.Class(OpenLayers.Control.LayerSwitcher, {
    // The layer we are currently editing
    currentlyEditing: null,
    // A list of all editable layers, including none.  Contains an object:
    // {
    //  layer: the layer,
    //  inputElem: the rado button,
    //  labelSpan: the name span next to the button
    // }
    editableLayers: [],
    // Panel for editing controls
    panel: null,

    initialize: function(options) {
        OpenLayers.Control.prototype.initialize.apply(this, arguments);
    },
    setMap: function() {
        OpenLayers.Control.prototype.setMap.apply(this, arguments);
        this.map.events.on({
            "addlayer": this.redraw,
            "changelayer": this.redraw,
            "removelayer": this.redraw,
            scope: this
        });
    },
    onInputClick: function(e) {
        if (!this.inputElem.disabled) {
            if (this.layer) {
                this.layerSwitcher.setEditing(this.layer);
            } else {
                this.layerSwitcher.stopEditing();
            }
            this.layerSwitcher.minimizeControl();
        }
    },
    stopEditing: function() {
        if (this.currentlyEditing) {
            var layer = this.currentlyEditing;
            layer.events.un({
                "featuremodified": layer.modifyWKT,
                "featureadded": layer.addWKT,
                scope: layer
            });
        }
        if (this.panel) {
            this.panel.deactivate();
            this.panel.destroy();
            this.panel = null;
        }
        this.maximize.innerHTML = "(+) Edit";
        this.minimize.innerHTML = "(-) Edit";
        this.currentlyEditing = null;
        // TODO: i18n
        if (this.map.selectControl) {
            this.map.selectControl.activate();
        }
        this.map.removeControl(this.panel);
        this.setChecked(null);
    },
    setEditing: function(layer) {
        if (this.currentlyEditing) {
            this.stopEditing();
        }
        this.panel = new OpenLayers.Control.Panel({
            defaultControl: layer.defaultControl,
            displayClass: 'olControlEditingToolbar'
        })
        this.panel.addControls(layer.controls);
        this.map.addControl(this.panel);

        this.currentlyEditing = layer;
        // TODO: i18n
        this.maximize.innerHTML = "(+) Editing \"" + layer.name + "\"";
        this.minimize.innerHTML = "(-) Editing \"" + layer.name + "\"";
        layer.events.on({
            "featuremodified": layer.modifyWKT,
            "featureadded": layer.addWKT,
            scope: layer
        });
        if (this.map.selectControl) {
            this.map.selectControl.deactivate();
        }

    },
    setChecked: function(layer) {
        for (var i = 0; i < this.editableLayers.length; i++) {
            if (layer == this.editableLayers[i].layer) {
                this.editableLayers[i].inputElem.checked = true;
                break;
            }
        }
    },
    destroy: function() {
        OpenLayers.Event.stopObservingElement(this.div);
        this.map.events.un({
            "addlayer": this.redraw,
            "changelayer": this.redraw,
            "removelayer": this.redraw,
            "changebaselayer": this.redraw,
            scope: this
        });
        clearLayersArray();
        OpenLayers.Control.prototype.destroy.apply(this, arguments);
    },
    clearLayersArray: function() {
        for (var i = 0; i < this.editableLayers.length; i++) {
            var layer = this.editableLayers[i];
            OpenLayers.Event.stopObservingElement(layer.inputElem);
            OpenLayers.Event.stopObservingElement(layer.labelSpan);
        }
        this.editableLayers = [];
    },
    draw: function() {
        OpenLayers.Control.prototype.draw.apply(this);
        this.loadContents()
        this.redraw();
        this.stopEditing();
        return this.div;
    },
    buildInput: function(name, checked, layer) {
        var input = document.createElement("input");
        input.id = this.id + "_edit_switcher_" + this.editableLayers.length;
        input.name = this.id + "_edit";
        input.type = "radio";
        input.value = name;
        input.checked = checked;
        if (layer && (!layer.inRange || !layer.visibility)) {
            input.disabled = true;
        }
        var span = document.createElement("span");
        OpenLayers.Element.addClass(span, "label");
        span.innerHTML = name;

        var context = {
            "inputElem": input,
            "layer": layer,
            "layerSwitcher": this,
        }
        OpenLayers.Event.observe(input, "mouseup",
            OpenLayers.Function.bindAsEventListener(this.onInputClick, 
                                                    context)
        );
        OpenLayers.Event.observe(span, "mouseup",
            OpenLayers.Function.bindAsEventListener(this.onInputClick,
                                                    context)
        );

        this.layersDiv.appendChild(input);
        this.layersDiv.appendChild(span);
        this.layersDiv.appendChild(document.createElement("br"));

        this.editableLayers.push({
            'layer': layer,
            'inputElem': input,
            'labelSpan': span
        });
    },
    redraw: function() {
        this.clearLayersArray();
        this.layersDiv.innerHTML = "";
        this.editingControls.innerHTML = "";
        if (this.panel && this.panel.div) {
            this.editingControls.appendChild(this.panel.div);
            var clr = document.createElement("div");
            clr.style.clear = "both";
            this.editingControls.appendChild(clr);
        }

        // TODO: i18n
        this.buildInput("none", !this.currentlyEditing, null);

        for (var i = 0; i < this.map.layers.length; i++) {
            var layer = this.map.layers[i];
            if (layer.editable) {
                this.buildInput(layer.name, 
                   this.currentlyEditing && 
                       this.currentlyEditing.name == layer.name, 
                   layer);
            }
        }
        if (this.editableLayers.length == 0) {
            this.div.style.display = "none";
        } else {
            this.div.style.display = "";
        }
    },
    loadContents: function() {
        // Set event handlers such that we don't get spurious clicks or mouse
        // ups for events not initiated in our control.
        OpenLayers.Event.observe(this.div, "mouseup",
            OpenLayers.Function.bindAsEventListener(this.mouseUp, this));
        OpenLayers.Event.observe(this.div, "click", this.ignoreEvent);
        OpenLayers.Event.observe(this.div, "mousedown",
            OpenLayers.Function.bindAsEventListener(this.mouseDown, this));
        OpenLayers.Event.observe(this.div, "dblclick", this.ignoreEvent);

        // Container for corners.
        this.container = document.createElement("div");
        OpenLayers.Element.addClass(this.container, "container");
        this.div.appendChild(this.container);
        OpenLayers.Rico.Corner.round(this.div, {
            corners: "bl br",
            bgColor: "transparent",
            color: this.activeColor,
            blend: false
        });
        OpenLayers.Rico.Corner.changeOpacity(this.container, 0.75);

        // Container for layers
        this.layersDiv = document.createElement("div");
        this.layersDiv.id = this.id + "_layersDiv";
        this.layersDiv.style.display = "none";
        OpenLayers.Element.addClass(this.layersDiv, "layersDiv");

        // Container for editing controls
        this.editingControls = document.createElement("div");
        this.editingControls.id = this.id + "_editingControls";
        OpenLayers.Element.addClass(this.editingControls, "editingControls");

        // Heading
        this.maximize = document.createElement("div");
        OpenLayers.Element.addClass(this.maximize, "maxmin max");
        this.minimize = document.createElement("div");
        OpenLayers.Element.addClass(this.minimize, "maxmin min");
        this.minimize.style.display = "none";
        OpenLayers.Event.observe(this.maximize, "click",
            OpenLayers.Function.bindAsEventListener(this.maximizeControl, this)
        );
        OpenLayers.Event.observe(this.minimize, "click",
            OpenLayers.Function.bindAsEventListener(this.minimizeControl, this)
        );
            
        this.container.appendChild(this.maximize);
        this.container.appendChild(this.minimize);
        this.container.appendChild(this.editingControls);
        var clr = document.createElement("div");
        clr.style.clear = "both";
        this.container.appendChild(clr);
        this.container.appendChild(this.layersDiv);
    },
    maximizeControl: function(e) {
        this.showControls(false);
        if (e != null) {
            OpenLayers.Event.stop(e);
        }
    },
    minimizeControl: function(e) {
        this.showControls(true);
        if (e != null) {
            OpenLayers.Event.stop(e);
        }
    },
    showControls: function(minimize) {
        this.maximize.style.display = minimize ? "" : "none";
        this.minimize.style.display = minimize ? "none" : "";
        this.layersDiv.style.display = minimize ? "none" : "";
    },
    CLASS_NAME: "olwidget.EditableLayerSwitcher"
});


/*
 * Paginated, framed popup type, CSS stylable.
 */
olwidget.Popup = OpenLayers.Class(OpenLayers.Popup.Framed, {
    autoSize: true,
    panMapIfOutOfView: true,
    fixedRelativePosition: false,
    // Position blocks.  Overriden to include additional "className" parameter,
    // allowing image paths relative to css rather than relative to the html
    // file (as paths included in a JS file are computed).
    positionBlocks: {
        "tl": {
            'offset': new OpenLayers.Pixel(44, -6),
            'padding': new OpenLayers.Bounds(5, 14, 5, 5),
            'blocks': [
                { // stem
                    className: 'olwidgetPopupStemTL',
                    size: new OpenLayers.Size(24, 14),
                    anchor: new OpenLayers.Bounds(null, 0, 32, null),
                    position: new OpenLayers.Pixel(0, -28)
                }
            ]
        },
        "tr": {
            'offset': new OpenLayers.Pixel(-44, -6),
            'padding': new OpenLayers.Bounds(5, 14, 5, 5),
            'blocks': [
                { // stem
                    className: "olwidgetPopupStemTR",
                    size: new OpenLayers.Size(24, 14),
                    anchor: new OpenLayers.Bounds(32, 0, null, null),
                    position: new OpenLayers.Pixel(0, -28)
                }
            ]
        },
        "bl": {
            'offset': new OpenLayers.Pixel(44, 6),
            'padding': new OpenLayers.Bounds(5, 5, 5, 14),
            'blocks': [
                { // stem
                    className: "olwidgetPopupStemBL",
                    size: new OpenLayers.Size(24, 14),
                    anchor: new OpenLayers.Bounds(null, null, 32, 0),
                    position: new OpenLayers.Pixel(0, 0)
                }
            ]
        },
        "br": {
            'offset': new OpenLayers.Pixel(-44, 6),
            'padding': new OpenLayers.Bounds(5, 5, 5, 14),
            'blocks': [
                { // stem
                    className: "olwidgetPopupStemBR",
                    size: new OpenLayers.Size(24, 14),
                    anchor: new OpenLayers.Bounds(32, null, null, 0),
                    position: new OpenLayers.Pixel(0, 0)
                }
            ]
        }
    },

    initialize: function(id, lonlat, contentSize, contentHTML, anchor, closeBox,
                    closeBoxCallback, relativePosition, separator) {
        if (relativePosition && relativePosition != 'auto') {
            this.fixedRelativePosition = true;
            this.relativePosition = relativePosition;
        }
        if (separator === undefined) {
            this.separator = ' of ';
        } else {
            this.separator = separator;
        }
        // we don't use the default close box because we want it to appear in
        // the content div for easier CSS control.
        this.olwidgetCloseBox = closeBox;
        this.olwidgetCloseBoxCallback = closeBoxCallback;
        this.page = 0;
        OpenLayers.Popup.Framed.prototype.initialize.apply(this, [id, lonlat,
            contentSize, contentHTML, anchor, false, null]);
    },

    /*
     * Construct the interior of a popup.  If contentHTML is an Array, display
     * the array element specified by this.page.
     */
    setContentHTML: function(contentHTML) {
        if (contentHTML !== null && contentHTML !== undefined) {
            this.contentHTML = contentHTML;
        }

        var pageHTML;
        var showPagination;
        if (this.contentHTML.constructor != Array) {
            pageHTML = this.contentHTML;
            showPagination = false;
        } else {
            pageHTML = this.contentHTML[this.page];
            showPagination = this.contentHTML.length > 1;
        }

        if ((this.contentDiv !== null) && (pageHTML !== null)) {
            var popup = this; // for closures

            // Clear old contents
            this.contentDiv.innerHTML = "";
            
            // Build container div
            var containerDiv = document.createElement("div");
            containerDiv.className = 'olwidgetPopupContent';
            this.contentDiv.appendChild(containerDiv);

            // Build close box
            if (this.olwidgetCloseBox) {
                var closeDiv = document.createElement("div");
                closeDiv.className = "olwidgetPopupCloseBox";
                closeDiv.innerHTML = "close";
                closeDiv.onclick = function(event) { 
                    popup.olwidgetCloseBoxCallback.apply(popup, arguments); 
                };
                containerDiv.appendChild(closeDiv);
            }
            
            var pageDiv = document.createElement("div");
            pageDiv.innerHTML = pageHTML;
            pageDiv.className = "olwidgetPopupPage";
            containerDiv.appendChild(pageDiv);

            if (showPagination) {
                // Build pagination control

                var paginationDiv = document.createElement("div");
                paginationDiv.className = "olwidgetPopupPagination";
                var prev = document.createElement("div");
                prev.className = "olwidgetPaginationPrevious";
                prev.innerHTML = "prev";
                prev.onclick = function(event) { 
                    popup.page = (popup.page - 1 + popup.contentHTML.length) % 
                        popup.contentHTML.length;
                    popup.setContentHTML();
                    popup.map.events.triggerEvent("move");
                };

                var count = document.createElement("div");
                count.className = "olwidgetPaginationCount";
                count.innerHTML = (this.page + 1) + this.separator + this.contentHTML.length;
                var next = document.createElement("div");
                next.className = "olwidgetPaginationNext";
                next.innerHTML = "next";
                next.onclick = function(event) {
                    popup.page = (popup.page + 1) % popup.contentHTML.length;
                    popup.setContentHTML();
                    popup.map.events.triggerEvent("move");
                };

                paginationDiv.appendChild(prev);
                paginationDiv.appendChild(count);
                paginationDiv.appendChild(next);
                containerDiv.appendChild(paginationDiv);

            }
            var clearFloat = document.createElement("div");
            clearFloat.style.clear = "both";
            containerDiv.appendChild(clearFloat);

            if (this.autoSize) {
                this.registerImageListeners();
                this.updateSize();
            }
        }
    },

    /*
     * Override parent to make the popup more CSS-friendly.  Rather than
     * specifying img paths in javascript, give position blocks CSS classes
     * that can be used to apply background images to the divs.
     */
    createBlocks: function() {
        this.blocks = [];

        //since all positions contain the same number of blocks, we can 
        // just pick the first position and use its blocks array to create
        // our blocks array
        var firstPosition = null;
        for(var key in this.positionBlocks) {
            firstPosition = key;
            break;
        }

        var position = this.positionBlocks[firstPosition];
        for (var i = 0; i < position.blocks.length; i++) {

            var block = {};
            this.blocks.push(block);

            var divId = this.id + '_FrameDecorationDiv_' + i;
            block.div = OpenLayers.Util.createDiv(divId,
                null, null, null, "absolute", null, "hidden", null
            );
            this.groupDiv.appendChild(block.div);
        }
    },
    /*
     * Override parent to make the popup more CSS-friendly, reflecting
     * modifications to createBlocks.
     */
    updateBlocks: function() {
        if (!this.blocks) {
            this.createBlocks();
        }
        if (this.size && this.relativePosition) {
            var position = this.positionBlocks[this.relativePosition];
            for (var i = 0; i < position.blocks.length; i++) {

                var positionBlock = position.blocks[i];
                var block = this.blocks[i];

                // adjust sizes
                var l = positionBlock.anchor.left;
                var b = positionBlock.anchor.bottom;
                var r = positionBlock.anchor.right;
                var t = positionBlock.anchor.top;

                //note that we use the isNaN() test here because if the 
                // size object is initialized with a "auto" parameter, the 
                // size constructor calls parseFloat() on the string, 
                // which will turn it into NaN
                //
                var w = (isNaN(positionBlock.size.w)) ? this.size.w - (r + l)
                                                      : positionBlock.size.w;

                var h = (isNaN(positionBlock.size.h)) ? this.size.h - (b + t)
                                                      : positionBlock.size.h;

                block.div.style.width = (w < 0 ? 0 : w) + 'px';
                block.div.style.height = (h < 0 ? 0 : h) + 'px';

                block.div.style.left = (l !== null) ? l + 'px' : '';
                block.div.style.bottom = (b !== null) ? b + 'px' : '';
                block.div.style.right = (r !== null) ? r + 'px' : '';
                block.div.style.top = (t !== null) ? t + 'px' : '';

                block.div.className = positionBlock.className;
            }

            this.contentDiv.style.left = this.padding.left + "px";
            this.contentDiv.style.top = this.padding.top + "px";
        }
    },
    updateSize: function() {
        if (this.map.opts.popupsOutside === true) {
            var preparedHTML = "<div class='" + this.contentDisplayClass+ "'>" +
                this.contentDiv.innerHTML +
                "</div>";

            var containerElement = document.body;
            var realSize = OpenLayers.Util.getRenderedDimensions(
                preparedHTML, null, {
                    displayClass: this.displayClass,
                    containerElement: containerElement
                }
            );
            return this.setSize(realSize);
        } else {
            return OpenLayers.Popup.prototype.updateSize.apply(this, arguments);
        }
    },

    CLASS_NAME: "olwidget.Popup"
});


window.olwidget = olwidget;
})();
