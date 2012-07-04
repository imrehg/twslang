#!/bin/bash

source ../../.env-remote
$REMOTEDB=${MONGO_DB}

# Clear local data
mongo ${REMOTEDB} --eval 'db.dropDatabase()'
mongorestore -h localhost dump/${REMOTEDB}/
