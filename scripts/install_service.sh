#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd ${SCRIPT_DIR} && cd ..

if [ -z ${ISOCHRONE_NAME} ]; then
    ISOCHRONE_NAME=isochrone
fi

podman build \
    --tag=${ISOCHRONE_NAME} \
    --build-arg environment=prod .

CREATE_CMD="podman create"
CREATE_CMD="${CREATE_CMD} --network=host"
CREATE_CMD="${CREATE_CMD} --name=${ISOCHRONE_NAME}"
CREATE_CMD="${CREATE_CMD} ${ISOCHRONE_NAME}"
${CREATE_CMD}
podman generate systemd --new --name --files ${ISOCHRONE_NAME}

mkdir -p ~/.config/systemd/user
mv container-${ISOCHRONE_NAME}.service ~/.config/systemd/user
systemctl --user enable container-${ISOCHRONE_NAME}
systemctl --user start container-${ISOCHRONE_NAME}