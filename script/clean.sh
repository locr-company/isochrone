#!/bin/bash

SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "${SCRIPT}")
WORKING_DIRECTORY=`pwd`

cd "${SCRIPTPATH}"

for d in ../third_party/*
do
    rm -rf ${d}/* ${d}/.*
done

rm -rf ../data/osrm
rm -rf ../data/valhalla

rm -rf ../node_modules
