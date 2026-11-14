// Photo suitability checks: format, size, resolution, exposure, sharpness.
// Returns Lithuanian messages that can be shown to the customer as-is.

import sharp from 'sharp';
import { PHOTO } from './config.js';
import { loadPhoto, PhotoError } from './image-io.js';

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[], metrics: object, photo?: object }>}
 */
export async function checkPhoto(input, limits = PHOTO) {
  const errors = [];
  const warnings = [];
  let photo;
  try {
    photo = await loadPhoto(input);
  } catch (err) {
    if (err instanceof PhotoError) return { ok: false, errors: [err.message], warnings, metrics: {} };
    throw err;
  }

  const metrics = { format: photo.format, width: photo.width, height: photo.height, bytes: photo.bytes };

  if (photo.bytes > limits.maxBytes) {
    errors.push(
      `Failas per didelis: ${(photo.bytes / 1048576).toFixed(1)} MB. Didžiausias leidžiamas dydis – ${Math.round(limits.maxBytes / 1048576)} MB.`,
    );
  }

  const shortSide = Math.min(photo.width, photo.height);
  if (shortSide < limits.minShortSidePx) {
    errors.push(
      `Per maža raiška: ${photo.width}×${photo.height} px. Trumpoji kraštinė turi būti bent ${limits.minShortSidePx} px. ` +
        'Dažna priežastis – nuotrauka atsiųsta per „Messenger“ ar ekrano kopija. Įkelkite originalą iš telefono galerijos.',
    );
  } else if (shortSide < limits.warnShortSidePx) {
    warnings.push(
      `Raiška nedidelė (${photo.width}×${photo.height} px). Portretas pavyks, bet smulkios detalės (akys, ūsai) gali būti netikslios.`,
    );
  }

  const { luma, sharpness } = await measure(photo.buffer);
  metrics.luma = round1(luma);
  metrics.sharpness = round1(sharpness);

  if (luma < limits.darkReject) {
    errors.push('Nuotrauka per tamsi: nesimato kailio ir akių detalių. Nufotografuokite prie lango dienos šviesoje.');
  } else if (luma < limits.darkWarn) {
    warnings.push('Nuotrauka tamsoka. Jei augintinis tamsaus kailio, geriau tiktų nuotrauka dienos šviesoje.');
  } else if (luma > limits.brightReject) {
    errors.push('Nuotrauka peršviesta: šviesios vietos išdegusios. Parinkite nuotrauką be tiesioginės saulės ar blykstės.');
  }

  // A very dark photo has no contrast, so its sharpness score means nothing:
  // report darkness only.
  if (luma < limits.darkReject) {
    // already reported
  } else if (sharpness < limits.sharpReject) {
    errors.push('Nuotrauka išplaukusi: nėra nė vienos ryškios vietos. Reikia nuotraukos, kurioje aiškiai matosi akys.');
  } else if (sharpness < limits.sharpWarn) {
    warnings.push('Nuotrauka nelabai ryški. Jei turite ryškesnę, kurioje aiškiai matosi akys, įkelkite ją.');
  }

  return { ok: errors.length === 0, errors, warnings, metrics, photo };
}

/**
 * Mean luma and a sharpness score. Sharpness is the variance of the Laplacian,
 * computed per tile on a 1024 px copy; the score is the mean of the sharpest
 * tenth of tiles. Pet photos often have a blurred background, so a global
 * variance would wrongly reject them: what matters is that something is sharp.
 */
async function measure(buffer) {
  const { data, info } = await sharp(buffer)
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const luma = sum / data.length;

  const grid = 8;
  const tileW = Math.floor((w - 2) / grid);
  const tileH = Math.floor((h - 2) / grid);
  const variances = [];
  for (let ty = 0; ty < grid; ty++) {
    for (let tx = 0; tx < grid; tx++) {
      let s = 0;
      let s2 = 0;
      let n = 0;
      const x0 = 1 + tx * tileW;
      const y0 = 1 + ty * tileH;
      for (let y = y0; y < y0 + tileH; y++) {
        for (let x = x0; x < x0 + tileW; x++) {
          const i = y * w + x;
          const lap = data[i - 1] + data[i + 1] + data[i - w] + data[i + w] - 4 * data[i];
          s += lap;
          s2 += lap * lap;
          n++;
        }
      }
      if (n > 0) variances.push(s2 / n - (s / n) ** 2);
    }
  }
  variances.sort((a, b) => b - a);
  const top = variances.slice(0, Math.max(1, Math.round(variances.length / 10)));
  const sharpness = top.reduce((a, b) => a + b, 0) / top.length;

  return { luma, sharpness };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
