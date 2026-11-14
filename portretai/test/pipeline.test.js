import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getSize, BLEED_PX } from '../src/config.js';
import { createPortrait, FILES } from '../src/pipeline.js';
import { inspectPrintPdf } from '../src/pdf.js';
import { buildSurveyHtml } from '../src/survey.js';
import { generatePortrait, DEFAULT_MODEL } from '../src/generate.js';

const fx = (name) => path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', name);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'portretas-test-'));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const NAME = 'Žąsiukė Ąžuolė';

/** A stand-in for fal.ai: records calls and answers like the queue API. */
function fakeFal({ failStatus, asDataUri } = {}) {
  const calls = [];
  const image = fs.readFileSync(fx('portretas.png'));
  const fetchFn = async (url, init = {}) => {
    calls.push({ url, init });
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
    if (failStatus && init.method === 'POST') return json({ detail: 'no' }, failStatus);
    if (init.method === 'POST') {
      return json({ request_id: 'req-1', status_url: 'https://queue.fal.run/x/requests/req-1/status', response_url: 'https://queue.fal.run/x/requests/req-1' });
    }
    if (url.endsWith('/status')) {
      const polls = calls.filter((c) => c.url.endsWith('/status')).length;
      return json({ status: polls < 2 ? 'IN_PROGRESS' : 'COMPLETED' });
    }
    if (url.endsWith('/req-1')) {
      return json({ images: [{ url: asDataUri ? `data:image/png;base64,${image.toString('base64')}` : 'https://cdn.example/out.png' }] });
    }
    if (url === 'https://cdn.example/out.png') return new Response(image, { status: 200 });
    return json({}, 404);
  };
  return { calls, fetchFn };
}

test('full run with a ready portrait: print PDF passes the scripted check (30×40)', async () => {
  const r = await createPortrait({
    photo: fx('sunelis.heic'),
    readyPortrait: fx('portretas.png'),
    name: NAME,
    secondLine: '2014 – 2026',
    style: 'akvarele',
    size: '30x40',
    outRoot: tmp,
  });
  assert.equal(path.basename(r.outDir), 'zasiuke-azuole-akvarele-30x40');
  for (const f of Object.values(FILES)) {
    if (f === FILES.model) continue;
    assert.ok(fs.existsSync(path.join(r.outDir, f)), `${f} missing`);
  }

  const size = getSize('30x40');
  const insp = await inspectPrintPdf(fs.readFileSync(path.join(r.outDir, FILES.print)), size);
  assert.equal(insp.ok, true, JSON.stringify(insp.checks.filter((c) => !c.ok)));
  assert.deepEqual(insp.facts.imagePx, [3543 + 2 * BLEED_PX, 4724 + 2 * BLEED_PX]);
  assert.ok(Math.min(...Object.values(insp.facts.bleedMm)) >= 3);
  assert.ok(Math.abs(insp.facts.trimMm[0] - 300) < 0.15 && Math.abs(insp.facts.trimMm[1] - 400) < 0.15);

  // The same file must fail when checked against the wrong size.
  assert.equal((await inspectPrintPdf(fs.readFileSync(path.join(r.outDir, FILES.print)), getSize('a4'))).ok, false);

  const report = JSON.parse(fs.readFileSync(path.join(r.outDir, FILES.report), 'utf8'));
  assert.equal(report.name, NAME);
  assert.equal(report.photo.format, 'heic');
  assert.ok(report.poster.upscaleFidelityDb >= 38, `upscale fidelity ${report.poster.upscaleFidelityDb} dB`);
});

test('A4 print PDF has A4 trim size, and the preview carries a watermark', async () => {
  const r = await createPortrait({ readyPortrait: fx('portretas.png'), name: 'Murka', style: 'grafika', size: 'a4', frame: 'baltas', outRoot: tmp });
  const insp = await inspectPrintPdf(fs.readFileSync(path.join(r.outDir, FILES.print)), getSize('a4'));
  assert.equal(insp.ok, true);
  assert.deepEqual(insp.facts.imagePx, [2480 + 2 * BLEED_PX, 3508 + 2 * BLEED_PX]);

  const preview = await sharp(path.join(r.outDir, FILES.preview)).greyscale().raw().toBuffer({ resolveWithObject: true });
  const clean = await sharp(path.join(r.outDir, FILES.clean)).greyscale().raw().toBuffer({ resolveWithObject: true });
  assert.equal(preview.info.width, 1200);
  assert.deepEqual([preview.info.width, preview.info.height], [clean.info.width, clean.info.height]);
  let changed = 0;
  for (let i = 0; i < preview.data.length; i++) if (Math.abs(preview.data[i] - clean.data[i]) > 12) changed++;
  const share = changed / preview.data.length;
  assert.ok(share > 0.02, `watermark covers only ${(share * 100).toFixed(2)} % of the preview`);

  const wall = await sharp(path.join(r.outDir, FILES.wall)).metadata();
  assert.deepEqual([wall.width, wall.height], [2000, 2500]);
});

test('bad input is refused before anything is produced', async () => {
  const base = { readyPortrait: fx('portretas.png'), name: 'Reksas', style: 'akvarele', size: 'a4', outRoot: tmp };
  await assert.rejects(createPortrait({ ...base, size: '50x70' }), /Nežinomas dydis/);
  await assert.rejects(createPortrait({ ...base, style: 'komiksas' }), /Nežinomas stilius/);
  await assert.rejects(createPortrait({ ...base, style: '../../etc/passwd' }), /Nežinomas stilius/);
  await assert.rejects(createPortrait({ ...base, frame: 'auksinis' }), /rėmelio spalva/);
  await assert.rejects(createPortrait({ ...base, name: '' }), /tuščias/);
  await assert.rejects(createPortrait({ ...base, readyPortrait: undefined }), /Reikia --nuotrauka/);
  await assert.rejects(createPortrait({ ...base, photo: fx('neryski.jpg') }), /Nuotrauka netinka/);
});

test('model call: request shape, polling, download, and caching of the result', async () => {
  const fal = fakeFal();
  const opts = { photo: fx('sunelis.jpg'), name: 'Reksas', style: 'aliejus', size: 'a4', outRoot: tmp, fetch: fal.fetchFn, key: 'test-key', pollMs: 1 };
  const r = await createPortrait(opts);
  assert.equal(r.report.portraitSource.type, 'model');
  assert.equal(r.report.portraitSource.model, DEFAULT_MODEL);

  const post = fal.calls[0];
  assert.equal(post.url, `https://queue.fal.run/${DEFAULT_MODEL}`);
  assert.equal(post.init.headers.Authorization, 'Key test-key');
  const body = JSON.parse(post.init.body);
  assert.match(body.prompt, /oil painting/);
  assert.equal(body.aspect_ratio, '4:5');
  assert.equal(body.num_images, 1);
  assert.match(body.image_urls[0], /^data:image\/jpeg;base64,/);
  assert.ok(fal.calls.filter((c) => c.url.endsWith('/status')).length >= 2, 'polled until COMPLETED');
  assert.ok(fs.existsSync(path.join(r.outDir, FILES.model)));

  // Second run: the paid result is reused, no network call at all.
  const fal2 = fakeFal();
  const again = await createPortrait({ ...opts, fetch: fal2.fetchFn });
  assert.equal(again.report.portraitSource.type, 'cache');
  assert.equal(fal2.calls.length, 0);

  // --is-naujo forces a new call.
  const fal3 = fakeFal({ asDataUri: true });
  const forced = await createPortrait({ ...opts, fetch: fal3.fetchFn, regenerate: true });
  assert.equal(forced.report.portraitSource.type, 'model');
  assert.ok(fal3.calls.length > 0);
});

test('model errors are reported in plain words', async () => {
  const photo = fs.readFileSync(fx('sunelis.jpg'));
  await assert.rejects(generatePortrait(photo, 'p', { key: '', fetch: fakeFal().fetchFn }), /Nėra FAL_KEY/);
  await assert.rejects(generatePortrait(photo, 'p', { key: 'k', fetch: fakeFal({ failStatus: 401 }).fetchFn }), /HTTP 401.*FAL_KEY/s);
  await assert.rejects(generatePortrait(photo, '', { key: 'k', fetch: fakeFal().fetchFn }), /prompto failas tuščias/);
});

test('survey page: three examples, escaped names, no external requests', async () => {
  const dirs = [];
  for (const [name, style] of [[NAME, 'akvarele'], ['Reksas <b>', 'aliejus'], ['Murka', 'grafika']]) {
    const r = await createPortrait({ photo: fx('sunelis.jpg'), readyPortrait: fx('portretas.png'), name, style, size: 'a4', outRoot: path.join(tmp, 'survey') });
    dirs.push(r.outDir);
  }
  const html = await buildSurveyHtml(dirs, { price: 35 });
  assert.equal((html.match(/<section class="ex">/g) || []).length, 3);
  assert.ok(html.includes(NAME));
  assert.ok(html.includes('Reksas &lt;b&gt;') && !html.includes('Reksas <b>'));
  assert.ok(html.includes('Ar pirktum už 35 €?'));
  assert.equal(/https?:\/\//.test(html), false, 'page must not reference any external URL');
  assert.equal((html.match(/data:image\/jpeg;base64,/g) || []).length, 9);
  await assert.rejects(buildSurveyHtml([tmp]), /nėra ataskaita\.json/);
});
