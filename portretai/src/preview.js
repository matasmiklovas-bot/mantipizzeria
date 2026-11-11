// Customer preview: the trimmed poster, small, with a watermark. It is good
// enough to judge likeness and the name, and useless for printing.

import sharp from 'sharp';
import { BLEED_PX, BRAND } from './config.js';
import { loadFont, layoutLine } from './text.js';

const PREVIEW_WIDTH = 1200;

/** Cuts the bleed off, returning the poster exactly as it will be trimmed. */
export async function trimPoster(posterPng) {
  const meta = await sharp(posterPng).metadata();
  return sharp(posterPng)
    .extract({ left: BLEED_PX, top: BLEED_PX, width: meta.width - 2 * BLEED_PX, height: meta.height - 2 * BLEED_PX })
    .toBuffer();
}

export async function buildPreview(posterPng, { watermark = `PERŽIŪRA · ${BRAND}` } = {}) {
  const trimmed = await trimPoster(posterPng);
  const small = await sharp(trimmed).resize({ width: PREVIEW_WIDTH }).toBuffer({ resolveWithObject: true });
  const { width, height } = small.info;

  const font = loadFont('Jost_600SemiBold.ttf');
  const size = Math.round(width * 0.04);
  const line = layoutLine(font, watermark.toLocaleUpperCase('lt-LT'), size, 0.14);
  const stepX = line.width + size * 3;
  const stepY = size * 7;

  // Tile the mark over a square larger than the image, then rotate the whole
  // group, so the diagonal pattern covers every corner.
  const span = Math.hypot(width, height);
  let uses = '';
  let row = 0;
  for (let y = -span / 2; y < span / 2 + stepY; y += stepY, row++) {
    const offset = row % 2 ? stepX / 2 : 0;
    for (let x = -span / 2 - stepX; x < span / 2 + stepX; x += stepX) {
      uses += `<use href="#w" x="${Math.round(x + offset)}" y="${Math.round(y)}"/>`;
    }
  }
  // One outline in <defs>, placed many times: keeps the SVG small. (A single
  // path holding every copy silently failed to render in librsvg.)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<defs><path id="w" d="${line.pathData(0, 0)}"/></defs>` +
    `<g transform="translate(${width / 2} ${height / 2}) rotate(-32)" ` +
    `fill="#ffffff" fill-opacity="0.34" stroke="#000000" stroke-opacity="0.2" stroke-width="1">${uses}</g></svg>`;

  return sharp(small.data)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .jpeg({ quality: 82, chromaSubsampling: '4:2:0', mozjpeg: true })
    .toBuffer();
}
