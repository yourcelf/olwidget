from os.path import join

from django.contrib.gis.gdal import OGRException
from django.contrib.gis.geos import GEOSGeometry, GEOSException
from django.forms.widgets import Textarea
from django.template.loader import render_to_string
from django.utils import simplejson
from django.conf import settings
from django import forms

try:
    OLWIDGET_MEDIA_URL = settings.OLWIDGET_MEDIA_URL
except AttributeError:
    OLWIDGET_MEDIA_URL = join(settings.MEDIA_URL, "olwidget")

try:
    GOOGLE_API_KEY = settings.GOOGLE_API_KEY
except AttributeError:
    GOOGLE_API_KEY = ""

try:
    YAHOO_APP_ID = settings.YAHOO_APP_ID
except AttributeError:
    YAHOO_APP_ID = ""


GOOGLE_API = "http://maps.google.com/maps?file=api&v=2&key=%s" % GOOGLE_API_KEY
YAHOO_API = "http://api.maps.yahoo.com/ajaxymap?v=3.0&appid=%s" % YAHOO_APP_ID
MS_VE_API = "http://dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=6.1"
OSM_API = "http://openstreetmap.org/openlayers/OpenStreetMap.js"
OL_API = "http://openlayers.org/api/2.7/OpenLayers.js"
OLWIDGET_JS = join(OLWIDGET_MEDIA_URL, "js/olwidget.js")
OLWIDGET_CSS = join(OLWIDGET_MEDIA_URL, "css/olwidget.css")

DEFAULT_PROJ = "4326"

def get_wkt(value, srid=DEFAULT_PROJ):
    """
    `value` is either a WKT string or a geometry field.  Returns WKT in the
    projection for the given SRID.
    """
    if isinstance(value, basestring):
        try:
            value = GEOSGeometry(value)
        except (GEOSException, ValueError):
            value = None

    wkt = ''
    if value:
        try:
            ogr = value.ogr
            ogr.transform(srid)
            wkt = ogr.wkt
        except OGRException:
            pass
    return wkt

def collection_wkt(fields):
    """ Returns WKT for the given list of geometry fields. """

    if not fields:
        return ""

    if len(fields) == 1:
        return get_wkt(fields[0])

    return "GEOMETRYCOLLECTION(%s)" % \
            ",".join(get_wkt(field) for field in fields)

def get_ewkt(wkt, srid=DEFAULT_PROJ):
    """
    Returns EWKT (WKT with a specified SRID) for the given wkt and SRID
    (default 4326). 
    """
    if wkt:
        return "SRID=%s;%s" % (srid, wkt)
    return ""

class OLWidget(forms.Textarea):
    def __init__(self, **kwargs):
        self.map_options = {
            'layers': ['osm.mapnik'],
        }
        self.map_options.update(kwargs.get('map_options', {}))
        print self.map_options

        self.template = kwargs.get('template', 'olwidget/olwidget.html')
        super(OLWidget, self).__init__()

    def render(self, name, value, attrs=None):
        if not attrs:
            attrs = {}
        # without an id, javascript fails
        if attrs.has_key('id'):
            element_id = attrs['id']
        else:
            element_id = "id_%s" % id(self)

        # Allow passing of wkt for MapDisplay subclass
        if attrs.has_key('wkt'):
            wkt = attrs['wkt']
        else:
            # Use the default SRID's
            wkt = get_ewkt(get_wkt(value))

        if name and not self.map_options.has_key('name'):
            self.map_options['name'] = name

        context = {
            'id': element_id,
            'name': name,
            'wkt': wkt,
            'map_opts': simplejson.dumps(self.map_options),
        }
        return render_to_string(self.template, context)

    def _media(self):
        js = set()
        # collect scripts necessary for various layers
        for layer in self.map_options['layers']:
            if layer.startswith("osm."):
                js.add(OSM_API)
            elif layer.startswith("google."):
                js.add(GOOGLE_API)
            elif layer.startswith("yahoo"):
                js.add(YAHOO_API)
            elif layer.startswith("microsoft"):
                js.add(MS_VE_API)
        js = [OL_API, OLWIDGET_JS] + list(js)
        return forms.Media(css={'all': (OLWIDGET_CSS,)}, js=js)
    media = property(_media)

class MapDisplay(OLWidget):
    """
    Object for display of geometries on an OpenLayers map.  Arguments:
    * ``fields`` - a list of geometric fields or WKT strings to display on the
      map.  If none are given, the map will have no overlay.
    * ``name`` - a name to use for display of the field data layer.
    * ``map_options`` - a dict of 
    
    All additional arguments are passed to the OLWidget superclass, which
    control map display.

    To use in a template, first display the media (URLs for javascript and CSS
    needed for map display) and then print the MapDisplay object, as in the
    following::

        <html>
            <head>
                {{ map.media }}
            </head>
            <body>
                {{ map }}
            </body>
        </html>

    By default, maps rendered by MapDisplay objects are not editable, in
    contrast with the OLWidget default (the assumption is that OLWidgets are
    intended to be used in forms for editing data, and MapDisplay objects for
    showing the data), but this can be overrided by providing the argument
    ``editable=True``.  
    """

    def __init__(self, fields=None, name=None, map_options=None):
        self.fields = fields
        self.name = name
        if not map_options:
            map_options = {}
        if not map_options.has_key('editable'):
            map_options['editable'] = False
        if (self.fields and len(self.fields) > 1) or \
                (fields[0].geom_type.upper() == 'GEOMETRYCOLLECTION'):
            map_options['is_collection'] = True

        super(MapDisplay, self).__init__(map_options=map_options)

    def __unicode__(self):
        wkt = get_ewkt(collection_wkt(self.fields))
        return self.render(self.name, None, attrs={'wkt': wkt})
