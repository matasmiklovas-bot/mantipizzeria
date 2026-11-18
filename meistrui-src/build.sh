#!/bin/bash
# Surenka optimizuotą „Meistrui“ svetainę iš src/ į ../public/meistrui/
#  - puslapis surenkamas iš anksto (telefonai, žemėlapis, ikonos įrašomi į HTML)
#  - CSS suspaudžiamas ir įdedamas į HTML
#  - visas JavaScript sujungiamas į vieną js/app.js (įkeliamas su defer)
# Reikia: node, python3, npx (esbuild atsisiunčiamas automatiškai) ir Playwright su Chromium.
set -euo pipefail
cd "$(dirname "$0")"
HERE=$(pwd)
SRC="$HERE/src"
OUT="$HERE/../public/meistrui"
TMP=$(mktemp -d)
PORT=${PORT:-8199}
EB="npx --yes esbuild@0.24.0"

$EB "$SRC/css/style.css" --minify --target=safari13 --log-level=warning --outfile="$TMP/style.min.css"
$EB "$SRC/js/main.js" --minify --target=safari13 --log-level=warning --outfile="$TMP/main.min.js"

# Iš anksto surenkamas puslapis
python3 -m http.server "$PORT" --directory "$SRC" > /dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true; rm -rf "$TMP"' EXIT
sleep 1
node "$HERE/prerender.js" "http://localhost:$PORT/index.html" "$TMP/pre.html"

rm -rf "$OUT"; mkdir -p "$OUT/js" "$OUT/fonts" "$OUT/img"
{
  cat "$SRC/js/icons.js"; echo
  cat "$SRC/js/ltmap.js"; echo
  cat "$SRC/js/gsap.min.js"; echo ";"
  cat "$TMP/main.min.js"
} > "$OUT/js/app.js"
cp "$SRC/js/qr.js" "$OUT/js/qr.js"
cp "$SRC"/fonts/*.woff2 "$OUT/fonts/"
cp "$SRC"/img/* "$OUT/img/"
cp "$SRC/manifest.webmanifest" "$OUT/"

python3 - "$TMP/pre.html" "$TMP/style.min.css" "$OUT/index.html" <<'EOF'
import sys, re
s = open(sys.argv[1]).read()
css = open(sys.argv[2]).read().replace('../fonts/', 'fonts/')
assert '<link rel="stylesheet" href="css/style.css">' in s
s = s.replace('<link rel="stylesheet" href="css/style.css">', '<style>' + css + '</style>')
s = re.sub(r'<script src="js/icons\.js"></script>\s*<script src="js/gsap\.min\.js"></script>\s*(<script src="js/ltmap\.js"></script>\s*)?<script src="js/main\.js"></script>', '', s)
s = s.replace('</head>', '<script src="js/app.js" defer></script>\n</head>', 1)
assert 'js/app.js" defer' in s and 'js/main.js' not in s
open(sys.argv[3], 'w').write(s)
EOF
echo "Surinkta į $OUT"
