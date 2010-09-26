.. _django-olwidget:

django-olwidget documentation
=============================

Introduction
~~~~~~~~~~~~

``django-olwidget`` is a portable Django application that uses
:ref:`olwidget.js <olwidget.js>` to easily create editable and informational
maps using GeoDjango, inside and outside of Django's admin.

A quick guide to the ``olwidget`` module contents:

Widgets: for display outside forms, single-layer maps in forms, or custom fields:
    Single layer:
        EditableMap_, InfoMap_
    Multi layer:
        `Map, EditableLayer, and InfoLayer`_

Forms: for ModelForm convenience with multi- or single-layer maps:
    MapModelForm_

Fields: for multi-layer map editing in forms:
    `MapField, EditableLayerField, and InfoLayerField`_

olwidget looks great in admin:
    GeoModelAdmin_

And of course, customization of all types: options_


Installation
~~~~~~~~~~~~

Installation of the ``olwidget`` requires a couple of steps -- these should be
familiar to users of other reusable Django apps:

1.  Install ``django-olwidget`` using your preferred method for python modules.
    The folder ``olwidget`` in the ``django-olwidget`` directory must end up in
    your python path.  You could do this by copying or symlinking it into your
    path, or with:
    
    .. code-block:: python

        python setup.py install

    The preferred method is to install from using `pip
    <http://pip.openplans.org/>`_ with `virtualenv
    <http://pypi.python.org/pypi/virtualenv>`_.  The `requirements file
    <http://pip.openplans.org/#requirements-files>`_ entry for the stable
    version::

        django-olwidget

    To use the development version, the requirements is::

        -e git://github.com/yourcelf/olwidget.git#egg=django-olwidget

2.  Copy or link the ``media/olwidget`` directory into to your project's
    ``MEDIA_ROOT``.  If you wish to name the directory something other than
    ``olwidget``, define ``OLWIDGET_MEDIA_URL`` with the URL for the media
    files in your settings file. 
    
3.  Include ``'olwidget'`` in your project's settings ``INSTALLED_APPS`` list.

4.  (Optional) If you want to use Google, Yahoo or CloudMade map layers, you
    must include ``GOOGLE_API_KEY``, ``YAHOO_APP_ID`` or ``CLOUDMADE_API_KEY``
    in your settings file.  ``olwidget`` uses an OpenStreetMaps layer by
    default, which requires no key.

``olwidget`` includes a test project demonstrating some of the ``olwidget`` app's
functionality; this can be found in the ``django-olwidget/test_project``
directory.  To use it, modify the ``settings.py`` directory to reflect your
database settings.  For convenience, a shell script, ``reset_testolwidget.sh``,
is included to set up the database using ``postgres``, ``template_postgis``,\
and the database user and password specified in the script.

Widgets
~~~~~~~
``olwidget`` defines several widget types.  If all you need is a single-layer
map, or if you want to display maps outside of the context of a form, this is 
what you want.  EditableMap_ and InfoMap_ are single-layer widgets for
editing or displaying map data.  `Map, EditableLayer, and InfoLayer`_
are the widget counterparts to the fields above which make display of
multi-layer maps outside of forms possible.

EditableMap
-----------

``EditableMap`` is a widget type for editing single layers.  Constructor:

.. code-block:: python

    olwidget.widgets.EditableMap(options=None, template=None)

``options``
    A dict of options_ for map display.
``template``
    A template to use for rendering the map.
    
An example form definition that uses an editable map:

.. code-block:: python

    from django import forms
    from olwidget.widgets import EditableMap

    class MyForm(forms.Form):
        location = forms.CharField(widget=EditableMap())

In a template:

.. code-block:: django

    <head> {{ form.media }} </head>
    <body>... {{ form }} ...</body>

InfoMap
-------

``InfoMap`` is used for displaying read-only single-layer maps with clickable
information popups over geometries.  Unlike the other types, you probably want
to use this widget without a Form.  Constructor:

.. code-block:: python

    olwidget.widgets.InfoMap(info, options=None, template=None)


``info``
    A list of ``[geometry, attr]`` pairs.  ``attr`` can be either a string
    containing html, or a dict containing ``html`` and ``style`` keys.  The 
    html is displayed when the geometry is clicked.
``options``
    A dict of options_ for map display.
``template``
    A template to use for rendering the map.

An example info map:

.. code-block:: python

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

In a template:

.. code-block:: django
    
    <head> {{ map.media }} </head>
    <body>... {{ map }} ...</body>

.. _MultiWidget:

Map, EditableLayer, and InfoLayer
---------------------------------

Use these widgets together to display multi-layer maps outside of forms.

**Map** constructor:

.. code-block:: python

    olwidget.widgets.Map(vector_layers=None, options=None, template=None, layer_names=None)

``vector_layers``
    A list or tuple of layer instances (``EditableLayer`` or ``InfoLayer``) to
    display on the map.
``options``
    Optional global options_ for the map.
``template``
    An optional template to use to render the map.
``layer_names`` 
    An optional list of names to use for the layers' POST data.

**EditableLayer** constructor:

.. code-block:: python

    olwidget.widgets.EditableLayer(options=None, template=None)

``options``
    Optional options_ for the layer.
``template``
    An optional template to use to render this layer's javascript.

.. _InfoLayer:

**InfoLayer** constructor:

.. code-block:: python

    olwidget.widgets.InfoLayer(info=None, options=None, template=None)

``info``
    A list of [``geometry``, ``html``] pairs which specify geometries and the
    html contents of popups when those geometries are clicked.  ``html`` can
    also be a dict such as ``{ html: "...", style: {}}``.  The ``style``
    parameter is used for individual styling of the geometry within the layer.
``options``
    Optional options_ for the layer

Examples
''''''''
An example of a widget with two info layers:

.. code-block:: python

    mymap = Map([
            InfoLayer([["POINT (0 0)", "the origin"]], {'name': 'origin'}),
            InfoLayer([["POINT (1 0)", "one degree off"]], {'name': 'a bit off'}),
        ], { overlay_style: {'fill_color': '#ffffff'} })

In a template:

.. code-block:: django

    <head> ... {{ mymap.media }} ... </head>
    <body> ...    {{ mymap }}    ... </body>

.. _MapModelForm:

ModelForms
~~~~~~~~~~

``MapModelForm`` is an extension of the built-in `ModelForm
<http://docs.djangoproject.com/en/dev/topics/forms/modelforms/>`_ type which
adds
support for maps.  ``MapModelForm`` subclasses can possess two extra parameters
in their inner ``Meta`` class -- an optional ``maps`` parameter which specifies
which fields to use with which maps, and an ``options`` parameter that specifies
global map options_.  

The following is a simple example using a separate map for each field, and the
same appearance for all maps:

.. code-block:: python

    # models.py
    class MyModel(models.Model):
        geom1 = models.PointField()
        geom2 = models.LineStringField()
        geom3 = models.GeometryCollectionField()


    # forms.py
    from olwidget.forms import MapModelForm
    from models import MyModel

    class MyForm(MapModelForm):
        class Meta:
            model = MyModel
            options = { 'layers': ['google.streets'] }

To edit multiple fields in a single map, specify the ``maps`` parameter.  The
following will construct a form with 2 maps, the first editing ``geom1`` and
``geom2`` fields and using Google Streets as a base layer, and the second
editing ``geom3`` and using default options:

.. code-block:: python

    class MyForm(MapModelForm):
        class Meta:
            model = MyModel
            maps = (
                (('geom1', 'geom2'), { 'layers': ['google.streets'] }),
                (('geom3', ), None),
            )

To define options for particular fields, override the field definition.

.. code-block:: python

    from olwidget.forms import MapModelForm
    from olwidget.fields import EditableLayerField
    
    class MyForm(MapModelForm):
        geom1 = EditableLayerField({'overlay_style': { 'fill_color': "#ff0000" }})
        class Meta:
            model = MyModel

Using the form in a template is the same as before.

.. code-block:: django

    <head> {{ form.media }} </head>
    <body>     {{ form }}   </body>

Fields
~~~~~~
MapField, EditableLayerField, and InfoLayerField
------------------------------------------------
Multi-layer maps are possible in forms using the ``MapField`` type, which is a
container field for any number of layer fields.  The layer fields are
``EditableLayerField`` or ``InfoLayerField`` types, which allow editing or
display of vector data on the map.

.. _MapField:

**MapField** constructor:

.. code-block:: python
    
    olwidget.fields.MapField(fields=None, options=None, layer_names=None, template=None)

``fields``
    An array of layer fields (either ``EditableLayerField`` or
    ``InfoLayerField``) which should appear on the map.
``options``
    A dict of options_ for the map.
``layer_names``
    If provided, these will be used as the names for textareas in editable
    fields and raw POST data.  However, ``form.cleaned_data`` will not use
    these names, and will instead contain a list of the values in each layer
    using the MapField's declared name.
``template``
    The name of a custom template to render the map.  It will receive the context::
        
        {'id': html id for the map,
         'layer_js': an array of javascript invocations from each layer,
         'layer_html': an array of html data from each layer,
         'map_opts': a JSON string of options for the map.
        }

.. _EditableLayerField:

**EditableLayerField** constructor:

.. code-block:: python

    olwidget.fields.EditableLayerField(options=None)

``options``
    A dict of options_ for this layer, which override the containing ``Map`` defaults.

.. _InfoLayerField:

**InfoLayerField** constructor:

.. code-block:: python

    olwidget.fields.InfoLayerField(info=None, options=None)

``info``
    A list of ``[geometry, html]`` pairs for clickable popups.  See InfoLayer_
    for more.
``options``
    A dict of options_ for this layer, which override the containing ``Map``
    defaults.

Example
'''''''

The following is an example that constructs a map widget with 3 fields, two of
them editable.  It uses both layer-specific options and global map options:

.. code-block:: python

    from django import forms
    from olwidget.fields import MapField, EditableLayerField, InfoLayerField

    class MyForm(forms.Form):
        country = MapField([
                EditableLayerField({'geometry': 'polygon', 'name': 'boundary'}),
                EditableLayerField({'geometry': 'point', 'name': 'capital'}),
                InfoLayerField([["Point (0 0)", "Of interest"]], {'name': "Points of interest"}),
            ], {
                'overlay_style': {
                    'fill_color': '#00ff00',
                },
            })

In a template:

.. code-block:: django

    <head>... {{ form.media }} ...</head>
    <body>...    {{ form }}    ...</body>


.. _GeoModelAdmin:

Inside Admin
~~~~~~~~~~~~

``olwidget`` has several advantages over the built-in geodjango admin map
implementation, including greater map customization, support for more geometry
types, the ability to edit multiple fields using one map, and the option to
include a map in admin changelist pages, on top of basic usability like
undo/redo and the ability to delete individual vertices.

To use ``olwidget`` for admin, simply use ``olwidget.admin.GeoModelAdmin`` or a
subclass of it as the ModelAdmin type for your model.

Example using ``olwidget`` in admin:

.. code-block:: python

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

To edit multiple fields using a single map, specify a ``maps`` parameter (with
the same syntax as that used in MapModelForm_) with a list of all geometry
fields and which maps they should use and the options those maps should use,
like so:

.. code-block:: python

    # model:
    class Country(models.Model):
        capital = models.PointField()
        perimiter = models.PolygonField()
        biggest_river = models.LineStringField()

    # admin.py
    class CountryAdmin(GeoModelAdmin):
        options = {
            default_lat: -72,
            default_lon: 43,
        }
        maps = (
            (('capital', 'perimiter'), { 'layers': ['google.streets'] }),
            (('biggest_river',), {'overlay_style': {'stroke_color': "#0000ff"}}),
        )


This will tell GeoModelAdmin to construct 2 maps, the first editing ``capital``
and ``perimiter`` fields, and the second editing ``biggest_river``, with
specific options for each map.  Both maps will share the global ``options``
parameter, but can override it by specifying options. 

Changelist maps
---------------

To show a clickable map on the admin changelist page, use the ``list_map``
property to specify which fields to display in the changelist map:

.. code-block:: python

    # an example model:

    class Tree(models.Model):
        location = models.PointField()
        root_spread = models.PolygonField()

    # admin.py

    from django.contrib import admin
    from olwidget.admin import GeoModelAdmin
    from myapp import Tree 

    class TreeGeoAdmin(GeoModelAdmin):
        list_map = ['location'] 

    admin.site.register(Tree, TreeGeoAdmin)

Options can be set for the changelist map using the ``list_map_options``
property:

.. code-block:: python

    class TreeGeoAdmin(GeoModelAdmin):
        list_map = ['location']
        list_map_options = {
            # group nearby points into clusters
            'cluster': True,
            'cluster_display': 'list',
        }

This results in a map like this:

.. image:: /examples/changelist_map.png
    
.. _options:

Options
~~~~~~~
Maps are both important user interface elements, and powerful persuasive data
displays.  Consequently, it is necessary to support a high degree of
customization around the appearance of a map.  ``olwidget`` does this primarily
through the use of OpenLayers' style framework.  All of ``olwidget``'s types accept
an optional ``options`` dict which controls the appearance of the map and
layers.

Layers inherit their styles from both their default parameters, and from those 
specified for a map::

    default layer options < map options < layer options

By contrast, maps only inherit from their default options, and not from
layers::

    default map options < map options

This allows the map to hold defaults for all layers, but let the layers
override them.  The following is a list of all available options.  Some are
specific to map display, and others specific to layer display.

General map display
-------------------
``layers`` (list; default ``['osm.mapnik']``) 
    A list of map base layers to include.  Choices include:

    Open Street Maps
        ``'osm.mapnik'``, ``'osm.osmarender'``
    Google
        ``'google.streets'``, ``'google.physical'``, ``'google.satellite'``, ``'google.hybrid'``, 
    Microsoft VirtualEarth
        ``'ve.road'``, ``'ve.shaded'``, ``'ve.aerial'``, ``'ve.hybrid'``, 
    WMS
        ``'wms.map'``, ``'wms.nasa'``, ``'wms.blank'`` (blank map)  
    Yahoo
        ``'yahoo.map'``
    CloudMade
        ``'cloudmade.<num>'`` (where ``<num>`` is the number for a cloudmade
        style).

    Remember to include ``GOOGLE_API_KEY``, ``YAHOO_APP_ID``, or
    ``CLOUDMADE_API_KEY`` in your ``settings.py`` if you use any of those
    layers.
``default_lat`` (float; default 0)
    Latitude for the center point of the map.
``default_lon`` (float; default 0)
    Longitude for the center point of the map.
``default_zoom`` (int; default ``4``) 
    The starting zoom level to use on the map.
``zoom_to_data_extent`` (``True``/``False``; default ``True``)
    If ``True``, the map will zoom to the extent of its vector data instead of
    ``default_zoom``, ``default_lat``, and ``default_lon``.  If no vector data
    is present, the map will use the defaults.
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

Layer options
-------------
Layer options can also be specified at the map level.  Any options passed to a
layer override the corresponding options from the map.

``name`` (string; defaults to ``"data"``) 
    The name of the overlay layer for the map (shown in the layer switcher).
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
``overlay_style_context`` (dict)
    A dict containing javascript functions which expand symbolizers in
    ``overlay_style``.  See 
    `this example <examples/info_cluster_per_point_style.html>`_ for a
    javascript usage example.  Note that javascript functions can't be
    specified directly from python in an ``options`` dict, as the serializer
    will interpret them as strings.  Instead, they must be specified manually
    in a template.

Options for editable layers
'''''''''''''''''''''''''''
``geometry`` (Array or string; default ``'point'``)
    The geometry to use while editing this layer.  Choices are ``'point'``,
    ``'linestring'``, and ``'polygon'``.  To allow multiple geometries, use an
    array such as ``['point', 'linestring', 'polygon']``.
``isCollection`` (boolean, default ``false``)
    If true, allows multiple points/lines/polygons.
``hide_textarea`` (boolean; default ``true``) 
    Hides the textarea if true.  Ignored if the layer does not have an
    associated textarea.
``editable`` (boolean, default ``true``) 
    If true, allows editing of geometries.  Ignored by ``InfoLayer`` types.

Options for info layers
'''''''''''''''''''''''

``cluster`` (boolean; default ``false``)
    If true, points will be clustered using the
    `OpenLayers.Strategy.ClusterStrategy
    <http://dev.openlayers.org/releases/OpenLayers-2.7/doc/apidocs/files/OpenLayers/Strategy/Cluster-js.html>`_.
    (see `this cluster example <examples/info_cluster.html>`_).
``cluster_display`` (string; default ``'paginate'``)
    The way HTML from clustered points is handled.

    * ``'list'`` -- constructs an unordered list of contents
    * ``'paginate'`` -- adds a pagination control to the popup to click through
      the different points' HTML.

