olwidget v0.2
=============

WARNING: the API has changed.  The older version can be accessed here:
http://github.com/yourcelf/olwidget/tree/v0.1.  Users upgrading olwidget should
take note of the `backwards incompatible changes
<doc/backwards_incompatible_changes.html>`_.

``olwidget`` is a javascript library and Django application for easily
incorporating editable and informational maps into web pages.  The javascript
library, ``olwidget.js``, can be used standalone or in Django via the
``olwidget`` Django app.

The doc directory contains `documentation for olwidget.js <doc/doc.html>`_.

Django documentation
~~~~~~~~~~~~~~~~~~~~

To use the Django app requires a couple of steps:

1.  Copy or link the ``olwidget`` directory in ``django_app`` into the search
    path for your django project.
2.  Copy or link the media (``css``, ``img``, and ``js``) into a directory
    named ``olwidget`` under your project's ``MEDIA_URL``.  If you wish to name
    the directory something else, define ``OLWIDGET_MEDIA_URL`` with the URL
    for the media files in your settings file.
3.  Include ``'olwidget'`` in your project's settings ``INSTALLED_APPS`` list.
4.  (Optional) If you want to use Google or Yahoo map layers, you must include
    ``GOOGLE_API_KEY`` or ``YAHOO_APP_ID`` in your settings file.  ``olwidget``
    uses OpenStreetMaps by default, which requires no key.

Examples
~~~~~~~~

Outside of admin
----------------

A form definition that uses an editable map::

    from django import forms
    from olwidget.widgets import EditableMap

    class MyForm(forms.Form):
        location = forms.CharField(widget=EditableMap())

    # In a template:

    <head> {{ form.media }} </head>
    <body>... {{ form }} ...</body>

A simple read-only display map::

    from olwidget.widgets import MapDisplay

    map = MapDisplay(fields=[mymodel.start_point, mymodel.destination])

    # In a template:

    <head> {{ map.media }} </head>
    <body>... {{ map }} ...</body>

A read-only map displaying informational popups over particular geometries::

    from olwidget.widgets import InfoMap

    map = InfoMap([
        [mymodel.point, "<p>This is where I had my first kiss.</p>"],
        [othermodel.polygon, "<p>This is my home town.</p>"],
        ...
    ])

    # In a template:
    
    <head> {{ map.media }} </head>
    <body>... {{ map }} ...</body>

Inside Admin
------------

``olwidget`` has several advantages over the built-in geodjango admin map
implementation, including greater map customization, support for more geometry
types, and (new in v0.2) the option to include a map in admin changelist pages.

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
        list_map_options = {
            # group nearby points into clusters
            'cluster': True,
            'cluster_display': 'list',
        }
    

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




Authors
~~~~~~~

By Charlie DeTar <cfd@media.mit.edu>.  Based on Django OSMAdmin implementation
by Justin Bronn, Travis Pinney & Dave Springmeyer.

Copying
~~~~~~~

Note: This software is not a part of Django, but the author relinqueshes
copyright to the Django Software Foundation.

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

