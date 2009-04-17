from django import template
from django.template.loader import render_to_string
from django.utils import simplejson
from django import forms

from olwidget import widgets

register = template.Library()

APIS = {
        'google': widgets.GOOGLE_API,
        'yahoo': widgets.YAHOO_API,
        'osm': widgets.OSM_API,
        'msve': widgets.MS_VE_API,
}

@register.tag
def map_apis(parser, token):
    """
    Arguments: names of map api providers ('osm', 'google', 'yahoo', or
    'msve').  Returns <script> and <link> tags for the javascript and css
    needed to render maps by that provider.
    """
    args = token.split_contents()[1:]

    if not args:
        args = ['osm']
    return MapApiNode(args)

class MapApiNode(template.Node):
    def __init__(self, providers):
        self.providers = [widgets.OL_API, widgets.OLWIDGET_JS] + \
                [APIS[api] for api in providers]
    def render(self, context):
        links = [u"<script type='text/javascript' src='%s'></script>" % \
                        api for api in self.providers]
        links.append("<link rel='stylesheet' media='all' href='%s' />" % \
                widgets.OLWIDGET_CSS)
        return "\n".join(links)


@register.tag
def map(parser, token):
    """
    Arguments: A (unique) name for the map, a possibly empty string of JSON map
    options, and any number of geometry fields to build a map from.
    """
    args = token.split_contents()
    try:
        name = args[1]
    except IndexError:
        raise template.TemplateSyntaxError, "%r tag requires at least 2 arguments (name, and map options)" % token.contents.split()[0]

    map_options = None
    fields = []
    if len(args) > 2:
        if args[2][0] == args[2][-1] and args[2][0] in ("'", '"'):
            map_options = args[2][1:-1] # strip out quote marks
            fields = args[3:]
        else:
            fields = args[2:]

    if not map_options:
        map_options = "{}"


    return MapNode(name, map_options, fields)

class MapNode(template.Node):
    def __init__(self, name, map_options, fields):
        self.name = name
        self.map_options = map_options
        self.fields = [template.Variable(field) for field in fields]

    def render(self, context):
        wkt = "%s"
        if len(self.fields) > 0:
            wkt %= "SRID=4326;%s"
        if len(self.fields) > 1:
            wkt %= "GEOMETRYCOLLECTION(%s)"
        wkt_parts = []
        for field in self.fields:
            geom_field = field.resolve(context)
            wkt_parts.append(widgets.get_wkt(geom_field))
        wkt %= (",".join(wkt_parts))

        context = {
            'id': 'id_%s_map' % self.name,
            'name': self.name,
            'wkt': wkt,
            'map_opts': self.map_options
        }
        return render_to_string("olwidget/olwidget.html", context)
