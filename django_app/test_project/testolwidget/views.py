from django import forms
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect

from testolwidget.models import GeoModel, MultiGeoModel, InfoModel
from olwidget.widgets import MapDisplay, EditableMap, InfoMap

class GeoModelForm(forms.ModelForm):
    point = forms.CharField(widget=EditableMap())
    linestring = forms.CharField(widget=EditableMap(map_options={'geometry': 'linestring'}))
    poly = forms.CharField(widget=EditableMap(map_options={'geometry': 'polygon', 'hide_textarea': False}))
    class Meta:
        model = GeoModel

class MultiGeoModelForm(forms.ModelForm):
    point = forms.CharField(widget=EditableMap(map_options={
        'geometry': 'point',
        'isCollection': True,
    }))
    linestring = forms.CharField(widget=EditableMap(map_options={
        'geometry': 'linestring',
        'isCollection': True,
    }))
    poly = forms.CharField(widget=EditableMap(map_options={
        'geometry': 'polygon',
        'isCollection': True,
    }))
    collection = forms.CharField(widget=EditableMap(map_options={
        'geometry': ['point', 'linestring', 'polygon'],
        'isCollection': True,
    }))
    class Meta:
        model = MultiGeoModel

class InfoModelForm(forms.ModelForm):
    geometry = forms.CharField(widget=EditableMap(map_options={
        'geometry': ['point', 'linestring', 'polygon'],
        'isCollection': True,
    }))
    class Meta:
        model = InfoModel

def show_multigeomodel(request, model_id):
    return show_model(request, model_id, klass=MultiGeoModel)

def show_geomodel(request, model_id):
    return show_model(request, model_id, klass=GeoModel)

def show_model(request, model_id, klass=GeoModel):
    geomodel = klass.objects.get(pk=model_id)
    maps = [("Points", MapDisplay(fields=[geomodel.point], 
                            map_options={'layers': ['google.streets']})),
            ("3 fields: Point, linestring, and poly", MapDisplay(
                fields=[geomodel.point, geomodel.linestring, geomodel.poly], 
                map_options={'hideTextarea': False})), 
    ]
    try:
        maps.append(("Single field Collection", 
            MapDisplay(fields=[geomodel.collection])))
    except AttributeError:
        pass
    map_media = maps[0][1].media
    for descr, map in maps[1:]:
        map_media += map.media
    return render_to_response("testolwidget/show_maps.html",
            {'maps': maps, 'map_media': map_media, 'object': geomodel},
            RequestContext(request))

def show_infomodel(request, model_id):
    object = InfoModel.objects.get(pk=model_id)
    map = InfoMap([(object.geometry, object.story)])
    return render_to_response("testolwidget/info_maps.html",
            {'map': map, 'object': object})

def edit_geomodel(request, model_id=None):
    return edit_model(request, model_id, GeoModelForm)

def edit_multigeomodel(request, model_id=None):
    return edit_model(request, model_id, MultiGeoModelForm)

def edit_model(request, model_id=None, Form=GeoModelForm):
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

def edit_infomodel(request, model_id=None):
    if model_id:
        instance = InfoModel.objects.get(pk=model_id)
    else:
        instance = InfoModel()

    if request.method == 'POST':
        form = InfoModelForm(request.POST, instance=instance)
        try:
            model = form.save()
            return HttpResponseRedirect(model.get_absolute_url())
        except ValueError:
            pass
    else:
        form = InfoModelForm(instance=instance)

    return render_to_response("testolwidget/edit_map.html",
            {'form': form},
            RequestContext(request))

def index(request):
    return render_to_response("testolwidget/index.html", {},
            RequestContext(request))
