import re

from django.contrib.gis.gdal import OGRException, OGRGeometry
from django.contrib.gis.geos import GEOSGeometry

DEFAULT_PROJ = "4326"

def url_join(*args):
    return reduce(_reduce_url_parts, args)
    
def _reduce_url_parts(a, b):
    if a and a[-1] == "/":
        return a + b
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


_ewkt_re = re.compile("^SRID=(?P<srid>\d+);(?P<wkt>.+)$", re.I)
def get_wkt(value, srid=DEFAULT_PROJ):
    """
    `value` is either a WKT string or a geometry field.  Returns WKT in the
    projection for the given SRID.
    """
    ogr = None
    if value:
        if isinstance(value, OGRGeometry):
            ogr = value
        elif isinstance(value, GEOSGeometry):
            ogr = value.ogr
        elif isinstance(value, basestring):
            match = _ewkt_re.match(value)
            if match:
                ogr = OGRGeometry(match.group('wkt'), match.group('srid'))
            else:
                ogr = OGRGeometry(value)

    wkt = ''
    if ogr:
        # Workaround for Django bug #12312.  GEOSGeometry types don't support
        # 3D wkt; OGRGeometry types output 3D for linestrings even if they
        # should do 2D, causing IntegrityError's.
        if ogr.coord_dim == 2:
            geos = ogr.geos
            geos.transform(srid)
            wkt = geos.wkt
        else:
            ogr.transform(srid)
            wkt = ogr.wkt 
    return wkt

#def collection_wkt(fields):
#    """ Returns WKT for the given list of geometry fields. """
#
#    if not fields:
#        return ""
#
#    if len(fields) == 1:
#        return get_wkt(fields[0])
#
#    return "GEOMETRYCOLLECTION(%s)" % \
#            ",".join(get_wkt(field) for field in fields)

def add_srid(wkt, srid=DEFAULT_PROJ):
    """
    Returns EWKT (WKT with a specified SRID) for the given wkt and SRID
    (default 4326). 
    """
    if wkt:
        return "SRID=%s;%s" % (srid, wkt)
    return ""

