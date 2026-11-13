// Real examples shown on the site. Files live in public/pavyzdziai/ (see
// SKAITYK.txt there). Until the owner adds them, the site shows clearly
// labelled empty slots: no stock photos, no invented portraits.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = path.join(process.cwd(), 'public', 'pavyzdziai');

async function image(file) {
  const full = path.join(DIR, file);
  if (!fs.existsSync(full)) return null;
  try {
    const meta = await sharp(full).metadata();
    // A small copy (made by scripts/pavyzdziai-mazinti.mjs) for phones.
    const small = fs.readdirSync(DIR).find((f) => f.startsWith(file.replace('.jpg', '-')) && /-\d+\.jpg$/.test(f));
    const smallW = small ? Number(small.match(/-(\d+)\.jpg$/)[1]) : 0;
    const srcSet = small && smallW < meta.width ? `/pavyzdziai/${small} ${smallW}w, /pavyzdziai/${file} ${meta.width}w` : undefined;
    return { src: `/pavyzdziai/${file}`, width: meta.width, height: meta.height, srcSet };
  } catch {
    return null;
  }
}

/**
 * @typedef {{ src: string, width: number, height: number, srcSet?: string } | null} ExampleImage
 * @typedef {{ index: number, name: string | null, style: string | null, photo: ExampleImage, portrait: ExampleImage }} Example
 */

/** @type {Promise<Example[]> | undefined} */
let cached;

/**
 * Always returns three entries; missing ones have photo/portrait = null.
 * @returns {Promise<Example[]>}
 */
export function loadExamples() {
  // Files in public/ only change with a deploy, so read them once per server start.
  if (!cached) cached = readExamples();
  return cached;
}

/** @returns {Promise<Example[]>} */
async function readExamples() {
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(path.join(DIR, 'pavyzdziai.json'), 'utf8'));
  } catch {
    list = [];
  }
  const out = [];
  for (let i = 1; i <= 3; i++) {
    const meta = Array.isArray(list) ? list[i - 1] : null;
    out.push({
      index: i,
      name: typeof meta?.vardas === 'string' ? meta.vardas : null,
      style: typeof meta?.stilius === 'string' ? meta.stilius : null,
      photo: await image(`${i}-nuotrauka.jpg`),
      portrait: await image(`${i}-portretas.jpg`),
    });
  }
  return out;
}
