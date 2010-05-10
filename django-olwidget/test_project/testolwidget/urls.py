from django.conf.urls.defaults import *

urlpatterns = patterns('testolwidget.views',
    url("(?P<name>\w+)/(?P<obj_id>\d+)$", 'show_obj', name='show_obj'),
    url("(?P<name>\w+)/(?P<obj_id>\d+)/edit$", 'edit_obj', name='edit_obj'),
    url("^$", 'index', name='index'),
)
