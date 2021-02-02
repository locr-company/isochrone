# base image
FROM ubuntu:18.04

RUN apt-get -y update && apt-get -y upgrade && apt-get -y install sudo bash-completion git htop mc wget
# packages for OSRM
RUN apt-get -y install cmake g++ libtbb2 libtbb-dev libexpat1 libexpat1-dev bzip2 libbz2-1.0 libbz2-dev lua5.3 libluabind-dev liblua5.3-0 liblua5.3-dev libluajit-5.1-dev luajit zlib1g zlib1g-dev doxygen libboost-all-dev
# packages for Valhalla
RUN apt-get -y install libsqlite3-mod-spatialite autoconf automake libzmq5 libzmq3-dev libczmq4 libczmq-dev curl libcurl4 libcurl4-openssl-dev libprotobuf-dev protobuf-compiler spatialite-bin libsqlite3-dev libspatialite-dev libsqlite3-mod-spatialite lcov libgeos-dev libgeos++-dev python-all-dev unzip
RUN wget https://deb.nodesource.com/setup_14.x -O nodejs_14.x.sh && bash nodejs_14.x.sh
RUN apt-get install -y nodejs

# copy application to docker container
COPY . /isochrone
WORKDIR /isochrone

RUN npm set unsafe-perm true
RUN npm run clean
RUN git submodule update --init --recursive
RUN npm install --production
RUN npm run setup-osrm && npm run prepare-osrm
RUN npm run setup-valhalla && npm run prepare-valhalla


CMD ["/bin/bash", "/isochrone/docker_start_script.sh"]
