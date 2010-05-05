import re

from django.contrib.gis.gdal import OGRException, OGRGeometry
from django.contrib.gis.geos import GEOSGeometry
from django.forms.widgets import Textarea
from django.template.loader import render_to_string
from django.utils import simplejson
from django.conf import settings
from django import forms
from django.utils.safestring import mark_safe

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
    'CLOUDMADE_API_KEY': "",
    'OLWIDGET_MEDIA_URL': url_join(settings.MEDIA_URL, "olwidget"),
    'GOOGLE_API': "http://maps.google.com/maps?file=api&v=2",
    'YAHOO_API': "http://api.maps.yahoo.com/ajaxymap?v=3.0",
    'OSM_API': "http://openstreetmap.org/openlayers/OpenStreetMap.js",
    'OL_API': "http://openlayers.org/api/2.8/OpenLayers.js",
    'MS_VE_API' : "http://dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=6.1",
}
api_defaults['CLOUDMADE_API'] = url_join(api_defaults['OLWIDGET_MEDIA_URL'], 
        "js/cloudmade.js")

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
            elif layer.startswith("cloudmade."):
                js.add(settings.CLOUDMADE_API + "#" + settings.CLOUDMADE_API_KEY)
        js = [settings.OL_API, OLWIDGET_JS] + list(js)
        return forms.Media(css={'all': (OLWIDGET_CSS,)}, js=js)
    media = property(_media)

#
# New multi layer types
#

class Map(forms.widgets.MultiWidget, MapMixin):
    default_template = 'olwidget/multi_layer_map.html'
    def __init__(self, vector_layers=None, options=None, template=None):
        self.vector_layers = vector_layers or []
        self.set_options(options, template)
        super(Map, self).__init__(widgets=self.vector_layers)

    def render(self, name, value, attrs=None):
        # value is assumed to be a list.
        values = value or [None for i in range(len(self.vector_layers))]
        layer_js = []
        layer_html = []
        for i, layer in enumerate(self.vector_layers):
            (javascript, html) = layer.prepare("%s_%i" % (name, i), values[i])
            layer_js.append(javascript)
            layer_html.append(html)

        attrs = attrs or {}
        context = {
            'id': attrs.get('id', "id_%s" % id(self)),
            'layer_js': layer_js,
            'layer_html': layer_html,
            'map_opts': simplejson.dumps(translate_options(self.options)),
        }
        return render_to_string(self.template, context)

    def __unicode__(self):
        return self.render(None, None)

class BaseVectorLayer(forms.Widget):
    def prepare(self, name, value, attrs=None):
        """
        Given the name, value and attrs, prepare both html and javascript
        components to handle this layer.  Should return (javascript, html)
        tuple.
        """
        raise NotImplementedError

    def render(self, name, value, attrs=None):
        """
        Returns just the javascript component of this widget.  To also get the
        HTML component, call ``prepare`` instead.
        """
        (javascript, html) = self.prepare(name, value, attrs)
        return self.javascript

    def __unicode__(self):
        return self.render(None, None)

class InfoLayer(BaseVectorLayer):
    default_template = 'olwidget/info_layer.html'

    def __init__(self, info=None, options=None, template=None):
        self.info = info or []
        self.options = options or {}
        self.template = template or self.default_template
        super(InfoLayer, self).__init__()

    def prepare(self, name, value, attrs=None):
        wkt_array = []
        for geom, attr in self.info:
            wkt = add_srid(get_wkt(geom))
            if isinstance(attr, dict):
                wkt_array.append([wkt, translate_options(attr)])
            else:
                wkt_array.append([wkt, attr])
        info_json = simplejson.dumps(wkt_array)

        if name and not self.options.has_key('name'):
            self.options['name'] = name

        context = {
            'info_array': info_json,
            'options': simplejson.dumps(translate_options(self.options)),
        }
        return (mark_safe(render_to_string(self.template, context)), "")

class EditableLayer(BaseVectorLayer):
    default_template = "olwidget/editable_layer.html"

    def __init__(self, options=None, template=None):
        self.options = options or {}
        self.template = template or self.default_template
        super(EditableLayer, self).__init__()

    def prepare(self, name, value, attrs=None):
        if not attrs:
            attrs = {}
        attrs['id'] = attrs.get('id', "id_%s" % id(self))

        if name and not self.options.has_key('name'):
            self.options['name'] = name

        self.wkt = add_srid(get_wkt(value))

        context = {
            'id': attrs['id'],
            'options': simplejson.dumps(translate_options(self.options)),
        }
        javascript = mark_safe(render_to_string(self.template, context))
        html = mark_safe(forms.Textarea().render(name, value, attrs))
        return (javascript, html)

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
        # Workaround for Django bug #12312.  GEOSGeometry types don't support
        # 3D wkt; OGRGeometry types output 3D for linestrings even if they
        # should do 2D, causing IntegrityError's.
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

