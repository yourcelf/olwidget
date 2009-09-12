olwidget v0.3
=============

``olwidget`` is a javascript library and Django application for easily
incorporating editable and informational maps into web pages.  The javascript
library, ``olwidget.js``, can be used standalone or in Django via the
``olwidget`` Django app.

Features include:

* Easy creation of maps with editable overlays
* Support for points, linestrings, polygons, and multiple geometry types per map
* Multiple map providers (including OpenStreetMaps, Google, Yahoo, Microsoft,
  etc)
* Maps with informational windows, clustered points, and paginated data displays
* Extended features for maps in Django admin, including overview maps on
  changelist pages, support for multiple geometries and collection types, and
  customizable map colors, start points, and zoom levels.

Documentation
~~~~~~~~~~~~~

* For Django developers intending to use ``olwidget`` for editable and
  informational maps inside and outside of Django admin, please see the
  `documentation for the django app <doc/django-olwidget.html>`_.

* For javascript developers intending to use ``olwidget.js`` without Django,
  please see `documentation for olwidget.js <doc/olwidget.js.html>`_.

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

