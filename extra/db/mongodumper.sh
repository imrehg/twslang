#!/bin/bash

source ../../.env-remote

echo $MONGO_DB "<-"
mongodump -v -u $MONGO_USER -p $MONGO_PASS -h $MONGO_URL -d $MONGO_DB

echo "Dumping finished from $MONGO_URL"
