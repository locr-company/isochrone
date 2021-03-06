#!/bin/bash
set -e

WORKING_DIRECTORY=`pwd`

#
# Sets up Valhalla backend
#
PRIME_SERVER_DESTINATION="third_party/prime_server"
VALHALLA_DESTINATION="third_party/valhalla"

#sudo apt install -y git make cmake libtool pkg-config g++ gcc jq lcov protobuf-compiler vim-common libboost-all-dev libboost-all-dev libcurl4-openssl-dev zlib1g-dev liblz4-dev libprotobuf-dev
#sudo apt install -y libgeos-dev libgeos++-dev libluajit-5.1-dev libspatialite-dev libsqlite3-dev spatialite-bin luajit wget
#if [[ $(grep -cF bionic /etc/lsb-release) > 0 ]]; then
	#sudo apt install -y libsqlite3-mod-spatialite;
	#ln -s /usr/lib/x86_64-linux-gnu/mod_spatialite.so /usr/lib/x86_64-linux-gnu/mod_spatialite
#fi
#if [[ $(grep -cF focal /etc/lsb-release) > 0 ]]; then
	#sudo apt install -y libsqlite3-mod-spatialite;
#fi
#sudo apt install -y python-all-dev

#sudo apt install -y autoconf automake libtool make gcc g++ lcov
#sudo apt install -y libcurl4-openssl-dev libzmq3-dev libczmq-dev

cd "${PRIME_SERVER_DESTINATION}"
./autogen.sh
./configure
make test -j $(nproc)
sudo make install
cd "${WORKING_DIRECTORY}"

cd "${VALHALLA_DESTINATION}"
npm install --ignore-scripts
mkdir -p build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DENABLE_DATA_TOOLS=On -DENABLE_PYTHON_BINDINGS=On -DENABLE_SERVICES=On
make -j $(nproc)
cd "${WORKING_DIRECTORY}"

sudo ldconfig

#
# Print out further instructions
#
echo "-------------------------------------------------------------------------------"
echo "Please complete following steps to setup isochrone:"
echo " - Visit https://download.geofabrik.de to download OSM files"
echo " - Place .osm files into data directory in package directory"
echo " - $ npm run prepare-valhalla"
