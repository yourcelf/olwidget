# Get the normal admin routines, classes, and `site` instance.
from django.contrib.admin import autodiscover, site, AdminSite, ModelAdmin, StackedInline, TabularInline, HORIZONTAL, VERTICAL

from django.contrib.admin import ModelAdmin
from django.contrib.gis.db import models

from olwidget.widgets import OLWidget

def custom_geo_admin(custom_map_options):
    """ Returns a GeoModelAdmin class with the given map options. """

    class CustomGeoModelAdmin(GeoModelAdmin):
        map_options = custom_map_options

    return CustomGeoModelAdmin


class GeoModelAdmin(ModelAdmin):
    map_options = {}

    def formfield_for_dbfield(self, db_field, **kwargs):
        """
        Overloaded from ModelAdmin to use our map widget.
        """
        if isinstance(db_field, models.GeometryField):
            request = kwargs.pop('request', None)
            kwargs['widget'] = self.get_map_widget(db_field)
            return db_field.formfield(**kwargs)
        else:
            return super(GeoModelAdmin, self).formfield_for_dbfield(
                    db_field, **kwargs)

    def get_map_widget(self, db_field):
        """
        Returns an OLWidget subclass with options appropriate for the given
        field.
        """
        is_collection = db_field.geom_type in ('MULTIPOINT', 'MULTILINESTRING', 
                'MULTIPOLYGON', 'GEOMETRYCOLLECTION')
        if db_field.geom_type == 'GEOMETRYCOLLECTION':
            geometry = ['polygon', 'point', 'linestring']
        else:
            if db_field.geom_type in ('MULTIPOINT', 'POINT'):
                geometry = 'point'
            elif db_field.geom_type in ('POLYGON', 'MULTIPOLYGON'):
                geometry = 'polygon'
            elif db_field.geom_type in ('LINESTRING', 'MULTILINESTRING'):
                geometry = 'linestring'
            else:
                # fallback: allow all types.
                geometry = ['polygon', 'point', 'linestring']

        self.map_options.update({
            'geometry': geometry, 
            'is_collection': is_collection,
            'name': db_field.name,
        })

        map_options = self.map_options #closure-ify map_options
        class Widget(OLWidget):
            def __init__(self, *args, **kwargs):
                kwargs['map_options'] = map_options
                # OL rendering bug with floats requires this
                kwargs['template'] = "olwidget/admin_olwidget.html"
                super(Widget, self).__init__(*args, **kwargs)

        return Widget
