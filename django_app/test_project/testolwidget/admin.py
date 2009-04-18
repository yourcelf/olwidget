from django.contrib.gis import admin
from testolwidget.models import GeoModel, MultiGeoModel

admin.site.register(GeoModel, admin.OSMGeoAdmin)
admin.site.register(MultiGeoModel, admin.OSMGeoAdmin)

