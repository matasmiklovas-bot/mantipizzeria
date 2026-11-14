// Wall mockup: the trimmed poster inside a frame, hung above a shelf, drawn
// to scale so 30×40 and A4 look different in size, as they do at home.

import sharp from 'sharp';
import { FRAMES, mmToPx } from './config.js';
import { trimPoster } from './preview.js';

const SCENE_W = 2000;
const SCENE_H = 2500;
const PX_PER_CM = 28; // the scene shows a wall about 71 cm wide
const MOULDING_CM = 2;
const REBATE_MM = 5; // part of the print hidden under the frame edge

export function frameChoices() {
  return Object.keys(FRAMES);
}

export async function buildWallMockup(posterPng, size, frameKey = 'azuolas') {
  const frame = FRAMES[frameKey];
  if (!frame) throw new Error(`Nežinoma rėmelio spalva „${frameKey}“. Galimos: ${frameChoices().join(', ')}.`);

  const openW = Math.round(((size.widthMm - 2 * REBATE_MM) / 10) * PX_PER_CM);
  const openH = Math.round(((size.heightMm - 2 * REBATE_MM) / 10) * PX_PER_CM);
  const m = Math.round(MOULDING_CM * PX_PER_CM);
  const outerW = openW + 2 * m;
  const outerH = openH + 2 * m;
  const fx = Math.round((SCENE_W - outerW) / 2);
  const shelfY = 2210;
  // Hang the frame so its centre sits a little above the middle of the wall
  // area that is visible above the shelf.
  const fy = Math.round(shelfY * 0.47 - outerH / 2);

  const rebatePx = mmToPx(REBATE_MM);
  const trimmed = await trimPoster(posterPng);
  const meta = await sharp(trimmed).metadata();
  const print = await sharp(trimmed)
    .extract({ left: rebatePx, top: rebatePx, width: meta.width - 2 * rebatePx, height: meta.height - 2 * rebatePx })
    .resize({ width: openW, height: openH, fit: 'fill' })
    .toBuffer();

  const x0 = fx;
  const y0 = fy;
  const x1 = fx + outerW;
  const y1 = fy + outerH;
  const ix0 = x0 + m;
  const iy0 = y0 + m;
  const ix1 = x1 - m;
  const iy1 = y1 - m;

  const scene =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SCENE_W}" height="${SCENE_H}">` +
    `<defs>` +
    `<linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#efebe4"/><stop offset="0.55" stop-color="#e6e1d8"/><stop offset="1" stop-color="#d6d0c5"/>` +
    `</linearGradient>` +
    `<radialGradient id="light" cx="0.28" cy="0.2" r="0.85">` +
    `<stop offset="0" stop-color="#fffaf0" stop-opacity="0.55"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<linearGradient id="shelfTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d2b083"/><stop offset="1" stop-color="#c29c6c"/></linearGradient>` +
    `<linearGradient id="shelfFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a98152"/><stop offset="1" stop-color="#8f6b41"/></linearGradient>` +
    `<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="26"/></filter>` +
    `<filter id="tight" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>` +
    `<filter id="under" x="-10%" y="-200%" width="120%" height="500%"><feGaussianBlur stdDeviation="22"/></filter>` +
    `</defs>` +
    `<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#wall)"/>` +
    `<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#light)"/>` +
    // Frame shadows: a wide soft one from the room light, a tight contact one.
    `<rect x="${x0 + 14}" y="${y0 + 30}" width="${outerW}" height="${outerH}" fill="#3b3226" fill-opacity="0.3" filter="url(#soft)"/>` +
    `<rect x="${x0 + 4}" y="${y0 + 8}" width="${outerW}" height="${outerH}" fill="#2a231a" fill-opacity="0.35" filter="url(#tight)"/>` +
    // Moulding: four mitred sides, lit from the upper left.
    `<polygon points="${x0},${y0} ${x1},${y0} ${ix1},${iy0} ${ix0},${iy0}" fill="${frame.highlight}"/>` +
    `<polygon points="${x0},${y0} ${ix0},${iy0} ${ix0},${iy1} ${x0},${y1}" fill="${frame.face}"/>` +
    `<polygon points="${x1},${y0} ${x1},${y1} ${ix1},${iy1} ${ix1},${iy0}" fill="${frame.face}"/>` +
    `<polygon points="${x0},${y1} ${ix0},${iy1} ${ix1},${iy1} ${x1},${y1}" fill="${frame.edge}"/>` +
    `<rect x="${x0}" y="${y0}" width="${outerW}" height="${outerH}" fill="none" stroke="#000000" stroke-opacity="0.18" stroke-width="1.5"/>` +
    // Shelf with a shadow on the wall beneath it.
    `<rect x="150" y="${shelfY + 60}" width="${SCENE_W - 300}" height="50" fill="#3b3226" fill-opacity="0.34" filter="url(#under)"/>` +
    `<rect x="120" y="${shelfY}" width="${SCENE_W - 240}" height="20" fill="url(#shelfTop)"/>` +
    `<rect x="120" y="${shelfY + 20}" width="${SCENE_W - 240}" height="46" fill="url(#shelfFront)"/>` +
    `<rect x="120" y="${shelfY + 20}" width="${SCENE_W - 240}" height="2" fill="#000000" fill-opacity="0.12"/>` +
    `</svg>`;

  const glass =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${openW}" height="${openH}">` +
    `<defs>` +
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.1"/><stop offset="0.35" stop-color="#ffffff" stop-opacity="0"/>` +
    `</linearGradient>` +
    // Shadow the moulding casts onto the print along the top and left edges.
    `<linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="sl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>` +
    `</defs>` +
    `<rect width="${openW}" height="${openH}" fill="url(#g)"/>` +
    `<rect width="${openW}" height="9" fill="url(#st)"/>` +
    `<rect width="7" height="${openH}" fill="url(#sl)"/>` +
    `</svg>`;

  // Fine plaster grain, so the wall does not look like a flat vector fill.
  const grain = await sharp({
    create: { width: SCENE_W, height: SCENE_H, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 9 } },
  })
    .greyscale()
    .png()
    .toBuffer();

  const base = await sharp(Buffer.from(scene))
    .composite([{ input: grain, blend: 'soft-light' }])
    .png()
    .toBuffer();

  return sharp(base)
    .composite([
      { input: print, left: ix0, top: iy0 },
      { input: Buffer.from(glass), left: ix0, top: iy0 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}
