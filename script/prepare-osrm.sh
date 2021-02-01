#!/bin/bash

WORKING_DIRECTORY=`pwd`

#
# Prepares the .osm data files in osrm directory
#
mkdir -p data/osrm
cd data/osrm

#
# Determine the osrm-extract path
#
OSRM_EXTRACT="../../third_party/osrm-backend/build/osrm-extract"
if type "osrm-extract" > /dev/null; then
	OSRM_EXTRACT=$(which "osrm-extract")
fi

#
# Determine the osrm-contract path
#
OSRM_CONTRACT="../../third_party/osrm-backend/build/osrm-contract"
if type "osrm-contract" > /dev/null; then
	OSRM_CONTRACT=$(which "osrm-contract")
fi

#
# Link the car profile to current directory
#
if [ ! -f profiles/car.lua ]; then
	mkdir -p profiles
	cd profiles
	ln -s ../../../third_party/osrm-backend/profiles/car.lua car.lua
	cd ..
fi

#
# Extract and contract each OSM file
#
for f in ../*.osm.pbf; do
	base=$(basename "$f" .osm.pbf)

	if [ -f "../$base.osrm" ]; then
		echo "../$base.osrm already exists, skipping..."
		continue
	fi

	$OSRM_EXTRACT "../$base.osm.pbf"
	$OSRM_CONTRACT "../$base.osrm"
done

mv ../*.osrm* .

cd "${WORKING_DIRECTORY}"
