from django.test import TestCase

from django import forms
from olwidget.fields import MapField, EditableLayerField, InfoLayerField

from django.contrib.gis.geos import Point

class TestForm(TestCase):
    def test_huh(self):
        class MyForm(forms.Form):
            mymap = MapField((
                EditableLayerField({'name': 'Fun'}),
                InfoLayerField([[Point(0, 0, srid=4326), "that"]]),
                EditableLayerField(),
            ))

        form = MyForm({'mymap_0': 0, 'mymap_2': 1})

        self.assertTrue(form.is_bound)
        self.assertTrue(form.is_valid())


        form = MyForm({'mymap_0': 0})
        self.assertTrue(form.is_bound)
        self.assertFalse(form.is_valid())
