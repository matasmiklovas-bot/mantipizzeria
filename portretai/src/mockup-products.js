// Product mockups for blankets and phone cases: how the customer's print will
// look on the real thing. Drawn from the actual print file, never a stock photo.

import sharp from 'sharp';
import { trimPoster } from './preview.js';

const SCENE_W = 2000;
const SCENE_H = 2500;

function noiseBuffer(width, height, sigma, mean = 128) {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) {
    const v = Math.round(mean + sigma * (Math.random() + Math.random() + Math.random() - 1.5) * 1.4);
    raw[i] = Math.max(0, Math.min(255, v));
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

/**
 * Blanket hanging from a wooden rail: soft vertical folds, fleece texture,
 * rounded hem, shadow on a plaster wall.
 */
export async function buildBlanketMockup(posterPng, size) {
  const print = await trimPoster(posterPng, size.bleedPx);
  const bw = 1180;
  const bh = Math.round((bw * size.heightMm) / size.widthMm);
  const bx = Math.round((SCENE_W - bw) / 2);
  const by = 300;

  // Fleece prints are softer than paper: slight blur and lower contrast.
  const soft = await sharp(print)
    .resize({ width: bw, height: bh, fit: 'fill' })
    .blur(1.6)
    .modulate({ saturation: 0.9 })
    .linear(0.88, 16)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Folds: the fabric hangs from the rail in a few soft waves. Each column is
  // shifted slightly and shaded by the slope of the wave.
  const { data, info } = soft;
  const out = Buffer.alloc(bw * bh * 4);
  // Fleece hangs in a few broad, soft folds.
  const waves = [
    { k: (2 * Math.PI) / 520, a: 9, p: 0.3 },
    { k: (2 * Math.PI) / 260, a: 3, p: 1.7 },
  ];
  const r = Math.round(bw * 0.035); // rounded hem corners
  for (let y = 0; y < bh; y++) {
    const depth = Math.min(1, y / (bh * 0.35)); // folds open up lower down
    for (let x = 0; x < bw; x++) {
      let dx = 0;
      let slope = 0;
      for (const w of waves) {
        dx += w.a * depth * Math.sin(w.k * x + w.p);
        slope += w.a * depth * w.k * Math.cos(w.k * x + w.p);
      }
      const sx = Math.min(bw - 1, Math.max(0, Math.round(x + dx)));
      const si = (y * bw + sx) * info.channels;
      // Gentle shading only: fabric is matte, not metal.
      const shade = 1 + Math.max(-0.09, Math.min(0.06, slope * 0.85)) - 0.03 * (1 - depth);
      const o = (y * bw + x) * 4;
      out[o] = Math.max(0, Math.min(255, data[si] * shade));
      out[o + 1] = Math.max(0, Math.min(255, data[si + 1] * shade));
      out[o + 2] = Math.max(0, Math.min(255, data[si + 2] * shade));
      // Rounded bottom corners; the top runs over the rail.
      let alpha = 255;
      if (y > bh - r) {
        const cy = bh - r;
        const cx = x < r ? r : x > bw - r ? bw - r : x;
        if (Math.hypot(x - cx, y - cy) > r) alpha = 0;
      }
      out[o + 3] = alpha;
    }
  }
  let blanket = await sharp(out, { raw: { width: bw, height: bh, channels: 4 } }).png().toBuffer();
  // Fleece texture: fine fibres, multiplied in.
  const fibres = await sharp(await noiseBuffer(bw, bh, 30)).blur(1.2).png().toBuffer();
  const fibresOk = fibres && fibres.length > 0;
  if (fibresOk) blanket = await sharp(blanket).composite([{ input: fibres, blend: 'soft-light' }]).png().toBuffer();
  // Keep the rounded corners after the texture pass.
  // The rounded silhouette is the alpha channel of the raw buffer: take it as
  // a greyscale PNG, then use it as the alpha of the textured blanket.
  const shapeRaw = Buffer.alloc(bw * bh);
  for (let i = 0; i < bw * bh; i++) shapeRaw[i] = out[i * 4 + 3];
  const shapePng = await sharp(shapeRaw, { raw: { width: bw, height: bh, channels: 1 } }).png().toBuffer();
  const rgb = await sharp(blanket).removeAlpha().raw().toBuffer();
  blanket = await sharp(rgb, { raw: { width: bw, height: bh, channels: 3 } })
    .joinChannel(shapePng)
    .png()
    .toBuffer();

  const railY = by - 10;
  const scene =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SCENE_W}" height="${SCENE_H}">` +
    `<defs>` +
    `<linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ece6dc"/><stop offset="1" stop-color="#d9d1c4"/></linearGradient>` +
    `<radialGradient id="light" cx="0.3" cy="0.15" r="0.9"><stop offset="0" stop-color="#fffaf0" stop-opacity="0.5"/><stop offset="1" stop-color="#fffaf0" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9a173"/><stop offset="0.5" stop-color="#a77b4b"/><stop offset="1" stop-color="#7d5732"/></linearGradient>` +
    `<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="34"/></filter>` +
    `<filter id="tight" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="8"/></filter>` +
    `</defs>` +
    `<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#wall)"/>` +
    `<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#light)"/>` +
    // Shadow of the blanket on the wall.
    `<rect x="${bx + 30}" y="${by + 40}" width="${bw}" height="${bh}" rx="40" fill="#3b3024" fill-opacity="0.28" filter="url(#soft)"/>` +
    `<rect x="${bx + 8}" y="${by + 10}" width="${bw}" height="${bh}" rx="30" fill="#2a2118" fill-opacity="0.22" filter="url(#tight)"/>` +
    // Rail brackets and rail.
    `<rect x="${bx - 90}" y="${railY - 26}" width="34" height="70" rx="6" fill="#5c4128"/>` +
    `<rect x="${bx + bw + 56}" y="${railY - 26}" width="34" height="70" rx="6" fill="#5c4128"/>` +
    `</svg>`;
  const rail =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SCENE_W}" height="${SCENE_H}">` +
    `<defs><linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4ad7d"/><stop offset="0.5" stop-color="#a77b4b"/><stop offset="1" stop-color="#7a5430"/></linearGradient>` +
    `<filter id="s" x="-10%" y="-50%" width="120%" height="300%"><feGaussianBlur stdDeviation="6"/></filter></defs>` +
    `<rect x="${bx - 110}" y="${railY + 30}" width="${bw + 220}" height="16" fill="#2a2118" fill-opacity="0.25" filter="url(#s)"/>` +
    `<rect x="${bx - 110}" y="${railY - 18}" width="${bw + 220}" height="40" rx="20" fill="url(#wood)"/>` +
    // The fabric wraps over the rail.
    `<rect x="${bx}" y="${railY - 22}" width="${bw}" height="34" rx="14" fill="#000" fill-opacity="0"/>` +
    `</svg>`;
  // The fabric folds over the rail: the same colour as the blanket's top edge, in shadow.
  const pm = await sharp(print).metadata();
  const wrap = await sharp(print)
    .extract({ left: 0, top: 0, width: pm.width, height: Math.max(4, Math.round(pm.height * 0.01)) })
    .resize({ width: bw, height: 44, fit: 'fill' })
    .blur(3)
    .modulate({ brightness: 0.9 })
    .png()
    .toBuffer();
  const grain = await noiseBuffer(SCENE_W, SCENE_H, 8);
  const base = await sharp(Buffer.from(scene)).composite([{ input: grain, blend: 'soft-light' }]).png().toBuffer();
  return sharp(base)
    .composite([
      { input: blanket, left: bx, top: by },
      { input: Buffer.from(rail), left: 0, top: 0 },
      { input: wrap, left: bx, top: railY - 28 },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

/**
 * Phone case seen from the back, lying on linen: rounded body, camera module,
 * gloss, soft shadow.
 */
export async function buildCaseMockup(posterPng, size) {
  const print = await trimPoster(posterPng, size.bleedPx);
  const cw = 760;
  const ch = Math.round((cw * size.heightMm) / size.widthMm);
  const rad = Math.round(cw * 0.15);
  const pad = 140;
  const W = cw + 2 * pad;
  const H = ch + 2 * pad;

  const art = await sharp(print).resize({ width: cw, height: ch, fit: 'fill' }).png().toBuffer();
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}"><rect width="${cw}" height="${ch}" rx="${rad}" fill="#fff"/></svg>`);
  const cam = Math.round(cw * 0.42);
  const cx = Math.round(cw * 0.06);
  const lens = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r + 9}" fill="#2b2b2e"/>` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="#0c0c10"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="#151a28"/>` +
    `<circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.18}" fill="#ffffff" fill-opacity="0.35"/>`;
  const lr = Math.round(cam * 0.17);
  const overlay =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}">` +
    `<defs>` +
    `<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.04"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/></linearGradient>` +
    `</defs>` +
    `<rect width="${cw}" height="${ch}" rx="${rad}" fill="url(#gloss)"/>` +
    // Raised rim of the case.
    `<rect x="3" y="3" width="${cw - 6}" height="${ch - 6}" rx="${rad - 3}" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="6"/>` +
    `<rect x="9" y="9" width="${cw - 18}" height="${ch - 18}" rx="${rad - 9}" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="3"/>` +
    // Camera opening and module.
    `<rect x="${cx}" y="${cx}" width="${cam}" height="${cam}" rx="${Math.round(cam * 0.24)}" fill="#1a1a1d"/>` +
    `<rect x="${cx + 6}" y="${cx + 6}" width="${cam - 12}" height="${cam - 12}" rx="${Math.round(cam * 0.21)}" fill="#3a3a3f"/>` +
    lens(cx + cam * 0.3, cx + cam * 0.3, lr) +
    lens(cx + cam * 0.3, cx + cam * 0.72, lr) +
    lens(cx + cam * 0.72, cx + cam * 0.5, lr) +
    `<circle cx="${cx + cam * 0.75}" cy="${cx + cam * 0.2}" r="${cam * 0.05}" fill="#d9d2c0"/>` +
    `</svg>`;
  const body = await sharp(art)
    .composite([
      { input: Buffer.from(overlay), left: 0, top: 0 },
      { input: mask, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();

  const scene =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="26"/></filter></defs>` +
    `<rect width="${W}" height="${H}" fill="#e7e0d4"/>` +
    `<rect x="${pad + 26}" y="${pad + 40}" width="${cw}" height="${ch}" rx="${rad}" fill="#2e2418" fill-opacity="0.35" filter="url(#sh)"/>` +
    `</svg>`;
  // Linen: crossed fine threads.
  const linen = await sharp(await noiseBuffer(W, H, 14)).blur(0.6).png().toBuffer();
  const base = await sharp(Buffer.from(scene)).composite([{ input: linen, blend: 'soft-light' }]).png().toBuffer();
  const flat = await sharp(base).composite([{ input: body, left: pad, top: pad }]).png().toBuffer();
  return sharp(flat)
    .rotate(-7, { background: '#e7e0d4' })
    .resize({ width: 1400, height: 2000, fit: 'cover' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

/** The right "how it looks" picture for any format. */
export async function buildProductMockup(posterPng, size, frameKey) {
  if (size.kind === 'pledas') return buildBlanketMockup(posterPng, size);
  if (size.kind === 'deklas') return buildCaseMockup(posterPng, size);
  const { buildWallMockup } = await import('./mockup.js');
  return buildWallMockup(posterPng, size, frameKey);
}
