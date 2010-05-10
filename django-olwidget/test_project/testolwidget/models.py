from django.contrib.gis.db import models
from django.core.urlresolvers import reverse

import testolwidget.forms

class Default(models.Model):
    def get_absolute_url(self):
        return reverse("testolwidget:show_obj",
                args=[self._meta.object_name.lower(), self.id])

    def get_edit_url(self):
        return reverse("testolwidget:edit_obj",
                args=[self._meta.object_name.lower(), self.id])

    def get_model_form(self):
        return getattr(testolwidget.forms, 
                "%sModelForm" % self._meta.object_name)

    class Meta:
        abstract = True

class Country(Default):
    name = models.CharField(max_length=255)
    boundary = models.MultiPolygonField()
    about = models.TextField()

    objects = models.GeoManager()

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name_plural = u"Countries"

class EnergyVortex(Default):
    name = models.CharField(max_length=255)
    nexus = models.PointField()
    lines_of_force = models.MultiLineStringField()

    objects = models.GeoManager()

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name_plural = u"Energy vortices"

class AlienActivity(Default):
    incident_name = models.CharField(max_length=255)
    landings = models.MultiPointField()
    strange_lights = models.GeometryCollectionField()
    chemtrails = models.MultiLineStringField()

    objects = models.GeoManager()

    class Meta:
        verbose_name_plural = u"Alien activities"

    def __unicode__(self):
        return self.incident_name

class Tree(Default):
    location = models.PointField()
    root_spread = models.PolygonField()
    species = models.CharField(max_length=255)

    objects = models.GeoManager()

    def __unicode__(self):
        return self.species
