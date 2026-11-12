"""Watercolour portrait: flat transparent washes, pigment pooling at wash
edges, paper granulation, dry-brush darks for eyes, nose and curls, and a
hard dried edge where the wash ends. No AI model.
Usage: python3 akvarele.py photo.jpg mask.png out.png x0 y0 width [cx,cy,rx,ry ...]
Output: 3000 x 3750 px, for "portretas kurti --paruostas-portretas".
Needs: pip install opencv-contrib-python-headless numpy
"""
import sys, cv2, numpy as np

src, maskf, outf = sys.argv[1:4]
x0, y0, cw = map(int, sys.argv[4:7])
ch = int(round(cw * 1.25))
W, H = 3000, 3750
rng = np.random.default_rng(9)

img = cv2.imread(src)
mask = cv2.imread(maskf, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
for spec in [a for a in sys.argv[7:] if a.count(',') == 3]:
    cx, cy, rx, ry = map(int, spec.split(','))
    hole = np.zeros(img.shape[:2], np.uint8)
    cv2.ellipse(hole, (cx, cy), (rx, ry), 0, 0, 360, 255, -1)
    img = cv2.inpaint(img, hole, 9, cv2.INPAINT_TELEA)
    soft = cv2.GaussianBlur(hole.astype(np.float32) / 255.0, (0, 0), max(rx, ry) / 3)[..., None]
    img = np.clip(img.astype(np.float32) * (1 - 0.45 * soft) + np.array([40, 62, 96], np.float32) * (0.45 * soft), 0, 255).astype(np.uint8)

def crop_pad(a, fill):
    h, w = a.shape[:2]
    c = np.full((ch, cw) + a.shape[2:], fill, a.dtype)
    sx0, sy0, sx1, sy1 = max(0, x0), max(0, y0), min(w, x0 + cw), min(h, y0 + ch)
    c[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = a[sy0:sy1, sx0:sx1]
    return c

def noise(scale, octaves, seed):
    r = np.random.default_rng(seed)
    acc = np.zeros((H, W), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        s = max(2, int(scale / (2 ** o)))
        acc += amp * cv2.resize(r.random((H // s + 2, W // s + 2)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
        tot += amp; amp *= 0.5
    return np.clip(acc / tot, 0, 1)

photo = cv2.resize(crop_pad(img, 0), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
alpha = np.clip(cv2.resize(crop_pad(mask, 0), (W, H), interpolation=cv2.INTER_CUBIC), 0, 1)

# Sand-coloured edge pixels take the nearest solid fur colour; cold sky
# reflections in wet hair are warmed.
solid = (alpha > 0.92).astype(np.float32)
inner = cv2.GaussianBlur(photo * solid[..., None], (0, 0), 14) / np.maximum(cv2.GaussianBlur(solid, (0, 0), 14)[..., None], 1e-3)
t = np.clip((alpha - 0.55) / 0.4, 0, 1)[..., None]
fur = photo * t + inner * (1 - t)
lab = cv2.cvtColor(np.clip(fur, 0, 255).astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
shade = np.clip(1 - lab[..., 0] / 140.0, 0, 1)
lab[..., 1] = np.clip(128 + (lab[..., 1] - 128) * 1.08 + 3 * shade, 130, 255)
lab[..., 2] = np.maximum(128 + (lab[..., 2] - 128) * 1.10 + 10 * shade, 140)
fur = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)

# 1. Washes: mean-shift merges the coat into a few flat transparent areas.
S = 3
small = cv2.resize(np.clip(fur, 0, 255).astype(np.uint8), (W // S, H // S), interpolation=cv2.INTER_AREA)
ms = cv2.pyrMeanShiftFiltering(small, 10, 26, maxLevel=2)
ms = cv2.pyrMeanShiftFiltering(ms, 8, 20, maxLevel=1)
wash = cv2.resize(ms, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32)
wash = cv2.GaussianBlur(wash, (0, 0), 2.5)

# Watercolour is transparent: work in pigment density, lighter than the photo.
paper_c = np.array([246, 250, 252], np.float32)
D = -np.log(np.clip(wash / paper_c, 0.02, 1.0))
D *= 0.78
# 2. Uneven flow of pigment inside each wash.
D *= (0.86 + 0.28 * noise(220, 4, 3))[..., None]
# 3. Pigment pools along wash edges: thin darker rims.
gl = cv2.cvtColor(np.clip(wash, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
edge = cv2.magnitude(cv2.Sobel(gl, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(gl, cv2.CV_32F, 0, 1, ksize=3))
edge = np.clip(cv2.GaussianBlur(edge, (0, 0), 1.6) / 40.0, 0, 1)
D *= (1 + 0.38 * edge)[..., None]
# 4. Granulation: pigment settles in the paper's valleys, most in the darks.
gran = cv2.GaussianBlur(rng.normal(0, 1, (H, W)).astype(np.float32), (0, 0), 2.4)
gran = gran / (gran.std() + 1e-6)
D *= (1 + 0.06 * gran * np.clip(D.mean(-1) / 1.2, 0, 1))[..., None]
yy_, xx_ = np.mgrid[0:H, 0:W].astype(np.float32)
# 5. Dry brush: the darkest fine detail of the photo (eyes, nose, curls).
g = cv2.cvtColor(np.clip(photo, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
det = np.clip(cv2.GaussianBlur(g, (0, 0), 5) - g, 0, 80) / 80.0
det = det * np.clip((150 - g) / 110, 0, 1)
dark_pig = -np.log(np.array([60, 72, 98], np.float32) / paper_c)
D = D + det[..., None] * dark_pig * 0.9
# Eyes, nose and curls stay precise: wherever the photo has fine structure,
# the painting follows the photo instead of the flat wash.
Dp = -np.log(np.clip(fur / paper_c, 0.02, 1.0)) * 0.86
loc = np.abs(g - cv2.GaussianBlur(g, (0, 0), 4))
loc = cv2.GaussianBlur(loc, (0, 0), 6)
fine = np.clip((loc - 3.0) / 7.0, 0, 1)
# Eyes sit in the upper third of the bust: protect them most.
face = np.exp(-(((xx_ - 0.47 * W) / (0.24 * W)) ** 2 + ((yy_ - 0.30 * H) / (0.14 * H)) ** 2))
fine = np.clip(fine * (0.55 + 0.45 * face) + 0.35 * face * np.clip((120 - g) / 80, 0, 1), 0, 0.85)
fine = cv2.GaussianBlur(fine.astype(np.float32), (0, 0), 2)
D = D * (1 - fine[..., None]) + Dp * fine[..., None]
color = paper_c * np.exp(-D)

# 6. Shape: the head is crisp; the wash ends in a hard, irregular dried edge
# below the chest, with a darker line where the water stopped.
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
a = cv2.GaussianBlur(alpha, (0, 0), 1.5)
# Fill small holes inside the figure, so the wash is continuous.
disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (95, 95))
closed = cv2.morphologyEx((alpha > 0.5).astype(np.uint8), cv2.MORPH_CLOSE, disk)
# Only true holes, well inside the outline: the curly silhouette stays.
deep = (cv2.distanceTransform(closed, cv2.DIST_L2, 5) > 40).astype(np.float32)
a = np.maximum(a, cv2.GaussianBlur(deep, (0, 0), 6))
# The painting ends below the chest: pigment thins out over a band, and the
# last stroke breaks up like a dry brush dragged over rough paper.
lim = 0.72 * H - 0.035 * H * ((xx - W / 2) / (W / 2)) ** 2
big_n = (noise(420, 3, 21) - 0.5) * 0.09 * H
rough = (noise(18, 2, 23) - 0.5) * 0.012 * H
edge_line = lim + big_n + rough
A = np.clip(a * np.clip((edge_line - yy) / 3.0, 0, 1), 0, 1)
thin = np.clip((edge_line - yy) / (0.20 * H), 0, 1) ** 0.9
D_end = D * (0.22 + 0.78 * thin[..., None])
color = paper_c * np.exp(-D_end)
canvas = np.ones((H, W, 3), np.float32) * paper_c
canvas = canvas * (1 - A[..., None]) + color * A[..., None]
# Where a wash dried, its edge holds a little more pigment.
rim = np.clip(A - cv2.erode(A, np.ones((7, 7), np.uint8)), 0, 1) * (yy > 0.5 * H)
canvas *= (1 - 0.14 * rim)[..., None]
# A faint warm bloom behind the head, the way a painter tones the paper.
halo = np.exp(-(((xx - 0.47 * W) / (0.40 * W)) ** 2 + ((yy - 0.32 * H) / (0.34 * H)) ** 2)) * (1 - A) * 0.10
halo *= 0.6 + 0.8 * noise(160, 3, 41)
canvas = canvas * (1 - halo[..., None]) + np.array([150, 190, 225], np.float32) * halo[..., None]
# A few splashes near the shoulders.
for _ in range(0):  # splashes read as dust at print size
    cx = int(rng.uniform(0.15, 0.85) * W); cy = int(rng.uniform(0.55, 0.78) * H)
    if alpha[cy, cx] > 0.1: continue
    r = int(rng.uniform(4, 18))
    layer = np.zeros((H, W), np.float32)
    cv2.circle(layer, (cx, cy), r, 1.0, -1, cv2.LINE_AA)
    layer = cv2.GaussianBlur(layer, (0, 0), 1.2) * rng.uniform(0.3, 0.6)
    col = paper_c * np.exp(-D[int(0.45 * H), int(0.5 * W)] * 0.7)
    canvas = canvas * (1 - layer[..., None]) + col * layer[..., None]
# Cold-pressed paper.
tooth = cv2.GaussianBlur(rng.normal(0, 1, (H, W)).astype(np.float32), (0, 0), 1.8)
canvas *= (1 + 0.018 * tooth / (tooth.std() + 1e-6))[..., None]
out = np.clip(canvas, 0, 255).astype(np.uint8)
cv2.imwrite(outf, out, [cv2.IMWRITE_PNG_COMPRESSION, 3])
cv2.imwrite(outf.replace('.png', '-small.jpg'), cv2.resize(out, (W // 4, H // 4), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
cv2.imwrite(outf.replace('.png', '-akys.jpg'), out[820:1820, 900:2100], [cv2.IMWRITE_JPEG_QUALITY, 90])
