// Stylisation through an image-to-image model on fal.ai.
//
// STATUS: written from fal's public docs as found by web search on
// 2026-11-11, NOT yet run against the live API (no key, and the build
// environment could not reach fal.ai). The first real run is the test.
// TODO(savininkas): run once with a real key and confirm before relying on it.
//
// Request shape (queue API): POST https://queue.fal.run/<model> with header
// "Authorization: Key <FAL_KEY>" and a JSON body; the response carries
// status_url and response_url, which are polled.

import sharp from 'sharp';
import { PORTRAIT_ASPECT_LABEL } from './config.js';

export const DEFAULT_MODEL = 'fal-ai/nano-banana-pro/edit';
export const DEFAULT_RESOLUTION = '2K';
const QUEUE_BASE = 'https://queue.fal.run';
const POLL_MS = 2500;
const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * @param {Buffer} photoBuffer upright sRGB photo
 * @returns {Promise<{ image: Buffer, model: string, resolution: string, requestId: string }>}
 */
export async function generatePortrait(photoBuffer, prompt, opts = {}) {
  const key = opts.key ?? process.env.FAL_KEY;
  if (!key) {
    throw new Error(
      'Nėra FAL_KEY. Įrašykite raktą į .env failą arba pasidarykite portretą kitu įrankiu ir paduokite jį su --paruostas-portretas.',
    );
  }
  if (!prompt) throw new Error('Stiliaus prompto failas tuščias.');
  const model = opts.model || process.env.PORTRETAS_MODELIS || DEFAULT_MODEL;
  const resolution = opts.resolution || process.env.PORTRETAS_RAISKA || DEFAULT_RESOLUTION;
  const fetchFn = opts.fetch ?? fetch;
  const log = opts.log ?? (() => {});

  // The model does not need more than ~2000 px; a smaller upload is faster.
  const input = await sharp(photoBuffer)
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
  const body = {
    prompt,
    image_urls: [`data:image/jpeg;base64,${input.toString('base64')}`],
    aspect_ratio: PORTRAIT_ASPECT_LABEL,
    resolution,
    output_format: 'png',
    num_images: 1,
  };

  const submit = await fetchFn(`${QUEUE_BASE}/${model}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const submitted = await readJson(submit, 'užklausos pateikimas');
  const statusUrl = submitted.status_url;
  const responseUrl = submitted.response_url;
  if (!statusUrl || !responseUrl) {
    throw new Error(`fal.ai atsakyme nėra status_url / response_url: ${JSON.stringify(submitted).slice(0, 300)}`);
  }
  log(`Užklausa priimta (${submitted.request_id}). Laukiama rezultato…`);

  const started = Date.now();
  for (;;) {
    if (Date.now() - started > TIMEOUT_MS) throw new Error('fal.ai neatsakė per 5 minutes. Bandykite dar kartą.');
    await new Promise((r) => setTimeout(r, opts.pollMs ?? POLL_MS));
    const status = await readJson(await fetchFn(statusUrl, { headers }), 'būsenos tikrinimas');
    if (status.status === 'COMPLETED') break;
    if (status.status && !['IN_QUEUE', 'IN_PROGRESS'].includes(status.status)) {
      throw new Error(`fal.ai grąžino būseną ${status.status}: ${JSON.stringify(status).slice(0, 300)}`);
    }
  }

  const result = await readJson(await fetchFn(responseUrl, { headers }), 'rezultato gavimas');
  const url = result.images?.[0]?.url;
  if (!url) throw new Error(`fal.ai atsakyme nėra paveikslėlio: ${JSON.stringify(result).slice(0, 300)}`);

  let image;
  if (url.startsWith('data:')) {
    image = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  } else {
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`Nepavyko parsisiųsti sugeneruoto paveikslėlio (HTTP ${res.status}).`);
    image = Buffer.from(await res.arrayBuffer());
  }
  // Fail here, not later, if what came back is not an image.
  const meta = await sharp(image).metadata();
  log(`Gautas ${meta.width}×${meta.height} px portretas.`);

  return { image, model, resolution, requestId: submitted.request_id, width: meta.width, height: meta.height };
}

async function readJson(res, step) {
  const text = await res.text();
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? ' Patikrinkite FAL_KEY ir ar paskyroje yra kreditų.'
        : res.status === 422
          ? ' Modelis nepriėmė parametrų: gali būti pasikeitusi jo schema.'
          : '';
    throw new Error(`fal.ai klaida (${step}, HTTP ${res.status}).${hint} ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`fal.ai grąžino ne JSON (${step}): ${text.slice(0, 200)}`);
  }
}
