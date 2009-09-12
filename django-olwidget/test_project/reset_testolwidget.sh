#!/bin/sh

DBNAME=olwidget_dev
DBUSER=django_dev

sudo su postgres -c "dropdb $DBNAME"
sudo su postgres -c "createdb -T template_postgis -O $DBUSER $DBNAME"
python manage.py syncdb #--noinput
#python manage.py loaddata demo_data.json
python add_postgis_srs.py
