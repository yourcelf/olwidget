import os

from django.conf.urls.defaults import *
from django.conf import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Example:
    #(r'^map_test_project/', include('map_test_project.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
     (r'^admin/', include(admin.site.urls)),

     url(r'^test/model/(?P<model_id>\d+)?$', 'testolwidget.views.show_geomodel',
         name='testolwidget-show-geomodel'),
     url(r'^test/multi/(?P<model_id>\d+)?$', 'testolwidget.views.show_multigeomodel',
         name='testolwidget-show-multigeomodel'),
     (r'^test/model/(?P<model_id>\d+)?/?edit$', 'testolwidget.views.edit_geomodel'),
     (r'^test/multi/(?P<model_id>\d+)?/?edit$', 'testolwidget.views.edit_multigeomodel'),
)

if settings.DEBUG:
    urlpatterns += patterns('',
        (r'^media/(?P<path>.*)$', 'django.views.static.serve',
            {'document_root': os.path.join(os.path.dirname(__file__), "media"),
             'show_indexes': True
            }),
    )
