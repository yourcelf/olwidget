#!/bin/sh

rst2html README.rst > README.html
rst2html doc/backwards_incompatible_changes.rst > doc/backwards_incompatible_changes.html
rst2html doc/olwidget.js.rst > doc/olwidget.js.html
rst2html doc/django-olwidget.rst > doc/django-olwidget.html
