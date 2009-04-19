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
    feature_to_ewkt: function(feature, proj) {
        // convert "EPSG:" in projCode to 'SRID='
        var srid = 'SRID=' + proj.projCode.substring(5) + ';';
        return srid + this.wkt_format.write(feature);
    },
    strip_srid_re: new RegExp("^SRID=\\d+;(.+)", "i"),
    ewkt_to_feature: function(wkt) {
        var match = this.strip_srid_re.exec(wkt);
        if (match) {
            wkt = match[1];
        }
        return this.wkt_format.read(wkt);
    },
    multi_geometry_classes: {
        'linestring': OpenLayers.Geometry.MultiLineString,
        'point': OpenLayers.Geometry.MultiPoint,
        'polygon': OpenLayers.Geometry.MultiPolygon,
        'collection': OpenLayers.Geometry.Collection,
    },
    /*
     * Projection transformation
     */
    transform_vector: function(vector, from_proj, to_proj) {
        // Transform the projection of a feature vector or an array of feature
        // vectors (as used in a collection) between the given projections.
        if (from_proj.projCode == to_proj.projCode) {
            return vector;
        }
        var transformed;
        if (vector.constructor == Array) {
            transformed = [];
            for (var i = 0; i < vector.length; i++) {
                transformed.push(this.transform_vector(vector[i], from_proj, to_proj));
            }
        } else {
            var cloned = vector.geometry.clone();
            transformed = new OpenLayers.Feature.Vector(cloned.transform(from_proj, to_proj));
        }
        return transformed;
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
    ve: {
        map: function(type, type_name) {
            return new OpenLayers.Layer.VirtualEarth("Microsoft VE (" + type_name + ")", 
                {sphericalMercator: true, numZoomLevels: 20, type: type });
        },
        road: function() { return this.map(VEMapStyle.Road, "Road"); },
        shaded: function() { return this.map(VEMapStyle.Shaded, "Shaded"); },
        aerial: function() { return this.map(VEMapStyle.Aerial, "Aerial"); },
        hybrid: function() { return this.map(VEMapStyle.Hybrid, "Hybrid"); }
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
            width: '600px',
            height: '400px',
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

    Map: function(textarea_id, user_options) {
        if (user_options == undefined) {
            user_options = {};
        }
        /*
         * Constructor and initialization routines
         */
        this.init = function() {
            this.opts = new olwidget.defaults();

            // this order must be preserved.  Functions are separated for
            // semantic clarity.
            this.init_options();
            this.init_map();
            this.init_wkt_and_center();
            this.init_controls();
        }
        this.init_options = function() {
            // Initialize remaining options, and construct OL objects from JSON
            // map_options parameters.

            // deep copy map_options defaults
            this.opts.map_options = olwidget.join_objects(
                    this.opts.map_options, 
                    user_options.map_options);
            delete user_options.map_options;

            // deep copy overlay_style defaults
            this.opts.overlay_style = olwidget.join_objects(
                    OpenLayers.Feature.Vector.style["default"],
                    this.opts.overlay_style,
                    user_options.overlay_style
            );
            // Increase stroke width for linestrings, unless set by user
            if (user_options.geometry == "linestring" && (!user_options.overlay_style || 
                    user_options.overlay_style.strokeWidth == undefined)) {
                this.opts.overlay_style.strokeWidth = 3;
            }
            delete user_options.overlay_style;
            
            // Get the rest of the user options
            for (var opt in user_options) {
                this.opts[opt] = user_options[opt];
            }
            if (this.opts.name == undefined) {
                this.opts.name = "";
            }
            var me = this.opts.map_options.maxExtent;
            this.opts.map_options.maxExtent = new OpenLayers.Bounds(me[0], me[1], me[2], me[3]);
            this.opts.map_options.projection = new OpenLayers.Projection(this.opts.map_options.projection);
            this.opts.map_options.displayProjection = new OpenLayers.Projection(this.opts.map_options.displayProjection);
            this.opts.default_center = new OpenLayers.LonLat(this.opts.default_lon, this.opts.default_lat);
            this.opts.default_center.transform(this.opts.map_options.displayProjection, 
                this.opts.map_options.projection);
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
            // Read any initial WKT from the text field.  We assume that the
            // WKT uses the projection given in "displayProjection", and ignore
            // any initial SRID.

            var wkt = this.textarea.value;
            if (wkt) {
                // After reading into geometry, immediately write back to 
                // WKT <textarea> as EWKT (so the SRID is included if it wasn't
                // before).
                var geom = olwidget.ewkt_to_feature(wkt);
                geom = olwidget.transform_vector(geom, this.map.displayProjection, this.map.projection);
                if (this.opts.is_collection) {
                    this.vector_layer.addFeatures(geom);
                } else {
                    this.vector_layer.addFeatures([geom]);
                }
                this.num_geom = this.vector_layer.features.length;
                
                // Set center
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
        }
        this.buildPanel = function(layer) {
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
                var draw_control;
                if (geometries[i] == 'linestring') {
                    draw_control = new OpenLayers.Control.DrawFeature(layer, 
                        OpenLayers.Handler.Path, 
                        {'displayClass': 'olControlDrawFeaturePath'});
                } else if (geometries[i] == 'polygon') {
                    draw_control = new OpenLayers.Control.DrawFeature(layer,
                        OpenLayers.Handler.Polygon,
                        {'displayClass': 'olControlDrawFeaturePolygon'});
                } else if (geometries[i] == 'point') {
                    draw_control = new OpenLayers.Control.DrawFeature(layer,
                        OpenLayers.Handler.Point,
                        {'displayClass': 'olControlDrawFeaturePoint'});
                }
                controls.push(draw_control);
            }
                
            // Modify feature control
            var mod = new OpenLayers.Control.ModifyFeature(layer);
            controls.push(mod);

            // Clear all control
            var closured_this = this;
            var del = new OpenLayers.Control.Button({
                displayClass: 'olControlClearFeatures', 
                trigger: function() {
                    closured_this.clearFeatures();
                }
            });

            controls.push(del);
            panel.addControls(controls);
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
            feature = olwidget.transform_vector(feature, 
                    this.map.projection, this.map.displayProjection);
            if (this.opts.is_collection) {
                // Convert to multi-geometry types if we are a collection.
                // Passing arrays to the WKT formatter results in a
                // "GEOMETRYCOLLECTION" type, but if we have only one geometry,
                // we should use a "MULTI<geometry>" type.
                if (this.opts.geometry.constructor != Array) {
                    var geoms = [];
                    for (var i = 0; i < feature.length; i++) {
                        geoms.push(feature[i].geometry);
                    }
                    var GeoClass = olwidget.multi_geometry_classes[this.opts.geometry]; 
                    feature = new OpenLayers.Feature.Vector(new GeoClass(geoms));
                } 
            }
            this.textarea.value = olwidget.feature_to_ewkt(feature, this.map.displayProjection);
        }
        // Call constructor
        this.init();
    },
    /*
     * Utility
     */
    join_objects: function() {
        // Create a new object which copies (one-level deep) the properties of
        // the objects passed as arguments.  Argument order determines priority;
        // later arguments override values of earlier arguments.
        var obj = {}
        for (var i = 0; i < arguments.length; i++) {
            for (var p in arguments[i]) {
                obj[p] = arguments[i][p];
            }
        }
        return obj;
    },
}
