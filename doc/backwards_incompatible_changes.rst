Backwards incompatible changes in v0.2
======================================

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

  All internal methods and variables have also changed to use mixedCase.

* Map types now inherit from ``OpenLayers.Map``.  This affects javascript
  customizations that access the base map type.

  The old way::

        var mymap = new olwidget.Map('textareaId');
        mymap.map.toZoom(4);

  The new way::

        var mymap = new olwidget.EditableMap('textareaId');
        mymap.toZoom(4);



  

