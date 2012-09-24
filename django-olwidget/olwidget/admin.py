"""
Example to use olwidget for mapping in the django admin site::

    from olwidget import admin
    from myapp import SomeGeoModel

    admin.site.register(SomeGeoModel, admin.GeoModelAdmin)

If you want to use custom OLWidget options to change the look and feel of the
map, just subclass GeoModelAdmin, and define "options", for example::

    class CustomGeoAdmin(admin.GeoModelAdmin):
        options = {
            'layers': ['google.hybrid'],
            'overlayStyle': {
                'fillColor': '#ffff00',
                'strokeWidth': 5,
            },
            'defaultLon': -72,
            'defaultLat': 44,
            'defaultZoom': 4,
        }

    admin.site.register(SomeGeoModel, CustomGeoAdmin)

A complete list of options is in the olwidget documentation.
"""

from django.contrib.admin import ModelAdmin
from django.contrib.gis.geos import GeometryCollection
from django.contrib.admin.options import csrf_protect_m
from django.utils.encoding import force_unicode

from olwidget.forms import apply_maps_to_modelform_fields, fix_initial_data, fix_cleaned_data
from olwidget.widgets import InfoMap
from olwidget.utils import DEFAULT_PROJ

__all__ = ('GeoModelAdmin',)

class GeoModelAdmin(ModelAdmin):
    options = None
    map_template = "olwidget/admin_olwidget.html"
    list_map = None
    list_map_options = None
    maps = None
    change_list_template = "admin/olwidget_change_list.html"
    default_field_class = None

    def get_form(self, *args, **kwargs):
        """
        Get a ModelForm with our own `__init__` and `clean` methods.  However,
        we need to allow ModelForm's metaclass_factory to run unimpeded, so
        dynamically override the methods rather than subclassing.
        """
        # Get the vanilla modelform class
        ModelForm = super(GeoModelAdmin, self).get_form(*args, **kwargs)

        # enclose klass.__init__
        orig_init = ModelForm.__init__
        def new_init(self, *args, **kwargs):
            orig_init(self, *args, **kwargs)
            fix_initial_data(self.initial, self.initial_data_keymap)

        # enclose klass.clean
        orig_clean = ModelForm.clean
        def new_clean(self):
            orig_clean(self)
            fix_cleaned_data(self.cleaned_data, self.initial_data_keymap)
            return self.cleaned_data

        # Override methods
        ModelForm.__init__ = new_init
        ModelForm.clean = new_clean

        # Rearrange fields
        ModelForm.initial_data_keymap = apply_maps_to_modelform_fields(
                ModelForm.base_fields, self.maps, self.options,
                self.map_template,
                default_field_class=self.default_field_class)
        return ModelForm

    def get_changelist_map(self, cl, request=None):
        """
        Display a map in the admin changelist, with info popups
        """
        if self.list_map:
            info = []
            if request:
                qs = cl.get_query_set(request)
            else:
                qs = cl.get_query_set()
            for obj in qs:
                # Transform the fields into one projection.
                geoms = []
                for field in self.list_map:
                    geom = getattr(obj, field)
                    if geom:
                        if callable(geom):
                            geom = geom()
                        geoms.append(geom)
                for geom in geoms:
                    geom.transform(int(DEFAULT_PROJ))

                if geoms:
                    info.append((
                        GeometryCollection(geoms, srid=int(DEFAULT_PROJ)),
                        "<a href='%s'>%s</a>" % (
                            cl.url_for_result(obj),
                            force_unicode(obj)
                        )
                    ))

            return InfoMap(info, options=self.list_map_options)
        return None

    @csrf_protect_m
    def changelist_view(self, request, extra_context=None):
        template_response = super(GeoModelAdmin, self).changelist_view(
                request, extra_context)
        if hasattr(template_response, 'context_data') and \
                'cl' in template_response.context_data:
            map_ = self.get_changelist_map(
                    template_response.context_data['cl'], request)
            if map_:
                template_response.context_data['media'] += map_.media
                template_response.context_data['map'] = map_
        return template_response
