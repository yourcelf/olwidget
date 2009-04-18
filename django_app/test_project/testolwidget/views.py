from django import forms
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect

from testolwidget.models import GeoModel, MultiGeoModel
from olwidget.widgets import MapDisplay, OLWidget

class GeoModelForm(forms.ModelForm):
    point = forms.CharField(widget=OLWidget())
    linestring = forms.CharField(widget=OLWidget(map_options={'geometry': 'linestring'}))
    poly = forms.CharField(widget=OLWidget(map_options={'geometry': 'polygon', 'hide_textarea': False}))
    class Meta:
        model = GeoModel

class MultiGeoModelForm(forms.ModelForm):
    point = forms.CharField(widget=OLWidget(map_options={
        'geometry': 'point',
        'is_collection': True,
    }))
    linestring = forms.CharField(widget=OLWidget(map_options={
        'geometry': 'linestring',
        'is_collection': True,
    }))
    poly = forms.CharField(widget=OLWidget(map_options={
        'geometry': 'polygon',
        'is_collection': True,
    }))
    collection = forms.CharField(widget=OLWidget(map_options={
        'geometry': ['point', 'linestring', 'polygon'],
        'is_collection': True,
    }))
    class Meta:
        model = MultiGeoModel

def show_multigeomodel(request, model_id):
    return show_model(request, model_id, klass=MultiGeoModel)

def show_geomodel(request, model_id):
    return show_model(request, model_id, klass=GeoModel)

def show_model(request, model_id, klass=GeoModel):
    geomodel = klass.objects.get(pk=model_id)
    maps = [
        MapDisplay(fields=[geomodel.point], map_options={'layers': ['google.streets']}),
        MapDisplay(fields=[geomodel.point, geomodel.linestring, geomodel.poly], map_options={'hide_textarea': False})
    ]
    try:
        maps.append(MapDisplay(fields=[geomodel.collection]))
    except AttributeError:
        pass
    map_media = maps[0].media
    for map in maps[1:]:
        map_media += map.media
    return render_to_response("testolwidget/show_maps.html",
            {'maps': maps, 'map_media': map_media},
            RequestContext(request))

def edit_geomodel(request, model_id = None):
    return edit_model(request, model_id, GeoModelForm)

def edit_multigeomodel(request, model_id = None):
    return edit_model(request, model_id, MultiGeoModelForm)

def edit_model(request, model_id = None, Form = GeoModelForm):
    if model_id:
        instance = Form.Meta.model.objects.get(pk=model_id)
    else:
        instance = Form.Meta.model()

    if request.method == 'POST':
        form = Form(request.POST, instance=instance)
        try:
            model = form.save()
            return HttpResponseRedirect(model.get_absolute_url())
        except ValueError:
            pass
    else:
        form = Form(instance=instance)

    return render_to_response("testolwidget/edit_map.html",
            {'form': form},
            RequestContext(request))
