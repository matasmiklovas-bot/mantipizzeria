"""Flat-colour screen-print portrait: a fixed palette of five inks, clean
shapes without specks, a flat ground, paper grain and slight misregistration.
Usage: python3 grafika.py photo.jpg mask.png out.png x0 y0 width [cx,cy,rx,ry ...]
Output: 3000 x 3750 px, for "portretas kurti --paruostas-portretas".
Needs: pip install opencv-contrib-python-headless numpy
"""
import sys, cv2, numpy as np

src, maskf, outf = sys.argv[1:4]
x0, y0, cw = map(int, sys.argv[4:7])
ch = int(round(cw * 1.25))
W, H = 3000, 3750
rng = np.random.default_rng(5)

img = cv2.imread(src)
mask = cv2.imread(maskf, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
for spec in [a for a in sys.argv[7:] if a.count(',') == 3]:
    cx, cy, rx, ry = map(int, spec.split(','))
    hole = np.zeros(img.shape[:2], np.uint8)
    cv2.ellipse(hole, (cx, cy), (rx, ry), 0, 0, 360, 255, -1)
    img = cv2.inpaint(img, hole, 9, cv2.INPAINT_TELEA)
    soft = cv2.GaussianBlur(hole.astype(np.float32) / 255.0, (0, 0), max(rx, ry) / 3)[..., None]
    img = np.clip(img.astype(np.float32) * (1 - 0.55 * soft) + np.array([22, 38, 62], np.float32) * (0.55 * soft), 0, 255).astype(np.uint8)

def crop_pad(a, fill):
    h, w = a.shape[:2]
    c = np.full((ch, cw) + a.shape[2:], fill, a.dtype)
    sx0, sy0, sx1, sy1 = max(0, x0), max(0, y0), min(w, x0 + cw), min(h, y0 + ch)
    c[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = a[sy0:sy1, sx0:sx1]
    return c

S = 3  # work at 1/3 size for the shapes
w, h = W // S, H // S
photo = cv2.resize(crop_pad(img, 0), (w, h), interpolation=cv2.INTER_AREA)
alpha = np.clip(cv2.resize(crop_pad(mask, 0), (w, h), interpolation=cv2.INTER_AREA), 0, 1)

# Luminance only: the palette, not the photo, decides the colours.
g = cv2.cvtColor(photo, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)
solid = (alpha > 0.9).astype(np.float32)
fill = cv2.GaussianBlur(g * solid, (0, 0), 6) / np.maximum(cv2.GaussianBlur(solid, (0, 0), 6), 1e-3)
g = np.where(alpha > 0.6, g, fill)
for _ in range(3):
    g = cv2.bilateralFilter(g, 9, 18, 7)
# Five tone bands by quantiles of the animal, so every ink is used.
vals = g[alpha > 0.6]
edges = np.quantile(vals, [0.16, 0.38, 0.62, 0.86])
band = np.digitize(g, edges).astype(np.uint8)          # 0 darkest .. 4 lightest
band = cv2.medianBlur(band, 9)
# Remove specks: any patch under 0.06 % of the picture joins its neighbour.
min_area = int(0.0006 * w * h)
for b in range(5):
    n, lab, st, _ = cv2.connectedComponentsWithStats((band == b).astype(np.uint8), 8)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] < min_area:
            m = lab == i
            ring = cv2.dilate(m.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~m
            if ring.any():
                band[m] = np.bincount(band[ring], minlength=5).argmax()

# Clean curves at print size: upscale each band as a smooth field.
fields = np.stack([cv2.GaussianBlur(cv2.resize((band == b).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 5) for b in range(5)], -1)
big = fields.argmax(-1)
# Inks come from the animal's own colours: the mean colour of each tone band,
# a little more saturated, with clearly separated lightness. (A fixed palette
# would turn a white dog orange.)
lab_full = cv2.cvtColor(photo, cv2.COLOR_BGR2LAB).astype(np.float32)
inks_lab = []
for b in range(5):
    sel = (band == b) & (alpha > 0.6)
    inks_lab.append(lab_full[sel].mean(0) if sel.any() else np.array([30 + 50 * b, 128, 128], np.float32))
inks_lab = np.array(inks_lab)
inks_lab[:, 1:] = 128 + (inks_lab[:, 1:] - 128) * 1.18
# Lightness: keep the animal's own range (a white dog stays white), but make
# sure neighbouring inks differ enough to read as separate colours.
L = np.sort(inks_lab[:, 0])
mid = L.mean()
span = max(L[-1] - L[0], 4 * 24)
L = np.clip(mid + (L - mid) * (span / max(L[-1] - L[0], 1e-3)), 18, 250)
for i in range(1, 5):
    L[i] = max(L[i], L[i - 1] + 20)
if L[-1] > 250:
    L -= L[-1] - 250
inks_lab[:, 0] = L
# A sixth ink, near black, only for what is truly dark in the photo: eyes,
# nose, mouth (and the whole coat of a black dog).
accent_lab = np.array([22, 128 + (inks_lab[0, 1] - 128) * 0.4, 128 + (inks_lab[0, 2] - 128) * 0.4], np.float32)
inks_lab = np.vstack([inks_lab, accent_lab])
INKS = cv2.cvtColor(np.clip(inks_lab, 0, 255).astype(np.uint8).reshape(1, 6, 3), cv2.COLOR_LAB2BGR)[0].astype(np.float32)
dark_px = (lab_full[..., 0] < 58) & (alpha > 0.5)
dark_px = cv2.morphologyEx(dark_px.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
dark_big = cv2.GaussianBlur(cv2.resize(dark_px.astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 4) > 0.5
big = np.where(dark_big, 5, big)
flat = INKS[big]
flat = INKS[big]

A = cv2.resize(alpha, (W, H), interpolation=cv2.INTER_CUBIC)
A = cv2.GaussianBlur(A, (0, 0), 4)
A = np.clip((A - 0.5) * 10 + 0.5, 0, 1)
# Drop stray hairs that print as loose specks.
n, lab, st, _ = cv2.connectedComponentsWithStats((A > 0.5).astype(np.uint8), 8)
keep = np.zeros(n, bool)
keep[1:] = st[1:, cv2.CC_STAT_AREA] >= 0.003 * W * H
A *= keep[lab].astype(np.float32)
# Thin hair tips print in a mid ink: a black tip on a pale strand reads as a speck.
opened = cv2.morphologyEx((A > 0.5).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
thin_part = (A > 0.5) & (opened == 0)
big = np.where(thin_part & (big < 2), 2, big)
flat = INKS[big]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
arc = 0.83 * H - 0.05 * H * ((xx - W / 2) / (W / 2)) ** 2
A *= np.clip((arc - yy) / 2.5, 0, 1)

ground = np.array([200, 205, 196], np.float32)   # BGR of a soft sage ground, #c4cdc8
paper = np.array([228, 238, 243], np.float32)    # BGR of #f3eee4
canvas = np.ones((H, W, 3), np.float32) * paper
canvas[:] = ground
# Darkest ink printed slightly out of register, as on a real screen print.
shift = np.float32([[1, 0, 5], [0, 1, 4]])
dark = (big == 0).astype(np.float32) * A
dark_off = cv2.warpAffine(dark, shift, (W, H))
canvas = canvas * (1 - A[..., None]) + flat * A[..., None]
canvas = canvas * (1 - 0.25 * np.clip(dark_off - dark, 0, 1)[..., None]) + INKS[0] * (0.25 * np.clip(dark_off - dark, 0, 1)[..., None])
# Uneven ink and paper tooth.
n1 = cv2.resize(rng.random((H // 40, W // 40)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
grain = cv2.GaussianBlur(rng.normal(0, 1, (H, W)).astype(np.float32), (0, 0), 1.1)
canvas *= (1 + 0.018 * (n1 - 0.5) + 0.02 * grain / (grain.std() + 1e-6))[..., None]
out = np.clip(canvas, 0, 255).astype(np.uint8)
cv2.imwrite(outf, out, [cv2.IMWRITE_PNG_COMPRESSION, 3])
cv2.imwrite(outf.replace('.png', '-small.jpg'), cv2.resize(out, (W // 4, H // 4), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
