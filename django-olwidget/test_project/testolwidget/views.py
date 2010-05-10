from django import forms
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect, HttpResponse

from testolwidget.models import *
from olwidget.widgets import *

model_names = {
    'country': Country,
    'alienactivity': AlienActivity,
    'energyvortex': EnergyVortex,
    'tree': Tree,
}

def show_obj(request, name, obj_id):
    Model = model_names[name]
    obj = Model.objects.get(id=obj_id)
    return render_to_response("testolwidget/show_obj.html",
            {'obj': obj, }, 
            context_instance=RequestContext(request))

def edit_obj(request, name, obj_id=None):
    if obj_id:
        obj = model_names[name].objects.get(id=obj_id) 
    else:
        obj = model_names[name]()
    print obj._meta.object_name

    form = obj.get_model_form()(request.POST or None, instance=obj)
    if form.is_valid():
        obj = form.save()
        return HttpResponseRedirect(reverse("show_obj", name=name,
            obj_id=obj.id))

    return render_to_response("testolwidget/edit_obj.html",
            {'obj': obj, 'form': form}, 
            context_instance=RequestContext(request))

def index(request):
    pass

