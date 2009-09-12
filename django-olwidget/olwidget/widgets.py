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

PEP8_OPTIONS_TRANSLATION = {
    # map constructor options
    'map_options': 'mapOptions',
    'max_resolution': 'maxResolution',
    'min_resolution': 'minResolution',
    'max_extent': 'maxExtent',
    'min_extent': 'minExtent',
    'min_scale': 'minScale',
    'max_scale': 'maxScale',
    'display_projection': 'displayProjection',
    'num_zoom_levels': 'numZoomLevels',
    # olwidget options
    'map_div_class': 'mapDivClass',
    'map_div_style': 'mapDivStyle',
    'default_lon': 'defaultLon',
    'default_lat': 'defaultLat',
    'default_zoom': 'defaultZoom',
    'hide_textarea': 'hideTextarea',
    'is_collection': 'isCollection',
    'popups_outside': 'popupsOutside',
    'popup_direction': 'popupDirection',
    'popup_pagination_separator': 'popupPaginationSeparator',
    'cluster_display': 'clusterDisplay',
    'cluster_style': 'clusterStyle',
    'font_size': 'fontSize',
    'font_family': 'fontFamily',
    'font_color': 'fontColor',
    # overlay style options
    'overlay_style': 'overlayStyle',
    'fill_color': 'fillColor',
    'fill_opacity': 'fillOpacity',
    'stroke_color': 'strokeColor',
    'stroke_width': 'strokeWidth',
    'stroke_linecap': 'strokeLinecap',
    'stroke_dash_style': 'strokeDashstyle',
    'point_radius': 'pointRadius',
    'external_graphic': 'externalGraphic',
    'graphic_height': 'graphicHeight',
    'graphic_x_offset': 'graphicXOffset',
    'graphic_y_offset': 'graphicYOffset',
    'graphic_opacity': 'graphicOpacity',
    'graphic_name': 'graphicName',
}

def translate_options(options):
    translated = {}
    for key, value in options.iteritems():
        new_key = PEP8_OPTIONS_TRANSLATION.get(key, key)
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
                js.add(OSM_API)
            elif layer.startswith("google."):
                js.add(GOOGLE_API)
            elif layer.startswith("yahoo."):
                js.add(YAHOO_API)
            elif layer.startswith("ve."):
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
            'map_opts': simplejson.dumps(
                translate_options(self.options)
            ),
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

