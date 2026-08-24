#!/bin/sh
# Stamp every stylesheet <link> with a short hash of css/style.css, so the URL
# changes whenever the file does and browsers cannot serve a stale copy.
# GitHub Pages caches assets for 10 minutes, which is long enough to make a
# deploy look like it did nothing.
#
# Run this after editing css/style.css, before committing:
#
#     ./tools/stamp-css.sh
#
# It is idempotent — running it with no CSS changes rewrites nothing.
set -eu

cd "$(dirname "$0")/.."

hash=$(shasum -a 256 css/style.css | cut -c1-8)

for f in *.html; do
  perl -pi -e "s|href=\"css/style\.css(\?v=[0-9a-f]+)?\"|href=\"css/style.css?v=$hash\"|g" "$f"
done

echo "stamped css/style.css?v=$hash"
