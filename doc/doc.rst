olwidget
========
.. contents:: Contents

``olwidget`` is a simple javascript library to turn a textarea containing `WKT
<http://en.wikipedia.org/wiki/Well-known_text>`_ geometry into an editable map,
using openlayers.  The map writes EWKT geometry (WKT with explicit SRID) to the
textarea for later processing in forms.  This is useful for anywhere you need a
form to enter or edit precise geographic geometries for storage in a GIS
database such as `PostGIS <http://postgis.refractions.net/>`_.

``olwidget`` supports multiple geometry types, any number of maps per page,
multiple map providers, read-only maps, and much more (see options_ below).  A
simple example::

    <html>
        <head>
            <script type='text/javascript' src='http://openlayers.org/api/2.8/OpenLayers.js'></script>
            <script type='text/javascript' src='http://openstreetmap.org/openlayers/OpenStreetMap.js'></script>
            <script type='text/javascript' src='js/olwidget.js'></script>
            <link rel='stylesheet' href='css/olwidget.css' />
        </head>
        <body>
            <textarea id='my_point'>SRID=900913;POINT(0 0)</textarea>
            <script type-'text/javascript'>
                new olwidget.Map('my_point', {name: 'My Point'});
            </script>
        </body>
    </html>

Examples
~~~~~~~~

* `Simple example <examples/simple.html>`_
* `Collections <examples/collection.html>`_ of multiple geometries.
* Read only maps and `multiple maps per page <examples/read_only_and_multiple_maps.html>`_
* Custom `starting locations and colors <examples/custom_start_point_and_colors.html>`_
* `Other map providers <examples/other_providers.html>`_, including Google,
  Yahoo, Microsoft VE, OpenStreetMaps, and MetaCarta.
* `Multiple geometry types <examples/multiple_geometries.html>`_
* `Other projections <examples/other_projections.html>`_

Documentation
~~~~~~~~~~~~~
To use, just create a new ``olwidget.Map`` object, with the DOM id of the
textarea you are replacing::   

    new olwidget.Map(<textarea_id>, [options]);

olwidget.Map constructor
------------------------

* ``textarea_id``: the DOM id of the textarea to replace
* ``options``: An object containing options for the resulting map.  All fields
  are optional.

options
........
``name`` (string; defaults to the given ``textarea_id``) 
    The name of the overlay layer for the map.
``geometry`` (Array or string; defaults to ``'point'``)
    The geometry to use for this map.  Choices are ``'point'``,
    ``'linestring'``, and ``'polygon'``.  To allow multiple geometries, use an
    array such as ``['point', 'linestring', 'polygon']``.
``is_collection`` (boolean, default ``false``) 
    If true, allows multiple points/lines/polygons.
``editable`` (boolean, default ``true``) 
    If true, allows editing of geometries.
``hide_textarea`` (boolean; default ``true``) 
    Hides the textarea if true.
``layers`` (Array; default ``['osm.mapnik']``) 
    A list of map base layers to include.  Choices include ``'osm.mapnik'``,
    ``'osm.osmarender'``, ``'google.streets'``, ``'google.physical'``,
    ``'google.satellite'``, ``'google.hybrid'``, ``'ve.road'``,
    ``'ve.shaded'``, ``'ve.aerial'``, ``'ve.hybrid'``, and ``'yahoo'``.  Additional
    providers or options can be manually added using the normal OpenLayers apis
    (see the `Examples`_ above).

    You must include separately whatever javascript sources needed to use these
    (e.g.  maps.google.com or openstreetmap.org apis).
``default_lat`` (float; default 0)
    Latitude for the center point of the map.  Only used if there is no
    geometry (e.g. the textarea is empty).
``default_lon`` (float: default 0)
    Longitude for the center pointof the map.  Only used if there is no
    geometry (e.g. the textarea is empty).
``default_zoom`` (int; default ``4``) The zoom level to use on the map.  Only
    used if there are no geometries (e.g. the textarea is empty).
``overlay_style`` (object) 
    A list of style definitions for the geometry overlays.  See 
    `OpenLayers styling <http://docs.openlayers.org/library/feature_styling.html>`_.
``map_class`` (string; default ``''``) 
    A CSS class name to add to the div which is created to contain the map.
``map_style`` (object, default ``{width: '600px', height: '400px'}``)  
    A set of CSS style definitions to apply to the div which is created to
    contain the map.
``map_options`` (object) 
    An object containing options for the OpenLayers Map.  Properties may
    include:

    * ``units``: (string) default ``'m'`` (meters)
    * ``projection``: (string) default ``"EPSG:900913"`` (the projection used
      by google, OSM, yahoo, and VirtualEarth -- See `Projections`_ below).
    * ``displayProjection``: (string) default ``"EPSG:4326"`` (the latitude
      and longitude we're all familiar with -- See `Projections`_ below).
    * ``maxResolution``: (float) default ``156543.0339``.  Value should be
      expressed in the projection specified in ``projection``.
    * ``maxExtent``: default ``[-20037508.34, -20037508.34, 20037508.34,
      20037508.34]``.  Values should be expressed in the projection specified
      in ``projection``.

    Any additional parameters available to the `OpenLayers.Map.Constructor
    <http://dev.openlayers.org/docs/files/OpenLayers/Map-js.html#OpenLayers.Map.Constructor>`_
    may be included, and will be passed directly.


Projections
-----------

``olwidget`` uses the projections given in ``map_options`` to determine the
input and output of WKT data.  By default, it expects incoming WKT data to use
``"EPSG:4326"`` (familiar latitudes and longitudes), which is transformed
internally to the map projection (by default, ``"EPSG:900913"``, the projection
used by OpenStreetMaps, Google, and others).  Currently, ``olwidget`` ignores
the SRID present in any initial WKT data, and uses the projection specified in
``map_options.displayProjection`` to read the data.

To change the projection used for WKT, define the
``map_options.displayProjection``.  For example, the following will use
``EPSG:900913`` for all WKT data in addition to map display::

    new olwidget.Map('textarea_id', {
        map_options: {
            projection: "EPSG:900913",
            displayProjection: "EPSG:900913"
        }
    });

Authors
~~~~~~~

By Charlie DeTar <cfd@media.mit.edu>.  Based on Django OSMAdmin implementation
by Justin Bronn, Travis Pinney & Dave Springmeyer.

Copying
~~~~~~~

Copyright (c) Django Software Foundation and individual contributors

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice, 
       this list of conditions and the following disclaimer.
    
    2. Redistributions in binary form must reproduce the above copyright 
       notice, this list of conditions and the following disclaimer in the
       documentation and/or other materials provided with the distribution.

    3. Neither the name of Django nor the names of its contributors may be used
       to endorse or promote products derived from this software without
       specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
