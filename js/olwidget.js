/*
 *  Simplified open layers mapping widgets.
 * 
 *  olwidget.EditableMap(textarea_id, options) -- replace a textarea containing
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
        'collection': OpenLayers.Geometry.Collection
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
    yahoo: {
        map: function() {
            return new OpenLayers.Layer.Yahoo("Yahoo", 
                    {sphericalMercator: true, numZoomLevels: 20});
        }
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
     * Utility
     */
    deep_join_options: function(destination, source) {
        if (destination == undefined) {
            return source;
        }
        for (var a in source) {
            if (source[a] != undefined) {
                if (typeof(source[a]) == 'object' && source[a].constructor != Array) {
                    destination[a] = this.deep_join_options(destination[a], source[a]);
                } else {
                    destination[a] = source[a];
                }
            }
        }
        return destination;
    },
    in_array: function(arr, val) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === val) {
                return true;
            }
        }
        return false;
    }
};

/*
 *  Base olwidget map type.  Extends OpenLayers.Map
 */
olwidget.BaseMap = OpenLayers.Class(OpenLayers.Map, {
    initialize: function(map_div_id, options) {
        this.opts = this.init_options(options);
        this.init_map(map_div_id, this.opts);
    },
    /*
     * Extend the passed in options with defaults, and create unserialized
     * objects for serialized options (such as projections).
     */
    init_options: function(options) {
        var defaults = {
            map_options: {
                units: 'm',
                maxResolution: 156543.0339,
                projection: "EPSG:900913",
                displayProjection: "EPSG:4326",
                maxExtent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34]
            },
            map_div_class: '',
            map_div_style: {
                width: '600px',
                height: '400px'
            },
            name: 'data',
            layers: ['osm.mapnik'],
            default_lon: 0,
            default_lat: 0,
            default_zoom: 4,
            overlay_style: {
                fillColor: '#ff00ff',
                strokeColor: '#ff00ff',
                pointRadius: 6,
                fillOpacity: 0.5,
                strokeWidth: 2
            }
        };
        var opts = olwidget.deep_join_options(defaults, options);

        // construct objects for serialized options
        var me = opts.map_options.maxExtent;
        opts.map_options.maxExtent = new OpenLayers.Bounds(me[0], me[1], me[2], me[3]);
        opts.map_options.projection = new OpenLayers.Projection(opts.map_options.projection);
        opts.map_options.displayProjection = new OpenLayers.Projection(opts.map_options.displayProjection);
        opts.default_center = new OpenLayers.LonLat(opts.default_lon, opts.default_lat);
        opts.default_center.transform(opts.map_options.displayProjection,
                opts.map_options.projection);
        return opts;
    },
    /*
     * Initialize the OpenLayers Map instance and add layers.
     */
    init_map: function(map_div_id, opts) {
        var map_div = document.getElementById(map_div_id);
        OpenLayers.Util.extend(map_div.style, opts.map_div_style);
        map_div.className = opts.map_div_class;
        var layers = [];
        for (var i = 0; i < opts.layers.length; i++) {
            var parts = opts.layers[i].split(".");
            layers.push(olwidget[parts[0]][parts[1]]());
        }
        var styleMap = new OpenLayers.StyleMap({'default': new OpenLayers.Style(opts.overlay_style)});

        // Super constructor
        OpenLayers.Map.prototype.initialize.apply(this, [map_div.id, opts.map_options]);
        this.vector_layer = new OpenLayers.Layer.Vector(this.opts.name, { styleMap: styleMap });
        layers.push(this.vector_layer);
        this.addLayers(layers);
        this.set_default_center();
    },
    set_default_center: function() {
        this.setCenter(this.opts.default_center.clone(), this.opts.default_zoom);
    },
    clear_features: function() {
        this.vector_layer.removeFeatures(this.vector_layer.features);
        this.vector_layer.destroyFeatures();
    }
});

/*
 *  Map type that implements editable vectors.
 */
olwidget.EditableMap = OpenLayers.Class(olwidget.BaseMap, {
    initialize: function(textarea_id, options) {
        var defaults = {
            editable: true,
            geometry: 'point',
            hide_textarea: true,
            is_collection: false
        };
        options = olwidget.deep_join_options(defaults, options);

        // set up map div
        var map_div = document.createElement("div");
        map_div.id = textarea_id + "_map";
        this.textarea = document.getElementById(textarea_id);
        this.textarea.parentNode.insertBefore(map_div, this.textarea);

        // initialize map
        olwidget.BaseMap.prototype.initialize.apply(this, [map_div.id, options])

        if (this.opts.hide_textarea) {
            this.textarea.style.display = 'none';
        }

        this.init_wkt_and_center()
        this.init_controls();
    },
    init_wkt_and_center: function() {
        // Read any initial WKT from the text field.  We assume that the
        // WKT uses the projection given in "displayProjection", and ignore
        // any initial SRID.

        var wkt = this.textarea.value;
        if (wkt) {
            // After reading into geometry, immediately write back to 
            // WKT <textarea> as EWKT (so the SRID is included if it wasn't
            // before).
            var geom = olwidget.ewkt_to_feature(wkt);
            geom = olwidget.transform_vector(geom, this.displayProjection, this.projection);
            if (this.opts.is_collection) {
                this.vector_layer.addFeatures(geom);
            } else {
                this.vector_layer.addFeatures([geom]);
            }
            this.num_geom = this.vector_layer.features.length;
            
            // Set center
            if (this.opts.geometry == 'point' && !this.opts.is_collection) {
                this.setCenter(geom.geometry.getBounds().getCenterLonLat(), 
                        this.opts.default_zoom);
            } else {
                this.zoomToExtent(this.vector_layer.getDataExtent());
            }
        }
    },
    init_controls: function() {
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
            var panel = this.build_panel(this.vector_layer);
            this.addControl(panel);
            var select = new OpenLayers.Control.SelectFeature( this.vector_layer,
                    {toggle: true, clickout: true, hover: false});
            this.addControl(select);
            select.activate();
        }
        // Then add optional visual controls
        this.addControl(new OpenLayers.Control.MousePosition());
        this.addControl(new OpenLayers.Control.Scale());
        this.addControl(new OpenLayers.Control.LayerSwitcher());
    },
    clear_features: function() {
        olwidget.BaseMap.prototype.clear_features.apply(this);
        this.textarea.value = '';
    },
    build_panel: function(layer) {
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
                closured_this.clear_features();
            }
        });

        controls.push(del);
        panel.addControls(controls);
        return panel;
    },
    // Callback for openlayers "featureadded" 
    add_wkt: function(event) {
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
    },
    // Callback for openlayers "featuremodified" 
    modify_wkt: function(event) {
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
    },
    feature_to_textarea: function(feature) {
        if (this.opts.is_collection) {
            this.num_geom = feature.length;
        } else {
            this.num_geom = 1;
        }
        feature = olwidget.transform_vector(feature, 
                this.projection, this.displayProjection);
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
        this.textarea.value = olwidget.feature_to_ewkt(feature, this.displayProjection);
    }
});

/*
 *  olwidget.InfoMap -- map type supporting clickable vectors that raise popups.
 *  
 *  Usage: olwidget.Infomap(map_div_id, info_array, options)
 *
 *  arguments: 
 *     map_div_id: the DOM id of a div to replace with the map.
 *     info_array: An array of the form:
 *         [ ["WKT", "html"], ... ]
 *         where "WKT" represents the well-known text form of the geometry,
 *         and "html" represents the HTML content for the popup.
 *     options: An options object.  See distribution documentation for details.
 */
olwidget.InfoMap = OpenLayers.Class(olwidget.BaseMap, {
    initialize: function(map_div_id, info_array, options) {
        var infomap_defaults = {
            popups_outside: false,
            cluster: false,
            cluster_style: {
                pointRadius: "${radius}",
                strokeWidth: "${width}",
                label: "${label}",
                fontSize: "11px",
                fontFamily: "Helvetica, sans-serif",
                fontColor: "#ffffff"
            }
        };

        options = olwidget.deep_join_options(infomap_defaults, options);
        olwidget.BaseMap.prototype.initialize.apply(this, [map_div_id, options]);

        if (this.opts.cluster == true) {
            this.addClusterStrategy();
        }

        var features = [];
        for (var i = 0; i < info_array.length; i++) {
            var feature = olwidget.ewkt_to_feature(info_array[i][0]);
            feature = olwidget.transform_vector(feature, 
                this.displayProjection, this.projection);
            feature.attributes = { html: info_array[i][1] };
            features.push(feature);
        }
        this.vector_layer.addFeatures(features);
        this.zoomToExtent(this.vector_layer.getDataExtent());

        this.select = new OpenLayers.Control.SelectFeature(this.vector_layer);
        
        var infomap = this; // closure "this" for callbacks
        this.select.onSelect = function(feature) { infomap.createPopup(feature) };
        this.select.onUnselect = function(feature) { infomap.deletePopup(); };
        
        // Zooming changes clusters, so we must delete popup if we zoom.
        this.events.register("zoomend", this, function(event) { this.deletePopup(); });

        this.addControl(this.select);
        this.select.activate();
    },
    addClusterStrategy: function() {
        var style_context = {
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

        var default_style_opts = OpenLayers.Util.applyDefaults(
            OpenLayers.Util.applyDefaults({}, this.opts.cluster_style), 
            this.vector_layer.styleMap.styles['default'].defaultStyle);
        var select_style_opts = OpenLayers.Util.applyDefaults(
            OpenLayers.Util.applyDefaults({}, this.opts.cluster_style),
            this.vector_layer.styleMap.styles['select'].defaultStyle);

        var default_style = new OpenLayers.Style(default_style_opts, {context: style_context});
        var select_style = new OpenLayers.Style(select_style_opts, {context: style_context});
        this.removeLayer(this.vector_layer);
        this.vector_layer = new OpenLayers.Layer.Vector(this.opts.name, { 
            styleMap: new OpenLayers.StyleMap({ 'default': default_style, 'select': select_style }),
            strategies: [new OpenLayers.Strategy.Cluster()]
        });
        this.addLayer(this.vector_layer);
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
            if (this.opts.popups_outside) {
                this.div.appendChild(popupDiv);
                // store a reference to this function so we can unregister on removal
                this.popupMoveFunc = function(event) {
                    var px = this.getPixelFromLonLat(this.popup.lonlat);
                    popup.moveTo(px);
                }
                this.events.register("move", this, this.popupMoveFunc);
                this.popupMoveFunc();
            } else {
                this.layerContainerDiv.appendChild(popupDiv);
            }
        }
    },
    /**
     * Override parent to allow placement of popups outside viewport
     */
    removePopup: function(popup) {
        OpenLayers.Util.removeItem(this.popups, popup);
        if (popup.div) {
            try {
                if (this.opts.popups_outside) {
                    this.div.removeChild(popup.div);
                    this.events.unregister("move", this, this.popupMoveFunc);
                } else {
                    this.layerContainerDiv.removeChild(popup.div);
                }
            } catch (e) { }
        }
        popup.map = null;
    },

    /**
     * Build a paginated popup
     */
    createPopup: function(feature) {
        var popup_html = [];
        if (feature.cluster) {
            for (var i = 0; i < feature.cluster.length; i++) {
                popup_html.push(feature.cluster[i].attributes.html);
            }
        } else {
            popup_html.push(feature.attributes.html);
        }
        var infomap = this;
        this.popup = new olwidget.Popup(null,
            feature.geometry.getBounds().getCenterLonLat(),
            null, popup_html, null, true, 
            function() { infomap.select.unselect(feature) });
        if (this.opts.popups_outside) {
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
                    closeBoxCallback) {
        //this.imageSrc = "../img/triangles.png";
        // we don't use the default close box because we want it to appear in
        // the content div for easier CSS control.
        this.olwidgetCloseBox = closeBox;
        this.olwidgetCloseBoxCallback = closeBoxCallback;
        this.page = 0;
        OpenLayers.Popup.Framed.prototype.initialize.apply(this, [id, lonlat,
            contentSize, contentHTML, anchor, false, null]);
    },

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

            this.contentDiv.innerHTML = "";
            var containerDiv = document.createElement("div");
            containerDiv.className = 'olwidgetPopupContent';
            this.contentDiv.appendChild(containerDiv);

            if (this.olwidgetCloseBox) {
                closeDiv = document.createElement("div");
                closeDiv.className = "olwidgetPopupCloseBox";
                closeDiv.innerHTML = "close";
                closeDiv.onclick = function(event) { 
                    popup.olwidgetCloseBoxCallback.apply(popup, arguments); 
                }
                containerDiv.appendChild(closeDiv);
            }
            
            var pageDiv = document.createElement("div");
            pageDiv.innerHTML = pageHTML;
            pageDiv.className = "olwidgetPopupPage";
            containerDiv.appendChild(pageDiv);

            var popup = this; // for closures

            if (showPagination) {

                paginationDiv = document.createElement("div");
                paginationDiv.className = "olwidgetPopupPagination";
                var prev = document.createElement("div");
                prev.className = "olwidgetPaginationPrevious";
                prev.innerHTML = "prev";
                prev.onclick = function(event) { 
                    popup.page = (popup.page - 1 + popup.contentHTML.length) % 
                        popup.contentHTML.length;
                    popup.setContentHTML();
                    popup.map.events.triggerEvent("move");
                }

                var count = document.createElement("div");
                count.className = "olwidgetPaginationCount";
                count.innerHTML = (this.page + 1) + " of " + this.contentHTML.length;
                var next = document.createElement("div");
                next.className = "olwidgetPaginationNext";
                next.innerHTML = "next";
                next.onclick = function(event) {
                    popup.page = (popup.page + 1) % popup.contentHTML.length;
                    popup.setContentHTML();
                    popup.map.events.triggerEvent("move");
                }

                paginationDiv.appendChild(prev);
                paginationDiv.appendChild(count);
                paginationDiv.appendChild(next);
                containerDiv.appendChild(paginationDiv);

                var clearFloat = document.createElement("div");
                clearFloat.style.clear = "both";
                containerDiv.appendChild(clearFloat);
            }

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

    CLASS_NAME: "olwidget.Popup"
});


// finish anonymous function.  Add olwidget to 'window'.
this.olwidget = olwidget;
})();
