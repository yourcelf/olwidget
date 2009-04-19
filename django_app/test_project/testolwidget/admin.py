from django.contrib.gis import admin as gis_admin
from olwidget import admin

from testolwidget.models import GeoModel, MultiGeoModel

admin.site.register(GeoModel, admin.GeoModelAdmin)
admin.site.register(MultiGeoModel, admin.custom_geo_admin({
    'layers': ['google.streets', 'osm.osmarender', 'yahoo'],
    'overlay_style': {
        'fillColor': '#ffff00',
        'fillOpacity': 0.7,
        'strokeWidth': 5,
     },
     'default_lon': -72,
     'default_lat': 44,
}))

