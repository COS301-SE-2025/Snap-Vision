# this file is used to convert a GeoJSON file of Points of Interest (POIs) into a format suitable for Firestore
# it extracts relevant properties and computes the centroid of each geometry
# run with `python convert.py` :)

import json
from shapely.geometry import shape

def get_centroid(geometry):
    geom = shape(geometry)
    centroid = geom.centroid
    return {'longitude': centroid.x, 'latitude': centroid.y}

with open('export.geojson', 'r', encoding='utf-8') as f:
    geojson = json.load(f)

firestore_pois = []

for feature in geojson['features']:
    props = feature.get('properties', {})
    geometry = feature.get('geometry', {})
    centroid = get_centroid(geometry)
    poi = {
        'id': feature.get('id'),
        'name': props.get('name'),
        'description': props.get('description'),
        'ref': props.get('ref'),
        'centroid': centroid,
        'tags': props  # all original OSM tags
    }
    firestore_pois.append(poi)

# Output as JSON for inspection or upload
with open('UPcampus_pois.json', 'w', encoding='utf-8') as f:
    json.dump(firestore_pois, f, ensure_ascii=False, indent=2)

print(f"Exported {len(firestore_pois)} POIs to UPcampus_pois.json")