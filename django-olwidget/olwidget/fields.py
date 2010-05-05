from django import forms

from olwidget.widgets import Map

class MapField(forms.fields.MultiValueField):
    def __init__(self, vector_layers, options=None):
        # create map widget enclosing vector layers and options
        class _Widget(Map):
            _vector_layers = vector_layers
            _options = options
            def __init__(self):
                super(_Widget, self).__init__(self._vector_layers, 
                        self._options)

        self.widget = _Widget
        super(MapField, self).__init__(vector_layers)

    def compress(self, data_list):
        # Map widget expects a list.
        return data_list
