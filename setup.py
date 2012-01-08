#!/usr/bin/env python
import os

from distutils.command.install import INSTALL_SCHEMES
from distutils.core import setup

root = os.path.abspath(os.path.dirname(__file__))
os.chdir(root)

VERSION = '0.48'

# Make data go to the right place.
# http://groups.google.com/group/comp.lang.python/browse_thread/thread/35ec7b2fed36eaec/2105ee4d9e8042cb
for scheme in INSTALL_SCHEMES.values():
    scheme['data'] = scheme['purelib']

setup(name='django-olwidget',
    version=VERSION,
    description="OpenLayers mapping widget for Django",
    author='Charlie DeTar',
    author_email='cfd@media.mit.edu',
    url='http://olwidget.org',
    packages=['olwidget'],
    package_dir={'': 'django-olwidget'},
    data_files=[
        ('olwidget/templates/olwidget/', [
            'django-olwidget/olwidget/templates/olwidget/admin_olwidget.html',
            'django-olwidget/olwidget/templates/olwidget/editable_layer.html',
            'django-olwidget/olwidget/templates/olwidget/multi_layer_map.html',
            'django-olwidget/olwidget/templates/olwidget/info_layer.html',
        ]),
        ('olwidget/static/olwidget/css/', [
            'css/olwidget.css'
        ]),
        ('olwidget/static/olwidget/js/', [
            'js/olwidget.js',
            'js/cloudmade.js',
        ]),
        ('olwidget/static/olwidget/img/', [
            'img/extra_edit_icons.png',
            'img/jquery_ui_license.txt',
            'img/popup_icons.png',
        ]),
        ('olwidget/templates/admin/', [
            'django-olwidget/olwidget/templates/admin/olwidget_change_list.html'
        ]),
    ],
    classifiers=[
        'Development Status :: 4 - Beta',
        'Environment :: Web Environment',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: JavaScript',
        'Topic :: Software Development :: Libraries :: Application Frameworks',
    ],
)
