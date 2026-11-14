"""Cuts the animal out of the photo: writes a greyscale mask (white = animal).
Uses the IS-Net "general use" segmentation model, run locally with ONNX Runtime.

Usage: python3 iskirpti.py photo.jpg isnet-general-use.onnx mask.png

Model file (170 MB, not in the repository):
https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx
TODO(savininkas): confirm the model's licence allows commercial use.

Needs: pip install opencv-contrib-python-headless numpy onnxruntime
"""
import sys, cv2, numpy as np, onnxruntime as ort
src, model, out = sys.argv[1:4]
img = cv2.imread(src)
h, w = img.shape[:2]
sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
x = cv2.resize(cv2.cvtColor(img, cv2.COLOR_BGR2RGB), (1024, 1024), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
x = (x - 0.5) / 1.0
x = np.transpose(x, (2, 0, 1))[None]
y = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
y = (y - y.min()) / (y.max() - y.min() + 1e-8)
mask = cv2.resize(y, (w, h), interpolation=cv2.INTER_CUBIC)
mask = np.clip(mask, 0, 1)
cv2.imwrite(out, (mask * 255).astype(np.uint8))
# quick visual: dog on white
vis = (img.astype(np.float32) * mask[..., None] + 255 * (1 - mask[..., None])).astype(np.uint8)
cv2.imwrite(out.replace('.png', '-vis.jpg'), cv2.resize(vis, (w // 2, h // 2)))
print('mask coverage', float(mask.mean()))
