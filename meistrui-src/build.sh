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
# Versijos žymė pagal turinį: naršyklė niekada nepaims seno JS kartu su nauju HTML
QRV=$(sha256sum "$OUT/js/qr.js" | cut -c1-10)
sed -i "s#\"js/qr.js\"#\"js/qr.js?v=$QRV\"#" "$OUT/js/app.js"
APPV=$(sha256sum "$OUT/js/app.js" | cut -c1-10)
cp "$SRC"/fonts/*.woff2 "$OUT/fonts/"
cp "$SRC"/img/* "$OUT/img/"
cp "$SRC/manifest.webmanifest" "$SRC/404.html" "$OUT/"

APPV="$APPV" python3 - "$TMP/pre.html" "$TMP/style.min.css" "$OUT/index.html" <<'EOF'
import sys, re, os
s = open(sys.argv[1]).read()
css = open(sys.argv[2]).read().replace('../fonts/', 'fonts/')
assert '<link rel="stylesheet" href="css/style.css">' in s
s = s.replace('<link rel="stylesheet" href="css/style.css">', '<style>' + css + '</style>')
s = re.sub(r'<script src="js/icons\.js"></script>\s*<script src="js/gsap\.min\.js"></script>\s*(<script src="js/ltmap\.js"></script>\s*)?<script src="js/main\.js"></script>', '', s)
s = s.replace('</head>', '<script src="js/app.js?v=' + os.environ['APPV'] + '" defer></script>\n</head>', 1)
assert 'js/app.js?v=' in s and 'js/main.js' not in s
open(sys.argv[3], 'w').write(s)
EOF
# Leidimas savame domene: SITE_URL=https://jusu-domenas.lt ./build.sh
# perrašo paveikslėlio adresus į domeną, prideda kanoninį adresą, robots.txt ir sitemap.xml
if [ -n "${SITE_URL:-}" ]; then
  SITE_URL="${SITE_URL%/}" python3 - "$OUT" <<'EOF'
import os, sys, datetime
out, site = sys.argv[1], os.environ['SITE_URL']
assert site.startswith('https://'), 'SITE_URL turi prasidėti https://'
p = os.path.join(out, 'index.html'); s = open(p).read()
old = 'https://raw.githubusercontent.com/matasmiklovas-bot/mantipizzeria/claude/modest-davinci-r55mii/public/meistrui/'
assert s.count(old) >= 3, 'nerasti paveikslėlio adresai'
s = s.replace(old, site + '/')
s = s.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="website">\n<meta property="og:url" content="%s/">\n<link rel="canonical" href="%s/">' % (site, site), 1)
s = s.replace('"@type": "ProfessionalService", ', '"@type": "ProfessionalService", "url": "%s/", ' % site, 1)
open(p, 'w').write(s)
open(os.path.join(out, 'robots.txt'), 'w').write('User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n' % site)
open(os.path.join(out, 'sitemap.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>%s/</loc><lastmod>%s</lastmod></url></urlset>\n' % (site, datetime.date.today().isoformat()))
print('Paruošta domenui', site)
EOF
fi

# Darbas be interneto: sw.js su visų failų sąrašu ir versija pagal turinį
python3 - "$SRC/sw.js" "$OUT" "$APPV" "$QRV" <<'EOF'
import sys, os, json, hashlib
src, out, appv, qrv = sys.argv[1:5]
files = ['./', 'index.html', 'manifest.webmanifest', 'js/app.js?v=' + appv, 'js/qr.js?v=' + qrv]
for d in ('fonts', 'img'):
    files += [d + '/' + f for f in sorted(os.listdir(os.path.join(out, d))) if f != 'og.jpg']
h = hashlib.sha256()
for f in ['index.html', 'js/app.js', 'js/qr.js'] + [x for x in files if x.startswith(('fonts/', 'img/'))]:
    h.update(open(os.path.join(out, f), 'rb').read())
sw = open(src).read().replace('__VER__', h.hexdigest()[:10]).replace('__FILES__', json.dumps(files))
assert '__' not in sw.split('*/', 1)[1]
open(os.path.join(out, 'sw.js'), 'w').write(sw)
print('sw.js:', len(files), 'files')
EOF
echo "Surinkta į $OUT"
