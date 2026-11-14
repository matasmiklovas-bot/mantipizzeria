import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getSize, SIZES, FONTS_DIR, BLEED_PX, SAFE_MM, mmToPx, NAME_MAX_CHARS } from '../src/config.js';
import { listStyles, loadStyle } from '../src/styles.js';
import { loadFont, missingGlyphs, cleanText } from '../src/text.js';
import { computeLayout, renderPoster } from '../src/layout.js';
import { slugify } from '../src/pipeline.js';

const fx = (name) => path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', name);
const LT = 'aąbcčdeęėfghiįyjklmnoprsštuųūvzžAĄBCČDEĘĖFGHIĮYJKLMNOPRSŠTUŲŪVZŽ';
const NAME = 'Žąsiukė Ąžuolė';

test('there are exactly three styles, each with a prompt file', () => {
  const styles = listStyles();
  assert.deepEqual(styles, ['akvarele', 'aliejus', 'grafika']);
  for (const key of styles) {
    const s = loadStyle(key);
    assert.ok(s.prompt.length > 200, `${key} prompt is too short`);
    assert.match(s.prompt, /Do not add any text/);
  }
});

test('every bundled font has the full Lithuanian alphabet and ships with a licence', () => {
  const fonts = fs.readdirSync(FONTS_DIR).filter((f) => f.endsWith('.ttf'));
  assert.ok(fonts.length >= 4);
  for (const f of fonts) {
    assert.deepEqual(missingGlyphs(loadFont(f), LT + '„“–0123456789'), [], f);
  }
  assert.ok(fs.readdirSync(FONTS_DIR).filter((f) => f.startsWith('OFL-')).length >= 3);
});

test('decomposed input is normalised: e + combining dot becomes ė', () => {
  assert.equal(cleanText('  Žąsiukė   Ąžuolė '), NAME);
});

test('slug keeps the name readable without accents', () => {
  assert.equal(slugify(NAME), 'zasiuke-azuole');
});

test('text stays inside the safe zone for every style, size and name length', () => {
  const names = ['Bo', NAME, 'W'.repeat(NAME_MAX_CHARS), 'Maksimilijonas Didysis Antras'];
  for (const styleKey of listStyles()) {
    for (const sizeKey of Object.keys(SIZES)) {
      const size = getSize(sizeKey);
      const style = loadStyle(styleKey);
      for (const name of names) {
        for (const second of ['', '2014 – 2026', 'Š'.repeat(40)]) {
          const l = computeLayout(size, style, name, second);
          const B = size.bleedPx ?? BLEED_PX;
          const safe = mmToPx(size.safeMm ?? SAFE_MM, size.dpi);
          const safeL = B + safe;
          const safeR = B + size.widthPx - safe;
          const safeB = B + size.heightPx - safe;
          const where = `${styleKey}/${sizeKey}/${name}/${second}`;
          for (const item of [l.name, l.second].filter(Boolean)) {
            assert.ok(item.left >= safeL - 0.5, `${where}: left edge`);
            assert.ok(item.left + item.width <= safeR + 0.5, `${where}: right edge`);
            // Descenders and ogoneks reach at most ~0.3 em below the baseline.
            assert.ok(item.baseline + item.size * 0.3 <= safeB, `${where}: bottom edge`);
          }
          const textTop = l.band ? l.band.top : l.image.top + l.image.height;
          // Accents above capitals reach about 0.3 cap-heights above the cap line.
          assert.ok(l.name.baseline - l.name.size * 0.95 >= textTop - 1 || l.band, `${where}: name overlaps the portrait`);
          if (l.second) assert.ok(l.second.baseline > l.name.baseline + l.second.size * 0.7, `${where}: lines overlap`);
        }
      }
    }
  }
});

test('a long name is shrunk, a short one is not', () => {
  const size = getSize('30x40');
  const style = loadStyle('grafika');
  assert.equal(computeLayout(size, style, 'Bo').name.shrunk, false);
  assert.equal(computeLayout(size, style, 'W'.repeat(NAME_MAX_CHARS)).name.shrunk, true);
});

test('unprintable names are refused with a reason', () => {
  const size = getSize('a4');
  const style = loadStyle('akvarele');
  assert.throws(() => computeLayout(size, style, ''), /tuščias/);
  assert.throws(() => computeLayout(size, style, 'x'.repeat(NAME_MAX_CHARS + 1)), /per ilgas/);
  assert.throws(() => computeLayout(size, style, 'Reksas 🐶'), /šriftas neturi/);
  assert.throws(() => computeLayout(size, style, '犬'), /šriftas neturi/);
});

test('Lithuanian accents are really drawn in the print image', async () => {
  // Render the same poster with and without accents. The two must differ
  // exactly where accents live: above the capitals and below the baseline.
  const size = getSize('a4');
  const style = loadStyle('aliejus');
  const portraitBuffer = fs.readFileSync(fx('portretas.png'));
  const withAccents = await renderPoster({ portraitBuffer, size, style, name: NAME });
  const without = await renderPoster({ portraitBuffer, size, style, name: 'Zasiuke Azuole' });
  const n = withAccents.layout.name;
  const cap = n.size * 0.71;
  const zones = {
    above: { left: Math.floor(n.left), top: Math.floor(n.baseline - cap * 1.42), width: Math.ceil(n.width), height: Math.floor(cap * 0.36) },
    below: { left: Math.floor(n.left), top: Math.ceil(n.baseline + cap * 0.06), width: Math.ceil(n.width), height: Math.floor(cap * 0.3) },
  };
  for (const [zone, region] of Object.entries(zones)) {
    const a = await sharp(withAccents.png).extract(region).greyscale().raw().toBuffer();
    const b = await sharp(without.png).extract(region).greyscale().raw().toBuffer();
    let dark = 0;
    let darkPlain = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] < 110) dark++;
      if (b[i] < 110) darkPlain++;
    }
    assert.ok(dark > 400, `accent ink ${zone} the letters: ${dark} px`);
    assert.equal(darkPlain, 0, `no ink expected ${zone} unaccented letters`);
  }
});

test('glyph outlines never contain NaN, at any position (opentype.js rounding bug)', async () => {
  const { loadFont, layoutLine } = await import('../src/text.js');
  // The bug showed for these exact lines in the gift voucher: the line was cut after "Ą".
  for (const [file, text] of [
    ['CormorantGaramond_500Medium_Italic.ttf', 'Žąsiukė Ąžuolė'],
    ['CormorantGaramond_500Medium.ttf', 'Portretą pristatysime apie sausio 8 d.'],
    ['Jost_600SemiBold.ttf', 'ŽĄSIUKĖ ĄŽUOLĖ'],
    ['PlayfairDisplay_500Medium.ttf', 'ŠUNIUKAS ČIUČIA'],
  ]) {
    const font = loadFont(file);
    for (const size of [84, 150, 330, 412.37]) {
      const line = layoutLine(font, text, size, 0.12);
      for (const x of [0, 158.3952, 1033.7, 1240 - line.width / 2]) {
        const d = line.pathData(x, 1830.25);
        assert.doesNotMatch(d, /NaN|Infinity|e[+-]/, `${file} "${text}" at ${size}px, x=${x}`);
      }
    }
  }
});

test('the print check accepts a one-letter name in the widely spaced style', async () => {
  // Letter spacing leaves the edges of the text box empty; the check must
  // look at where the letters really are.
  const r = await renderPoster({ portraitBuffer: fs.readFileSync(fx('portretas.png')), size: getSize('a4'), style: loadStyle('grafika'), name: 'I' });
  assert.ok(r.png.length > 0);
});
