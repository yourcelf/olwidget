from django.conf.urls.defaults import *

def build_pattern(name, action="show"):
    return url("^%s/(?P<object_id>\d+)/%s$" % (name, action),
            "%s_%s" % (action, name),
            name="%s_%s" % (action, name))

urlpatterns = patterns('testolwidget.views',
    build_pattern("alienactivity", "show"),
    build_pattern("alienactivity", "edit"),
    build_pattern("tree", "show"),
    build_pattern("tree", "edit"),
    build_pattern("tree_custom", "edit"),
    url("^capitals/edit$", "edit_capitals", name="edit_capitals"),
    url("^countries$", "show_countries", name="show_countries"),
    url("^$", "index", name="index"),
)
