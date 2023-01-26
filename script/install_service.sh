#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd ${SCRIPT_DIR} && cd ..

if [ -z ${ISOCHRONE_NAME} ]; then
    ISOCHRONE_NAME=isochrone
fi

podman build -t ${ISOCHRONE_NAME} .
podman create \
    --network=host \
    --name=${ISOCHRONE_NAME} \
    ${ISOCHRONE_NAME}
podman generate systemd --new --name --files ${ISOCHRONE_NAME}

mkdir -p ~/.config/systemd/user
mv container-${ISOCHRONE_NAME}.service ~/.config/systemd/user
systemctl --user enable container-${ISOCHRONE_NAME}
systemctl --user start container-${ISOCHRONE_NAME}