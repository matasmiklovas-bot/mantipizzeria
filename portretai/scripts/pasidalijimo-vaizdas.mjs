// Builds app/opengraph-image.jpg: the picture Messenger, Facebook and others
// show when someone shares a link to the site. Uses the first real example
// (public/pavyzdziai/1-portretas.jpg), so run it again after changing examples:
//   node scripts/pasidalijimo-vaizdas.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { loadFont, layoutLine } from '../src/text.js';
import { SETTINGS } from '../server/settings.js';

const W = 1200;
const H = 630;
const display = loadFont('Bricolage_780.ttf');
const sans = loadFont('Jost_600SemiBold.ttf');
let paths = '';
const text = (font, s, size, x, y, fill, spacing = 0) => {
  const line = layoutLine(font, s, size, spacing);
  paths += `<path fill="${fill}" d="${line.pathData(x, y)}"/>`;
  return line;
};

const blue = '#2a3bd1';
const pink = '#ff5aa5';
const ink = '#17171f';
text(display, SETTINGS.brand, 40, 140, 104, ink, -0.03);
text(display, 'Jūsų augintinio', 76, 70, 236, ink, -0.035);
text(display, 'portretas', 76, 70, 316, ink, -0.035);
// "su vardu" printed in two inks, like the site headline.
const sv = layoutLine(display, 'su vardu', 76, -0.035);
paths += `<rect x="64" y="${384 - 20}" width="${sv.width + 14}" height="26" fill="${pink}"/>`;
text(display, 'su vardu', 76, 70, 396, blue, -0.035);
text(sans, 'PAVEIKSLAS · PLEDAS · TELEFONO DĖKLAS', 22, 72, 470, '#555764', 0.14);
text(sans, 'PRIEŠ SPAUDĄ ATSIUNČIAME PERŽIŪRĄ', 22, 72, 506, '#555764', 0.14);

const mark = fs.readFileSync(new URL('../app/icon.svg', import.meta.url), 'utf8')
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '');

// The example portrait in a light frame on two ink plates.
const fw = 330;
const fh = 440;
const fx = 790;
const fy = 95;
const portrait = await sharp(new URL('../public/pavyzdziai/1-portretas.jpg', import.meta.url).pathname)
  .resize(fw - 36, fh - 36, { fit: 'cover' })
  .toBuffer();
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
  `<rect width="${W}" height="${H}" fill="#f2f1ec"/>` +
  `<rect x="${fx + 16}" y="${fy + 16}" width="${fw}" height="${fh}" fill="${pink}"/>` +
  `<rect x="${fx - 12}" y="${fy - 12}" width="${fw}" height="${fh}" fill="${blue}"/>` +
  `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="#c8a777"/>` +
  `<rect x="${fx + 10}" y="${fy + 10}" width="${fw - 20}" height="${fh - 20}" fill="#f6f2ea"/>` +
  `<g transform="translate(70 62) scale(1.6)">${mark}</g>` +
  paths +
  `</svg>`;
const out = await sharp(Buffer.from(svg))
  .composite([{ input: portrait, left: fx + 18, top: fy + 18 }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toBuffer();
fs.writeFileSync(new URL('../app/opengraph-image.jpg', import.meta.url), out);
fs.writeFileSync(new URL('../app/opengraph-image.alt.txt', import.meta.url), 'Šuns portretas su vardu įrėmintas, šalia užrašas „Jūsų augintinio portretas su vardu“.\n');
console.log('app/opengraph-image.jpg', out.length, 'B');
