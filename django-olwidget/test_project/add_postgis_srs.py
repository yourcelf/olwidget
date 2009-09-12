#!/usr/bin/env python

from manage import *

from django.core.management import setup_environ
import settings

setup_environ(settings)

from django.contrib.gis.utils import add_postgis_srs

if __name__ == "__main__":
    add_postgis_srs(900913)
    

