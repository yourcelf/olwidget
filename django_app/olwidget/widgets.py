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
OL_API = "http://openlayers.org/api/2.8/OpenLayers.js"
OLWIDGET_JS = join(OLWIDGET_MEDIA_URL, "js/olwidget.js")
OLWIDGET_CSS = join(OLWIDGET_MEDIA_URL, "css/olwidget.css")

DEFAULT_PROJ = "4326"

class MapMixin(object):
    def set_options(self, map_options, template):
        self.map_options = map_options or {}
        # Though this is the olwidget.js default, it must be explicitly set so
        # form.media knows to include osm.
        self.map_options['layers'] = self.map_options.get('layers',
                ['osm.mapnik'])
        self.template = template or self.default_template

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
            elif layer.startswith("ve"):
                js.add(MS_VE_API)
        js = [OL_API, OLWIDGET_JS] + list(js)
        return forms.Media(css={'all': (OLWIDGET_CSS,)}, js=js)
    media = property(_media)

class EditableMap(forms.Textarea, MapMixin):
    """
    An OpenLayers mapping widget for geographic data.

    Example::

        from django import forms
        from olwidget.widgets import OLWidget

        class MyForm(forms.Form):
            location = forms.CharField(widget=EditableMap(
                map_options={'geometry': 'point'}))

    A complete list of the options available in map_options is in the
    olwidget.js documentation.
    """
    default_template = 'olwidget/editable_map.html'

    def __init__(self, map_options=None, template=None):
        self.set_options(map_options, template)
        super(EditableMap, self).__init__()

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
            wkt = add_srid(get_wkt(value))

        if name and not self.map_options.has_key('name'):
            self.map_options['name'] = name

        context = {
            'id': element_id,
            'name': name,
            'wkt': wkt,
            'map_opts': simplejson.dumps(self.map_options),
        }
        return render_to_string(self.template, context)

class MapDisplay(EditableMap):
    """
    Object for display of geometries on an OpenLayers map.  Arguments (all are
    optional):

    * ``fields`` - a list of geometric fields or WKT strings to display on the
      map.  If none are given, the map will have no overlay.
    * ``name`` - a name to use for display of the field data layer.
    * ``map_options`` - a dict of options for map display.  A complete list of
      options is in the documentation for olwidget.js.

    Example::

        from olwidget.widgets import MapDisplay 

        map = MapDisplay(fields=[my_model.start_point, my_model.destination])

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

    By default, maps rendered by MapDisplay objects are not editable, but this
    can be overriden by setting "map_options['editable'] = True".
    """

    def __init__(self, fields=None, map_options=None, template=None):
        self.fields = fields

        map_options = map_options or {}
        if not map_options.has_key('editable'):
            map_options['editable'] = False

        if (self.fields and len(self.fields) > 1) or \
                (fields[0].geom_type.upper() == 'GEOMETRYCOLLECTION'):
            map_options['isCollection'] = True

        super(MapDisplay, self).__init__(map_options, template)

    def __unicode__(self):
        wkt = add_srid(collection_wkt(self.fields))
        name = self.map_options.get('name', 'data')
        return self.render(name, None, attrs={'wkt': wkt})

class InfoMap(forms.Widget, MapMixin):
    """
    Widget for displaying maps with pop-up info boxes over geometries.
    Arguments:

    * ``info``: an array of [geometry, HTML] pairs that specify geometries, and
      the popup contents associated with them. Geometries can be expressed as
      geometry fields, or as WKT strings.  Example::

          [
            [geomodel1.geofield, "<p>Model One</p>"],
            [geomodel2.geofield, "<p>Model Two</p>"],
            ...
          ]

    * ``map_options``: an optional dict of options for map display.  A complete
      list of options is in the documentation for olwidget.js

    In templates, InfoMap.media must be displayed in addition to InfoMap for
    the map to function properly.
      
    """
    default_template = 'olwidget/info_map.html'

    def __init__(self, info=None, map_options=None, template=None):
        self.info = info
        self.set_options(map_options, template)
        super(InfoMap, self).__init__()

    def render(self, name, value, attrs=None):
        if self.info is None:
            info_json = '[]'
        else:
            # convert fields to wkt
            for geom, html in self.info:
                wkt_array = [[add_srid(collection_wkt(geom)), html] for geom, html in self.info]
            info_json = simplejson.dumps(wkt_array)

        # arbitrary unique id
        div_id = "id_%s" % id(self)

        context = {
            'id': div_id,
            'info_array': info_json,
            'map_opts': simplejson.dumps(self.map_options),
        }
        return render_to_string(self.template, context)

    def __unicode__(self):
        return self.render(None, None)

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

def add_srid(wkt, srid=DEFAULT_PROJ):
    """
    Returns EWKT (WKT with a specified SRID) for the given wkt and SRID
    (default 4326). 
    """
    if wkt:
        return "SRID=%s;%s" % (srid, wkt)
    return ""

