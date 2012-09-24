.. _backwards-incompatible:

Backwards incompatible changes
==============================

In development version
~~~~~~~~~~~~~~~~~~~~~~
In keeping with Django 1.3's new support for static media files, the location
of olwidget's media has changed, to:

    olwidget/static/olwidget

In addition, the ``OLWIDGET_MEDIA_URL`` setting has been renamed
``OLWIDGET_STATIC_URL``, and templates rendered by olwidget now receive
``STATIC_URL`` instead of ``MEDIA_URL`` as context.  The setting ``STATIC_URL``
is also required.  This has the potential to break symlinks to olwidget's
static media files.

The olwidget CSS class names have been 
`changed <https://github.com/yourcelf/olwidget/commit/156c0c95e286d11d4b1d9d9b51a48cd36318749>`_ 
to be prefixed with "olwidget", to avoid colliding with other generic class
names like "container".  Custom css that expects to select olwidget's elements
will need to be updated to use olwidget-prefixed names.

Since Google Maps API v2 is now deprecated, ``olwidget`` has `switched to Google
Maps API v3 <https://github.com/yourcelf/olwidget/8b24080b5d06538dd81d24a1606e07fc1268707a>`_.  Customizations that depend on Google Maps v2 will need to be
updated to use v3 instead.

In version 0.6
~~~~~~~~~~~~~~
Support for Django less than 1.4 is removed.

In version 0.4
~~~~~~~~~~~~~~
Version 0.4 represents a complete overhaul of olwidget to build in support for
multiple vector layers.  As such, chances are high that v0.4 will break any
custom extensions that make use of undocumented implementation details.
However, the public, documented API from v0.3 is compatible with v0.4.  The
following are notable changes that have a higher probability of breaking your
app if you did customization.

django-olwidget changes
-----------------------
* The template format and context variables used in the templates have 
  changed, which will break custom map rendering templates.
* The ID's used for form elements have changed, which will break custom
  javascript that accesses form elements directly.

olwidget.js changes
-------------------
* ``map.vector_layer`` no longer exists; it has been replaced with an array,
  ``map.vector_layers``.
* ``olwidget.js`` now uses version 2.9 of the OpenLayers API.  Django users
  should get this change automatically, but ``olwidget.js`` users will have to
  change their script tags for the OpenLayers import.

In version 0.3
~~~~~~~~~~~~~~

django-olwidget changes
-----------------------
* 2009-04-13: Changed the media for the olwidget app to live in
  "olwidget/media/olwidget/..." by default, in accordance with the convention
  proposed by `django-staticmedia
  <http://pypi.python.org/pypi/django-staticmedia/#avoiding-media-filename-conflicts>`_
  (thanks to `skyl
  <http://github.com/yourcelf/olwidget/issues/closed#issue/39>`_ for suggesting
  this good idea).  This doesn't change any URLs, but it has the potential to
  break symlink paths from previous installations.

In version 0.2
~~~~~~~~~~~~~~

django-olwidget changes
-----------------------

* ``olwidget.widgets.OLWidget`` has been renamed ``olwidget.widgets.EditableMap``
* The ``"olwidget/olwidget.html"`` template has been renamed
  ``"olwidget/editable_map.html"``
* The ``admin.custom_geo_admin`` method has been removed.  Instead, just
  subclass ``olwidget.admin.GeoModelAdmin``.
* ``olwidget.admin`` No longer inherits from ``django.contrib.admin``.  The old
  way:

  .. code-block:: python

        from olwidget import admin

        # no longer works
        admin.site.register(MyModel, admin.GeoModelAdmin)

  Instead, import admin from ``django.contrib`` as normal, and import
  ``GeoModelAdmin`` from ``olwidget``, like this:

  .. code-block:: python
        
        from django.contrib import admin
        from olwidget.admin import GeoModelAdmin

        admin.site.register(MyModel, GeoModelAdmin)

olwidget.js changes
-------------------

* ``olwidget.Map`` has been renamed ``olwidget.EditableMap``
* Many of the options parameters' names have changed, mostly to conform to
  OpenLayers' mixedCase standard:

  * ``default_lat`` is now ``defaultLat``
  * ``default_lon`` is now ``defaultLon``
  * ``default_zoom`` is now ``defaultZoom``
  * ``overlay_style`` is now ``overlayStyle``
  * ``map_class`` is now ``mapDivClass`` (note addition of "Div")
  * ``map_style`` is now ``mapDivStyle`` (note addition of "Div")
  * ``map_options`` is now ``mapOptions``
  * ``is_collection`` is now ``isCollection``
  * ``hide_textarea`` is now ``hideTextarea``
  * ``'yahoo'`` map layer is now called ``'yahoo.map'``

  All internal methods and variables have also changed to use mixedCase.

* Map types now inherit from ``OpenLayers.Map``.  This affects javascript
  customizations that access the base map type.

  The old way:

  .. code-block:: javascript

        var mymap = new olwidget.Map('textareaId');
        mymap.map.zoomTo(4);

  The new way:

  .. code-block:: javascript

        var mymap = new olwidget.EditableMap('textareaId');
        mymap.zoomTo(4);


