#!/bin/bash

set -e

WORKING_DIRECTORY=`pwd`

#
# Sets up OSRM backend
#
OSRM_DESTINATION="./third_party/osrm-backend"

# check, if this script is running under docker
#set +e
#SUDO_COMMAND=`sudo --version`
#set -e
#if [ $? -ne 0 ]
#then
#	export DEBIAN_FRONTEND=noninteractive
#	ln -fs /usr/share/zoneinfo/Europe/Berlin /etc/localtime
#	apt install -y sudo
#fi

cd "${OSRM_DESTINATION}"
mkdir -p build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . -- -j $(nproc)
cd "${WORKING_DIRECTORY}"

#
# Print out further instructions
#
echo "-------------------------------------------------------------------------------"
echo "Please complete following steps to setup isochrone:"
echo " - Visit https://download.geofabrik.de to download OSM files"
echo " - Place .osm files into data directory in package directory"
echo " - $ npm run prepare-osrm"
