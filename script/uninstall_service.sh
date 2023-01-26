#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd ${SCRIPT_DIR}

if [ -z ${ISOCHRONE_NAME} ]; then
    ISOCHRONE_NAME=isochrone
fi

systemctl --user stop container-${ISOCHRONE_NAME}
systemctl --user disable container-${ISOCHRONE_NAME}
rm ~/.config/systemd/user/container-${ISOCHRONE_NAME}.service
podman image rm -f ${ISOCHRONE_NAME}