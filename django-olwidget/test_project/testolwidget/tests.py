from django.test import TestCase

from django import forms
from olwidget.fields import MapField, EditableLayerField, InfoLayerField
from olwidget.widgets import EditableMap, InfoMap

from django.contrib.gis.geos import Point

class TestForm(TestCase):
    def test_map(self):
        class MyForm(forms.Form):
            mymap = MapField((
                EditableLayerField({'name': 'Fun'}),
                InfoLayerField([[Point(0, 0, srid=4326), "that"]]),
                EditableLayerField(),
                ))

        form = MyForm({'mymap_0': 0, 'mymap_2': 1})
         #print(unicode(form))

        self.assertTrue(form.is_bound)
        self.assertTrue(form.is_valid())


        form = MyForm({'mymap_0': 0})
        self.assertTrue(form.is_bound)
        self.assertFalse(form.is_valid())

    def test_single(self):
        class MyForm(forms.Form):
            field = forms.CharField(widget=EditableMap({"name": "Fun times"}))

        form = MyForm({'field': 1})
        self.assertTrue(form.is_bound)
        self.assertTrue(form.is_valid())
        #print(unicode(form))
        #print(unicode(form.media))

        form = MyForm({'notafield': 1})
        self.assertTrue(form.fields['field'].required)
        self.assertTrue(form.is_bound)
        self.assertFalse(form.is_valid())


        mymap = InfoMap([[Point(0, 0, srid=4326), "that"]], {"name": "frata"})
        #print(unicode(mymap))

      
