from django import forms
from django.conf import settings

from olwidget.forms import MapModelForm
from olwidget.fields import MapField, EditableLayerField, InfoLayerField

from testolwidget.models import Tree, Country

class AlienActivityForm(forms.Form):
    """ Example of olwidget in a custom form. """
    incident_name = forms.CharField()
    # Old style single field invocation
    landings = MapField([EditableLayerField({
            'geometry': 'point',
            'is_collection': True,
            'overlay_style': {
                'external_graphic': settings.MEDIA_URL+"alien.png",
                'graphic_width': 21,
                'graphic_height': 25,
            },
            'name': 'Landings',
        })])
    # Define a map to edit two geometry fields
    other_stuff = MapField([
            EditableLayerField({'geometry': ['point', 'linestring', 'polygon'],
                'is_collection': True, 'name': "Strange lights",
                'overlay_style': {
                    'fill_color': '#FFFF00',
                    'stroke_color': '#FFFF00',
                    'stroke_width': 6,
                }
            }),
            EditableLayerField({'geometry': 'linestring',
                'is_collection': True, 'name': "Chemtrails",
                'overlay_style': {
                    'fill_color': '#ffffff',
                    'stroke_color': '#ffffff',
                    'stroke_width': 6,
                },
            }),
        ])

class CustomTreeForm(MapModelForm):
    # set options for individual geometry fields by explicitly declaring the
    # field type.  If not declared, defaults will be used.
    location = EditableLayerField({
        'overlay_style': {
            'stroke_color': '#ffff00',
        }})
    class Meta:
        model = Tree
        # Define a single map to edit two geometry fields, with options.
        maps = (
            (('root_spread', 'location'), {
                'layers': ['google.streets', 'osm.mapnik'],
                'overlay_style': {
                    'fill_color': 'brown',
                    'fill_opacity': 0.2,
                    'stroke_color': 'green',
                }
            }),
        )

class DefaultTreeForm(MapModelForm):
    class Meta:
        model = Tree

class MixedForm(forms.Form):
    capitals = MapField([
        InfoLayerField([[c.boundary, c.about] for c in Country.objects.all()],
            {
                'overlay_style': {
                    'fill_opacity': 0,
                    'stroke_color': "white",
                    'stroke_width': 6,
                }, 
                'name': "Country boundaries",
            }),
        EditableLayerField({
            'geometry': 'point',
            'name': 'Capitals',
            'is_collection': True,
            'name': "Country capitals",
        }),
        ], {'layers': ['google.satellite']})

