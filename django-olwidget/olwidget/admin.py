"""
Drop-in replacement for admin, similar to that used in the official
django.contrib.gis.admin.  

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

A complete list of options is in the olwidget.js documentation.
"""
import copy

# Get the parts necessary for the methods we override
from django.contrib.admin import ModelAdmin
from django.contrib.gis.db import models
from django.contrib.gis.geos import GeometryCollection
from django.shortcuts import render_to_response
from django import template
from django.contrib.admin.options import IncorrectLookupParameters
from django.http import HttpResponse, HttpResponseRedirect
from django.core.exceptions import PermissionDenied
from django.utils.encoding import force_unicode
from django.utils.translation import ungettext

from olwidget.widgets import EditableMap, InfoMap, DEFAULT_PROJ

class GeoModelAdmin(ModelAdmin):
    options = {}
    list_map = None
    list_map_options = {}
    change_list_template = "admin/olwidget_change_list.html"

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
        Returns an EditableMap subclass with options appropriate for the given
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

        options = copy.deepcopy(self.options) 
        options.update({
            'geometry': geometry, 
            'isCollection': is_collection,
            'name': db_field.name,
        })
        class Widget(EditableMap):
            def __init__(self, *args, **kwargs):
                kwargs['options'] = options
                # OL rendering bug with floats requires this.
                kwargs['template'] = "olwidget/admin_olwidget.html"
                super(Widget, self).__init__(*args, **kwargs)

        return Widget

    def get_changelist_map(self, cl):
        """ 
        Display a map in the admin changelist, with info popups
        """
        if self.list_map:
            info = []
            for obj in cl.get_query_set():
                # Transform the fields into one projection.
                geoms = []
                for field in self.list_map:
                    geom = getattr(obj, field)
                    if callable(geom):
                        geom = geom()
                    geoms.append(geom)
                for geom in geoms:
                    geom.transform(int(DEFAULT_PROJ))

                info.append((
                    GeometryCollection(geoms, srid=int(DEFAULT_PROJ)),
                    "<a href='%s'>%s</a>" % (
                        cl.url_for_result(obj),
                        force_unicode(obj)
                    )
                ))

            return InfoMap(info, options=self.list_map_options)
        return None

    def changelist_view(self, request, extra_context=None):
        # Copied from parent and modified where marked to add map based on
        # change list and media.
        "The 'change list' admin view for this model."
        from django.contrib.admin.views.main import ChangeList, ERROR_FLAG
        opts = self.model._meta
        app_label = opts.app_label
        if not self.has_change_permission(request, None):
            raise PermissionDenied

        # Check actions to see if any are available on this changelist
        actions = self.get_actions(request)

        # Remove action checkboxes if there aren't any actions available.
        list_display = list(self.list_display)
        if not actions:
            try:
                list_display.remove('action_checkbox')
            except ValueError:
                pass

        try:
            cl = ChangeList(request, self.model, list_display, self.list_display_links, self.list_filter,
                self.date_hierarchy, self.search_fields, self.list_select_related, self.list_per_page, self.list_editable, self)
        except IncorrectLookupParameters:
            # Wacky lookup parameters were given, so redirect to the main
            # changelist page, without parameters, and pass an 'invalid=1'
            # parameter via the query string. If wacky parameters were given and
            # the 'invalid=1' parameter was already in the query string, something
            # is screwed up with the database, so display an error page.
            if ERROR_FLAG in request.GET.keys():
                return render_to_response('admin/invalid_setup.html', {'title': _('Database error')})
            return HttpResponseRedirect(request.path + '?' + ERROR_FLAG + '=1')

        # If the request was POSTed, this might be a bulk action or a bulk edit.
        # Try to look up an action first, but if this isn't an action the POST
        # will fall through to the bulk edit check, below.
        if actions and request.method == 'POST':
            response = self.response_action(request, queryset=cl.get_query_set())
            if response:
                return response

        # If we're allowing changelist editing, we need to construct a formset
        # for the changelist given all the fields to be edited. Then we'll
        # use the formset to validate/process POSTed data.
        formset = cl.formset = None


        # Handle POSTed bulk-edit data.
        if request.method == "POST" and self.list_editable:
            FormSet = self.get_changelist_formset(request)
            formset = cl.formset = FormSet(request.POST, request.FILES, queryset=cl.result_list)
            if formset.is_valid():
                changecount = 0
                for form in formset.forms:
                    if form.has_changed():
                        obj = self.save_form(request, form, change=True)
                        self.save_model(request, obj, form, change=True)
                        form.save_m2m()
                        change_msg = self.construct_change_message(request, form, None)
                        self.log_change(request, obj, change_msg)
                        changecount += 1

                if changecount:
                    if changecount == 1:
                        name = force_unicode(opts.verbose_name)
                    else:
                        name = force_unicode(opts.verbose_name_plural)
                    msg = ungettext("%(count)s %(name)s was changed successfully.",
                                    "%(count)s %(name)s were changed successfully.",
                                    changecount) % {'count': changecount,
                                                    'name': name,
                                                    'obj': force_unicode(obj)}
                    self.message_user(request, msg)

                return HttpResponseRedirect(request.get_full_path())

        # Handle GET -- construct a formset for display.
        elif self.list_editable:
            FormSet = self.get_changelist_formset(request)
            formset = cl.formset = FormSet(queryset=cl.result_list)

        # Build the list of media to be used by the formset.
        if formset:
            media = self.media + formset.media
        else:
            media = self.media

        # Build the action form and populate it with available actions.
        if actions:
            action_form = self.action_form(auto_id=None)
            action_form.fields['action'].choices = self.get_action_choices(request)
        else:
            action_form = None

        context = {
            'title': cl.title,
            'is_popup': cl.is_popup,
            'cl': cl,
            'media': media,
            'has_add_permission': self.has_add_permission(request),
            'root_path': self.admin_site.root_path,
            'app_label': app_label,
            'action_form': action_form,
            'actions_on_top': self.actions_on_top,
            'actions_on_bottom': self.actions_on_bottom,
        }

        # MODIFICATION
        map = self.get_changelist_map(cl)
        if map:
            context['media'] += map.media
            context['map'] = map
        # END MODIFICATION

        context.update(extra_context or {})
        return render_to_response(self.change_list_template or [
            'admin/%s/%s/change_list.html' % (app_label, opts.object_name.lower()),
            'admin/%s/change_list.html' % app_label,
            'admin/change_list.html'
        ], context, context_instance=template.RequestContext(request))

