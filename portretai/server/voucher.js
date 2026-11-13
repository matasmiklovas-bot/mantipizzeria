// Printable gift voucher (A4 PDF) for orders that arrive after Christmas:
// something to put under the tree while the portrait is being made.
// Text is drawn as outlines from the bundled fonts, like on the poster, so
// Lithuanian letters cannot go missing.

import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { loadFont, layoutLine, fitLine, cleanText } from '../src/text.js';
import { SETTINGS, STYLE_LABELS, describeProduct } from './settings.js';
import { formatDate } from './deadline.js';

const W = 2480; // A4 at 300 DPI
const H = 3508;

// The studio mark (components/LogoMark.tsx), drawn at any size.
const MARK =
  '<g fill="#ff5aa5" transform="translate(2.2 2.2)">' +
  '<path d="M9.5 9.5c-4.2.8-6.6 6.5-5.8 13.2.4 3.4 2.4 5.6 4.8 5.2 2.3-.4 3.2-3.4 3.3-6.4L12.5 12z"/>' +
  '<path d="M30.5 9.5c4.2.8 6.6 6.5 5.8 13.2-.4 3.4-2.4 5.6-4.8 5.2-2.3-.4-3.2-3.4-3.3-6.4L27.5 12z"/>' +
  '<path d="M20 5.5c6.4 0 10.5 4.6 10.5 11.2 0 3.2-.8 6-1.9 8.6-1.5 3.6-4.6 7.2-8.6 7.2s-7.1-3.6-8.6-7.2c-1.1-2.6-1.9-5.4-1.9-8.6C9.5 10.1 13.6 5.5 20 5.5z"/></g>' +
  '<path fill="#2a3bd1" d="M20 5.5c6.4 0 10.5 4.6 10.5 11.2 0 3.2-.8 6-1.9 8.6-1.5 3.6-4.6 7.2-8.6 7.2s-7.1-3.6-8.6-7.2c-1.1-2.6-1.9-5.4-1.9-8.6C9.5 10.1 13.6 5.5 20 5.5z"/>' +
  '<g fill="#1a2380"><path d="M9.5 9.5c-4.2.8-6.6 6.5-5.8 13.2.4 3.4 2.4 5.6 4.8 5.2 2.3-.4 3.2-3.4 3.3-6.4L12.5 12z"/>' +
  '<path d="M30.5 9.5c4.2.8 6.6 6.5 5.8 13.2-.4 3.4-2.4 5.6-4.8 5.2-2.3-.4-3.2-3.4-3.3-6.4L27.5 12z"/></g>' +
  '<ellipse cx="20" cy="24.8" rx="5.4" ry="4.6" fill="#f2f1ec"/><circle cx="15.6" cy="17" r="1.6" fill="#f2f1ec"/><circle cx="24.4" cy="17" r="1.6" fill="#f2f1ec"/>' +
  '<path d="M17.4 22.4c0-1.1 1.2-1.7 2.6-1.7s2.6.6 2.6 1.7c0 1.3-1.4 2.4-2.6 2.4s-2.6-1.1-2.6-2.4z" fill="#17171f"/>' +
  '<path d="M20 24.6v2.2M17.6 27.4c1.4 1 3.4 1 4.8 0" stroke="#17171f" stroke-width="1.1" fill="none" stroke-linecap="round"/>';

export async function buildVoucherPdf(order) {
  const display = loadFont('Bricolage_780.ttf');
  const sans = loadFont('Jost_400Regular.ttf');
  const sansBold = loadFont('Jost_600SemiBold.ttf');
  const paper = '#f2f1ec';
  const ink = '#17171f';
  const muted = '#555764';
  const blue = '#2a3bd1';
  const pink = '#ff5aa5';
  const maxW = W - 2 * 330;
  let paths = '';
  const centered = (font, text, size, y, fill, spacing = 0, dx = 0, dy = 0) => {
    const { line } = fitLine(font, cleanText(text), size, maxW, spacing);
    paths += `<path fill="${fill}" d="${line.pathData((W - line.width) / 2 + dx, y + dy)}"/>`;
    return line;
  };
  // Printed twice: pink plate first, a little off register, then blue ink.
  const twoInks = (font, text, size, y, spacing = 0) => {
    centered(font, text, size, y, pink, spacing, size * 0.045, size * 0.045);
    centered(font, text, size, y, blue, spacing);
  };

  centered(sansBold, 'DOVANŲ KUPONAS', 58, 900, blue, 0.32);
  centered(display, 'Tavo augintinio portretas', 138, 1150, ink, -0.02);
  centered(display, 'jau kuriamas', 138, 1310, ink, -0.02);
  twoInks(display, order.name, 300, 1860, -0.03);
  centered(sansBold, `${STYLE_LABELS[order.style]} · ${describeProduct(order)}`.toLocaleUpperCase('lt-LT'), 50, 2090, muted, 0.16);
  centered(display, `Pristatysime apie ${formatDate(order.estimatedDelivery)}`, 92, 2560, ink, -0.02);
  centered(sans, 'Prieš spaudą parodysime portretą ir palauksime patvirtinimo.', 62, 2680, muted);
  centered(sansBold, `${SETTINGS.brand}  ·  užsakymas ${order.code}`.toLocaleUpperCase('lt-LT'), 42, 3150, muted, 0.22);

  const markSize = 300;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="${paper}"/>` +
    // Ticket edge: a dashed cut line inside a solid ink border.
    `<rect x="150" y="150" width="${W - 300}" height="${H - 300}" rx="60" fill="none" stroke="${blue}" stroke-width="10"/>` +
    `<rect x="200" y="200" width="${W - 400}" height="${H - 400}" rx="36" fill="none" stroke="${blue}" stroke-width="3" stroke-dasharray="22 16"/>` +
    `<g transform="translate(${(W - markSize) / 2} 420) scale(${markSize / 40})">${MARK}</g>` +
    `<line x1="${W / 2 - 200}" y1="1470" x2="${W / 2 + 200}" y2="1470" stroke="${pink}" stroke-width="8" stroke-linecap="round"/>` +
    `<line x1="${W / 2 - 200}" y1="2300" x2="${W / 2 + 200}" y2="2300" stroke="${pink}" stroke-width="8" stroke-linecap="round"/>` +
    paths +
    '</svg>';

  const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
  const stats = await sharp(jpeg).extract({ left: 330, top: 1600, width: maxW, height: 300 }).greyscale().stats();
  // The pet's name must really be on the page (see assertTextDrawn in layout.js).
  if (stats.channels[0].min > 120) throw new Error('Voucher text was not rendered.');

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Dovanų kuponas – ${order.name}`);
  const page = pdf.addPage([595.28, 841.89]);
  page.drawImage(await pdf.embedJpg(jpeg), { x: 0, y: 0, width: 595.28, height: 841.89 });
  return Buffer.from(await pdf.save());
}

// Exported for tests.
export const VOUCHER_PX = { width: W, height: H };
export { layoutLine };
