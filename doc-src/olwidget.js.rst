.. _olwidget.js:

olwidget.js documentation
=========================

Introduction
~~~~~~~~~~~~

``olwidget.js`` is a standalone javascript library to make editing and
displaying geometries and information on OpenLayers maps easier.  The library
defines two main types of objects -- map types and vector layer types.  Maps
may contain one or more vector layer, which may be editable, or may contain
features which produce popup bubbles when clicked.

Installation
~~~~~~~~~~~~

Copy or link the olwidget media directory (which contains ``js/``, ``css/``,
and ``img/`` directories into your website's path.  The three directories
should share a parent.

Examples
~~~~~~~~

``olwidget`` supports multiple geometry types, any number of maps per page,
multiple map providers, and much more (see options_ below).  A simple
example of how to use it:

.. code-block:: html

    <html>
        <head>
            <script type='text/javascript' src='http://openlayers.org/api/2.9/OpenLayers.js'></script>
            <script type='text/javascript' src='http://openstreetmap.org/openlayers/OpenStreetMap.js'></script>
            <script type='text/javascript' src='olwidget/js/olwidget.js'></script>
            <link rel='stylesheet' href='olwidget/css/olwidget.css' />
        </head>
        <body>
            <!-- a map with an editable overlay -->
            <textarea id='my_point'>SRID=4326;POINT(0 0)</textarea>
            <script type='text/javascript'>
                new olwidget.EditableMap('my_point', {name: 'My Point'});
            </script>

            <!-- a map displaying an info popup over a geometry -->
            <div id='map'></div>
            <script type='text/javascript'>
                new olwidget.InfoMap('map', [
                    ['SRID=4326;POINT(0 0)', "<p>Here at the zero point!</p>"]
                ]);
            </script>
        </body>
    </html>


See :ref:`examples` for several examples of olwidget in action.

Overview
~~~~~~~~

Map types
---------

* olwidget.Map_ is the primary map class.  It extends `OpenLayers.Map
  <http://dev.openlayers.org/docs/files/OpenLayers/Map-js.html>`_, and provides
  the infrastructure for handling olwidget.EditableLayer_ and
  olwidget.InfoLayer_ layer types.

* olwidget.EditableMap_ is a convenience class that defines a map with a single
  olwidget.EditableLayer_ layer.

* olwidget.InfoMap_ is a convenience class that defines a map with a single
  olwidget.InfoLayer_ layer.

Layer types
-----------
* olwidget.EditableLayer_ is a layer class that turns a textarea containing
  `WKT <http://en.wikipedia.org/wiki/Well-known_text>`_ geometry into vector
  data for a map, and provides controls for editing the geometries.  The layer
  writes EWKT geometry (WKT with explicit SRID) to the textarea for later
  processing in forms.  This is useful for anywhere you need a form to enter or
  edit precise geographic geometries for storage in a GIS database such as
  `PostGIS <http://postgis.refractions.net/>`_.

* olwidget.InfoLayer_ is a layer class that displays popup info-windows over
  geometries when clicked.  The popups are stylable using CSS, work with
  clustered as well as non-clustered points, and can be shown both inside and
  outside the Map's "viewport".


Maps
~~~~

olwidget.Map
------------
``olwidget.Map`` is the primary map type used by olwidget; the other types are
just convenience wrappers of this type.  Constructor:

.. code-block:: javascript

    new olwidget.Map(mapDivID, vectorLayers, options)

``mapDivId``
    The DOM id of a div in which to create the map.
``vectorLayers``
    An array of vector layers (olwidget.EditableLayer_ or olwidget.InfoLayer_
    instances).
``options``
    An object containing options_ to customize the look and feel of the map.

Example
'''''''

.. _`Map Example`:

.. code-block:: html

    <div id="map"></div>
    <script type='text/javascript'>
        new olwidget.Map("map", [
            new olwidget.InfoLayer([["POINT (0 0)", "the origin"]], {
                name: "Origin"
            }),
            new olwidget.InfoLayer([["POINT (1 0)", "one degree off"]], {
                name: "A little off"
            })
        ], {
            layers: ['osm.mapnik', 'osm.osmarender']
        });
    </script>


olwidget.InfoMap
----------------
``olwidget.InfoMap`` is a convenience type for defining a map with one info
layer.

Constructor:

.. code-block:: javascript

    new olwidget.InfoMap(mapDivId, info, options);

``mapDivId``
    The DOM id of a div in which to create the map
``info``
    An array of geometry and HTML pairs for popups.  See olwidget.InfoLayer_
    for more details.
``options``
    An object containing options_ customizing the map.

The following produce identical maps:

.. code-block:: javascript

    new olwidget.InfoMap(mapDivId, info, options);
    new olwidget.Map(mapDivId, [new olwidget.InfoLayer(info)], options);

olwidget.EditableMap
--------------------
``olwidget.EditableMap`` is a convenience type for defining a map with one
editable layer.

Constructor:

.. code-block:: javascript

    new olwidget.EditableMap(textareaId, options);

``textareaId``
    The DOM id of a textarea which contains WKT data for this map.  A div
    containing the map wiill be created dynamically and inserted before this
    textarea.
``options``
    An object containing options_ customizing the map.

The following produce identical maps, with the exception that the
``olwidget.EditableMap`` creates a ``div`` to contain the map dynamically,
where ``olwidget.Map`` does not.

.. code-block:: javascript

    new olwidget.EditableMap(textareaId, options);
    new olwidget.Map(mapDivId, [new olwidget.EditableLayer(textareaId)], options); 

Layers
~~~~~~

olwidget.EditableLayer
----------------------

``olwidget.EditableLayer`` is a layer type which reads and writes WKT geometry data to a textarea.  Constructor:

.. code-block:: javascript

    new olwidget.EditableLayer(textareaId, options);

``textareaId``
    The DOM id of a textarea which contains WKT data for this layer.      
``options``
    An object containing options_ customizing the layer.

Example
'''''''
Create a map that contains two editable layers:

.. code-block:: html

    <div id='map'></div>
    <textarea id='geom1'>POINT (0 0)</textarea>
    <textarea id='geom2'>POINT (1 1)</textarea>
    <script type='text/javascript'>
        new olwidget.Map('map', [
            new olwidget.EditableLayer('geom1', {'name': "The origin"}),
            new olwidget.EditableLayer('geom2', {'name': "A bit off"})
        ], { 'overlayStyle': { 'fillColor': "#ff0000" }});
    </script>

olwidget.InfoLayer
------------------
``olwidget.InfoLayer`` is a layer type which displays geometries with clickable
popups containing HTML.  Constructor:

.. code-block:: javascript

    new olwidget.InfoLayer(info, options);

``info``
    An array of ``[geom, html]`` pairs, where ``geom`` is a WKT geometry, and
    ``html`` is a string containing HTML to display in the popup.  ``html`` can
    also be an object containing style information for the particular geometry,
    with the following format::

        {
            'html': "An html string"
            'style': {
                // style properties for this geometry
            }
        }

``options``
    An object with options_ for the display of this layer.

Example
'''''''
The following is an example ``olwidget.Map`` with ``olwidget.InfoLayer``
instances using geometry-specific styles, layer-specific styles, and map styles
together.  See `this example <examples/multi_style_inheritance.html>`_ for a
full example of style inheritance:

.. code-block:: html

    <div id='map'></div>
    <script type='text/javascript'>
        new olwidget.Map('map', 
            [new InfoLayer([["POINT (0 0)", { html: "The origin", 
                                              style: {
                                                  'fillColor': "#00FF00"
                                              }],
                            ["POINT (0 1)", { html: "A degree off",
                                              style: {
                                                  'fillColor': "#FF0000"
                                              }]],
                           { // Layer-wide options
                                'overlayStyle': {
                                    'strokeColor': "#0000FF"
                                }
                           }),
            ], { // Map-wide options
                   'overlayStyle': {
                       'strokeWidth': 6
                   }
        })
    </script>

.. _options:

Options
~~~~~~~

Maps are both important user interface elements, and powerful persuasive data
displays.  Consequently, it is necessary to support a high degree of
customization around the appearance of a map.  OLWidget does this primarily
through the use of OpenLayers' style framework.  All of OLWidget's types accept
an optional ``options`` dict which controls the appearance of the map and
layers.

Layers inherit their styles from both their default parameters, and from those
specified for a map::

    default options < map options < layer options

This allows the map to hold defaults for all layers, but let the layers
override them.  See `this example <examples/multi_style_inheritance.html>`_ for
a full example of style inheritance with multi-layer maps.  

The following is a list of all available options.  Some are specific to map
display, and others specific to layer display.

General map display
-------------------
``layers`` (Array; default ``['osm.mapnik']``) 
    A list of map base layers to include.  Choices include ``'osm.mapnik'``,
    ``'osm.osmarender'``, ``'google.streets'``, ``'google.physical'``,
    ``'google.satellite'``, ``'google.hybrid'``, ``'ve.road'``,
    ``'ve.shaded'``, ``'ve.aerial'``, ``'ve.hybrid'``, ``'wms.map'``,
    ``'wms.nasa'``, ``'yahoo.map'``, and ``'cloudmade.<num>'`` (where ``<num>``
    is the number for a cloudmade style).  A blank map can be obtained using
    ``'wms.blank'``.

    Other providers can be added by choosing ``custom.<name>`` where
    ``<name>`` corresponds to a property that has been registered with
    ``olwidget.registerCustomBaseLayers()``.  The property must have a
    ``class`` property corresponding to an OpenLayers layer subclass
    and an ``args`` property that is a list of arguments to pass to that
    constructor.  For example::
    
     olwidget.registerCustomBaseLayers({
        'opengeo_osm':  // to use this, your olwidget layers would include ['custom.opengeo_osm']
            {"class": "WMS",  // The OpenLayers.Layer subclass to use.
             "args": [  // These are passed as arguments to the constructor.
                "OpenStreetMap (OpenGeo)",
                "http://maps.opengeo.org/geowebcache/service/wms",
                {"layers": "openstreetmap",
                 "format": "image/png",
                 "bgcolor": "#A1BDC4",
                 },
                {"wrapDateLine": true
                 },
                ],
             }
     })

    Additional options and layers can also be manually added
    using the normal OpenLayers apis (see `this provider example
    <examples/other_providers.html>`_).

    You must also include whatever javascript sources are needed to use these
    (e.g.  maps.google.com or openstreetmap.org apis).  For CloudMade maps, use
    the included ``cloudmade.js`` file, and append the API key as the hash
    portion of the URL, for example:

    .. code-block:: html

        <!-- API key for http://olwidget.org -->
        <script src="js/cloudmade.js#06c005818e31487cb270b0bdfc71e115" type="text/javascript"></script>

    See the `other providers <examples/other_providers.html>`_ for a full
    example of all built-in layer providers.
``defaultLat`` (float; default 0)
    Latitude for the center point of the map.  For ``olwidget.EditableMap``,
    this is only used if there is no geometry (e.g. the textarea is empty).
``defaultLon`` (float; default 0)
    Longitude for the center point of the map.  For ``olwidget.EditableMap``,
    this is only used if there is no geometry (e.g. the textarea is empty).
``defaultZoom`` (int; default ``4``) 
    The zoom level to use on the map.  For ``olwidget.EditableMap``,
    this is only used if there is no geometry (e.g. the textarea is empty).
``zoomToDataExtent`` (boolean; default ``true``) 
    If ``true``, the map will zoom to the extent of its vector data instead of
    ``defaultZoom``, ``defaultLat``, and ``defaultLon``.  If no vector data is
    present, the map will use the defaults.
``mapDivClass`` (string; default ``''``) 
    A CSS class name to add to the div which is created to contain the map.
``mapDivStyle`` (object, default ``{width: '600px', height: '400px'}``)  
    A set of CSS style definitions to apply to the div which is created to
    contain the map.
``mapOptions`` (object) 
    An object containing options for the OpenLayers Map constructor.
    Properties may include:

    * ``units``: (string) default ``'m'`` (meters)
    * ``projection``: (string) default ``"EPSG:900913"`` (the projection used
      by Google, OSM, Yahoo, and VirtualEarth -- See `Projections`_ below).
    * ``displayProjection``: (string) default ``"EPSG:4326"`` (the latitude
      and longitude we're all familiar with -- See `Projections`_ below).
    * ``maxResolution``: (float) default ``156543.0339``.  Value should be
      expressed in the projection specified in ``projection``.
    * ``maxExtent``: default ``[-20037508.34, -20037508.34, 20037508.34,
      20037508.34]``.  Values should be expressed in the projection specified
      in ``projection``.
    * ``controls``: (array of strings) default ``['LayerSwitcher',
      'Navigation', 'PanZoom', 'Attribution']``
      The strings should be `class names for map controls
      <http://dev.openlayers.org/releases/OpenLayers-2.8/doc/apidocs/files/OpenLayers/Control-js.html>`_,
      which will be instantiated without arguments.

    Any additional parameters available to the `OpenLayers.Map.Constructor
    <http://dev.openlayers.org/docs/files/OpenLayers/Map-js.html#OpenLayers.Map.Constructor>`_
    may be included, and will be passed directly.
``popupsOutside`` (boolean; default ``false``)
    If false, popups are contained within the map's viewport.  If true, popups
    may expand outside the map's viewport.
``popupDirection`` (string; default ``auto``)
    The direction from the clicked geometry that a popup will extend.  This may
    be one of:

    * ``tr`` -- top right
    * ``tl`` -- top left
    * ``br`` -- bottom right
    * ``bl`` -- bottom left
    * ``auto`` -- automatically choose direction.

Layer options
-------------

``name`` (string; defaults to ``"data"``) 
    The name of the overlay layer for the map (shown in the layer switcher).
``overlayStyle`` (object) 
    An object with style definitions for the geometry overlays.  See 
    `OpenLayers styling <http://docs.openlayers.org/library/feature_styling.html>`_.
``overlayStyleContext`` (object)
    An object with functions which expand ``'${var}'`` symbolizers in style
    definitions.  See `OpenLayers Style context <http://dev.openlayers.org/docs/files/OpenLayers/Style-js.html#OpenLayers.Style.context>`_.  

Options for editable layers
---------------------------

``geometry`` (Array or string; defaults to ``'point'``) 
    The geometry to use for editing this layer.  Choices are ``'point'``,
    ``'linestring'``, and ``'polygon'``.  To allow multiple geometries, use an
    array such as ``['point', 'linestring', 'polygon']``.
``isCollection`` (boolean, default ``false``) 
    If true, allows multiple points/lines/polygons.
``hideTextarea`` (boolean; default ``true``) 
    Hides the textarea if true.  
``editable`` (boolean, default ``true``) 
    If true, allows editing of geometries.

Options for info layers
-----------------------

``cluster`` (boolean; default ``false``)
    If true, points will be clustered using the
    `OpenLayers.Strategy.ClusterStrategy
    <http://dev.openlayers.org/releases/OpenLayers-2.7/doc/apidocs/files/OpenLayers/Strategy/Cluster-js.html>`_.
    See `this cluster example <examples/info_cluster.html>`_.
``clusterDisplay`` (string; default ``'paginate'``)
    The way HTML from clustered points is handled:

    * ``'list'`` -- constructs an unordered list of contents
    * ``'paginate'`` -- adds a pagination control to the popup to click through
      the different points' HTML.


Extras
~~~~~~

A couple of internal ``olwidget`` types might be useful outside ``olwidget`` as
well.

olwidget.Popup
--------------
``olwidget`` defines its own Popup type, which it uses for display of popups in
``InfoLayer`` instances.  The popup differs from default `OpenLayers popup
types <http://dev.openlayers.org/docs/files/OpenLayers/Popup-js.html>`_ in a
few important ways: first, it is styled primarily using CSS rather than
hard-coded javascript.  Second, it will paginate data if it is passed an array
as the ``contentHTML`` parameter.  Third, it can be placed outside the map's
viewport as well as inside it.  The popup's CSS class hierarchy is as follows:

.. code-block:: html

    <div> <!-- container div for popup -->
        <div class='olPopupContent'> <!-- the main content frame -->
            <div class='olwidgetPopupContent'>
                <div class='olwidgetPopupCloseBox'>
                    <!-- the close box -->
                </div>
                <div class='olwidgetPopupPage'>
                    <!-- the message in the popup -->
                </div>
                <!-- paginator shown only if contentHTML is an array -->
                <div class='olwidgetPopupPagination'>
                    <div class='olwidgetPaginationPrevious'></div>
                    <div class='olwidgetPaginationCount'></div>
                    <div class='olwidgetPaginationNext'></div>
                </div>
                <div style='clear: both;'></div>
            </div>
            <!-- the stem class may be one of:
                olwidgetPopupStemBR (bottom right),
                olwidgetPopupStemBL (bottom left),
                olwidgetPopupStemTR (top right),
                olwidgetPopupStemTL (top left) -->
            <div class='olwidgetPopupStemBR'></div>
        </div>
    </div>

olwidget.DeleteVertexControl
----------------------------

``olwidget.DeleteVertexControl`` is a simple control which deletes vertices
when they are clicked.  It may be useful outside of ``olwidget``.

Projections
~~~~~~~~~~~

``olwidget`` uses the projections given in ``mapOptions`` to determine the
input and output of WKT data.  By default, it expects incoming WKT data to use
``"EPSG:4326"`` (familiar latitudes and longitudes), which is transformed
internally to the map projection (by default, ``"EPSG:900913"``, the projection
used by OpenStreetMaps, Google, and others).  Currently, ``olwidget`` ignores
the SRID present in any initial WKT data, and uses the projection specified in
``mapOptions.displayProjection`` to read the data.

To change the projection used for WKT, define the
``mapOptions.displayProjection``.  For example, the following will use
``EPSG:900913`` for all WKT data in addition to map display:

.. code-block:: javascript

    new olwidget.EditableMap('textareaId', {
        mapOptions: {
            projection: "EPSG:900913",
            displayProjection: "EPSG:900913"
        }
    });

