from django.contrib import admin
from olwidget.admin import GeoModelAdmin

from testolwidget.models import GeoModel, MultiGeoModel, InfoModel, PointModel

admin.site.register(GeoModel, GeoModelAdmin)

class MyGeoAdmin(GeoModelAdmin):
    options = {
        'layers': ['google.streets', 'osm.osmarender', 'yahoo.map'],
        'overlay_style': {
            'fill_color': '#ffff00',
            'fill_opacity': 0.7,
            'stroke_width': 5,
         },
         'default_lon': -72,
         'default_lat': 44,
         'hide_textarea': False,
    }
    map_fields = ['point']

admin.site.register(MultiGeoModel, MyGeoAdmin)
admin.site.register(InfoModel, GeoModelAdmin)

class PointGeoAdmin(GeoModelAdmin):
    list_map_options = {
        'cluster': True,
        'cluster_display': 'list',
        'map_div_style': {
            'width': '300px',
            'height': '200px',
        },
    }
    list_map = ['point']

admin.site.register(PointModel, PointGeoAdmin)

