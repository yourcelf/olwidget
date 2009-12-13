olwidget.js v0.3
================

Note: the API has changed.  See a list of `backwards incompatible changes
<backwards_incompatible_changes.html>`_ if you are upgrading.

.. contents:: Contents

Introduction
~~~~~~~~~~~~

``olwidget`` is a javascript library to make editing and displaying geometries
and information on OpenLayers maps easier.  It defines two primary types:

* ``olwidget.EditableMap`` is a map class that turns a textarea containing `WKT
  <http://en.wikipedia.org/wiki/Well-known_text>`_ geometry into an editable
  map.  The map writes EWKT geometry (WKT with explicit SRID) to the textarea
  for later processing in forms.  This is useful for anywhere you need a form
  to enter or edit precise geographic geometries for storage in a GIS database
  such as `PostGIS <http://postgis.refractions.net/>`_.

* ``olwidget.InfoMap`` is a map class that displays popup info-windows over
  geometries when clicked.  The popups are stylable using CSS, work with
  clustered as well as non-clustered points, and can be shown both inside
  and outside the Map's "viewport".

``olwidget`` supports multiple geometry types, any number of maps per page,
multiple map providers, and much more (see `Common options`_ below).  A simple
example::

    <html>
        <head>
            <script type='text/javascript' src='http://openlayers.org/api/2.8/OpenLayers.js'></script>
            <script type='text/javascript' src='http://openstreetmap.org/openlayers/OpenStreetMap.js'></script>
            <script type='text/javascript' src='js/olwidget.js'></script>
            <link rel='stylesheet' href='css/olwidget.css' />
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


Installation
~~~~~~~~~~~~

Copy or link the olwidget/js/, olwidget/css/, and olwidget/img/ directories
into your website's path.  The three directories should share a parent.

Examples
~~~~~~~~

Editable Maps
-------------
* `Simple example <examples/simple.html>`_
* `Collections <examples/collection.html>`_ of multiple geometries.
* Read only maps and `multiple maps per page <examples/read_only_and_multiple_maps.html>`_
* Custom `starting locations and colors <examples/custom_start_point_and_colors.html>`_
* `Other map providers <examples/other_providers.html>`_, including Google,
  Yahoo, Microsoft VE, OpenStreetMaps, and MetaCarta.
* `Multiple geometry types <examples/multiple_geometries.html>`_
* `Other projections <examples/other_projections.html>`_

Info Maps
---------
* `Info popups over geometries <examples/info_geometries.html>`_
* `Clustered points <examples/info_cluster.html>`_
* Popups `inside and outside map viewport <examples/info_inside_outside.html>`_
* Info map with `image markers <examples/info_markers.html>`_
* Info map with `different styles per geometry <examples/info_per_point_style.html>`_


Documentation
~~~~~~~~~~~~~

olwidget.EditableMap constructor
--------------------------------

Format::

    new olwidget.EditableMap(<textareaId>, [options]);

* ``textareaId``: the DOM id of the textarea to replace
* ``options``: An object containing options for the resulting map.  All fields
  are optional.  
  
In addition to the common options_ listed below, ``EditableMap``
accepts the following options:

``geometry`` (Array or string; defaults to ``'point'``)
    The geometry to use for this map.  Choices are ``'point'``,
    ``'linestring'``, and ``'polygon'``.  To allow multiple geometries, use an
    array such as ``['point', 'linestring', 'polygon']``.
``isCollection`` (boolean, default ``false``) 
    If true, allows multiple points/lines/polygons.
``hideTextarea`` (boolean; default ``true``) 
    Hides the textarea if true.
``editable`` (boolean, default ``true``) 
    If true, allows editing of geometries.

olwidget.InfoMap constructor
----------------------------

Format::

    new olwidget.InfoMap(<mapDivId>, <infoArray>, [options]);

* ``mapDivId``: the DOM id of a div to replace with this map.
* ``infoArray``: an Array of (E)WKT geometries and content HTML for popups, such as
  ::

        [ 
            ["SRID=4326;POINT(0 0)", "<p>This is the zero point.</p>"],
            ["SRID=4326;POINT(10 10)", "<p>This is longitude 10 and latitude 10.</p>"],
            ...  
        ]

  Geometries can be displayed with individual styles by passing an object
  containing ``html`` and ``style`` keys instead of an HTML string::

        [
            ["SRID=4326;POINT(10 10)", {
                html: "<p>A good looking point</p>",
                style: {
                    fillColor: '#00FF00'
                }
            }],
            ...
        ]

* ``options``: An object containing options for the resulting map.  All fields
  are optional.

In addition to the common options_ listed below, ``InfoMap`` accepts the
following options:

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

``cluster`` (boolean; default ``false``)
    If true, points will be clustered using the `OpenLayers.Strategy.ClusterStrategy
    <http://dev.openlayers.org/releases/OpenLayers-2.7/doc/apidocs/files/OpenLayers/Strategy/Cluster-js.html>`_.
    (see `this cluster example <examples/info_cluster.html>`_).
``clusterDisplay`` (string; default ``'paginate'``)
    The way HTML from clustered points is handled:

    * ``'list'`` -- constructs an unordered list of contents
    * ``'paginate'`` -- adds a pagination control to the popup to click through
      the different points' HTML.

``clusterStyle`` (object)
    The default style is::

        { 
            pointRadius: "${radius}",
            strokeWidth: "${width}",
            label: "${label}",
            fontSize: "11px",
            fontFamily: "Helvetica, sans-serif",
            fontColor: "#ffffff" 
        }

    The arguments expressed with ``${}`` are programmatically replaced with
    values based on the cluster.  Setting them to specific values will prevent
    this programatic replacement.

.. _options:

Common options
--------------

The following options are shared by ``olwidget.EditableMap`` and
``olwidget.InfoMap``:

``name`` (string; defaults to ``"data"``) 
    The name of the overlay layer for the map (shown in the layer switcher).
``layers`` (Array; default ``['osm.mapnik']``) 
    A list of map base layers to include.  Choices include ``'osm.mapnik'``,
    ``'osm.osmarender'``, ``'google.streets'``, ``'google.physical'``,
    ``'google.satellite'``, ``'google.hybrid'``, ``'ve.road'``,
    ``'ve.shaded'``, ``'ve.aerial'``, ``'ve.hybrid'``, ``'wms.map'``,
    ``'wms.nasa'``, and ``'yahoo.map'``.  A blank map can be obtained using
    ``'wms.blank'``.  Additional providers or options can be manually added
    using the normal OpenLayers apis
    (see `this provider example <examples/other_providers.html>`_).

    You must include separately whatever javascript sources needed to use these
    (e.g.  maps.google.com or openstreetmap.org apis).
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
``overlayStyle`` (object) 
    A list of style definitions for the geometry overlays.  See 
    `OpenLayers styling <http://docs.openlayers.org/library/feature_styling.html>`_.
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

Projections
-----------

``olwidget`` uses the projections given in ``mapOptions`` to determine the
input and output of WKT data.  By default, it expects incoming WKT data to use
``"EPSG:4326"`` (familiar latitudes and longitudes), which is transformed
internally to the map projection (by default, ``"EPSG:900913"``, the projection
used by OpenStreetMaps, Google, and others).  Currently, ``olwidget`` ignores
the SRID present in any initial WKT data, and uses the projection specified in
``mapOptions.displayProjection`` to read the data.

To change the projection used for WKT, define the
``mapOptions.displayProjection``.  For example, the following will use
``EPSG:900913`` for all WKT data in addition to map display::

    new olwidget.EditableMap('textareaId', {
        mapOptions: {
            projection: "EPSG:900913",
            displayProjection: "EPSG:900913"
        }
    });

