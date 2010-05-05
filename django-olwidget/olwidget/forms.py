from django import forms

from widgets import MapMixin

class LayerField(forms.fields.CharField):
    def __init__(self, options=None, **kwargs):
        self.options = options or {}
        super(CharField, self).__init__(**kwargs)

class MapField(forms.fields.Field):
    def __init__(self, fields=None, **kwargs):
        self.options = kwargs.pop(options, {})
        super(MapField, self).__init__(*args, **kwargs)
        self.widget = EditableMap(self.fields, self.options)

    #XXX: Aggregate fields ala MultiValueField?

class EditableMap(forms.widgets.Widget, MapMixin):
    def __init__(self, fields=None, options=None, template=None):
        self.set_options(options, template)
        super(EditableMap, self).__init__(options, template)
        self.fields = fields

    def render(self, name, value, attrs=None):



