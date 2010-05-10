from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect
from django.conf import settings

from olwidget.fields import MapField, EditableLayerField
from olwidget.widgets import Map, EditableLayer, InfoLayer, InfoMap

from testolwidget.models import *
from testolwidget.forms import AlienActivityForm, CustomTreeForm, \
        DefaultTreeForm, MixedForm

def edit_alienactivity(request, object_id):
    obj = get_object_or_404(AlienActivity, id=object_id)
    form = AlienActivityForm(request.POST or None, initial={
        'incident_name': obj.incident_name,
        'landings': obj.landings,
        'other_stuff': [obj.strange_lights, obj.chemtrails],
    })
    if form.is_valid():
        try:
            obj.landings = form.cleaned_data['landings'][0]
            obj.strange_lights = form.cleaned_data['other_stuff'][0]
            obj.chemtrails = form.cleaned_data['other_stuff'][1]
            obj.incident_name = form.cleaned_data['incident_name']
            obj.save()
            return HttpResponseRedirect(
                    reverse("show_alienactivity", args=[obj.id]))
        except ValueError:
            pass
    return render_to_response("testolwidget/edit_obj.html", {
        'obj': obj, 'form': form,
    }, context_instance=RequestContext(request))


def show_alienactivity(request, object_id):
    obj = get_object_or_404(AlienActivity, id=object_id)
    return render_to_response("testolwidget/show_obj.html", {
        'obj': obj, 'map': Map([
                InfoLayer([[obj.landings, 
                    "%s landings" % obj.incident_name]], {
                        'overlay_style': {
                            'external_graphic': settings.MEDIA_URL+"alien.png",
                            'graphic_width': 21,
                            'graphic_height': 25,
                            'fill_color': '#00FF00',
                            'stroke_color': '#008800',
                        }, 'name': "Landings"
                    }),
                InfoLayer([[obj.strange_lights, 
                    "%s strange lights" % obj.incident_name]], {
                        'overlay_style': {
                            'fill_color': '#FFFF00',
                            'stroke_color': '#FFFF00',
                            'stroke_width': 6,
                        }, 'name': "Strange lights",
                    }),
                InfoLayer([[obj.chemtrails, 
                    "%s chemtrails" % obj.incident_name]], {
                        'overlay_style': {
                            'fill_color': '#ffffff',
                            'stroke_color': '#ffffff',
                            'stroke_width': 6,
                        }, 'name': "Chemtrails",
                    })
            ], {'layers': ['osm.mapnik', 'google.physical']}),
        'edit_link': reverse("edit_alienactivity", args=[obj.id])
    }, context_instance=RequestContext(request))

def edit_tree(request, object_id):
    return do_edit_tree(request, object_id, DefaultTreeForm)

def edit_tree_custom(request, object_id):
    return do_edit_tree(request, object_id, CustomTreeForm)

def do_edit_tree(request, object_id, Form):
    obj = get_object_or_404(Tree, id=object_id)
    form = Form(request.POST or None, instance=obj)
    if form.is_valid():
        form.save()
        return HttpResponseRedirect(reverse("show_tree", args=[obj.id]))
    return render_to_response("testolwidget/edit_obj.html", {
            'obj': obj, 'form': form,
        }, context_instance=RequestContext(request))

def show_tree(request, object_id):
    obj = get_object_or_404(Tree, id=object_id)
    # Use the convenience 1-layer map type
    map_ = InfoMap([
            [obj.root_spread, "Root spread"],
            [obj.location, "Trunk center"],
        ])
    return render_to_response("testolwidget/show_obj.html", {
            'obj': obj, 'map': map_, 
            'edit_link': reverse("edit_tree", args=[obj.id]),
        }, context_instance=RequestContext(request))

def edit_capitals(request):
    return render_to_response("testolwidget/edit_obj.html", {
        'obj': "Capitals",
        'form': MixedForm(),
    }, context_instance=RequestContext(request))


def show_countries(request):
    info = []
    colors = ["red", "green", "blue", "peach"]
    for i,country in enumerate(Country.objects.all()):
        info.append((country.boundary, {
            'html': country.about,
            'style': {
                # TODO: 4-color map algorithm.  Just kidding.
                'fill_color': colors[i]
            },
        }))
    map_ = InfoMap(info)
    return render_to_response("testolwidget/show_obj.html", {
        'obj': "Countries", "map": map_, 
        "edit_link": "/admin/testolwidget/country/",
    }, context_instance=RequestContext(request))

def index(request):
    return render_to_response("testolwidget/index.html", {
            'map': Map([ 
                EditableLayer({
                    'geometry': ['point', 'linestring', 'polygon'],
                    'is_collection': True,
                }),
            ], {
                'default_lat': 42.360836996182,
                'default_lon': -71.087611985694,
                'default_zoom': 10,
                'layers': ['osm.mapnik', 'google.physical'],
            }), 
        }, context_instance=RequestContext(request))
