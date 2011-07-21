import re

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry

DEFAULT_PROJ = "4326"
DEFAULT_OPTIONS = getattr(settings, 'OLWIDGET_DEFAULT_OPTIONS', {})

def get_options(o):
    options = DEFAULT_OPTIONS.copy()
    options.update(o or {})
    return options

def url_join(*args):
    return reduce(_reduce_url_parts, args)
    
def _reduce_url_parts(a, b):
    b = b or ""
    if a and a[-1] == "/":
        return a + b
    a = a or ""
    return a + "/" + b

def translate_options(options):
    translated = {}
    for key, value in options.iteritems():
        new_key = _separated_lowercase_to_lower_camelcase(key)
        # recurse
        if isinstance(value, dict):
            translated[new_key] = translate_options(value)
        else:
            translated[new_key] = value
    return translated

def _separated_lowercase_to_lower_camelcase(input_):
    return re.sub('_\w', lambda match: match.group(0)[-1].upper(), input_)


def get_ewkt(value, srid=None):
    if srid is None:
        if hasattr(value, 'srid'):
            srid = value.srid
        else:
            srid = DEFAULT_PROJ
    return _add_srid(_get_wkt(value, srid), srid)

def get_geos(value, srid=DEFAULT_PROJ):
    geos = None
    if value:
        if isinstance(value, GEOSGeometry):
            geos = value
        elif isinstance(value, basestring):
            match = _ewkt_re.match(value)
            if match:
                geos = GEOSGeometry(match.group('wkt'), match.group('srid'))
            else:
                geos = GEOSGeometry(value, srid)
    if geos and geos.srid and int(srid) != geos.srid:
        geos.transform(int(srid))
    return geos

def collection_ewkt(fields, srid=DEFAULT_PROJ):
    return _add_srid(_collection_wkt(fields, srid), srid)

_ewkt_re = re.compile("^SRID=(?P<srid>\d+);(?P<wkt>.+)$", re.I)
def _get_wkt(value, srid):
    """
    `value` is either a WKT string or a geometry field.  Returns WKT in the
    projection for the given SRID.
    """
    geos = get_geos(value, srid)
    wkt = ''
    if geos:
        wkt = geos.wkt 
    return wkt

def _collection_wkt(fields, srid):
    """ Returns WKT for the given list of geometry fields. """

    if not fields:
        return ""

    if len(fields) == 1:
        return _get_wkt(fields[0], srid)

    return "GEOMETRYCOLLECTION(%s)" % \
            ",".join(_get_wkt(field, srid) for field in fields)

def _add_srid(wkt, srid):
    """
    Returns EWKT (WKT with a specified SRID) for the given wkt and SRID
    (default 4326). 
    """
    if wkt:
        return "SRID=%s;%s" % (srid, wkt)
    return ""

def options_for_field(db_field):
    is_collection = db_field.geom_type in ('MULTIPOINT', 'MULTILINESTRING', 
            'MULTIPOLYGON', 'GEOMETRYCOLLECTION', 'GEOMETRY')
    if db_field.geom_type == 'GEOMETRYCOLLECTION':
        geometry = ['polygon', 'point', 'linestring']
    else:
        if db_field.geom_type in ('MULTIPOINT', 'POINT'):
            geometry = 'point'
        elif db_field.geom_type in ('POLYGON', 'MULTIPOLYGON'):
            geometry = 'polygon'
        elif db_field.geom_type in ('LINESTRING', 'MULTILINESTRING'):
            geometry = 'linestring'
        else:
            # fallback: allow all types.
            geometry = ['polygon', 'point', 'linestring']

    return { 'geometry': geometry, 'isCollection': is_collection, }
