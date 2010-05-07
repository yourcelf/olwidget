from django import forms

from olwidget.widgets import Map, EditableLayer, InfoLayer

def _build_widget_class(superclass, attributes):
    """ 
    Builds a widget class that can be instantiated with an empty constructor
    (as fields are wont to do) but which encloses options. 
    """
    class _Widget(superclass):
        _attributes = attributes
        def __init__(self, **kwargs):
            kwargs.update(self._attributes)
            super(_Widget, self).__init__(**kwargs)
    return _Widget

class MapField(forms.fields.MultiValueField):
    """
    Extends MultiValueField for the particular case of map layers.  Allows the
    addition of non-editable layers which are used in the map, but aren't
    properly "fields".
    """
    def __init__(self, fields, options=None, **kwargs):
        # create map widget enclosing vector layers and options
        layers = [field.widget for field in fields]
        self.widget = kwargs.get('widget', _build_widget_class(Map, 
                {'vector_layers': layers, 'options': options}))
        super(MapField, self).__init__(fields, **kwargs)

    def compress(self, data_list):
        # no compression; return list
        return data_list

    def clean(self, value):
        """
        Set an arbitrary value for any InfoLayer objects to prevent their
        presence from invalidating the form.
        """
        fixed = []
        for i,val in enumerate(value):
            if isinstance(self.fields[i].widget, InfoLayer):
                fixed.append(1)
            else:
                fixed.append(val)
        return super(MapField, self).clean(fixed)



class EditableLayerField(forms.fields.CharField):
    def __init__(self, options=None, **kwargs):
        self.widget = _build_widget_class(EditableLayer, {'options': options})
        super(EditableLayerField, self).__init__(**kwargs)

class InfoLayerField(forms.fields.CharField):
    """
    Read-only field for displaying vector data on the same map used to edit
    data in another field.
    """
    def __init__(self, info, options=None, **kwargs):
        self.widget = _build_widget_class(InfoLayer, 
                {'info': info, 'options': options})
        kwargs['required'] = False
        super(InfoLayerField, self).__init__(**kwargs)
