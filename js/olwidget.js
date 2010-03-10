/*
 *  Simplified open layers mapping widgets.
 * 
 *  olwidget.EditableMap(textareaID, options) -- replace a textarea containing
 *  (E)WKT data with an editable map.
 *
 *  olwidget.InfoMap(div_id, data, options) -- replace a div with a map which
 *  displays the data (an array of [WKT, html] pairs) in clickable popups.
 *
 */
(function() {

/*
 *  Base namespace and utility functions
 */
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
     * Constructors for layers
     */
    wms: {
        map: function() {
            return new OpenLayers.Layer.WMS(
                    "OpenLayers WMS",
                    "http://labs.metacarta.com/wms/vmap0",
                    {layers: 'basic'}
            );
        },
        nasa: function() {
            return new OpenLayers.Layer.WMS(
                    "NASA Global Mosaic",
                    "http://t1.hypercube.telascience.org/cgi-bin/landsat7",
                    {layers: "landsat7"}
            );
        },
        blank: function() {
            return new OpenLayers.Layer("", {isBaseLayer: true});
        }
    },
    osm: {
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
                    {sphericalMercator: true, type: G_SATELLITE_MAP});
        },
        hybrid: function() {
            return new OpenLayers.Layer.Google("Google Hybrid", 
                    {sphericalMercator: true, type: G_HYBRID_MAP, numZoomLevels: 20});
        }
    },
    yahoo: {
        map: function() {
            return new OpenLayers.Layer.Yahoo("Yahoo", 
                    {sphericalMercator: true, numZoomLevels: 20});
        }
    },
    ve: {
        map: function(type, typeName) {
            /* 
               VE does not play nice with vector layers at zoom level 1.
               Also, map may need "panMethod: OpenLayers.Easing.Linear.easeOut"
               to avoid drift.  See:

               http://openlayers.com/dev/examples/ve-novibrate.html

            */
                
            return new OpenLayers.Layer.VirtualEarth("Microsoft VE (" + typeName + ")", 
                {sphericalMercator: true, minZoomLevel: 2, type: type });
        },
        road: function() { return this.map(VEMapStyle.Road, "Road"); },
        shaded: function() { return this.map(VEMapStyle.Shaded, "Shaded"); },
        aerial: function() { return this.map(VEMapStyle.Aerial, "Aerial"); },
        hybrid: function() { return this.map(VEMapStyle.Hybrid, "Hybrid"); }
    },


    /*
     * Deep copies all attributes in 'source' object into 'destination' object.
     * Useful for applying defaults in nested objects.
     */
    deepJoinOptions: function(destination, source) {
        if (destination == undefined) {
            destination = {};
        }
        for (var a in source) {
            if (source[a] != undefined) {
                if (typeof(source[a]) == 'object' && source[a].constructor != Array) {
                    destination[a] = this.deepJoinOptions(destination[a], source[a]);
                } else {
                    destination[a] = source[a];
                }
            }
        }
        return destination;
    }
};

/*
 *  Base olwidget map type.  Extends OpenLayers.Map
 */
olwidget.BaseMap = OpenLayers.Class(OpenLayers.Map, {
    initialize: function(mapDivID, options) {
        this.opts = this.initOptions(options);
        this.initMap(mapDivID, this.opts);
    },
    /*
     * Extend the passed in options with defaults, and create unserialized
     * objects for serialized options (such as projections).
     */
    initOptions: function(options) {
        var defaults = {
            mapOptions: {
                units: 'm',
                maxResolution: 156543.0339,
                projection: "EPSG:900913",
                displayProjection: "EPSG:4326",
                maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
                controls: ['LayerSwitcher', 'Navigation', 'PanZoom', 'Attribution']
            },
            mapDivClass: '',
            mapDivStyle: {
                width: '600px',
                height: '400px'
            },
            name: 'data',
            layers: ['osm.mapnik'],
            defaultLon: 0,
            defaultLat: 0,
            defaultZoom: 4,
            zoomToDataExtent: true,
            overlayStyle: {
                fillColor: '#ff00ff',
                strokeColor: '#ff00ff',
                pointRadius: 6,
                fillOpacity: 0.5,
                strokeWidth: 2
            }
        };
        var opts = olwidget.deepJoinOptions(defaults, options);

        // construct objects for serialized options
        var me = opts.mapOptions.maxExtent;
        opts.mapOptions.maxExtent = new OpenLayers.Bounds(me[0], me[1], me[2], me[3]);
        opts.mapOptions.projection = new OpenLayers.Projection(opts.mapOptions.projection);
        opts.mapOptions.displayProjection = new OpenLayers.Projection(
                opts.mapOptions.displayProjection);
        opts.default_center = new OpenLayers.LonLat(opts.defaultLon, opts.defaultLat);
        opts.default_center.transform(opts.mapOptions.displayProjection,
                opts.mapOptions.projection);
        var controls = [];
        for (var i = 0; i < opts.mapOptions.controls.length; i++) {
            var control = opts.mapOptions.controls[i];
            controls.push(new OpenLayers.Control[control]());
        }
        opts.mapOptions.controls = controls;
        return opts;
    },
    /*
     * Initialize the OpenLayers Map instance and add layers.
     */
    initMap: function(mapDivID, opts) {
        var mapDiv = document.getElementById(mapDivID);
        OpenLayers.Util.extend(mapDiv.style, opts.mapDivStyle);
        mapDiv.className = opts.mapDivClass;
        var layers = [];
        for (var i = 0; i < opts.layers.length; i++) {
            var parts = opts.layers[i].split(".");
            layers.push(olwidget[parts[0]][parts[1]]());
            
            // workaround for problems with Microsoft layers and vector layer drift
            // (see http://openlayers.com/dev/examples/ve-novibrate.html)
            if (parts[0] == "ve") {
                if (opts.mapOptions.panMethod == undefined) {
                    opts.mapOptions.panMethod = OpenLayers.Easing.Linear.easeOut;
                }
            }
        }
        var styleMap = new OpenLayers.StyleMap({'default': new OpenLayers.Style(opts.overlayStyle, opts.styleContext)});

        // Super constructor
        OpenLayers.Map.prototype.initialize.apply(this, [mapDiv.id, opts.mapOptions]);
        this.vectorLayer = new OpenLayers.Layer.Vector(this.opts.name, { styleMap: styleMap });
        layers.push(this.vectorLayer);
        this.addLayers(layers);
    },
    initCenter: function() {
        if (this.opts.zoomToDataExtent && this.vectorLayer.features.length > 0) {
            if (this.opts.cluster) {
                var extent = this.vectorLayer.features[0].geometry.getBounds();
                for (var i = 0; i < this.vectorLayer.features.length; i++) {
                    for (var j = 0; j < this.vectorLayer.features[i].cluster.length; j++) {
                        extent.extend(this.vectorLayer.features[i].cluster[j].geometry.getBounds());
                    }
                }
                this.zoomToExtent(extent);
            } else if (this.vectorLayer.features.length == 1 &&
                    this.vectorLayer.features[0].geometry.CLASS_NAME == "OpenLayers.Geometry.Point") {

                this.setCenter(this.vectorLayer.features[0].geometry.getBounds().getCenterLonLat(), 
                               this.opts.defaultZoom);
            } else {
                this.zoomToExtent(this.vectorLayer.getDataExtent());
            }
        } else {
            this.setCenter(this.opts.default_center, this.opts.defaultZoom);
        }
    },
    clearFeatures: function() {
        this.vectorLayer.removeFeatures(this.vectorLayer.features);
        this.vectorLayer.destroyFeatures();
    }
});

/*
 *  Map type that implements editable vectors.
 */
olwidget.EditableMap = OpenLayers.Class(olwidget.BaseMap, {
    initialize: function(textareaID, options) {
        var defaults = {
            editable: true,
            geometry: 'point',
            hideTextarea: true,
            isCollection: false
        };
        options = olwidget.deepJoinOptions(defaults, options);

        // set up map div
        var mapDiv = document.createElement("div");
        mapDiv.id = textareaID + "_map";
        this.textarea = document.getElementById(textareaID);
        this.textarea.parentNode.insertBefore(mapDiv, this.textarea);

        // initialize map
        olwidget.BaseMap.prototype.initialize.apply(this, [mapDiv.id, options]);

        if (this.opts.hideTextarea) {
            this.textarea.style.display = 'none';
        }

        this.initWKT();
        this.initCenter();
        this.initControls();
    },
    initWKT: function() {
        // Read any initial WKT from the text field.  We assume that the
        // WKT uses the projection given in "displayProjection", and ignore
        // any initial SRID.

        var wkt = this.textarea.value;
        if (wkt) {
            // After reading into geometry, immediately write back to 
            // WKT <textarea> as EWKT (so the SRID is included if it wasn't
            // before).
            var geom = olwidget.ewktToFeature(wkt);
            geom = olwidget.transformVector(geom, this.displayProjection, this.projection);
            if (geom.constructor == Array || 
                    geom.geometry.CLASS_NAME === "OpenLayers.Geometry.MultiLineString" ||
                    geom.geometry.CLASS_NAME === "OpenLayers.Geometry.MultiPoint" ||
                    geom.geometry.CLASS_NAME === "OpenLayers.Geometry.MultiPolygon") {
                // extract geometries from MULTI<geom> types into individual components
                // (keeps the vector layer flat)
                if (typeof(geom.geometry) !== "undefined") {
                    var geoms = [];
                    for (var i = 0; i < geom.geometry.components.length; i++) {
                        geoms.push(new OpenLayers.Feature.Vector(geom.geometry.components[i]));
                    }
                    this.vectorLayer.addFeatures(geoms);
                } else {
                    this.vectorLayer.addFeatures(geom);
                }
            } else {
                this.vectorLayer.addFeatures([geom]);
            }
            this.numGeom = this.vectorLayer.features.length;
        }
    },
    initControls: function() {
        // Initialize controls for editing geometries, navigating, and map data.

        // This allows editing of the geographic fields -- the modified WKT is
        // written back to the content field (as EWKT)
        if (this.opts.editable) {
            var closuredThis = this;
            this.vectorLayer.events.on({
                "featuremodified" : function(event) { closuredThis.modifyWKT(event); },
                "featureadded": function(event) { closuredThis.addWKT(event); }
            });

            // Map controls:
            // Add geometry specific panel of toolbar controls
            var panel = this.buildPanel(this.vectorLayer);
            this.addControl(panel);
            var select = new OpenLayers.Control.SelectFeature( this.vectorLayer,
                    {toggle: true, clickout: true, hover: false});
            this.addControl(select);
            select.activate();
        }
    },
    clearFeatures: function() {
        olwidget.BaseMap.prototype.clearFeatures.apply(this);
        this.textarea.value = '';
    },
    buildPanel: function(layer) {
        var panel = new OpenLayers.Control.Panel({displayClass: 'olControlEditingToolbar'});
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
                drawControl = new OpenLayers.Control.DrawFeature(layer, 
                    OpenLayers.Handler.Path, 
                    {'displayClass': 'olControlDrawFeaturePath'});
            } else if (geometries[i] == 'polygon') {
                drawControl = new OpenLayers.Control.DrawFeature(layer,
                    OpenLayers.Handler.Polygon,
                    {'displayClass': 'olControlDrawFeaturePolygon'});
            } else if (geometries[i] == 'point') {
                drawControl = new OpenLayers.Control.DrawFeature(layer,
                    OpenLayers.Handler.Point,
                    {'displayClass': 'olControlDrawFeaturePoint'});
            }
            controls.push(drawControl);
        }
            
        // Modify feature control
        var mod = new OpenLayers.Control.ModifyFeature(layer);
        controls.push(mod);

        // Clear all control
        var closuredThis = this;
        var del = new OpenLayers.Control.Button({
            displayClass: 'olControlClearFeatures', 
            trigger: function() {
                closuredThis.clearFeatures();
            }
        });

        controls.push(del);
        panel.addControls(controls);
        return panel;
    },
    // Callback for openlayers "featureadded" 
    addWKT: function(event) {
        // This function will sync the contents of the `vector` layer with the
        // WKT in the text field.
        if (this.opts.isCollection) {
            this.featureToTextarea(this.vectorLayer.features);
        } else {
            // Make sure to remove any previously added features.
            if (this.vectorLayer.features.length > 1) {
                var old_feats = [this.vectorLayer.features[0]];
                this.vectorLayer.removeFeatures(old_feats);
                this.vectorLayer.destroyFeatures(old_feats);
            }
            this.featureToTextarea(event.feature);
        }
    },
    // Callback for openlayers "featuremodified" 
    modifyWKT: function(event) {
        if (this.opts.isCollection){
            // OpenLayers adds points around the modified feature that we want to strip.
            // So only take the features up to "numGeom", the number of features counted
            // when we last added.
            var feat = [];
            for (var i = 0; i < this.numGeom; i++) {
                feat.push(this.vectorLayer.features[i].clone());
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
                this.projection, this.displayProjection);
        if (this.opts.isCollection) {
            // Convert to multi-geometry types if we are a collection.
            // Passing arrays to the WKT formatter results in a
            // "GEOMETRYCOLLECTION" type, but if we have only one geometry,
            // we should use a "MULTI<geometry>" type.
            if (this.opts.geometry.constructor != Array) {
                var geoms = [];
                for (var i = 0; i < feature.length; i++) {
                    geoms.push(feature[i].geometry);
                }
                var GeoClass = olwidget.multiGeometryClasses[this.opts.geometry]; 
                feature = new OpenLayers.Feature.Vector(new GeoClass(geoms));
            } 
        }
        this.textarea.value = olwidget.featureToEWKT(feature, this.displayProjection);
    }
});

/*
 *  olwidget.InfoMap -- map type supporting clickable vectors that raise
 *  popups.  The popups are displayed optionally inside or outside the map's
 *  viewport.
 *  
 *  Usage: olwidget.Infomap(mapDivID, infoArray, options)
 *
 *  arguments: 
 *     mapDivID: the DOM id of a div to replace with the map.
 *     infoArray: An array of the form:
 *         [ ["WKT", "html"], ... ]
 *         where "WKT" represents the well-known text form of the geometry,
 *         and "html" represents the HTML content for the popup.
 *     options: An options object.  See distribution documentation for details.
 */
olwidget.InfoMap = OpenLayers.Class(olwidget.BaseMap, {
    initialize: function(mapDivID, infoArray, options) {
        var infomapDefaults = {
            popupsOutside: false,
            popupDirection: 'auto',
            popupPaginationSeparator: ' of ',
            cluster: false,
            clusterDisplay: "paginate"
        };

        options = olwidget.deepJoinOptions(infomapDefaults, options);
        olwidget.BaseMap.prototype.initialize.apply(this, [mapDivID, options]);

        // Must have explicitly specified position for popups to work properly.
        if (!this.div.style.position) {
            this.div.style.position = 'relative';
        }

        if (this.opts.cluster == true) {
            this.addClusterStrategy();
        }

        var features = [];
        for (var i = 0; i < infoArray.length; i++) {
            var feature = olwidget.ewktToFeature(infoArray[i][0]);
            feature = olwidget.transformVector(feature, 
                this.displayProjection, this.projection);

            if (feature.constructor != Array) {
                feature = [feature];
            }
            var htmlInfo = infoArray[i][1];
            for (var k = 0; k < feature.length; k++) {
                if (typeof htmlInfo === "object") {
                    feature[k].attributes = htmlInfo
                    if (typeof htmlInfo.style !== "undefined") {
                        feature[k].style = OpenLayers.Util.applyDefaults(htmlInfo.style, this.opts.overlayStyleContext);
                    }
                } else {
                    feature[k].attributes = { html: htmlInfo };
                }
                features.push(feature[k]);
            }
        }
        this.vectorLayer.addFeatures(features);
        this.initCenter();

        this.select = new OpenLayers.Control.SelectFeature(this.vectorLayer, { clickout: true, hover: false });
        this.select.events.register("featurehighlighted", this, 
                function(evt) { this.createPopup(evt); });
        this.select.events.register("featureunhighlighted", this, 
                function(evt) { this.deletePopup(); });
        // Zooming changes clusters, so we must delete popup if we zoom.
        var map = this;
        this.events.register("zoomend", this, function(event) { map.deletePopup(); });
        this.addControl(this.select);
        this.select.activate();
    },
    addClusterStrategy: function() {
        var defaultClusterStyle = {
                pointRadius: "${radius}",
                strokeWidth: "${width}",
                label: "${label}",
                labelSelect: true,
                fontSize: "11px",
                fontFamily: "Helvetica, sans-serif",
                fontColor: "#ffffff"
        };
        var context = {
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
                return (feature.cluster && feature.cluster.length > 1) ? feature.cluster.length : '';
            }
        };
        if (this.opts.overlayStyleContext !== undefined) {
            OpenLayers.Util.applyDefaults(context, this.opts.overlayStyleContext);
        }

        var defaultStyleOpts = OpenLayers.Util.applyDefaults(
            OpenLayers.Util.applyDefaults({}, defaultClusterStyle), 
            this.vectorLayer.styleMap.styles['default'].defaultStyle);
        var selectStyleOpts = OpenLayers.Util.applyDefaults(
            OpenLayers.Util.applyDefaults({}, defaultClusterStyle),
            this.vectorLayer.styleMap.styles['select'].defaultStyle);
        if (this.opts.clusterStyle !== undefined) {
            defaultStyleOpts = olwidget.deepJoinOptions(defaultStyleOpts, this.opts.clusterStyle);
            selectStyleOpts = olwidget.deepJoinOptions(selectStyleOpts, this.opts.clusterStyle);
            window['console'] && console.warn("olwidget: ``clusterStyle`` option is deprecated.  Use ``overlayStyle`` instead.");
        }

        var defaultStyle = new OpenLayers.Style(defaultStyleOpts, {context: context});
        var selectStyle = new OpenLayers.Style(selectStyleOpts, {context: context});
        this.removeLayer(this.vectorLayer);
        this.vectorLayer = new OpenLayers.Layer.Vector(this.opts.name, { 
            styleMap: new OpenLayers.StyleMap({ 'default': defaultStyle, 'select': selectStyle }),
            strategies: [new OpenLayers.Strategy.Cluster()]
        });
        this.addLayer(this.vectorLayer);
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
            popupDiv.style.zIndex = this.Z_INDEX_BASE['Popup'] +
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
            popupHTML.push(feature.attributes.html);
        }
        var infomap = this;
        this.popup = new olwidget.Popup(null, 
                lonlat, null, popupHTML, null, true, 
                function() { infomap.select.unselect(feature); }, 
                this.opts.popupDirection,
                this.opts.popupPaginationSeparator);
        if (this.opts.popupsOutside) {
            this.popup.panMapIfOutOfView = false;
        }
        this.addPopup(this.popup);
    },

    deletePopup: function() {
        if (this.popup) {
            this.popup.destroy();
            this.popup = null;
        }
    }
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
        if (separator == undefined) {
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
        if (contentHTML != null) {
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

        if ((this.contentDiv != null) && (pageHTML != null)) {
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

                block.div.style.left = (l != null) ? l + 'px' : '';
                block.div.style.bottom = (b != null) ? b + 'px' : '';
                block.div.style.right = (r != null) ? r + 'px' : '';
                block.div.style.top = (t != null) ? t + 'px' : '';

                block.div.className = positionBlock.className;
            }

            this.contentDiv.style.left = this.padding.left + "px";
            this.contentDiv.style.top = this.padding.top + "px";
        }
    },
    updateSize: function() {
        if (this.map.opts.popupsOutside == true) {
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

// finish anonymous function.  Add olwidget to 'window'.
this.olwidget = olwidget;
})();
