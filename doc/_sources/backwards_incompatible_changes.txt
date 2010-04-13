.. _backwards-incompatible:

Backwards incompatible changes introduced in v0.3
=================================================
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

Backwards incompatible changes introduced in v0.2
=================================================

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


Django app changes
------------------

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
