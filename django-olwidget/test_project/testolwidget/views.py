from django import forms
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect, HttpResponse

from testolwidget.models import GeoModel, MultiGeoModel, InfoModel, PointModel, MultiLinestringModel
from olwidget.widgets import MapDisplay, EditableMap, InfoMap

class GeoModelForm(forms.ModelForm):
    point = forms.CharField(widget=EditableMap(options={
        'hide_textarea': False,
    }))
    linestring = forms.CharField(widget=EditableMap(options={
        'geometry': 'linestring',
        'hide_textarea': False,
    }))
    poly = forms.CharField(widget=EditableMap(options={
        'geometry': 'polygon', 
        'hide_textarea': False,
        'hide_textarea': False,
    }))
    class Meta:
        model = GeoModel

class MultiGeoModelForm(forms.ModelForm):
    point = forms.CharField(widget=EditableMap(options={
        'geometry': 'point',
        'is_collection': True,
        'hide_textarea': False,
    }))
    linestring = forms.CharField(widget=EditableMap(options={
        'geometry': 'linestring',
        'is_collection': True,
        'hide_textarea': False,
    }))
    poly = forms.CharField(widget=EditableMap(options={
        'geometry': 'polygon',
        'is_collection': True,
        'hide_textarea': False,
    }))
    collection = forms.CharField(widget=EditableMap(options={
        'geometry': ['point', 'linestring', 'polygon'],
        'is_collection': True,
        'hide_textarea': False,
    }))
    class Meta:
        model = MultiGeoModel

class MultiLinestringModelForm(forms.ModelForm):
    linestring = forms.CharField(widget=EditableMap(options={
        'geometry': 'linestring',
        'is_collection': True,
        'hide_textarea': False,
    }))
    class Meta:
        model = MultiLinestringModel

class InfoModelForm(forms.ModelForm):
    geometry = forms.CharField(widget=EditableMap(options={
        'geometry': ['point', 'linestring', 'polygon'],
        'is_collection': True,
    }))
    class Meta:
        model = InfoModel

def show_multigeomodel(request, model_id):
    return show_model(request, model_id, klass=MultiGeoModel)

def show_multilinestringmodel(request, model_id):
    model = MultiLinestringModel.objects.get(id=model_id)
    map = MapDisplay(fields=[model.linestring])
    return render_to_response("testolwidget/show_maps.html",
            {'maps': [["map", map]], 'map_media': map.media, 'object': model},
            RequestContext(request))

def show_geomodel(request, model_id):
    return show_model(request, model_id, klass=GeoModel)

def show_model(request, model_id, klass=GeoModel):
    geomodel = klass.objects.get(pk=model_id)
    maps = [("Points", 
                MapDisplay(fields=[geomodel.point], 
                    options={'layers': ['google.streets']})),
            ("3 fields: Point, linestring, and poly", 
                MapDisplay(
                    fields=[geomodel.point, geomodel.linestring, geomodel.poly], 
                    options={'hide_textarea': False})), 
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
    map = InfoMap([(object.geometry, object.story)], options={'name': 'Project area'})
    return render_to_response("testolwidget/info_maps.html",
            {'map': map, 'object': object})

def point_infomodel(request):
    geoms = []
    for point in PointModel.objects.all():
        geoms.append([point.point, '%s' % point.point])

    map = InfoMap(geoms)
    return render_to_response("testolwidget/info_maps.html", {'map': map})

def style_infomodel(request):
    geoms = []
    for i, point in enumerate(PointModel.objects.all()):
        color = (float(0xFFFFFF) / len(PointModel.objects.all())) * i
        geoms.append([point.point, { 
            'html': '%s' % point.point, 
            'style': {
                'fill_color': "#%06x" % (color),
                'stroke_color': "#%06x" % (0xFFFFFF - color),
                'fill_opacity': 1,
                'point_radius': 10,
                },
        }])
    map = InfoMap(geoms)
    return render_to_response("testolwidget/info_maps.html", {'map': map})



def edit_geomodel(request, model_id=None):
    return edit_model(request, model_id, GeoModelForm)

def edit_multigeomodel(request, model_id=None):
    return edit_model(request, model_id, MultiGeoModelForm)

def edit_multilinestringmodel(request, model_id=None):
    return edit_model(request, model_id, MultiLinestringModelForm)

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

def test(request):
    object = GeoModel.objects.all()[0]
    temp_map = MapDisplay(
        fields = [object.point],
        options = {
            'mapDivStyle': {
                'width': '100%',
                'height': '100px',
            },
            'editable': False,
            'defaultZoom': '4',
        },
    )
    return HttpResponse("ok!")


