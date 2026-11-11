// Text is converted to vector outlines from the real font file. No system
// fonts and no image model are involved, so "Žąsiukė Ąžuolė" renders the same
// on every machine and in the print file.

import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import { FONTS_DIR } from './config.js';

const cache = new Map();

export function loadFont(fileName) {
  if (!cache.has(fileName)) {
    const file = path.join(FONTS_DIR, fileName);
    if (!fs.existsSync(file)) throw new Error(`Nerastas šrifto failas: ${file}`);
    const buf = fs.readFileSync(file);
    cache.set(fileName, opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)));
  }
  return cache.get(fileName);
}

/** NFC-normalises, collapses whitespace, trims. "e" + combining dot becomes "ė". */
export function cleanText(text) {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Characters the font cannot draw. An empty array means the text is safe. */
export function missingGlyphs(font, text) {
  const missing = new Set();
  for (const ch of text) {
    if (ch === ' ') continue;
    if (font.charToGlyph(ch).index === 0) missing.add(ch);
  }
  return [...missing];
}

export function capHeight(font, size) {
  const units = font.tables.os2?.sCapHeight || font.ascender * 0.7;
  return (units / font.unitsPerEm) * size;
}

/**
 * Lays out one line. Returns its width and a function producing SVG path data
 * with the line's left edge at x and its baseline at y.
 * @param {number} spacing extra space between letters, in em
 */
export function layoutLine(font, text, size, spacing = 0) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  const positions = [];
  let x = 0;
  for (let i = 0; i < glyphs.length; i++) {
    positions.push(x);
    x += glyphs[i].advanceWidth * scale;
    if (i < glyphs.length - 1) {
      x += font.getKerningValue(glyphs[i], glyphs[i + 1]) * scale + spacing * size;
    }
  }
  const width = x;
  return {
    width,
    pathData(originX, baselineY) {
      let d = '';
      for (let i = 0; i < glyphs.length; i++) {
        d += glyphs[i].getPath(originX + positions[i], baselineY, size).toPathData(2);
      }
      return d;
    },
  };
}

/**
 * Largest size not exceeding `size` at which the line fits into maxWidth.
 */
export function fitLine(font, text, size, maxWidth, spacing = 0) {
  let line = layoutLine(font, text, size, spacing);
  if (line.width > maxWidth) {
    size = size * (maxWidth / line.width) * 0.999;
    line = layoutLine(font, text, size, spacing);
  }
  return { size, line };
}
