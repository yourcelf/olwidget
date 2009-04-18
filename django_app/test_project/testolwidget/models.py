from django.contrib.gis.db import models
from django.core.urlresolvers import reverse

class GeoModel(models.Model):
    point = models.PointField()
    poly = models.PolygonField()
    linestring = models.LineStringField()

    objects = models.GeoManager()

    def get_absolute_url(self):
        return reverse("testolwidget-show-geomodel", args=[self.id])

class MultiGeoModel(models.Model):
    point = models.MultiPointField()
    poly = models.MultiPolygonField()
    linestring = models.MultiLineStringField()
    collection = models.GeometryCollectionField()

    objects = models.GeoManager()

    def get_absolute_url(self):
        return reverse("testolwidget-show-multigeomodel", args=[self.id])
