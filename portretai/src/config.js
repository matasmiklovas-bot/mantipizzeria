// Central configuration. Everything a non-programmer may need to change lives
// here or in stiliai/*.json and stiliai/*.txt.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STYLES_DIR = path.join(ROOT, 'stiliai');
export const FONTS_DIR = path.join(ROOT, 'sriftai');

// TODO(savininkas): working brand name, used only in the preview watermark.
export const BRAND = 'Snukutis';

export const DPI = 300;

// 36 px at 300 DPI = 3.048 mm. A whole pixel count keeps the print file at
// exactly 300 DPI while still satisfying the 3 mm minimum bleed.
// TODO(savininkas): confirm bleed with the print shop.
export const BLEED_PX = 36;

// Nothing important (name, eyes) closer than this to the trim edge. A typical
// frame rebate hides about 5 mm on each side, so 10 mm leaves a visible margin.
// TODO(savininkas): measure the rebate of the real frame.
export const SAFE_MM = 10;

// Trim sizes in pixels at 300 DPI.
export const SIZES = {
  '30x40': { label: '30×40 cm', widthMm: 300, heightMm: 400, widthPx: 3543, heightPx: 4724 },
  a4: { label: 'A4 (21×29,7 cm)', widthMm: 210, heightMm: 297, widthPx: 2480, heightPx: 3508 },
};

// The portrait image itself is always composed at this aspect ratio
// (width / height). It is one of the ratios image models accept natively.
export const PORTRAIT_ASPECT = 4 / 5;
export const PORTRAIT_ASPECT_LABEL = '4:5';

export const NAME_MAX_CHARS = 30;
export const SECOND_LINE_MAX_CHARS = 40;

// Photo checks. Sharpness and brightness thresholds were calibrated on
// synthetic images only.
// TODO(savininkas): re-check thresholds on 20+ real customer photos.
export const PHOTO = {
  maxBytes: 15 * 1024 * 1024,
  minShortSidePx: 800, // below this: rejected
  warnShortSidePx: 1200, // below this: accepted with a warning
  darkReject: 30, // mean luma 0..255
  darkWarn: 55,
  brightReject: 240,
  sharpReject: 35, // variance of Laplacian in the sharpest tiles
  sharpWarn: 90,
};

// Upscaling beyond this factor looks soft in print at 30 cm viewing distance.
export const UPSCALE_WARN_FACTOR = 2.5;

export const FRAMES = {
  juodas: { label: 'juodas', face: '#1d1c1a', edge: '#0d0d0c', highlight: '#3a3835' },
  baltas: { label: 'baltas', face: '#f3f1ec', edge: '#d9d5cc', highlight: '#ffffff' },
  azuolas: { label: 'ąžuolo', face: '#c39a67', edge: '#9a7446', highlight: '#dab585' },
};

export function mmToPx(mm) {
  return Math.round((mm / 25.4) * DPI);
}

export function pxToMm(px) {
  return (px / DPI) * 25.4;
}

export function getSize(key) {
  const k = String(key || '').toLowerCase().replace('×', 'x');
  const size = SIZES[k];
  if (!size) {
    throw new Error(`Nežinomas dydis „${key}“. Galimi: ${Object.keys(SIZES).join(', ')}.`);
  }
  return { key: k, ...size };
}
