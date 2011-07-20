from django.test import TestCase
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry

from testolwidget.models import GoogProjModel

class TestGoogProjAdmin(TestCase):
    def setUp(self):
        u = User.objects.create(username='admin', is_superuser=True, is_staff=True)
        u.set_password('admin')
        u.save()

    def test_edit(self):
        c = self.client
        self.assertTrue(c.login(username='admin', password='admin'))
        r = c.post('/admin/testolwidget/googprojmodel/add/', {
            "point": 'SRID=900913;POINT(10 10)'
        }, follow=True)
        self.assertEquals(r.status_code, 200)

        self.assertEquals(len(GoogProjModel.objects.all()), 1)
        a = GEOSGeometry("SRID=900913;POINT(10 10)")
        b = GoogProjModel.objects.all()[0].point
        # Floating point comparison -- ensure distance is miniscule.
        self.assertTrue(a.distance(b) < 1.0e-9)

