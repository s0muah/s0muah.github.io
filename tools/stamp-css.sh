#!/bin/sh
# Stamp every stylesheet <link> and main.js <script> with a short hash of the
# file, so the URL changes whenever the file does and browsers cannot serve a
# stale copy. GitHub Pages caches assets for 10 minutes, which is long enough
# to make a deploy look like it did nothing - or, for main.js, to pair new
# markup with old script.
#
# Run this after editing css/style.css or js/main.js, before committing:
#
#     ./tools/stamp-css.sh
#
# It is idempotent — running it with no changes rewrites nothing.
set -eu

cd "$(dirname "$0")/.."

# shasum ships with macOS; Git for Windows' bash only has sha256sum.
if command -v shasum >/dev/null 2>&1; then
  sum() { shasum -a 256 "$1" | cut -c1-8; }
else
  sum() { sha256sum "$1" | cut -c1-8; }
fi

css=$(sum css/style.css)
js=$(sum js/main.js)

for f in *.html; do
  perl -pi -e "s|href=\"css/style\.css(\?v=[0-9a-f]*)?\"|href=\"css/style.css?v=$css\"|g; s|src=\"js/main\.js(\?v=[0-9a-f]*)?\"|src=\"js/main.js?v=$js\"|g" "$f"
done

echo "stamped css/style.css?v=$css js/main.js?v=$js"
