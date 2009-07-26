from django.contrib import admin
from olwidget.admin import GeoModelAdmin

from testolwidget.models import GeoModel, MultiGeoModel, InfoModel, PointModel

admin.site.register(GeoModel, GeoModelAdmin)

class MyGeoAdmin(GeoModelAdmin):
    map_options = {
        'layers': ['google.streets', 'osm.osmarender', 'yahoo.map'],
        'overlayStyle': {
            'fillColor': '#ffff00',
            'fillOpacity': 0.7,
            'strokeWidth': 5,
         },
         'defaultLon': -72,
         'defaultLat': 44,
    }
    map_fields = ['point']

admin.site.register(MultiGeoModel, MyGeoAdmin)

admin.site.register(InfoModel, GeoModelAdmin)

class PointGeoAdmin(GeoModelAdmin):
    list_map_options = {
        'cluster': True,
        'clusterDisplay': 'list',
        'mapDivStyle': {
            'width': '300px',
            'height': '200px',
        },
    }
    list_map = ['point']

admin.site.register(PointModel, PointGeoAdmin)

