.. olwidget documentation master file, created by
   sphinx-quickstart on Fri Apr  2 11:41:38 2010.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Welcome to olwidget's documentation!
====================================

*olwidget* is a javascript library that makes it easy to add editable maps to forms.  It operates by replacing a textarea with an editable map, and writes `WKT <http://en.wikipedia.org/wiki/Well-known_text>`_ data back to the textarea for processing.

**olwidget.js** functions as a standalone javascript library, usable in any context where you need editable maps.  **django-olwidget** is an included Django application that uses olwidget.js to smoothly integrate editable maps into Django forms and to improve the functionality of forms in admin.


.. raw:: html
    :file: inline-olwidget-example.html

Features
~~~~~~~~

 * Easy creation of maps with editable overlays
 * Support for points, linestrings, plygons, and multiple geometry types per map
 * Multiple map providers (including OpenStreetMaps, Google, Yahoo, Microsoft, CloudMade, etc)
 * Maps with informational windows, clustered points, and paginated data displays
 * Extended features for maps in Django admin, including overview maps on changelist pages, support for multiple geometries and collection types, and customizable map colors, start points, and zoom levels
 * Same license as Django (see `COPYING.rst <https://github.com/yourcelf/olwidget/blob/master/COPYING.rst>`_ for details)

Download
~~~~~~~~

Install from `pypi <http://pypi.python.org/pypi/django-olwidget/>`_ using ``easy_install``::

    easy_install django-olwidget

or ``pip``::

    pip install django-olwidget
    
The latest version is `on github <https://github.com/yourcelf/olwidget>`_::

    git clone https://github.com/yourcelf/olwidget.git

Found a bug?  Please file an issue on github.

Documentation
~~~~~~~~~~~~~

.. toctree::
  :maxdepth: 3

  olwidget in Django <django-olwidget>
  standalone olwidget.js <olwidget.js>
  examples
  backwards_incompatible_changes
