// Printable gift voucher (A4 PDF) for orders that arrive after Christmas:
// something to put under the tree while the portrait is being made.
// Text is drawn as outlines from the bundled fonts, like on the poster, so
// Lithuanian letters cannot go missing.

import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { loadFont, layoutLine, fitLine, cleanText } from '../src/text.js';
import { SETTINGS, STYLE_LABELS, SIZE_LABELS } from './settings.js';
import { formatDate } from './deadline.js';

const W = 2480; // A4 at 300 DPI
const H = 3508;

export async function buildVoucherPdf(order) {
  const serifItalic = loadFont('CormorantGaramond_500Medium_Italic.ttf');
  const serif = loadFont('CormorantGaramond_500Medium.ttf');
  const sans = loadFont('Jost_400Regular.ttf');
  const ink = '#26221d';
  const muted = '#6e665b';
  const accent = '#8a4b2a';
  const maxW = W - 2 * 330;
  let paths = '';
  const centered = (font, text, size, y, fill, spacing = 0) => {
    const { line } = fitLine(font, cleanText(text), size, maxW, spacing);
    paths += `<path fill="${fill}" d="${line.pathData((W - line.width) / 2, y)}"/>`;
  };

  centered(sans, 'DOVANŲ KUPONAS', 62, 760, accent, 0.32);
  centered(serif, 'Tavo augintinio portretas', 150, 1080, ink);
  centered(serif, 'jau kuriamas', 150, 1260, ink);
  centered(serifItalic, order.name, 330, 1830, ink);
  centered(sans, `${STYLE_LABELS[order.style]} · ${SIZE_LABELS[order.size]} · su rėmeliu`.toLocaleUpperCase('lt-LT'), 54, 2080, muted, 0.2);
  centered(serif, `Portretą pristatysime apie ${formatDate(order.estimatedDelivery)}`, 84, 2520, ink);
  centered(serif, 'Prieš spaudą jį parodysime ir palauksime patvirtinimo.', 70, 2640, muted);
  centered(sans, `${SETTINGS.brand}  ·  užsakymas ${order.code}`.toLocaleUpperCase('lt-LT'), 44, 3080, muted, 0.22);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" fill="#fbf9f4"/>` +
    `<rect x="170" y="170" width="${W - 340}" height="${H - 340}" fill="none" stroke="${ink}" stroke-width="5"/>` +
    `<rect x="200" y="200" width="${W - 400}" height="${H - 400}" fill="none" stroke="${ink}" stroke-width="1.5"/>` +
    `<line x1="${W / 2 - 220}" y1="1420" x2="${W / 2 + 220}" y2="1420" stroke="${accent}" stroke-width="3"/>` +
    `<line x1="${W / 2 - 220}" y1="2280" x2="${W / 2 + 220}" y2="2280" stroke="${accent}" stroke-width="3"/>` +
    paths +
    '</svg>';

  const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
  const stats = await sharp(jpeg).extract({ left: 330, top: 1560, width: maxW, height: 330 }).greyscale().stats();
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
