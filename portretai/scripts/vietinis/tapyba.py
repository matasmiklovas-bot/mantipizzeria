"""Stroke-based painterly rendering (after Hertzmann 1998): the picture is
rebuilt from brush strokes laid along the fur direction, large brushes first,
small ones only where detail is still missing. No AI model is involved.

Usage: python3 tapyba.py photo.jpg mask.png out.png x0 y0 width

x0, y0, width select the bust in photo pixels; height is width * 1.25 (4:5).
The result is a 3000 x 3750 px oil-style portrait on a dark ground, to be
passed to "portretas kurti --paruostas-portretas ... --stilius aliejus".
Also writes <out>-small.jpg and <out>-akys.jpg (a full-size crop of the face).

Needs: pip install opencv-contrib-python-headless numpy
"""
import sys, cv2, numpy as np

src, maskf, outf = sys.argv[1:4]
x0, y0, cw = map(int, sys.argv[4:7])
ch = int(round(cw * 1.25))
W, H = 3000, 3750
rng = np.random.default_rng(11)

img = cv2.imread(src)
mask = cv2.imread(maskf, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0

def crop_pad(a, fill):
    h, w = a.shape[:2]
    canvas = np.full((ch, cw) + a.shape[2:], fill, a.dtype)
    sx0, sy0, sx1, sy1 = max(0, x0), max(0, y0), min(w, x0 + cw), min(h, y0 + ch)
    canvas[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = a[sy0:sy1, sx0:sx1]
    return canvas

photo = cv2.resize(crop_pad(img, 0), (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
alpha = np.clip(cv2.resize(crop_pad(mask, 0), (W, H), interpolation=cv2.INTER_CUBIC), 0, 1)

# Edge decontamination: edge pixels carry sand colour; give them the colour of
# the nearest solid fur instead.
solid = (alpha > 0.92).astype(np.float32)
num = cv2.GaussianBlur(photo * solid[..., None], (0, 0), 14)
den = cv2.GaussianBlur(solid, (0, 0), 14)[..., None]
inner = num / np.maximum(den, 1e-3)
t = np.clip((alpha - 0.55) / 0.4, 0, 1)[..., None]
fur = photo * t + inner * (1 - t)
a = np.clip((alpha - 0.18) / 0.72, 0, 1)
a = cv2.GaussianBlur(a, (0, 0), 1.6)

# Tone: a little richer and warmer, like oil colour.
hsv = cv2.cvtColor(np.clip(fur, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
hsv[..., 1] = np.clip(hsv[..., 1] * 1.10, 0, 255)
fur = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
# Ground: warm brown-black, lighter behind the head, darker at the corners.
glow = np.exp(-(((xx - 0.46 * W) / (0.58 * W)) ** 2 + ((yy - 0.34 * H) / (0.46 * H)) ** 2))
bg = np.array([16, 22, 30], np.float32) + glow[..., None] * np.array([30, 46, 66], np.float32)
low = cv2.resize(rng.normal(0, 1, (H // 60, W // 60)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
bg *= (1 + 0.07 * low)[..., None]
# Light from the upper left; the lower body sinks into shadow.
light = 1.05 - 0.20 * np.clip((xx / W - 0.58) / 0.42, 0, 1) - 0.62 * np.clip((yy / H - 0.66) / 0.34, 0, 1) ** 1.4
target = bg * (1 - a[..., None]) + fur * light[..., None] * a[..., None]
target = np.clip(target, 0, 255)

# Stroke direction: along the fur, from the smoothed structure tensor.
g = cv2.GaussianBlur(cv2.cvtColor(target.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 3)
gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
jxx = cv2.GaussianBlur(gx * gx, (0, 0), 14); jyy = cv2.GaussianBlur(gy * gy, (0, 0), 14); jxy = cv2.GaussianBlur(gx * gy, (0, 0), 14)
theta = 0.5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2
coher = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / (jxx + jyy + 1e-3)
# Where there is no clear direction (background), sweep diagonally with some drift.
drift = cv2.resize(rng.normal(0, 1, (H // 200 + 2, W // 200 + 2)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
theta = np.where((coher > 0.18) & (a > 0.15), theta, -0.95 + 0.28 * drift)
dirx = np.cos(theta); diry = np.sin(theta)

canvas = np.zeros((H, W, 3), np.float32) + np.array([20, 28, 38], np.float32)
height = np.zeros((H, W), np.float32)

def paint_layer(radius, threshold, max_steps, only=None):
    ref = cv2.GaussianBlur(target, (0, 0), max(1.0, radius * 0.45))
    err = np.abs(canvas - ref).sum(-1)
    step = max(2, int(radius * 0.9))
    gh, gw = H // step, W // step
    cell = cv2.resize(err, (gw, gh), interpolation=cv2.INTER_AREA)
    ys, xs = np.nonzero(cell > threshold)
    order = rng.permutation(len(xs))
    count = 0
    for i in order:
        x = float(xs[i] * step + rng.uniform(0, step)); y = float(ys[i] * step + rng.uniform(0, step))
        xi, yi = min(W - 1, int(x)), min(H - 1, int(y))
        if only is not None and only[yi, xi] < 0.5:
            continue
        col = ref[yi, xi]
        pts = [(x, y)]
        lx, ly = 0.0, 0.0
        for s in range(max_steps):
            dx, dy = float(dirx[yi, xi]), float(diry[yi, xi])
            if lx * dx + ly * dy < 0:
                dx, dy = -dx, -dy
            x += dx * radius; y += dy * radius
            if x < 0 or y < 0 or x >= W or y >= H:
                break
            xi, yi = int(x), int(y)
            # Stop when the stroke would run into a different colour.
            if s >= 1 and np.abs(ref[yi, xi] - col).sum() > np.abs(ref[yi, xi] - canvas[yi, xi]).sum() + 18:
                break
            pts.append((x, y)); lx, ly = dx, dy
        if len(pts) < 2:
            pts.append((pts[0][0] + dirx[yi, xi] * radius * 0.6, pts[0][1] + diry[yi, xi] * radius * 0.6))
        p = np.array(pts, np.float32).reshape(-1, 1, 2)
        jitter = 1 + rng.normal(0, 0.035)
        c = tuple(float(v) for v in np.clip(col * jitter, 0, 255))
        cv2.polylines(canvas, [np.round(p * 8).astype(np.int32)], False, c, thickness=max(1, int(radius * 2)), lineType=cv2.LINE_AA, shift=3)
        cv2.polylines(height, [np.round(p * 8).astype(np.int32)], False, float(rng.uniform(0.35, 1.0) * min(1.0, radius / 14.0)), thickness=max(1, int(radius * 2)), lineType=cv2.LINE_AA, shift=3)
        count += 1
    return count

# Fine brushes only where the photo has real detail: eyes, nose, curls.
detail = np.abs(g - cv2.GaussianBlur(g, (0, 0), 10))
detail = cv2.GaussianBlur(detail, (0, 0), 6)
fine = ((detail > 9.0) & (a > 0.3)).astype(np.float32)

for radius, thr, steps, only in ((52, -1, 9, None), (26, 22, 9, None), (13, 20, 9, (a > 0.05).astype(np.float32)), (7, 22, 8, (a > 0.2).astype(np.float32)), (3.5, 30, 6, fine)):
    n = paint_layer(radius, thr, steps, only)
    print('radius', radius, 'strokes', n, flush=True)

# Impasto: each stroke has its own thickness; light catches the ridges.
hmap = cv2.GaussianBlur(height, (0, 0), 2.2)
relief = -(cv2.Sobel(hmap, cv2.CV_32F, 1, 0, ksize=3) + cv2.Sobel(hmap, cv2.CV_32F, 0, 1, ksize=3))
relief *= (0.35 + 0.65 * cv2.GaussianBlur(a, (0, 0), 20))  # quieter in the background
out = canvas + np.clip(relief * 15, -9, 12)[..., None]
# Eyes and nose: let some of the photo's own sharpness through.
sharp = cv2.GaussianBlur(target, (0, 0), 1.0)
m = cv2.GaussianBlur(fine, (0, 0), 9)[..., None] * 0.42
out = out * (1 - m) + sharp * m
# Canvas weave and a soft vignette.
weave = np.sin(xx * (2 * np.pi / 10.0)) + np.sin(yy * (2 * np.pi / 10.0))
out *= (1 + 0.012 * weave)[..., None]
vig = 1 - 0.28 * np.clip((np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) - 0.78) / 0.6, 0, 1)
out *= vig[..., None]
out = np.clip(out, 0, 255).astype(np.uint8)
cv2.imwrite(outf, out, [cv2.IMWRITE_PNG_COMPRESSION, 3])
cv2.imwrite(outf.replace('.png', '-small.jpg'), cv2.resize(out, (W // 4, H // 4), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])
# Close-up of the face at full resolution, to judge the eyes.
cv2.imwrite(outf.replace('.png', '-akys.jpg'), out[820:1820, 900:2100], [cv2.IMWRITE_JPEG_QUALITY, 90])
