#!/bin/bash
# This script generates routes.json listing all .kml files in alpha order.
# For each .kml, if a matching .url file exists (same base name), its first line is included as the 'url' field.
# Usage: Run from the data directory. Requires 'jq'.

cd "$(dirname "$0")"

# Build JSON entries for each route base name (no extension)
entries=()
for kml in *.kml; do
  base="${kml%.kml}"
  entries+=("{ \"base\": \"$base\" }")
done

# Output as JSON array
printf '%s\n' "[" > routes.json
for i in "${!entries[@]}"; do
  if [[ $i -gt 0 ]]; then printf ',\n' >> routes.json; fi
  printf '%s' "${entries[$i]}" >> routes.json
done
printf '\n]\n' >> routes.json
