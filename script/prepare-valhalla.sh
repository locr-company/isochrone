#!/bin/bash

WORKING_DIRECTORY=`pwd`

#
# Prepares the .osm data files in valhalla directory
#
mkdir -p data/valhalla
cd data
VALHALLA_BUILD_CONFIG="../third_party/valhalla/scripts/valhalla_build_config"
$VALHALLA_BUILD_CONFIG --mjolnir-tile-dir ${PWD}/valhalla/tiles --mjolnir-tile-extract ${PWD}/valhalla/valhalla_tiles.tar --mjolnir-timezone ${PWD}/valhalla/timezones.sqlite --mjolnir-admin ${PWD}/valhalla/admins.sqlite > ${PWD}/valhalla/valhalla.json
cd valhalla
VALHALLA_BUILD_ADMINS="../../third_party/valhalla/build/valhalla_build_admins"
VALHALLA_BUILD_TILES="../../third_party/valhalla/build/valhalla_build_tiles"
for f in ../*.osm.pbf; do
	base=$(basename "$f" .osm.pbf)

	$VALHALLA_BUILD_ADMINS -c valhalla.json ../$base.osm.pbf
	$VALHALLA_BUILD_TILES -c valhalla.json ../$base.osm.pbf
	find tiles | sort -n | tar cf valhalla_tiles.tar --no-recursion -T -

	break
done
