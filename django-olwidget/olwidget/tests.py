from django.test import TestCase

from django import forms
from django.contrib.gis.db import models
from django.contrib.gis.geos import Point

from olwidget.fields import MapField, EditableLayerField, InfoLayerField
from olwidget.widgets import EditableMap, InfoMap
from olwidget.forms import MapModelForm


# Simple geo model for testing
class MyModel(models.Model):
    # extra non-geom fields are to test ordering
    koan = models.CharField(max_length=140, blank=True)
    start = models.PointField()
    love = models.CharField(max_length=1, blank=True)
    route = models.LineStringField()
    death = models.BooleanField()
    end = models.PointField(blank=True, null=True)

    objects = models.GeoManager()

#
# form for testing
#

class MyModelForm(MapModelForm):
    class Meta:
        model = MyModel
        maps = (
            (('start', 'end'), {'layers': ['google.streets']}),
            (('route',), None),
        )

# Required=false form
class RequirednessForm(forms.Form):
    optional = MapField(
            fields=[EditableLayerField(required=False, options={
                'geometry': 'point',
                'name': 'optional',
            })],
            options={
                'overlay_style': {'fill_color': '#00ff00'},
            })
    required = MapField(
            fields=[EditableLayerField(required=True, options={
                'geometry': 'point',
                'name': 'required',
            })],
            options={
                'overlay_style': {'fill_color': '#00ff00'},
            })
    unspecified = MapField(
            fields=[EditableLayerField({
                'geometry': 'point',
                'name': 'unspecified',
            })],
            options={
                'overlay_style': {'fill_color': '#00ff00'},
            })

#
# MapModelForm with single set of options.  The two should be equivalent.
#
class SingleStyleMapModelForm(MapModelForm):
    class Meta:
        model = MyModel
        options = {'layers': ['google.streets']}

class SingleStyleMapModelFormEquivalent(MapModelForm):
    class Meta:
        model = MyModel
        maps = ((('start', 'route', 'end'), {'layers': ['google.streets']}),)

class CustomTemplateMapModelForm(MapModelForm):
    class Meta:
        model = MyModel
        template = "olwidget/test_map_template.html"

class MixedTemplateMapModelForm(MapModelForm):
    class Meta:
        model = MyModel
        template = 'olwidget/multi_layer_map.html'
        maps = (
            (('start',), {}, 'olwidget/test_map_template.html'),
            (('end',), {}, 'olwidget/test_map_template.html'),
        )

#
# tests
#

class TestForm(TestCase):
    def test_single_form(self):
        class MySingleForm(forms.Form):
            char = forms.CharField(max_length=10, required=False)
            field = forms.CharField(widget=EditableMap({"name": "Fun times"}))

        form = MySingleForm({'field': 1})
        #print(form)
        self.assertTrue(form.is_bound)
        self.assertTrue(form.is_valid())
        #print(form.media)
        self.assertNotEqual(form.media, '')

        form = MySingleForm({'notafield': 1})
        #print(form)
        self.assertTrue(form.fields['field'].required)
        self.assertTrue(form.is_bound)
        self.assertFalse(form.is_valid())

    def test_multi_form(self):
        class MyMultiForm(forms.Form):
            mymap = MapField((
                EditableLayerField({'name': 'Fun'}),
                InfoLayerField([[Point(0, 0, srid=4326), "that"]]),
                EditableLayerField(),
            ))

        form = MyMultiForm({'mymap_0': "POINT(0 0)", 'mymap_2': "POINT(1 1)"})

        self.assertTrue(form.is_bound)
        self.assertTrue(form.is_valid())


        form = MyMultiForm({'mymap_0': 0})
        self.assertTrue(form.is_bound)
        self.assertFalse(form.is_valid())

    def test_info_map(self):
        # Just ensure that no errors arise from construction and rendering
        mymap = InfoMap([[Point(0, 0, srid=4326), "that"]], {"name": "frata"})
        unicode(mymap)
        #print(mymap)

    def test_modelform_empty(self):
        form = MyModelForm()
        unicode(form)

    def test_modelform_valid(self):
        form = MyModelForm({'start': "SRID=4326;POINT(0 0)", 
            'route': "SRID=4326;LINESTRING(0 0,1 1)"})
        self.assertTrue(form.is_bound)
        self.assertTrue(form.is_valid())
        # check order of keys
        self.assertEqual(form.fields.keys(), 
            ['koan', 'start_end', 'love', 'route', 'death']
        )
        form.save()
        #print(form)

    def test_modelform_invalid(self):
        class MyOtherModelForm(MapModelForm):
            class Meta:
                model = MyModel

        form = MyModelForm({'start': 1})
        self.assertTrue(form.is_bound)
        self.assertFalse(form.is_valid())

        form = MyOtherModelForm()
        #print(form)
        unicode(form)

    def test_modelform_initial(self):
        form = MyModelForm(instance=MyModel.objects.create(start="SRID=4326;POINT(0 0)", route="SRID=4326;LINESTRING(0 0,1 1)"))
        unicode(form)

    def test_info_modelform(self):
        class MyInfoModelForm(MapModelForm):
            start = MapField([
                EditableLayerField({'name': 'start'}),
                InfoLayerField([[Point(0, 0, srid=4326), "Of interest"]]),
            ])
            class Meta:
                model = MyModel

        instance = MyModel.objects.create(start="SRID=4326;POINT(0 0)",
                route="SRID=4326;LINESTRING(0 0,1 1)")
        form = MyInfoModelForm({
                'start': "SRID=4326;POINT(0 0)",
                'route': "SRID=4326;LINESTRING(0 0,1 1)",
                'death': False,
            }, instance=instance)
        self.assertEqual(form.fields.keys(),
            ['koan', 'start', 'love', 'route', 'death', 'end'])
        self.assertEquals(form.errors, {})
        form.save()

    def test_custom_form(self):
        class MixedForm(forms.Form):
            stuff = MapField([
                InfoLayerField([["SRID=4326;POINT(0 0)", "Origin"]]),
                EditableLayerField({'geometry': 'point'}),
            ])
        unicode(MixedForm())

    def test_has_changed(self):
        vals = {
                'start': "SRID=4326;POINT(0 0)",
                'route': "SRID=4326;LINESTRING(0 0,1 1)",
        }
        instance = MyModel.objects.create(**vals)
        form = MyModelForm(vals, instance=instance)
        self.assertFalse(form.has_changed())
        
        form = MyModelForm({
            'start': "SRID=4326;POINT(0 0.1)",
            'route': "SRID=4326;LINESTRING(0 0,1 1)",
        }, instance=instance)
        self.assertTrue(form.has_changed())

    def test_single_style_option_form(self):
        f1 = SingleStyleMapModelForm()
        f2 = SingleStyleMapModelFormEquivalent()

        self.assertEquals(unicode(f1.media), unicode(f2.media))
        self.assertEquals(unicode(f1), unicode(f2))

    def test_required(self):
        form = RequirednessForm({
            'optional': None,
            'required': None,
            'unspecified': None,
        })
        #print form.fields['optional'].required
        self.assertFalse(form.is_valid())

        form = RequirednessForm({
            'optional': None,
            'required': "SRID=4326;POINT(0 0)",
            'unspecified': "SRID=4326;POINT(0 0)",
        })
        self.assertTrue(form.is_valid())

    def test_custom_template_map_model_form(self):
        form = CustomTemplateMapModelForm()
        for field in ('start', 'route', 'end'):
            self.assertEquals(unicode(form[field]), u'<h1>Boogah!</h1>\n')

    def test_mixed_template_map_model_form(self):
        form = MixedTemplateMapModelForm()
        for field in ('start', 'end'):
            self.assertEquals(unicode(form[field]), u'<h1>Boogah!</h1>\n')
        self.assertNotEquals(unicode(form['route']), u'<h1>Boogah!</h1>\n')

