#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd ${SCRIPT_DIR} && cd ..

git pull

cd scripts
set +e
./uninstall_service.sh
set -e
./install_service.sh
