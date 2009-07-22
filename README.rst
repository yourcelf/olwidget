olwidget v0.1
=============

``olwidget`` is a library which replaces textareas containing WKT data with
editable OpenLayers maps.  While the javascript library functions on its own,
it was written to use with django apps which display and edit geographic data.

Documentation for ``olwidget.js`` is included in the ``doc`` directory.

Django documentation
~~~~~~~~~~~~~~~~~~~~

To use the django app requires a couple of steps:

1.  Copy or link the ``olwidget`` directory in ``django_app`` into the search
    path for your django project.
2.  Copy or link the media (``css``, ``img``, and ``js``) into a directory named
    ``olwidget`` under your project's ``MEDIA_URL``.  If you wish to name the directory 
    something else, define ``OLWIDGET_MEDIA_URL`` with the URL for the media files in
    your settings file.
3.  Include ``'olwidget'`` in your project's settings ``INSTALLED_APPS`` list.
4.  (Optional) If you want to use google or yahoo map layers, you must include
    ``GOOGLE_API_KEY`` or ``YAHOO_APP_ID`` in your settings file.  ``olwidget``
    uses OpenStreetMaps by default, which requires no key.

Examples
~~~~~~~~

Forms
-----

A form definition that uses OLWidget::

    from django import forms
    from olwidget.widgets import OLWidget

    class MyForm(forms.Form):
        location = forms.CharField(widget=OLWidget())

In a template::

    <html>
        <head> {{ form.media }} </head>
        <body>... {{ form }} ...</body>
    </html>

A map displaying several fields::

    from olwidget.widgets import MapDisplay

    map = MapDisplay(fields=[mymodel.start_point, mymodel.destination])

    # template

    <head> {{ map.media }} </head>
    <body>... {{ map }} ...</body>

Admin
-----

Example to use ``OLWidget`` in the Django admin site::

    # admin.py

    from olwidget import admin
    from myapp import Restaurant, Owner

    # Use the default map
    admin.site.register(Restaurant, admin.GeoModelAdmin)

    # Customize the map
    admin.site.register(Owner, admin.custom_geo_admin({
        'layers': ['google.streets'],
        'default_lat': 44,
        'default_lon': -72,
    }))

Options
~~~~~~~

Several ``olwidget`` features, including ``widgets.OLWidget``,
``widgets.MapDisplay``, and ``admin.custom_geo_admin``, take a ``map_options``
argument that customizes the look and feel of the maps that are produced.
These options are passed directly to the ``olwidget.js`` Map constructor.  An
example::

    from olwidget.widgets import MapDisplay

    map = MapDisplay(map_options={
        'layers': ['osm.mapnik', 'google.hybrid', 'yahoo'],
        'default_lat': 44,
        'default_lon': -72,
    })

For a complete list of options available to olwidget.js, see the `olwidget.js
documentation <doc/doc.html>`_.

