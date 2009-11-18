from django.contrib.gis.db import models
from django.core.urlresolvers import reverse

class GeoModel(models.Model):
    point = models.PointField()
    poly = models.PolygonField()
    linestring = models.LineStringField()

    objects = models.GeoManager()

    def get_absolute_url(self):
        return reverse("testolwidget-show-geomodel", args=[self.id])

    def get_edit_url(self):
        return reverse("testolwidget-edit-geomodel", args=[self.id])

class MultiGeoModel(models.Model):
    point = models.MultiPointField()
    poly = models.MultiPolygonField()
    linestring = models.MultiLineStringField()
    collection = models.GeometryCollectionField()

    objects = models.GeoManager()

    def get_absolute_url(self):
        return reverse("testolwidget-show-multigeomodel", args=[self.id])

    def get_edit_url(self):
        return reverse("testolwidget-edit-multigeomodel", args=[self.id])

class InfoModel(models.Model):
    geometry = models.GeometryCollectionField()
    story = models.TextField(help_text="Tell a story about this geometry.")

    objects = models.GeoManager()

    def get_absolute_url(self):
        return reverse("testolwidget-show-infomodel", args=[self.id])

    def get_edit_url(self):
        return reverse("testolwidget-edit-infomodel", args=[self.id])

class PointModel(models.Model):
    name = models.CharField(max_length=15)
    point = models.PointField()

    objects = models.GeoManager()

    def __unicode__(self):
        return self.name

class MultiLinestringModel(models.Model):
    linestring = models.MultiLineStringField()

    def get_absolute_url(self):
        return reverse("testolwidget-show-multilinestringmodel", args=[self.id])

    def get_absolute_url(self):
        return reverse("testolwidget-edit-multilinestringmodel", args=[self.id])
