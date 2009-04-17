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


GOOGLE_API = "http://maps.google.com/maps?file=api&v=2&key=%s" 
YAHOO_API = "http://api.maps.yahoo.com/ajaxymap?v=3.0&appid=%s"
MS_VE_API = "http://dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=6.1"
OSM_API = "http://openstreetmap.org/openlayers/OpenStreetMap.js"
OL_API = "http://openlayers.org/api/2.7/OpenLayers.js"
OLWIDGET_JS = join(OLWIDGET_MEDIA_URL, "js/olwidget.js")

class OLWidget(forms.Textarea):
    def __init__(self, *args, **kwargs):
        map_option_defaults = [
            ('default_lon', 0),
            ('default_lat', 0),
            ('default_zoom', 4),
            ('editable', True),
            ('geometry', 'point'),
            ('is_collection', False),
            ('layers', ['osm.mapnik']),
            ('hide_textarea', True),
            ('map_style', {'width': '400px', 'height': '300px'}),
            ('map_class', ''),
            ('overlay_style', 
                {
                    'fillColor': '#ff00ff', 
                    'strokeColor': '#ff00ff',
                    'pointRadius': 6,
                    'fillOpacity': 0.5,
                }),
        ]
        self.options = {}
        for key, value in map_option_defaults:
            if kwargs.has_key(key):
                self.options[key] = kwargs[key]
                del kwargs[key]
            else:
                self.options[key] = value

        self.template = kwargs.get('template', 'olwidget/olwidget.html')

        # API ids
        try:
            self.GOOGLE_API_KEY = self.kwargs.get('GOOGLE_API_KEY', settings.GOOGLE_API_KEY) 
        except AttributeError:
            self.GOOGLE_API_KEY = ""
        try:
            self.YAHOO_APP_ID = self.kwargs.get('YAHOO_APP_ID', settings.YAHOO_APP_ID)
        except AttributeError:
            self.YAHOO_APP_ID = ""

        super(OLWidget, self).__init__(*args, **kwargs)

    def render(self, name, value, attrs=None):
        # without an id, javascript fails
        if not attrs:
            attrs = {}
        if not attrs['id']:
            attrs['id'] = "id_%s" % name

        if isinstance(value, basestring):
            try:
                value = GEOSGeometry(value)
            except (GEOSException, ValueError):
                value = None

        if value and value.geom_type.lower() != self.options['geometry']:
            value = None

        wkt = ''
        if value:
            try:
                ogr = value.ogr
                ogr.transform('900913')
                wkt = ogr.wkt
            except OGRException:
                pass

        self.options['name'] = name
        map_opts = simplejson.dumps(self.options)

        context = {
            'id': attrs['id'],
            'name': name,
            'wkt': wkt,
            'map_opts': map_opts,
        }
        return render_to_string(self.template, context)

    def _media(self):
        js = set()
        # collect scripts necessary for various layers
        for layer in self.options['layers']:
            if layer.startswith("osm."):
                js.add(OSM_API)
            elif layer.startswith("google."):
                js.add(GOOGLE_API % self.GOOGLE_API_KEY)
            elif layer.startswith("yahoo"):
                js.add(YAHOO_API % self.YAHOO_APP_ID)
            elif layer.startswith("microsoft"):
                js.add(MS_VE_API)
        js = [OL_API, OLWIDGET_JS] + list(js)
        return forms.Media(css={'all': (join(OLWIDGET_MEDIA_URL, 'css/olwidget.css'),)}, js=js)
    media = property(_media)
