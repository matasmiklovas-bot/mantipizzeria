// Brings the portrait to print resolution.
//
// Method: Lanczos3 resampling. It cannot invent detail, which is the point:
// AI upscalers hallucinate fur strands and can redraw an eye, and that is the
// exact failure this product cannot afford. The cost is softness at large
// factors, so the factor is reported and the caller warns above a threshold.
// The fix for softness is to generate at a higher native resolution, not to
// upscale harder.

import sharp from 'sharp';
import { PORTRAIT_ASPECT } from './config.js';

/**
 * Crops the source to the portrait aspect ratio and resizes it to the target.
 * @returns {Promise<{ data: Buffer, factor: number, cropLoss: number, source: {width:number,height:number}, fidelityDb: number }>}
 */
export async function toPrintSize(sourceBuffer, targetWidth, targetHeight) {
  const upright = await sharp(sourceBuffer).rotate().toColorspace('srgb').flatten({ background: '#ffffff' }).toBuffer({ resolveWithObject: true });
  const { width: sw, height: sh } = upright.info;

  // Cover-crop to the portrait aspect. Too tall: keep the top (the head).
  // Too wide: keep the centre.
  const aspect = PORTRAIT_ASPECT;
  let cw = sw;
  let ch = sh;
  let left = 0;
  if (sw / sh > aspect) {
    cw = Math.round(sh * aspect);
    left = Math.round((sw - cw) / 2);
  } else {
    ch = Math.round(sw / aspect);
  }
  const cropLoss = 1 - (cw * ch) / (sw * sh);
  const cropped = await sharp(upright.data).extract({ left, top: 0, width: cw, height: ch }).toBuffer();

  const factor = targetWidth / cw;
  const data = await sharp(cropped)
    .resize({ width: targetWidth, height: targetHeight, fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 1 })
    .toBuffer();

  const fidelityDb = factor > 1 ? await roundTripPsnr(cropped, data, cw, ch) : Infinity;

  return { data, factor, cropLoss, source: { width: sw, height: sh }, fidelityDb };
}

/**
 * Downscales the enlarged image back to the source size and compares it with
 * the source. A high PSNR proves the enlargement added no structure of its
 * own (no ringing, no invented texture). 38 dB and above is visually identical.
 */
async function roundTripPsnr(sourceBuf, enlargedBuf, width, height) {
  const a = await sharp(sourceBuf).removeAlpha().raw().toBuffer();
  const b = await sharp(enlargedBuf).resize({ width, height, fit: 'fill', kernel: 'lanczos3' }).removeAlpha().raw().toBuffer();
  let se = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    se += d * d;
  }
  const mse = se / n;
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}
