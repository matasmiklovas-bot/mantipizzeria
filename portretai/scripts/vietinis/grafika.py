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
# A white or cream animal (samoyed, westie, white cat) must stay white: most of
# the coat goes to the two lightest inks, only real shadows get the grey ones.
light_coat = np.median(vals) > 175
edges = np.quantile(vals, [0.05, 0.14, 0.32, 0.62] if light_coat else [0.16, 0.38, 0.62, 0.86])
band = np.digitize(g, edges).astype(np.uint8)          # 0 darkest .. 4 lightest
# A coat of several colours (merle, tricolour, tabby, calico) loses them when
# split by lightness alone: copper and grey of the same lightness merge into
# one beige. Then the five inks are found by colour clustering instead, with
# hue weighted four times as much as lightness, and numbered darkest to lightest.
lab_sm = cv2.cvtColor(cv2.bilateralFilter(photo, 9, 30, 7), cv2.COLOR_BGR2LAB).astype(np.float32)
chroma = np.hypot(lab_sm[..., 1] - 128, lab_sm[..., 2] - 128)
# A black dog is dark and colourless; a dark wet ginger dog is dark but
# coloured, and should print as ginger, not as black.
black_coat = np.median(vals) < 70 and np.median(chroma[alpha > 0.6]) < 10
multicolour = False
if not light_coat:
    sel = alpha > 0.6
    # Several colours: clear white or grey patches next to clearly coloured ones.
    # (A one-colour ginger coat has no light neutral patches and stays on the
    # lightness bands, which suit it better.)
    colourful = (chroma[sel] > 18).mean()
    light_neutral = ((lab_sm[..., 0][sel] > 150) & (chroma[sel] < 14)).mean()
    if colourful > 0.1 and 0.1 < light_neutral < 0.9:
        feats = np.stack([lab_sm[..., 0], 4 * (lab_sm[..., 1] - 128), 4 * (lab_sm[..., 2] - 128)], -1)
        sample = feats[sel].reshape(-1, 3)
        if len(sample) > 60000:
            sample = sample[rng.choice(len(sample), 60000, replace=False)]
        _, _, centers = cv2.kmeans(sample.astype(np.float32), 5, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.5), 4, cv2.KMEANS_PP_CENTERS)
        order = np.argsort(centers[:, 0])
        centers = centers[order]
        d = ((feats[..., None, :] - centers[None, None, :, :]) ** 2).sum(-1)
        band = d.argmin(-1).astype(np.uint8)
        multicolour = True
        print('colour clusters', np.round(centers).astype(int).tolist(), 'colourful', round(float(colourful), 2), 'light neutral', round(float(light_neutral), 2), file=sys.stderr)
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
inks_lab[:, 1:] = 128 + (inks_lab[:, 1:] - 128) * (1.18 if light_coat else 1.3)
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
single_colour = not (light_coat or black_coat or multicolour)
if single_colour:
    # One-colour coat (ginger, red, brown, golden): a designed ramp in the
    # coat's own hue, light peach to deep brown. Photo means in shade are
    # muddy; a screen printer would mix clean inks of one hue instead.
    sel = (alpha > 0.6) & (chroma > 10)
    ha = np.median(lab_sm[..., 1][sel] - 128)
    hb = np.median(lab_sm[..., 2][sel] - 128)
    hue = np.arctan2(hb, ha)
    # Warm coats (red, ginger, brown, golden) photograph pinkish in shade;
    # pull their hue halfway to a clean orange.
    if np.radians(15) < hue < np.radians(95):
        hue = 0.5 * hue + 0.5 * np.radians(62)
    C = float(np.clip(np.hypot(ha, hb) * 2.8, 36, 72))
    Ls = np.array([46, 86, 128, 170, 212], np.float32)
    cf = np.array([0.55, 1.0, 1.12, 1.0, 0.82], np.float32)
    dh = np.radians(np.array([-10, -6, 0, 5, 10], np.float32))   # darker inks a little redder
    inks_lab[:, 0] = Ls
    inks_lab[:, 1] = 128 + C * cf * np.cos(hue + dh)
    inks_lab[:, 2] = 128 + C * cf * np.sin(hue + dh)
elif not light_coat and not black_coat:
    # A screen print is lighter and cleaner than a photo in shade: lift the
    # inks so the lightest is near paper and the darkest is still a colour.
    # (A black dog keeps its own dark range.)
    lo, hi = max(L[0], 52), max(L[-1], 222)
    inks_lab[:, 0] = lo + (L - L[0]) * (hi - lo) / max(L[-1] - L[0], 1e-3)
if light_coat:
    # Paper-white coat with warm, creamy shadows: neutral greys read as dirt.
    inks_lab[:, 0] = [118, 160, 196, 226, 246]
    inks_lab[:, 1] = 128 + np.array([3, 3, 2, 1, 0], np.float32)
    inks_lab[:, 2] = 128 + np.array([6, 9, 10, 9, 6], np.float32)
# A sixth ink, near black, only for what is truly dark in the photo: eyes,
# nose, mouth (and the whole coat of a black dog).
accent_lab = np.array([22, 128 + (inks_lab[0, 1] - 128) * 0.4, 128 + (inks_lab[0, 2] - 128) * 0.4], np.float32)
inks_lab = np.vstack([inks_lab, accent_lab])
INKS = cv2.cvtColor(np.clip(inks_lab, 0, 255).astype(np.uint8).reshape(1, 6, 3), cv2.COLOR_LAB2BGR)[0].astype(np.float32)
# On a white coat the eyes are lighter than on a dark one, but still far
# darker than the fur around them.
dark_px = (lab_full[..., 0] < (95 if light_coat else 58 if black_coat else 30 if single_colour else 46)) & (alpha > 0.5)
if light_coat:
    # Dark background shows through the fur at the outline: only the inside counts.
    inside = cv2.erode((alpha > 0.5).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    dark_px &= inside.astype(bool)
dark_px = cv2.morphologyEx(dark_px.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
dark_big = cv2.GaussianBlur(cv2.resize(dark_px.astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 4) > 0.5
big = np.where(dark_big, 5, big)
# Tongue and inner ears: a seventh ink, pink, where the photo is clearly pink
# (red stronger than yellow). A copper or ginger coat is yellower, so it stays out.
pa, pb = lab_full[..., 1] - 128, lab_full[..., 2] - 128
pink_px = (pa > 16) & (pa > 1.15 * pb) & (lab_full[..., 0] > 80) & (alpha > 0.6)
pink_px = cv2.morphologyEx(pink_px.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool)
if pink_px.sum() > 0.002 * w * h:
    pink_lab = lab_full[pink_px].mean(0)
    pink_lab[1:] = 128 + (pink_lab[1:] - 128) * 1.1
    pink_ink = cv2.cvtColor(np.clip(pink_lab, 0, 255).astype(np.uint8).reshape(1, 1, 3), cv2.COLOR_LAB2BGR)[0].astype(np.float32)
    INKS = np.vstack([INKS, pink_ink])
    pink_big = cv2.GaussianBlur(cv2.resize(pink_px.astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 4) > 0.5
    big = np.where(pink_big & ~dark_big, 6, big)
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
