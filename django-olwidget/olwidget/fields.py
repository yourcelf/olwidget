from django import forms

from olwidget.widgets import Map, EditableLayer, InfoLayer

def _build_widget_class(superclass, attributes):
    """ 
    Builds a widget class that can be instantiated with an empty constructor
    (as fields are wont to do) but which encloses options.  Allows
    use of options in declaratively constructed fields. 
    """
    class _Widget(superclass):
        _attributes = attributes
        def __init__(self, **kwargs):
            kwargs.update(self._attributes)
            super(_Widget, self).__init__(**kwargs)
    return _Widget

class MapField(forms.fields.Field):
    """
    Container field for map fields.  Similar to MultiValueField, but with
    greater autonomy of component fields.  Values are never "compressed" or
    "decompressed", and component fields are consulted for their validation.
    Example:

        MapField([EditableLayerField(), InfoLayerField()], options={...})

    """
    def __init__(self, fields, options=None, **kwargs):
        # create map widget enclosing vector layers and options
        layers = [field.widget for field in fields]
        self.widget = kwargs.get('widget', _build_widget_class(Map, 
                {'vector_layers': layers, 'options': options}))
        super(Field, self).__init__(fields, **kwargs)

    def validate(self, value):
        pass

    def clean(self, value):
        """
        Set an arbitrary value for any InfoLayer objects to prevent their
        presence from invalidating the form (they have no data, but it may
        be desirable to include them in a form's map).
        """
        return [f.clean(v) for v,f in zip(value, self.fields]

class EditableLayerField(forms.fields.CharField):
    """
    Convenience field wrapping an EditableLayer widget.  
    Usage:

        EditableLayerField(options={...})
    
    Equivalent to:

        forms.CharField(widget=EditableLayer(options={...}))

    """
    def __init__(self, options=None, **kwargs):
        self.widget = kwargs.get('widget', 
                _build_widget_class(EditableLayer, {'options': options}))
        super(EditableLayerField, self).__init__(**kwargs)

class InfoLayerField(forms.fields.CharField):
    """
    Convenience field wrapping an InfoLayer widget.  
    Usage:

        InfoLayerField(info=[...], options={...})
    
    Equivalent to:

        forms.CharField(widget=InfoLayer(info=[...], options={...}))

    """
    def __init__(self, info, options=None, **kwargs):
        self.widget = kwargs.get('widget', 
            _build_widget_class(InfoLayer, {'info': info, 'options': options}))
        kwargs['required'] = False
        super(InfoLayerField, self).__init__(**kwargs)
