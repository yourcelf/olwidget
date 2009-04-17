/*

olwidget -- replace textarea containing (E)WKT geometry with an editable map.

Usage:

    new olwidget.Map("textarea_id")

See included examples and documentation for more info.

*/

var olwidget = {
    /*
     * WKT transformations
     */
    wkt_format: new OpenLayers.Format.WKT(),
    display_projection: new OpenLayers.Projection("EPSG:4326"),
    projection: new OpenLayers.Projection("EPSG:900913"),
    feature_to_ewkt: function(feature) {
        return 'SRID=900913;' + this.wkt_format.write(feature);
    },
    ewkt_to_wkt_re: new RegExp("^SRID=\\d+;(.+)", "i"),
    ewkt_to_wkt: function(wkt) {
        // OpenLayers cannot handle EWKT -- this converts to WKT (strips SRID)
        var match = this.ewkt_to_wkt_re.exec(wkt);
        if (match) {
            wkt = match[1];
        }
        return this.wkt_format.read(wkt);
    },
    transform_lon_lat: function(lon, lat) {
        return (new OpenLayers.LonLat(lon, lat)).transform(
                this.display_projection, 
                this.projection);
    },
    /*
     * Constructors for layers
     */
    osm: {
        mapnik: function() {
            return new OpenLayers.Layer.OSM.Mapnik("OpenStreetMap (Mapnik)", {numZoomLevels: 20});
        },
        osmarender: function() {
            return new OpenLayers.Layer.OSM.Osmarender('OpenStreetMap (Osmarender)');
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
    yahoo: function() {
            return new OpenLayers.Layer.Yahoo("Yahoo", 
                    {sphericalMercator: true, numZoomLevels: 20});
    },
    microsoft: {
        ve: function() {
            return new OpenLayers.Layer.VirtualEarth("Microsoft VE", 
                    {sphericalMercator: true, numZoomLevels: 20});
        }
    },
    /*
     * Default settings for olwidget.Map object.  Override with object passed
     * to Map constructor.
     */
    defaults: function() {
        this.map_options = {
            units: 'm',
            maxResolution: 156543.0339,
            projection: "EPSG:900913",
            displayProjection: "EPSG:4326",
            maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34]
        };
        this.editable = true;
        this.layers = ['osm.mapnik'];   
        this.geometry = 'point';
        this.is_collection = false;
        this.default_lon = 0;
        this.default_lat = 0;
        this.default_zoom = 4;
        this.hide_textarea = true;
        this.map_style = {
            width: '400px',
            height: '300px',
        };
        this.map_class = '';
        // elements for OpenLayers.Style
        this.overlay_style = {};
        // OL default orange is a wee tough to see on osm.mapnik; we default to
        // magenta instead, with a higher opacity.
        this.overlay_style.fillColor = "#ff00ff";
        this.overlay_style.strokeColor = "#ff00ff";
        this.overlay_style.pointRadius = 6;
        this.overlay_style.fillOpacity = 0.5;
    },
    /*
     * Map object
     */

    Map: function(textarea_id, options) {
        if (options == undefined) {
            options = {};
        }
        /*
         * Constructor and initialization routines
         */
        this.init = function() {
            this.opts = new olwidget.defaults();

            // this order must be preserved.  Functions are separated for
            // semantic clarity.
            this.init_style();
            this.init_options();
            this.init_map();
            this.init_wkt_and_center();
            this.init_controls();
        }
        this.init_style = function() {
            // The parameters for map styling require special treatment,
            // because all required OpenLayers attributes must be provided, or
            // the geometries won't show up.  Copy OpenLayers default overlay
            // style, to get all required attributes, then override with 
            // olwidget defaults, then user provided styling, if any.

            var overlay_style = {};
            for (var p in OpenLayers.Feature.Vector.style["default"]) {
                overlay_style[p] = OpenLayers.Feature.Vector.style["default"][p];
            }
            // override with olwidget defaults
            for (var p in this.opts.overlay_style) {
                overlay_style[p] = this.opts.overlay_style[p];
            }
            // Increase stroke width for linestrings, unless set by user
            if (options.geometry == "linestring" && (!options.overlay_style || 
                    options.overlay_style.strokeWidth == undefined)) {
                overlay_style.strokeWidth = 3;
            }
            
            // override remaining styles with user overlay_style
            if (options.overlay_style) {
                for (var p in options.overlay_style) {
                    overlay_style[p] = options.overlay_style[p];
                }
                // prevent us from overriding below.
                delete options['overlay_style'];
            }
            this.opts.overlay_style = overlay_style;
        }
        this.init_options = function() {
            // Initialize remaining options, and construct OL objects from JSON
            // map_options parameters.

            // Get the rest of the user options
            for (var opt in options) {
                this.opts[opt] = options[opt];
            }
            if (this.opts.name == undefined) {
                this.opts.name = textarea_id;
            }
            // Construct OL objects from JSON map_options parameters
            // Copy to ensure we aren't overriding references to defaults.
            var map_options = {};
            for (var p in this.opts.map_options) {
                map_options[p] = this.opts.map_options[p];
            }
            var me = map_options.maxExtent;
            map_options.maxExtent = new OpenLayers.Bounds(me[0], me[1], me[2], me[3]);
            map_options.projection = new OpenLayers.Projection(map_options.projection);
            map_options.displayProjection = new OpenLayers.Projection(map_options.displayProjection);
            this.opts.map_options = map_options;
            this.opts.default_center = olwidget.transform_lon_lat( this.opts.default_lon,
                    this.opts.default_lat);
            console.log(this.opts.default_center);
        }
        this.init_map = function() {
            // Create the map div, and attach it to an OpenLayers map with all
            // required parameters.
             
            // create map div
            this.textarea = document.getElementById(textarea_id);
            if (this.opts.hide_textarea) {
                this.textarea.style.display = 'none';
            }
            this.map_div = document.createElement('div');
            this.map_div.id = textarea_id + "_map";
            for (k in this.opts.map_style) {
                this.map_div.style[k] = this.opts.map_style[k];
            }
            this.map_div.className = this.opts.map_class;
            this.textarea.parentNode.insertBefore(this.map_div, this.textarea);

            // create map
            this.map = new OpenLayers.Map(this.map_div, this.opts.map_options);
            var layers = [];
            for (var i = 0; i < this.opts.layers.length; i++) {
                layers.push(eval("olwidget." + this.opts.layers[i] + "();"))
            }
            
            // create vector layer
            var styleOpts = {}
            for (style in this.opts.overlay_style) {
                styleOpts[style] = this.opts.overlay_style[style];
            }
            var styleMap = new OpenLayers.StyleMap({'default': new OpenLayers.Style(styleOpts)});
            this.vector_layer = new OpenLayers.Layer.Vector(this.opts.name, { styleMap: styleMap });
            layers.push(this.vector_layer);
            this.map.addLayers(layers);
        }
        this.init_wkt_and_center = function() {
            // Read any initial WKT from the text field
            var wkt = this.textarea.value;
            if (wkt) {
                // After reading into geometry, immediately write back to 
                // WKT <textarea> as EWKT (so the SRID is included if it wasn't
                // before).
                var geom = olwidget.ewkt_to_wkt(wkt);
                this.feature_to_textarea(geom);

                if (this.opts.is_collection) {
                    this.vector_layer.addFeatures(geom);
                } else {
                    this.vector_layer.addFeatures([geom]);
                }
                if (this.opts.geometry == 'point' && !this.opts.is_collection) {
                    this.map.setCenter(geom.geometry.getBounds().getCenterLonLat(), 
                            this.opts.default_zoom);
                } else {
                    this.map.zoomToExtent(this.vector_layer.getDataExtent());
                }
            } else {
                this.setDefaultCenter();
            }
        }
        this.init_controls = function() {
            // Initialize controls for editing geometries, navigating, and map data.

            // This allows editing of the geographic fields -- the modified WKT is
            // written back to the content field (as EWKT)
            if (this.opts.editable) {
                var closured_this = this;
                this.vector_layer.events.on({
                    "featuremodified" : function(event) { closured_this.modify_wkt(event); },
                    "featureadded": function(event) { closured_this.add_wkt(event); }
                });

                // Map controls:
                // Add geometry specific panel of toolbar controls
                var panel = this.buildPanel(this.vector_layer);
                this.map.addControl(panel);
                var select = new OpenLayers.Control.SelectFeature( this.vector_layer, 
                        {toggle: true, clickout: true, hover: false});
                this.map.addControl(select);
                select.activate();
                //if (wkt) {
                //    this.enableEditing();
                //} else {
                //    this.enableDrawing();
                //}
            }
            // Then add optional visual controls
            this.map.addControl(new OpenLayers.Control.MousePosition());
            this.map.addControl(new OpenLayers.Control.Scale());
            this.map.addControl(new OpenLayers.Control.LayerSwitcher());
        }


        /*
         * Map methods
         */
        this.setDefaultCenter = function() {
            this.map.setCenter(this.opts.default_center.clone(), this.opts.default_zoom);
        }
        this.clearFeatures = function() {
            this.vector_layer.removeFeatures(this.vector_layer.features);
            this.vector_layer.destroyFeatures();
            this.textarea.value = '';
            this.setDefaultCenter();
        }
        this.enableDrawing = function() {
            this.map.getControlsByClass('OpenLayers.Control.DrawFeature')[0].activate();
        }
        this.enableEditing = function() {
            this.map.getControlsByClass('OpenLayers.Control.ModifyFeature')[0].activate();
        }
        this.buildPanel = function(layer) {
            var panel = new OpenLayers.Control.Panel({displayClass: 'olControlEditingToolbar'});
            var nav = new OpenLayers.Control.Navigation();
            var draw_control;
            if (this.opts.geometry == 'linestring') {
                draw_control = new OpenLayers.Control.DrawFeature(layer, 
                    OpenLayers.Handler.Path, 
                    {'displayClass': 'olControlDrawFeaturePath'});
            } else if (this.opts.geometry == 'polygon') {
                draw_control = new OpenLayers.Control.DrawFeature(layer,
                    OpenLayers.Handler.Polygon,
                    {'displayClass': 'olControlDrawFeaturePolygon'});
            } else if (this.opts.geometry == 'point') {
                draw_control = new OpenLayers.Control.DrawFeature(layer,
                    OpenLayers.Handler.Point,
                    {'displayClass': 'olControlDrawFeaturePoint'});
            }
            var mod = new OpenLayers.Control.ModifyFeature(layer);

            var closured_this = this;
            var del = new OpenLayers.Control.Button({
                displayClass: 'olControlClearFeatures', 
                trigger: function() {
                    closured_this.clearFeatures();
                }
            });

            panel.addControls([nav, draw_control, mod, del]);
            return panel;
        }
        // Callback for openlayers "featureadded" 
        this.add_wkt = function(event) {
            // This function will sync the contents of the `vector` layer with the
            // WKT in the text field.
            if (this.opts.is_collection) {
                this.feature_to_textarea(this.vector_layer.features);
            } else {
                // Make sure to remove any previously added features.
                if (this.vector_layer.features.length > 1) {
                    old_feats = [this.vector_layer.features[0]];
                    this.vector_layer.removeFeatures(old_feats);
                    this.vector_layer.destroyFeatures(old_feats);
                }
                this.feature_to_textarea(event.feature);
            }
        }
        // Callback for openlayers "featuremodified" 
        this.modify_wkt = function(event) {
            if (this.opts.is_collection){
                // OpenLayers adds points around the modified feature that we want to strip.
                // So only take the features up to "num_geom", the number of features counted
                // when we last added.
                var feat = [];
                for (var i = 0; i < this.num_geom; i++) {
                    feat.push(this.vector_layer.features[i].clone());
                }
                this.feature_to_textarea(feat)
            } else {
                this.feature_to_textarea(event.feature);
            }
        }
        this.feature_to_textarea = function(feature) {
            if (this.opts.is_collection) {
                this.num_geom = feature.length;
            } else {
                this.num_geom = 1;
            }
            this.textarea.value = olwidget.feature_to_ewkt(feature);
        }
        // Call constructor
        this.init();
    }
}
