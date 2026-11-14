// Reading customer photos. sharp's prebuilt binaries cannot decode HEIC
// (HEVC), so iPhone files go through a WASM decoder first.

import fs from 'node:fs/promises';
import sharp from 'sharp';

const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);

/** Detects the container format from magic bytes, not from the file name. */
export function sniffFormat(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (buf.length >= 12 && buf.toString('latin1', 4, 8) === 'ftyp') {
    const brand = buf.toString('latin1', 8, 12);
    if (HEIF_BRANDS.has(brand)) return 'heic';
    if (brand === 'avif' || brand === 'avis') return 'avif';
  }
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return 'unknown';
}

/**
 * Decodes JPG / PNG / HEIC into an upright sRGB sharp pipeline.
 * @returns {{ image: import('sharp').Sharp, format: string, width: number, height: number, bytes: number }}
 */
export async function loadPhoto(input) {
  const buf = Buffer.isBuffer(input) ? input : await fs.readFile(input);
  const format = sniffFormat(buf);
  if (!['jpeg', 'png', 'heic'].includes(format)) {
    const what = format === 'unknown' ? 'Neatpažintas failo formatas' : `Formatas ${format.toUpperCase()} netinka`;
    throw new PhotoError(`${what}. Priimame JPG, PNG ir HEIC (iPhone) nuotraukas.`);
  }

  let decodable = buf;
  if (format === 'heic') {
    const { default: heicConvert } = await import('heic-convert');
    try {
      decodable = Buffer.from(await heicConvert({ buffer: buf, format: 'JPEG', quality: 0.95 }));
    } catch (err) {
      throw new PhotoError(`Nepavyko perskaityti HEIC failo (${err.message}). Pabandykite išsaugoti nuotrauką kaip JPG.`);
    }
  }

  let meta;
  try {
    // rotate() with no arguments applies the EXIF orientation.
    const upright = await sharp(decodable, { failOn: 'error' }).rotate().toColorspace('srgb').toBuffer({ resolveWithObject: true });
    meta = upright;
  } catch (err) {
    throw new PhotoError(`Failas sugadintas arba ne paveikslėlis (${err.message}).`);
  }

  return {
    image: sharp(meta.data),
    buffer: meta.data,
    format,
    width: meta.info.width,
    height: meta.info.height,
    bytes: buf.length,
  };
}

export class PhotoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PhotoError';
  }
}
