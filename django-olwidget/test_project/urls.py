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
     url(r'^test/pointinfo',
         'testolwidget.views.point_infomodel',
         name='testolwidget-show-point-infomodel'),
     url(r'^test/styleinfo',
         'testolwidget.views.style_infomodel',
         name='testolwidget-style-infomodel'),
     url(r'^test/multilinestring/(?P<model_id>\d+)?$', 
         'testolwidget.views.show_multilinestringmodel',
         name='testolwidget-show-multilinestringmodel'),

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
     url(r'^test/multilinestring/(?P<model_id>\d+)?/?edit$', 
         'testolwidget.views.edit_multilinestringmodel',
         name='testolwidget-edit-multilinestringmodel'),
     (r'^test/test$', 'testolwidget.views.test'),

     ('^$', 'testolwidget.views.index'),
)

if settings.DEBUG:
    urlpatterns += patterns('',
        (r'^media/(?P<path>.*)$', 'django.views.static.serve',
            {'document_root': os.path.join(os.path.dirname(__file__), "media"),
             'show_indexes': True
            }),
    )
