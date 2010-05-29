from django.contrib.gis.db import models
from django.core.urlresolvers import reverse

class Country(models.Model):
    name = models.CharField(max_length=255)
    boundary = models.MultiPolygonField()
    about = models.TextField()

    objects = models.GeoManager()

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name_plural = u"Countries"

class EnergyVortex(models.Model):
    name = models.CharField(max_length=255)
    nexus = models.PointField()
    lines_of_force = models.MultiLineStringField()

    objects = models.GeoManager()

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name_plural = u"Energy vortices"

class AlienActivity(models.Model):
    incident_name = models.CharField(max_length=255)
    landings = models.MultiPointField()
    strange_lights = models.GeometryCollectionField()
    chemtrails = models.MultiLineStringField()

    objects = models.GeoManager()

    class Meta:
        verbose_name_plural = u"Alien activities"

    def __unicode__(self):
        return self.incident_name

class Tree(models.Model):
    location = models.PointField()
    root_spread = models.PolygonField()
    species = models.CharField(max_length=255)

    objects = models.GeoManager()

    def __unicode__(self):
        return self.species

class Nullable(models.Model):
    location = models.PointField(null=True, blank=True)

    objects = models.GeoManager()

    def __unicode__(self):
        return str(self.location)
