#!/bin/bash

if [[ "$NODE_ENV" == "dev" ]]; then
    echo "Starting in development mode..."
    exec npm run start:dev
else
    echo "Starting in production mode..."
    exec npm run start
fi
