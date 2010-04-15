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
    deepJoinOptions: function(destination, source) {
        if (destination === undefined) {
            destination = {};
        }
        if (source) {
            for (var a in source) {
                if (source[a] !== undefined) {
                    if (typeof(source[a]) == 'object' && source[a].constructor != Array) {
                        destination[a] = this.deepJoinOptions(destination[a], source[a]);
                    } else {
                        destination[a] = source[a];
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

        if (opts.vectorLayers) {
            this.vectorLayers = opts.vectorLayers;
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
    },
    initCenter: function() {
        // Zooming to data extent for multiple vector layers is complimacated.  TODO
        this.setCenter(this.opts.default_center, this.opts.defaultZoom);
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
        OpenLayers.Layer.Vector.prototype.initialize.apply(this, [this.opts.name, layerOpts]);
    },
    setMap: function(map) {
        OpenLayers.Layer.Vector.prototype.setMap.apply(this, [map]);
        if (map.CLASS_NAME == "olwidget.Map") {
            var styleOpts = {};
            olwidget.deepJoinOptions(styleOpts, map.opts.overlayStyle);
            olwidget.deepJoinOptions(styleOpts, this.opts.overlayStyle);

            var selectStyleOpts = {};
            olwidget.deepJoinOptions(selectStyleOpts, map.opts.selectOverlayStyle);
            olwidget.deepJoinOptions(selectStyleOpts, this.opts.selectOverlayStyle);

            var styleContext = {};
            olwidget.deepJoinOptions(styleContext, map.opts.overlayStyleContext);
            olwidget.deepJoinOptions(styleContext, this.opts.overlayStyleContext);

            this.styleMap = new OpenLayers.StyleMap({
                default: new OpenLayers.Style(styleOpts, {context: styleContext}),
                select: new OpenLayers.Style(selectStyleOpts, {context: styleContext})
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
            options.overlayStyle = olwidget.deepJoinOptions({
                    pointRadius: "${radius}",
                    strokeWidth: "${width}",
                    label: "${label}",
                    labelSelect: true,
                    fontSize: "11px",
                    fontFamily: "Helvetica, sans-serif",
                    fontColor: "#ffffff"
                }, options.overlayStyle);
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
                        return (feature.cluster && feature.cluster.length > 1) ? feature.cluster.length : '';
                    }
                }, options.overlayStyleContext);
        }
        olwidget.BaseVectorLayer.prototype.initialize.apply(this, [options]);
        this.info = info;
    },
    afterAdd: function() {
        OpenLayers.Layer.Vector.prototype.afterAdd.apply(this);
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
                        feature[k].style = OpenLayers.Util.applyDefaults(htmlInfo.style, this.opts.overlayStyle);
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
    initialize: function(textareaId, options) {
        options = olwidget.deepJoinOptions({
            editable: true,
            geometry: 'point',
            hideTextarea: true,
            isCollection: false
        }, options);

        olwidget.BaseVectorLayer.prototype.initialize.apply(this, [options]);
    },
    afterAdd: function() {
        OpenLayers.Layer.Vector.prototype.afterAdd.apply(this);
        this.map.addControl(new OpenLayers.Control.MousePosition());
    },
    CLASS_NAME: "olwidget.EditableLayer"
});


olwidget.EditableLayerSwitcher = OpenLayers.Class(OpenLayers.Control, {
    initialize: function(options) {
        

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
