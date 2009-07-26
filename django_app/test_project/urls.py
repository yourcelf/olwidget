import os

from django.conf.urls.defaults import *
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
     (r'^admin/', include(admin.site.urls)),

     # showing
     url(r'^test/model/(?P<model_id>\d+)?$', 
         'testolwidget.views.show_geomodel',
         name='testolwidget-show-geomodel'),
     url(r'^test/multi/(?P<model_id>\d+)?$', 
         'testolwidget.views.show_multigeomodel',
         name='testolwidget-show-multigeomodel'),
     url(r'^test/info/(?P<model_id>\d+)?$',
         'testolwidget.views.show_infomodel',
         name='testolwidget-show-infomodel'),

     # editing
     url(r'^test/model/(?P<model_id>\d+)?/?edit$', 
         'testolwidget.views.edit_geomodel',
         name='testolwidget-edit-geomodel'),
     url(r'^test/multi/(?P<model_id>\d+)?/?edit$', 
         'testolwidget.views.edit_multigeomodel',
         name='testolwidget-edit-multigeomodel'),
     url(r'^test/info/(?P<model_id>\d+)?/?edit$',
         'testolwidget.views.edit_infomodel',
         name='testolwidget-edit-infomodel'),
)

if settings.DEBUG:
    urlpatterns += patterns('',
        (r'^media/(?P<path>.*)$', 'django.views.static.serve',
            {'document_root': os.path.join(os.path.dirname(__file__), "media"),
             'show_indexes': True
            }),
    )
