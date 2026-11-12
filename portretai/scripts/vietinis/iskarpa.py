"""Picks the bust crop automatically from the animal mask: head and chest,
4:5, with some room above the ears. Prints "x0 y0 width" for the painting
scripts.

Usage: python3 iskarpa.py mask.png"""
import sys, cv2, numpy as np

m = cv2.imread(sys.argv[1], cv2.IMREAD_GRAYSCALE) > 127
h, w = m.shape
# Largest connected animal only.
n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
if n > 1:
    m = lab == (1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])))
ys, xs = np.nonzero(m)
y_top, y_bot = ys.min(), ys.max()
bh = y_bot - y_top
# Head and ears: the upper part of the animal (whole animal if it is a close-up).
upper = m[y_top:y_top + int(bh * 0.45)]
cols = np.nonzero(upper.any(axis=0))[0]
head_w = cols.max() - cols.min()
cx = (cols.min() + cols.max()) / 2
cw = int(head_w * 1.35)
cw = max(cw, int(bh * 0.55))          # a close-up still gets some chest
cw = min(cw, w, int(h / 1.25))
x0 = int(round(min(max(cx - cw / 2, 0), w - cw)))
y0 = int(round(min(max(y_top - 0.12 * cw, 0), h - cw * 1.25)))
print(x0, y0, cw)
