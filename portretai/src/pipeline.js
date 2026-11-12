// The whole "kurti" flow as one function, so the CLI and (later) the website
// admin page run exactly the same code.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getSize, FRAMES } from './config.js';
import { loadStyle } from './styles.js';
import { checkPhoto } from './validate.js';
import { prepareTexts, renderPoster } from './layout.js';
import { buildPrintPdf, inspectPrintPdf } from './pdf.js';
import { buildPreview, trimPoster } from './preview.js';
import { buildProductMockup } from './mockup-products.js';
import { generatePortrait } from './generate.js';

export const FILES = {
  print: 'spauda.pdf',
  preview: 'perziura.jpg',
  clean: 'plakatas.jpg',
  wall: 'siena.jpg',
  original: 'originalas.jpg',
  model: 'portretas-modelio.png',
  report: 'ataskaita.json',
};

/** "Žąsiukė Ąžuolė" -> "zasiuke-azuole" */
export function slugify(text) {
  return (
    String(text)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'portretas'
  );
}

/**
 * @param {object} o
 * @param {string} [o.photo] path to the customer photo
 * @param {string} [o.readyPortrait] path to a portrait made with any other tool
 * @param {string} o.name
 * @param {string} [o.secondLine]
 * @param {string} o.style
 * @param {string} o.size
 * @param {string} [o.frame]
 * @param {string} o.outRoot output root directory
 * @param {boolean} [o.ignoreChecks] continue even if the photo fails checks
 * @param {boolean} [o.regenerate] call the model even if a cached result exists
 * @param {(msg: string) => void} [o.log]
 */
export async function createPortrait(o) {
  const log = o.log ?? (() => {});
  const size = getSize(o.size);
  const style = loadStyle(o.style);
  const frameKey = o.frame || 'azuolas';
  if (!FRAMES[frameKey]) throw new Error(`Nežinoma rėmelio spalva „${frameKey}“. Galimos: ${Object.keys(FRAMES).join(', ')}.`);
  // Fail on a bad name before any money is spent on the image model.
  prepareTexts(style, o.name, o.secondLine);
  if (!o.photo && !o.readyPortrait) throw new Error('Reikia --nuotrauka arba --paruostas-portretas.');

  const outDir = path.join(o.outRoot, `${slugify(o.name)}-${style.key}-${size.key}`);
  await fs.mkdir(outDir, { recursive: true });
  const warnings = [];
  const report = {
    createdAt: new Date().toISOString(),
    name: o.name,
    secondLine: o.secondLine || '',
    style: style.key,
    styleTitle: style.title,
    size: size.key,
    frame: frameKey,
  };

  let photo = null;
  if (o.photo) {
    log(`Tikrinama nuotrauka ${o.photo}…`);
    const check = await checkPhoto(o.photo);
    report.photo = { file: path.basename(o.photo), ...check.metrics, errors: check.errors, warnings: check.warnings };
    warnings.push(...check.warnings);
    if (!check.ok) {
      if (!check.photo || !o.ignoreChecks) {
        const err = new Error('Nuotrauka netinka:\n' + check.errors.map((e) => `  – ${e}`).join('\n'));
        err.photoErrors = check.errors;
        throw err;
      }
      warnings.push(...check.errors.map((e) => `IGNORUOTA: ${e}`));
    }
    photo = check.photo;
    await fs.writeFile(
      path.join(outDir, FILES.original),
      await sharp(photo.buffer).resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
    );
  }

  let portrait;
  const cached = path.join(outDir, FILES.model);
  if (o.readyPortrait) {
    log(`Naudojamas paruoštas portretas ${o.readyPortrait}.`);
    portrait = await fs.readFile(o.readyPortrait);
    report.portraitSource = { type: 'ready', file: path.basename(o.readyPortrait) };
  } else if (!o.regenerate && (await exists(cached))) {
    log(`Naudojamas anksčiau sugeneruotas portretas (${FILES.model}). Naujam generavimui pridėkite --is-naujo.`);
    portrait = await fs.readFile(cached);
    report.portraitSource = { type: 'cache' };
  } else {
    log(`Generuojamas „${style.title}“ portretas…`);
    const gen = await generatePortrait(photo.buffer, style.prompt, { model: o.model, resolution: o.resolution, log, fetch: o.fetch, key: o.key, pollMs: o.pollMs });
    portrait = gen.image;
    await fs.writeFile(cached, portrait);
    report.portraitSource = { type: 'model', model: gen.model, resolution: gen.resolution, requestId: gen.requestId };
  }

  log('Maketuojamas plakatas…');
  const poster = await renderPoster({ portraitBuffer: portrait, size, style, name: o.name, secondLine: o.secondLine });
  warnings.push(...poster.report.warnings);
  report.poster = poster.report;

  const pdf = await buildPrintPdf(poster.png, { title: `${o.name} – ${style.title} – ${size.label}`, size });
  const inspection = await inspectPrintPdf(pdf, size);
  report.printCheck = inspection.checks;
  if (!inspection.ok) {
    const failed = inspection.checks.filter((c) => !c.ok).map((c) => `  – ${c.name}: ${c.detail}`);
    throw new Error('Spaudos failas nepraėjo patikros, todėl neišsaugotas:\n' + failed.join('\n'));
  }
  await fs.writeFile(path.join(outDir, FILES.print), pdf);

  await fs.writeFile(path.join(outDir, FILES.preview), await buildPreview(poster.png, { bleed: size.bleedPx }));
  await fs.writeFile(
    path.join(outDir, FILES.clean),
    await sharp(await trimPoster(poster.png, size.bleedPx)).resize({ width: 1200 }).jpeg({ quality: 86, mozjpeg: true }).toBuffer(),
  );
  await fs.writeFile(path.join(outDir, FILES.wall), await buildProductMockup(poster.png, size, frameKey));

  report.warnings = warnings;
  await fs.writeFile(path.join(outDir, FILES.report), JSON.stringify(report, null, 2) + '\n');

  return { outDir, warnings, report, inspection };
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
