#!/usr/bin/env bash

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd ${SCRIPT_DIR} && cd ..

if [ -z "${ISOCHRONE_NAME}" ]; then
    ISOCHRONE_NAME=isochrone
fi

if [ -z "${ENV}" ]; then
    ENV=prod
fi
if [[ "${ENV}" == "dev" || "${ENV}" == "devel" || "${ENV}" == "development" ]]; then
    ENV=dev
fi

podman build \
    --tag=${ISOCHRONE_NAME} \
    --build-arg environment=${ENV} .

CREATE_CMD="podman create"
if [ ${ENV} = "dev" ]; then
    CREATE_CMD="${CREATE_CMD} -v ${PWD}/src:/app/src"
    CREATE_CMD="${CREATE_CMD} -v ${PWD}/server:/app/server"
    CREATE_CMD="${CREATE_CMD} -v ${PWD}/node_modules:/app/node_modules"
    CREATE_CMD="${CREATE_CMD} -v ${PWD}/package.json:/app/package.json"
    CREATE_CMD="${CREATE_CMD} -v ${PWD}/package-lock.json:/app/package-lock.json"
fi
if [ ! -z "${VALHALLA_DATA_DATE}" ]; then
    CREATE_CMD="${CREATE_CMD} -e VALHALLA_DATA_DATE=${VALHALLA_DATA_DATE}"
fi
if [ ! -z "${OSRM_DATA_DATE}" ]; then
    CREATE_CMD="${CREATE_CMD} -e OSRM_DATA_DATE=${OSRM_DATA_DATE}"
fi
CREATE_CMD="${CREATE_CMD} --network=host"
CREATE_CMD="${CREATE_CMD} --name=${ISOCHRONE_NAME}"
CREATE_CMD="${CREATE_CMD} ${ISOCHRONE_NAME}"
${CREATE_CMD}
podman generate systemd --new --name --files ${ISOCHRONE_NAME}

mkdir -p ~/.config/systemd/user
mv container-${ISOCHRONE_NAME}.service ~/.config/systemd/user
systemctl --user enable container-${ISOCHRONE_NAME}
systemctl --user start container-${ISOCHRONE_NAME}
