from django.forms.widgets import Textarea
from django.template.loader import render_to_string
from django.utils import simplejson
from django.conf import settings
from django import forms
from django.utils.safestring import mark_safe

from olwidget import utils

# Default settings for paths and API URLs.  These can all be overridden by
# specifying a value in settings.py

api_defaults = {
    'GOOGLE_API_KEY': "",
    'YAHOO_APP_ID': "",
    'CLOUDMADE_API_KEY': "",
    'OLWIDGET_MEDIA_URL': utils.url_join(settings.MEDIA_URL, "olwidget"),
    'GOOGLE_API': "http://maps.google.com/maps?file=api&v=2",
    'YAHOO_API': "http://api.maps.yahoo.com/ajaxymap?v=3.0",
    'OSM_API': "http://openstreetmap.org/openlayers/OpenStreetMap.js",
    'OL_API': "http://openlayers.org/api/2.8/OpenLayers.js",
    'MS_VE_API' : "http://dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=6.1",
}
api_defaults['CLOUDMADE_API'] = utils.url_join(api_defaults['OLWIDGET_MEDIA_URL'], 
        "js/cloudmade.js")

for key, default in api_defaults.iteritems():
    if not hasattr(settings, key):
        setattr(settings, key, default)

OLWIDGET_JS = utils.url_join(settings.OLWIDGET_MEDIA_URL, "js/olwidget.js")
OLWIDGET_CSS = utils.url_join(settings.OLWIDGET_MEDIA_URL, "css/olwidget.css")

#
# Map widget
#

class Map(forms.widgets.MultiWidget):
    """
    ``Map`` is a container widget for layers.  The constructor takes a list of
    vector layer instances, a dictionary of options for the map, and a template
    to customize rendering.
    """
    default_template = 'olwidget/multi_layer_map.html'
    def __init__(self, vector_layers=None, options=None, template=None):
        self.vector_layers = vector_layers or []
        self.options = options or {}
        # Though this is the olwidget.js default, it must be explicitly set so
        # form.media knows to include osm.
        self.options['layers'] = self.options.get('layers',
                ['osm.mapnik'])
        self.template = template or self.default_template

        super(Map, self).__init__(widgets=self.vector_layers)

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

    def render(self, name, value, attrs=None):
        # value is assumed to be a list.  There is no decompression (as there
        # is no compression in the map form).
        values = value or [None for i in range(len(self.vector_layers))]
        layer_js = []
        layer_html = []

        if name is None:
            name = "data"

        for i, layer in enumerate(self.vector_layers):
            if len(self.vector_layers) == 1:
                layer_name = name
            else:
                layer_name = "%s_%i" % (name, i)
            id_ = "id_%s" % layer_name
            (javascript, html) = layer.prepare(layer_name, values[i], attrs={
                'id': id_ 
            })
            layer_js.append(javascript)
            layer_html.append(html)

        attrs = attrs or {}
        context = {
            'id': attrs.get('id', "id_%s" % id(self)),
            'layer_js': layer_js,
            'layer_html': layer_html,
            'map_opts': simplejson.dumps(utils.translate_options(self.options)),
        }
        return render_to_string(self.template, context)

    def __unicode__(self):
        return self.render(None, None)

    def value_from_datadict(self, data, files, name):
        # The extra logic here is to allow single-layer types to use the
        # MultiValueWidget's name to refer to the data held by the layer's
        # widget.
        if len(self.vector_layers) == 1:
            val = data.get(name, None)
            if val is not None:
                return [val]
            return None
        else:
            return super(Map, self).value_from_datadict(data, files, name)

    def id_for_label(self, id_):
        if id_ and len(self.vector_layers) > 1:
            return id_ + "_0"
        return id_

#
# Layer widgets
#

class BaseVectorLayer(forms.Widget):
    """
    Base type for common functionality among vector layers.
    """
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
    """
    A wrapper for the javscript olwidget.InfoLayer() type.  It is constructed
    with an array [geometry, html] pairs, where the html will be the contents
    of a popup displayed over the geometry, and an optional options dict.
    """
    default_template = 'olwidget/info_layer.html'

    def __init__(self, info=None, options=None, template=None):
        self.info = info or []
        self.options = options or {}
        self.template = template or self.default_template
        super(InfoLayer, self).__init__()

    def prepare(self, name, value, attrs=None):
        wkt_array = []
        for geom, attr in self.info:
            wkt = utils.add_srid(utils.get_wkt(geom))
            if isinstance(attr, dict):
                wkt_array.append([wkt, utils.translate_options(attr)])
            else:
                wkt_array.append([wkt, attr])
        info_json = simplejson.dumps(wkt_array)

        if name and not self.options.has_key('name'):
            self.options['name'] = forms.forms.pretty_name(name)

        context = {
            'info_array': info_json,
            'options': simplejson.dumps(utils.translate_options(self.options)),
        }
        return (mark_safe(render_to_string(self.template, context)), "")

class EditableLayer(BaseVectorLayer):
    """
    A wrapper for the javascript olwidget.EditableLayer() type.  It is
    constructed with an optional options dict.
    """
    default_template = "olwidget/editable_layer.html"

    def __init__(self, options=None, template=None):
        self.options = options or {}
        self.template = template or self.default_template
        super(EditableLayer, self).__init__()

    def prepare(self, name, value, attrs=None):
        if not attrs:
            attrs = {}

        if name and not self.options.has_key('name'):
            self.options['name'] = forms.forms.pretty_name(name)

        self.wkt = utils.add_srid(utils.get_wkt(value))

        context = {
            'id': attrs['id'],
            'options': simplejson.dumps(utils.translate_options(self.options)),
        }
        javascript = mark_safe(render_to_string(self.template, context))
        html = mark_safe(forms.Textarea().render(name, value, attrs))
        return (javascript, html)

#
# Convenience single layer widgets
#

class BaseSingleLayerMap(Map):
    """
    Base type for convenience and backwards compatibility single-layer types.
    """
    layer_opt_keys = []
    def split_options(self, options=None):
        layer_opts = {}
        if options:
            for opt in self.layer_opt_keys:
                if options.has_key(opt):
                    layer_opts[opt] = options.pop(opt)
        return options, layer_opts

class EditableMap(BaseSingleLayerMap):
    """
    Convenience Map widget with a single editable layer.
    """
    layer_opt_keys = ['name', 'editable', 'geometry', 'hide_textarea',
            'hideTextarea', 'is_collection', 'isCollection']
    def __init__(self, options=None):
        options, layer_opts = self.split_options(options)
        super(EditableMap, self).__init__([
            EditableLayer(layer_opts), 
        ], options)
        
class InfoMap(BaseSingleLayerMap):
    """
    Convenience Map widget with a single info layer.
    """
    layer_opt_keys = ['name']
    def __init__(self, info, options=None):
        options, layer_opts = self.split_options(options)
        super(InfoMap, self).__init__([
            InfoLayer(info, options),
        ], options)

