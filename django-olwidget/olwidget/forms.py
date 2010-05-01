from django import forms

from widgets import MapMixin

#class MapFormOptions(object):
#    def __init__(self, options=None):
#        self.maps = getattr(options, 'maps', None)
#
#def get_maps(bases, attrs):
#    try:
#        maps = getattr(attrs['Meta'], 'maps')
#    except (KeyError, AttributeError):
#        maps = None
#
#    #... do something with fields?  urm....
#    return maps
#
#class MapFormBaseMetaclass(type):
#    def __new__(cls, name, bases, attrs):
#        attrs['maps'] = get_maps(bases, attrs)
#        new_class = super(MapFormBaseMetaClass, cls).__new__(
#                cls, name, bases, attrs)
#
#class MapFormMetaclass(MapFormBaseMetaclass,
#        forms.forms.DeclarativeFieldMetaclass):
#    pass
#
#class BaseMapForm(forms.BaseForm):
#    def __init__(self, *args, **kwargs):
#        super(BaseMapForm, self).__init__(*args, **kwargs)
#
#        # ... fields?  Build widgets, etc.?  Alter "repr"?
#
#class MapForm(BaseMapForm):
#    __metaclass__ = MapFormMetaclass
#    __doc__ = BaseMapForm.__doc__
