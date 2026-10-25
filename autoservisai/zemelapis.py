#!/usr/bin/env python3
"""Build map.jpg for the "Servisai"/"Kontaktai" sections from OpenStreetMap tiles.

Usage: python3 autoservisai/zemelapis.py <tile-cache-dir> <out.png>
Writes out.png and out.jpg and prints pin positions (percent of width/height)
to paste into PINS in both index.html files. Credit OpenStreetMap on the page.
"""
import math, io, json, os, sys, urllib.request
from PIL import Image
PTS = [("Žemynos g. 13C", 54.7229912, 25.2280404), ("Viršuliškių skg. 38", 54.7028720, 25.2117048),
       ("Kauno g. 45", 54.6709140, 25.2619960), ("Vilkpėdės g. 2A", 54.6650653, 25.2490646), ("Liepsnos g. 2", 54.6492656, 25.2189971)]
Z, TILE = 13, 256          # z13 tiles shown at half size = a sharp z12 map on retina
OUT_W, OUT_H = 1200, 1100  # 2x pixels of the final image (600x550 css)
CACHE = sys.argv[1]
def px(lat, lon):
    n = 2 ** Z * TILE
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y
xs, ys = zip(*[px(la, lo) for _, la, lo in PTS])
cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
x0, y0 = cx - OUT_W / 2, cy - OUT_H / 2
img = Image.new('RGB', (OUT_W, OUT_H), 'white')
for tx in range(int(x0 // TILE), int((x0 + OUT_W) // TILE) + 1):
    for ty in range(int(y0 // TILE), int((y0 + OUT_H) // TILE) + 1):
        f = os.path.join(CACHE, f'{Z}_{tx}_{ty}.png')
        if not os.path.exists(f):
            req = urllib.request.Request(f'https://tile.openstreetmap.org/{Z}/{tx}/{ty}.png', headers={'User-Agent': 'autoservisai-redesign/1.0'})
            open(f, 'wb').write(urllib.request.urlopen(req, timeout=30).read())
        img.paste(Image.open(f).convert('RGB'), (int(tx * TILE - x0), int(ty * TILE - y0)))
# Restyle the OSM carto palette into a quiet light map: greys everywhere, water kept pale blue.
src = img.convert('RGB'); px_ = src.load(); W, H = src.size
out = Image.new('RGB', (W, H)); po = out.load()
for yy in range(H):
    for xx in range(W):
        r, g, b = px_[xx, yy]
        lum = 0.3 * r + 0.59 * g + 0.11 * b
        if b > r + 25 and b > 190 and g > 190:          # water (#aad3df)
            po[xx, yy] = (214, 230, 242)
        else:
            v = int(255 - (255 - lum) * 0.42)
            po[xx, yy] = (v, v, min(255, v + 1))
img = out
img.save(sys.argv[2], optimize=True)
img.convert('RGB').save(sys.argv[2].replace('.png', '.jpg'), quality=82, optimize=True, progressive=True)
pins = [{"name": n, "x": round((x - x0) / OUT_W * 100, 2), "y": round((y - y0) / OUT_H * 100, 2)} for (n, _, _), x, y in zip(PTS, xs, ys)]
print(json.dumps(pins, ensure_ascii=False))
