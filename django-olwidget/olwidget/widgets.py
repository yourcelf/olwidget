import re

from django.contrib.gis.gdal import OGRException, OGRGeometry
from django.contrib.gis.geos import GEOSGeometry
from django.forms.widgets import Textarea
from django.template.loader import render_to_string
from django.utils import simplejson
from django.conf import settings
from django import forms

def reduce_url_parts(a, b):
    if a and a[-1] == "/":
        return a + b
    return a + "/" + b

def url_join(*args):
    return reduce(reduce_url_parts, args)
    
# Default settings for paths and API URLs.  These can all be overridden by
# specifying a value in settings.py

api_defaults = {
    'GOOGLE_API_KEY': "",
    'YAHOO_APP_ID': "",
    'OLWIDGET_MEDIA_URL': url_join(settings.MEDIA_URL, "olwidget"),
    'GOOGLE_API': "http://maps.google.com/maps?file=api&v=2",
    'YAHOO_API': "http://api.maps.yahoo.com/ajaxymap?v=3.0",
    'OSM_API': "http://openstreetmap.org/openlayers/OpenStreetMap.js",
    'OL_API': "http://openlayers.org/api/2.8/OpenLayers.js",
    'MS_VE_API' : "http://dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=6.1",
}

for key, default in api_defaults.iteritems():
    if not hasattr(settings, key):
        setattr(settings, key, default)

OLWIDGET_JS = url_join(settings.OLWIDGET_MEDIA_URL, "js/olwidget.js")
OLWIDGET_CSS = url_join(settings.OLWIDGET_MEDIA_URL, "css/olwidget.css")

DEFAULT_PROJ = "4326"

def separated_lowercase_to_lower_camelcase(input):
    return re.sub('_\w', lambda match: match.group(0)[-1].upper(), input)

def translate_options(options):
    translated = {}
    for key, value in options.iteritems():
        new_key = separated_lowercase_to_lower_camelcase(key)
        # recurse
        if isinstance(value, dict):
            translated[new_key] = translate_options(value)
        else:
            translated[new_key] = value
    return translated

class MapMixin(object):
    def set_options(self, options, template):
        self.options = options or {}
        # Though this is the olwidget.js default, it must be explicitly set so
        # form.media knows to include osm.
        self.options['layers'] = self.options.get('layers',
                ['osm.mapnik'])
        self.template = template or self.default_template

    def _media(self):
        js = set()
        # collect scripts necessary for various layers
        for layer in self.options['layers']:
            if layer.startswith("osm."):
                js.add(settings.OSM_API)
            elif layer.startswith("google."):
                js.add(settings.GOOGLE_API + "&key=%s" % settings.GOOGLE_API_KEY)
            elif layer.startswith("yahoo."):
                js.add(settings.YAHOO_API + "&appid=%s" % settings.YAHOO_APP_ID)
            elif layer.startswith("ve."):
                js.add(settings.MS_VE_API)
        js = [settings.OL_API, OLWIDGET_JS] + list(js)
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
                options={'geometry': 'point'}))
    """
    default_template = 'olwidget/editable_map.html'

    def __init__(self, options=None, template=None):
        self.set_options(options, template)
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

        if name and not self.options.has_key('name'):
            self.options['name'] = name

        context = {
            'id': element_id,
            'name': name,
            'wkt': wkt,
            'map_opts': simplejson.dumps(
                translate_options(self.options)
            ),
        }
        return render_to_string(self.template, context)

class MapDisplay(EditableMap):
    """
    Object for display of geometries on an OpenLayers map.  Arguments (all are
    optional):

    * ``fields`` - a list of geometric fields or WKT strings to display on the
      map.  If none are given, the map will have no overlay.
    * ``name`` - a name to use for display of the field data layer.
    * ``options`` - a dict of options for map display.  A complete list of
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
    can be overriden by setting "options['editable'] = True".
    """

    def __init__(self, fields=None, options=None, template=None):
        self.fields = fields

        options = options or {}
        if not options.has_key('editable'):
            options['editable'] = False

        if (self.fields and len(self.fields) > 1) or \
                (fields[0].geom_type.upper() == 'GEOMETRYCOLLECTION'):
            options['isCollection'] = True

        super(MapDisplay, self).__init__(options, template)

    def __unicode__(self):
        wkt = add_srid(collection_wkt(self.fields))
        name = self.options.get('name', 'data')
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

    * ``options``: an optional dict of options for map display.

    In templates, InfoMap.media must be displayed in addition to InfoMap for
    the map to function properly.
      
    """
    default_template = 'olwidget/info_map.html'

    def __init__(self, info=None, options=None, template=None):
        self.info = info
        self.set_options(options, template)
        super(InfoMap, self).__init__()

    def render(self, name, value, attrs=None):
        if not self.info:
            info_json = '[]'
        else:
            # convert fields to wkt and translate options if needed
            wkt_array = []
            for geom, attr in self.info:
                wkt = add_srid(get_wkt(geom))
                if isinstance(attr, dict):
                    wkt_array.append([wkt, translate_options(attr)])
                else:
                    wkt_array.append([wkt, attr])

            info_json = simplejson.dumps(wkt_array)

        # arbitrary unique id
        div_id = "id_%s" % id(self)

        context = {
            'id': div_id,
            'info_array': info_json,
            'map_opts': simplejson.dumps(
                translate_options(self.options)
            ),
        }
        return render_to_string(self.template, context)

    def __unicode__(self):
        return self.render(None, None)

ewkt_re = re.compile("^SRID=(?P<srid>\d+);(?P<wkt>.+)$", re.I)
def get_wkt(value, srid=DEFAULT_PROJ):
    """
    `value` is either a WKT string or a geometry field.  Returns WKT in the
    projection for the given SRID.
    """
    ogr = None
    if value:
        if isinstance(value, OGRGeometry):
            ogr = value
        elif isinstance(value, GEOSGeometry):
            ogr = value.ogr
        elif isinstance(value, basestring):
            match = ewkt_re.match(value)
            if match:
                ogr = OGRGeometry(match.group('wkt'), match.group('srid'))
            else:
                ogr = OGRGeometry(value)

    wkt = ''
    if ogr:
        # Workaround for Django bug #12312.  GEOSGeometry types don't support 3D wkt;
        # OGRGeometry types output 3D for linestrings even if they should do 2D, causing
        # IntegrityError's.
        if ogr.dimension == 2:
            geos = ogr.geos
            geos.transform(srid)
            wkt = geos.wkt
        else:
            ogr.transform(srid)
            wkt = ogr.wkt 
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

