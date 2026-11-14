// Styles live in stiliai/: <name>.txt is the image-model prompt, <name>.json
// holds the poster layout settings. Both are meant to be edited by hand.

import fs from 'node:fs';
import path from 'node:path';
import { STYLES_DIR } from './config.js';

export function listStyles() {
  return fs
    .readdirSync(STYLES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.basename(f, '.json'))
    .sort();
}

export function loadStyle(name) {
  const key = String(name || '').toLowerCase();
  const jsonFile = path.join(STYLES_DIR, `${key}.json`);
  const promptFile = path.join(STYLES_DIR, `${key}.txt`);
  if (!/^[a-z0-9-]+$/.test(key) || !fs.existsSync(jsonFile)) {
    throw new Error(`Nežinomas stilius „${name}“. Galimi: ${listStyles().join(', ')}.`);
  }
  let style;
  try {
    style = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  } catch (err) {
    throw new Error(`Stiliaus failas ${jsonFile} sugadintas: ${err.message}`);
  }
  if (!['full', 'margins'].includes(style.layout)) {
    throw new Error(`Stiliaus „${key}“ laukas "layout" turi būti "full" arba "margins".`);
  }
  const prompt = fs.existsSync(promptFile) ? fs.readFileSync(promptFile, 'utf8').trim() : '';
  return { key, ...style, prompt, promptFile };
}
