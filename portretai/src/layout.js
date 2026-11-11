// Poster layout: portrait + name (+ optional second line), on a canvas that
// includes bleed. All text is drawn by code as vector outlines.

import sharp from 'sharp';
import {
  BLEED_PX,
  SAFE_MM,
  PORTRAIT_ASPECT,
  NAME_MAX_CHARS,
  SECOND_LINE_MAX_CHARS,
  UPSCALE_WARN_FACTOR,
  mmToPx,
} from './config.js';
import { loadFont, cleanText, missingGlyphs, capHeight, fitLine } from './text.js';
import { toPrintSize } from './upscale.js';

const DARK_TEXT = '#2a2622';
const LIGHT_TEXT = '#f4efe6';

/**
 * Validates and normalises the texts. Throws a Lithuanian error message when
 * the text cannot be printed.
 */
export function prepareTexts(style, nameRaw, secondRaw) {
  let name = cleanText(nameRaw);
  let second = cleanText(secondRaw);
  if (!name) throw new Error('Vardas tuščias.');
  if ([...name].length > NAME_MAX_CHARS) {
    throw new Error(`Vardas per ilgas: ${[...name].length} ženklų. Daugiausia ${NAME_MAX_CHARS}.`);
  }
  if ([...second].length > SECOND_LINE_MAX_CHARS) {
    throw new Error(`Antra eilutė per ilga: ${[...second].length} ženklų. Daugiausia ${SECOND_LINE_MAX_CHARS}.`);
  }
  if (style.name.uppercase) name = name.toLocaleUpperCase('lt-LT');
  if (second && style.secondLine.uppercase) second = second.toLocaleUpperCase('lt-LT');

  const nameFont = loadFont(style.name.font);
  const secondFont = loadFont(style.secondLine.font);
  const bad = [...missingGlyphs(nameFont, name), ...(second ? missingGlyphs(secondFont, second) : [])];
  if (bad.length) {
    throw new Error(`Šių ženklų šriftas neturi, todėl jų atspausdinti negalima: ${[...new Set(bad)].join(' ')}`);
  }
  return { name, second, nameFont, secondFont };
}

/**
 * Pure geometry, no pixels. Exported so the website can draw the same live
 * preview and so tests can assert that text stays inside the safe zone.
 */
export function computeLayout(size, style, nameRaw, secondRaw = '') {
  const { name, second, nameFont, secondFont } = prepareTexts(style, nameRaw, secondRaw);
  const B = BLEED_PX;
  const W = size.widthPx;
  const H = size.heightPx;
  const canvasW = W + 2 * B;
  const canvasH = H + 2 * B;
  const safe = mmToPx(SAFE_MM);

  let image;
  let textTop;
  let fade = null;
  let band = null;
  let maxTextWidth;

  if (style.layout === 'full') {
    const imgH = Math.round(canvasW / PORTRAIT_ASPECT);
    image = { left: 0, top: 0, width: canvasW, height: imgH };
    const bandH = Math.round(Math.max(0.19 * canvasH, canvasH - imgH + 0.1 * imgH));
    band = { top: canvasH - bandH, height: bandH };
    const fadeH = Math.round((style.fade ?? 0.1) * imgH);
    fade = { top: band.top - fadeH, height: fadeH };
    textTop = band.top;
    maxTextWidth = W - 2 * safe;
  } else {
    const margin = Math.round(0.085 * W);
    const imgW = W - 2 * margin;
    const imgH = Math.round(imgW / PORTRAIT_ASPECT);
    image = { left: B + margin, top: B + margin, width: imgW, height: imgH };
    textTop = image.top + imgH;
    maxTextWidth = imgW;
  }

  const textBottom = B + H - safe;
  const available = textBottom - textTop;

  // Fit both lines to the width first, then shrink the whole block if it is
  // taller than the space under the portrait. Accents above capitals (Ž, Ė)
  // need clear space, hence the top padding.
  let scale = 1;
  let nameFit;
  let secondFit = null;
  let nameCap;
  let secondCap = 0;
  let gap = 0;
  let topPad;
  let bottomPad;
  let blockH;
  for (let attempt = 0; attempt < 6; attempt++) {
    nameFit = fitLine(nameFont, name, style.name.size * W * scale, maxTextWidth, style.name.spacing);
    nameCap = capHeight(nameFont, nameFit.size);
    if (second) {
      secondFit = fitLine(secondFont, second, style.secondLine.size * W * scale, maxTextWidth, style.secondLine.spacing);
      secondCap = capHeight(secondFont, secondFit.size);
      gap = Math.max(1.7 * secondCap, 0.55 * nameCap);
    }
    topPad = (style.layout === 'margins' ? 0.85 : 0.35) * nameCap;
    // Room under the last baseline for descenders and ogoneks (ą, ę, į, ų, y).
    bottomPad = 0.32 * (second ? secondFit.size : nameFit.size);
    blockH = nameCap + (second ? gap + secondCap : 0);
    const needed = topPad + blockH + bottomPad;
    if (needed <= available) break;
    scale *= (available / needed) * 0.98;
  }

  // Slightly above the geometric centre: reads as centred to the eye.
  const blockTop = textTop + topPad + (available - topPad - blockH - bottomPad) * 0.42;
  const nameBaseline = blockTop + nameCap;
  const secondBaseline = second ? nameBaseline + gap + secondCap : null;
  const centerX = canvasW / 2;

  return {
    canvas: { width: canvasW, height: canvasH },
    trim: { left: B, top: B, width: W, height: H },
    safe: { left: B + safe, top: B + safe, width: W - 2 * safe, height: H - 2 * safe },
    image,
    band,
    fade,
    name: {
      text: name,
      size: nameFit.size,
      width: nameFit.line.width,
      left: centerX - nameFit.line.width / 2,
      baseline: nameBaseline,
      line: nameFit.line,
      shrunk: nameFit.size < style.name.size * W - 0.5,
    },
    second: second
      ? {
          text: second,
          size: secondFit.size,
          width: secondFit.line.width,
          left: centerX - secondFit.line.width / 2,
          baseline: secondBaseline,
          line: secondFit.line,
        }
      : null,
  };
}

/**
 * Renders the poster.
 * @param {Buffer} portraitBuffer stylised portrait (any size; cropped to 4:5)
 * @returns {Promise<{ png: Buffer, layout: object, report: object }>}
 */
export async function renderPoster({ portraitBuffer, size, style, name, secondLine = '' }) {
  const layout = computeLayout(size, style, name, secondLine);
  const { canvas, image, band, fade } = layout;

  const scaled = await toPrintSize(portraitBuffer, image.width, image.height);
  const warnings = [];
  if (scaled.factor > UPSCALE_WARN_FACTOR) {
    warnings.push(
      `Portretas padidintas ${scaled.factor.toFixed(2)} karto (${scaled.source.width}×${scaled.source.height} px šaltinis). ` +
        `Virš ${UPSCALE_WARN_FACTOR} karto atspaudas iš arti atrodys minkštas. Generuokite didesne raiška.`,
    );
  }
  if (scaled.cropLoss > 0.1) {
    warnings.push(
      `Portretas apkarpytas ${Math.round(scaled.cropLoss * 100)} % ploto, kad tilptų į ${'4:5'} proporciją. Patikrinkite, ar nenukirptos ausys.`,
    );
  }

  let background;
  if (style.layout === 'full') {
    background = await sampleEdgeColor(scaled.data, image.width, image.height);
  } else {
    background = style.paper || '#f4efe4';
  }
  const textColor =
    style.textColor && style.textColor !== 'auto' ? style.textColor : luminance(background) > 0.45 ? DARK_TEXT : LIGHT_TEXT;

  let overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`;
  if (band && fade) {
    overlay +=
      `<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${background}" stop-opacity="0"/>` +
      `<stop offset="0.55" stop-color="${background}" stop-opacity="0.72"/>` +
      `<stop offset="1" stop-color="${background}" stop-opacity="1"/>` +
      `</linearGradient></defs>` +
      `<rect x="0" y="${fade.top}" width="${canvas.width}" height="${fade.height + 1}" fill="url(#f)"/>` +
      `<rect x="0" y="${band.top}" width="${canvas.width}" height="${band.height}" fill="${background}"/>`;
  }
  overlay += `<path fill="${textColor}" d="${layout.name.line.pathData(layout.name.left, layout.name.baseline)}"/>`;
  if (layout.second) {
    overlay += `<path fill="${textColor}" fill-opacity="0.82" d="${layout.second.line.pathData(layout.second.left, layout.second.baseline)}"/>`;
  }
  overlay += '</svg>';

  const png = await sharp({
    create: { width: canvas.width, height: canvas.height, channels: 3, background },
  })
    .composite([
      { input: scaled.data, left: image.left, top: image.top },
      { input: Buffer.from(overlay), left: 0, top: 0 },
    ])
    .png({ compressionLevel: 1 })
    .toBuffer();

  await assertTextDrawn(png, layout, background);

  return {
    png,
    layout,
    report: {
      warnings,
      upscaleFactor: round2(scaled.factor),
      upscaleFidelityDb: Number.isFinite(scaled.fidelityDb) ? round2(scaled.fidelityDb) : null,
      cropLoss: round2(scaled.cropLoss),
      source: scaled.source,
      background,
      textColor,
      nameShrunk: layout.name.shrunk,
    },
  };
}

/**
 * The SVG renderer can fail silently on malformed or oversized path data, and
 * a poster without its name must never reach the printer. So measure the
 * pixels: the name area has to contain ink that differs from the background.
 */
async function assertTextDrawn(png, layout, background) {
  for (const item of [layout.name, layout.second]) {
    if (!item) continue;
    const cap = item.size * 0.7;
    const region = {
      left: Math.max(0, Math.floor(item.left)),
      top: Math.max(0, Math.floor(item.baseline - cap)),
      width: Math.ceil(item.width),
      height: Math.ceil(cap),
    };
    const { data, info } = await sharp(png).extract(region).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const n = parseInt(background.slice(1), 16);
    const bg = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    let ink = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 120) ink++;
    }
    const coverage = ink / (data.length / info.channels);
    if (coverage < 0.03) {
      throw new Error(`Tekstas „${item.text}“ plakate neatsirado (padengimas ${(coverage * 100).toFixed(1)} %). Spaudos failas nesukurtas.`);
    }
  }
}

/**
 * Median colour of the lower left and right edges of the portrait. In a bust
 * portrait these are background, so the name band can continue that colour
 * without a visible seam.
 */
async function sampleEdgeColor(buffer, width, height) {
  const stripW = Math.max(8, Math.round(width * 0.08));
  const top = Math.round(height * 0.82);
  const stripH = height - top;
  const samples = [[], [], []];
  for (const left of [0, width - stripW]) {
    const { data, info } = await sharp(buffer)
      .extract({ left, top, width: stripW, height: stripH })
      .resize({ width: 24, height: 48, fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += info.channels) {
      samples[0].push(data[i]);
      samples[1].push(data[i + 1]);
      samples[2].push(data[i + 2]);
    }
  }
  const median = (arr) => arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  return '#' + samples.map((c) => median(c).toString(16).padStart(2, '0')).join('');
}

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
