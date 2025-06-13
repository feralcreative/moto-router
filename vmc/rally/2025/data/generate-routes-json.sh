#!/bin/bash
# This script generates routes.json listing all .kml files in alpha order
cd "$(dirname "$0")"
ls -1 *.kml | sort | jq -R . | jq -s . > routes.json
