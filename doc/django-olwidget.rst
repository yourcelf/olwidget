olwidget Django app documentation
=================================

.. contents:: Contents

Installation
~~~~~~~~~~~~

Installation of the ``olwidget`` Django app requires a couple of steps -- these
should be familiar to users of other reusable Django apps:

1.  Copy or link the ``olwidget`` directory in ``django-olwidget`` into the search
    path for your django project.
2.  Copy or link the media (``css``, ``img``, and ``js``) into a directory
    named ``olwidget`` under your project's ``MEDIA_URL``.  If you wish to name
    the directory something else, define ``OLWIDGET_MEDIA_URL`` with the URL
    for the media files in your settings file.
3.  Include ``'olwidget'`` in your project's settings ``INSTALLED_APPS`` list.
4.  (Optional) If you want to use Google or Yahoo map layers, you must include
    ``GOOGLE_API_KEY`` or ``YAHOO_APP_ID`` in your settings file.  ``olwidget``
    uses OpenStreetMaps by default, which requires no key.

Map widgets
~~~~~~~~~~~

``olwidget`` defines 3 widget types that can be used to display maps:

EditableMap
-----------
``EditableMap`` is a widget type for use in forms to allows editing of
geometries.  Constructor::

    olwidget.widgets.EditableMap(options=None, template=None)

``options``
    A dict of options for map display.  See Options_ below.
``template``
    A template to use for rendering the map.
    
An example form definition that uses an editable map::

    from django import forms
    from olwidget.widgets import EditableMap

    class MyForm(forms.Form):
        location = forms.CharField(widget=EditableMap())

    # In a template:

    <head> {{ form.media }} </head>
    <body>... {{ form }} ...</body>

MapDisplay
----------

``MapDisplay`` is used for displaying geometries on read-only maps.
Constructor::

    olwidget.widgets.MapDisplay(fields, options=None, template=None)

``fields``
    A list of geometries to display on the map, either valid geometry
    strings or geometry fields.
``options``
    A dict of options for map display.  See Options_ below.
``template``
    A template to use for rendering the map.

An example simple read-only display map::

    from olwidget.widgets import MapDisplay

    map = MapDisplay(fields=[mymodel.start_point, mymodel.destination])

    # In a template:

    <head> {{ map.media }} </head>
    <body>... {{ map }} ...</body>

InfoMap
-------

``InfoMap`` is used for displaying read-only maps with clickable information
popups over geometries.  Constructor::

    olwidget.widgets.InfoMap(info, options=None, template=None)


``info``
    A list of ``[geometry, attr]`` pairs.  ``attr`` can be either a string
    containing html, or a dict containing ``html`` and ``style`` keys.  The 
    html is displayed when the geometry is clicked.
``options``
    A dict of options for map display.  See Options_ below.
``template``
    A template to use for rendering the map.

An example info map::

    from olwidget.widgets import InfoMap

    map = InfoMap([
        [mymodel.point, "<p>This is where I had my first kiss.</p>"],
        [othermodel.polygon, "<p>This is my home town.</p>"],
        [othermodel.point, {
            'html': "<p>Special style for this point.</p>", 
            'style': {'fill_color': '#00FF00'},
        }],
        ...
    ])

    # In a template:
    
    <head> {{ map.media }} </head>
    <body>... {{ map }} ...</body>

Inside Admin
~~~~~~~~~~~~

``olwidget`` has several advantages over the built-in geodjango admin map
implementation, including greater map customization, support for more geometry
types, and the option to include a map in admin changelist pages.

To use ``olwidget`` for admin, simply use ``olwidget.admin.GeoModelAdmin`` or a
subclass of it as the ModelAdmin type for your model.

Example using ``olwidget`` in admin::

    # admin.py

    from django.contrib import admin
    from olwidget.admin import GeoModelAdmin
    from myapp import Restaurant, Owner

    # Use the default map
    admin.site.register(Restaurant, GeoModelAdmin)

    # Customize the map
    class MyGeoAdmin(GeoModelAdmin):
        options = {
            'layers': ['google.streets'],
            'default_lat': 44,
            'default_lon': -72,
        }

    admin.site.register(Owner, MyGeoAdmin)

``olwidget.admin.GeoModelAdmin`` uses the ``olwidget.widgets.EditableMap`` for
display, so all the map display options listed below in Options_ for editable
map types  can be used with maps in admin. 

Changelist maps
---------------

To show a clickable map on the admin changelist page, use the ``list_map``
property to specify which fields to display::

    # an example model:

    class City(models.Model):
        location = models.PointField()

    # admin.py

    from django.contrib import admin
    from olwidget.admin import GeoModelAdmin
    from myapp import City

    class CityGeoAdmin(GeoModelAdmin):
        list_map = ['location'] 

    admin.site.register(City, CityGeoAdmin)

Options can be set for the changelist map using the ``list_map_options``
property::

    class CityGeoAdmin(GeoModelAdmin):
        list_map = ['location']
        list_map_options = {
            # group nearby points into clusters
            'cluster': True,
            'cluster_display': 'list',
        }

Changelist maps use the ``olwidget.widgets.InfoMap`` type for display, so all
the options listed below in Options_ for InfoMap types can be used for
``list_map_options``.
    
.. _Options:

Options
~~~~~~~

All of the ``olwidget`` map types can be passed an ``options`` dictionary
that controls the look and feel of the map.  An example::

    from olwidget.widgets import MapDisplay

    map = MapDisplay(options={
        'layers': ['osm.mapnik', 'google.hybrid', 'yahoo'],
        'default_lat': 44,
        'default_lon': -72,
    })

Common options
--------------

The following options are shared by all ``olwidget`` map types:

``name`` (string; defaults to ``"data"``) 
    The name of the overlay layer for the map (shown in the layer switcher).
``layers`` (list; default ``['osm.mapnik']``) 
    A list of map base layers to include.  Choices include ``'osm.mapnik'``,
    ``'osm.osmarender'``, ``'google.streets'``, ``'google.physical'``,
    ``'google.satellite'``, ``'google.hybrid'``, ``'ve.road'``,
    ``'ve.shaded'``, ``'ve.aerial'``, ``'ve.hybrid'``, ``'wms.map'``,
    ``'wms.nasa'``, and ``'yahoo.map'``.  A blank map can be obtained using
    ``'wms.blank'``.  
``default_lat`` (float; default 0)
    Latitude for the center point of the map.
``default_lon`` (float; default 0)
    Longitude for the center point of the map.
``default_zoom`` (int; default ``4``) 
    The zoom level to use on the map.  
``zoom_to_data_extent`` (``True``/``False``; default ``True``)
    If ``True``, the map will zoom to the extent of its vector data instead of
    ``default_zoom``, ``default_lat``, and ``default_lon``.  If no vector data
    is present, the map will use the defaults.
``overlay_style`` (dict) 
    A dict of style definitions for the geometry overlays.  For more on overlay
    styling, consult the OpenLayers `styling documentation
    <http://docs.openlayers.org/library/feature_styling.html>`_.  Options
    include:

    * ``fill_color``: (string) HTML color value
    * ``fill_opacity``: (float) opacity of overlays from 0 to 1
    * ``stroke_color``: (string) HTML color value
    * ``stroke_opacity``: (float) opacity of strokes from 0 to 1
    * ``stroke_width``: (int) width in pixels of lines and borders
    * ``stroke_linecap``: (string) Default is ``round``. Options are ``butt``,
      ``round``, ``square``.
    * ``stroke_dash_style``: (string) Default is ``solid``. Options are
      ``dot``, ``dash``, ``dashdot``, ``longdash``, ``longdashdot``, ``solid``.
    * ``cursor``: (string) Cursor to be used when mouse is over a feature.
      Default is an empty string.
    * ``point_radius``: (integer) radius of points in pixels
    * ``external_graphic``: (string) URL of external graphic to use in place of
      vector overlays
    * ``graphic_height``: (int) height in pixels of external graphic
    * ``graphic_width``: (int) width in pixels of external graphic
    * ``graphic_x_offset``: (int) x offset in pixels of external graphic
    * ``graphic_y_offset``: (int) y offset in pixels of external graphic
    * ``graphic_opacity``: (float) opacity of external graphic from 0 to 1.
    * ``graphic_name``: (string) Name of symbol to be used for a point mark.
    * ``display``: (string) Can be set to ``none`` to hide features from
      rendering.

``map_div_class`` (string; default ``''``) 
    A CSS class name to add to the div which is created to contain the map.
``map_div_style`` (dict, default ``{width: '600px', height: '400px'}``)  
    A set of CSS style definitions to apply to the div which is created to
    contain the map.
``map_options`` (dict) 
    A dict containing options for the OpenLayers Map constructor.
    Properties may include:

    * ``units``: (string) default ``'m'`` (meters)
    * ``projection``: (string) default ``"EPSG:900913"`` (the projection used
      by Google, OSM, Yahoo, and VirtualEarth).
    * ``display_projection``: (string) default ``"EPSG:4326"`` (the latitude
      and longitude we're all familiar with).
    * ``max_resolution``: (float) default ``156543.0339``.  Value should be
      expressed in the projection specified in ``projection``.
    * ``max_extent``: default ``[-20037508.34, -20037508.34, 20037508.34,
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

Additional options for ``EditableMap`` and ``MapDisplay`` types
---------------------------------------------------------------

In addition to the common options listed above, ``EditableMap`` and
``MapDisplay``, and ``GeoModelAdmin`` accept the following options:

``hide_textarea`` (boolean; default ``true``) 
    Hides the textarea if true.
``editable`` (boolean, default ``true``) 
    If true, allows editing of geometries.

Additional options for ``InfoMap``
----------------------------------

In addition to the common options listed above, ``InfoMap`` accepts the
following options:

``popups_outside`` (boolean; default ``false``)
    If false, popups are contained within the map's viewport.  If true, popups
    may expand outside the map's viewport.
``popup_direction`` (string; default ``auto``)
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
``cluster_display`` (string; default ``'paginate'``)
    The way HTML from clustered points is handled:

    * ``'list'`` -- constructs an unordered list of contents
    * ``'paginate'`` -- adds a pagination control to the popup to click through
      the different points' HTML.

``cluster_style`` (dict)
    The default style is::

        { 
            point_radius: "${radius}",
            stroke_width: "${width}",
            label: "${label}",
            font_size: "11px",
            font_family: "Helvetica, sans-serif",
            font_color: "#ffffff" 
        }

    The arguments expressed with ``${}`` are programmatically replaced with
    values based on the cluster.  Setting them to specific values will prevent
    this programatic replacement.

