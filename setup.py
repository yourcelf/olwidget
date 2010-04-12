#!/usr/bin/env python
import os

from distutils.core import setup
from distutils.command.install import INSTALL_SCHEMES

root = os.path.abspath(os.path.dirname(__file__))
os.chdir(root)

master_file = open(os.path.join(root, ".git", "refs", "heads", "master"))
VERSION = '0.3.git-' + master_file.read().strip()
master_file.close()

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
    data_files=[('olwidget/media/js', ['js/olwidget.js', 'js/cloudmade.js']),
        ('olwidget/media/css', ['css/olwidget.css']),
        ('olwidget/media/img', ['img/popup_icons.png',
            'img/extra_edit_icons.png',
            'img/jquery_ui_license.txt',
        ]),
        ('olwidget/templates/olwidget/', [
            'django-olwidget/olwidget/templates/olwidget/admin_olwidget.html',
            'django-olwidget/olwidget/templates/olwidget/editable_map.html',
            'django-olwidget/olwidget/templates/olwidget/info_map.html',
        ]),
        ('olwidget/templates/admin/', [
            'django-olwidget/olwidget/templates/admin/olwidget_change_list.html']),
    ],
    classifiers=[
        'Development Status :: 4 - Beta',
        'Environment :: Web Environment',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: javascript',
        'Topic :: Software Development :: Libraries :: Application Frameworks',
    ],
)

