from django.test import TestCase

from django import forms
from olwidget.fields import MapField
from olwidget.widgets import EditableLayer, InfoLayer

print("HEY!!!!!!!!!!!!")

class TestForm(TestCase):
    def test_huh(self):
        class MyForm(forms.Form):
            mymap = MapField((
                EditableLayer(),
                EditableLayer(),
            ))

        form = MyForm({'mymap': [1, 2]})
        print(unicode(form))

