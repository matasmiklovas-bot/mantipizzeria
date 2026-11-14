// Product mockups for blankets and phone cases: how the customer's print will
// look on the real thing. Drawn from the actual print file, never a stock photo.

import sharp from 'sharp';
import { trimPoster } from './preview.js';
import { CAMERA_LAYOUTS, cameraFor } from './cameras.js';

const SCENE_W = 2000;
const SCENE_H = 2500;

function noiseBuffer(width, height, sigma, mean = 128) {
  // Greyscale noise: the same value in all three channels, so it never tints.
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i += 3) {
    const v = Math.max(0, Math.min(255, Math.round(mean + sigma * (Math.random() + Math.random() + Math.random() - 1.5) * 1.4)));
    raw[i] = v;
    raw[i + 1] = v;
    raw[i + 2] = v;
  }
  return sharp(raw, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

/**
 * Blanket lying on a bed, seen from above, with the bottom corner folded
 * back to show the soft reverse side: the fold is what tells a viewer this
 * is a thick fleece and not a poster.
 */
export async function buildBlanketMockup(posterPng, size) {
  const print = await trimPoster(posterPng, size.bleedPx);
  const bw = 1240;
  const bh = Math.round((bw * size.heightMm) / size.widthMm);

  // Fleece prints are softer than paper: slight blur, lower contrast, no pure white.
  const inset = Math.round(bw * 0.028);
  const hem =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}">` +
    `<rect x="0" y="0" width="${bw}" height="${bh}" fill="none" stroke="#3a2c1e" stroke-opacity="0.12" stroke-width="${inset * 2}"/>` +
    `<rect x="${inset}" y="${inset}" width="${bw - 2 * inset}" height="${bh - 2 * inset}" rx="${inset}" fill="none" stroke="#3a2c1e" stroke-opacity="0.3" stroke-width="2.4" stroke-dasharray="9 7"/>` +
    `<rect x="${inset + 2}" y="${inset + 2}" width="${bw - 2 * inset - 4}" height="${bh - 2 * inset - 4}" rx="${inset}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1.4" stroke-dasharray="9 7"/>` +
    `</svg>`;
  const { data, info } = await sharp(print)
    .resize({ width: bw, height: bh, fit: 'fill' })
    .blur(1.3)
    .modulate({ saturation: 0.92 })
    .linear(0.86, 18)
    .composite([{ input: Buffer.from(hem), left: 0, top: 0 }])
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Soft wrinkles where the fleece lies on the bed: a smooth random height
  // field, lit from the upper left, shifts and shades the print a little.
  const gw = Math.round(bw / 40);
  const gh = Math.round(bh / 40);
  const field = await sharp(await noiseBuffer(gw, gh, 60))
    .resize({ width: bw, height: bh, kernel: 'cubic' })
    .blur(60)
    .greyscale()
    .raw()
    .toBuffer();
  // Size of the folded corner: small enough to stay clear of the name band.
  const fold = Math.round(bw * 0.22);
  const c = bw + bh - fold; // fold line: x + y = c
  const out = Buffer.alloc(bw * bh * 4);
  const r = Math.round(bw * 0.035);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x;
      const h = (field[i] - 128) / 128;
      const sx = Math.min(bw - 1, Math.max(0, Math.round(x + h * 6)));
      const sy = Math.min(bh - 1, Math.max(0, Math.round(y + h * 4)));
      const si = (sy * bw + sx) * info.channels;
      // Shade by height only: slopes of an 8-bit field show contour lines.
      const shade = 1 + h * 0.035;
      const o = i * 4;
      out[o] = Math.max(0, Math.min(255, data[si] * shade));
      out[o + 1] = Math.max(0, Math.min(255, data[si + 1] * shade));
      out[o + 2] = Math.max(0, Math.min(255, data[si + 2] * shade));
      // Silhouette: rounded corners, and the folded-back corner is cut away.
      let a = x + y > c ? 0 : 255;
      if (a) {
        const cx = x < r ? r : x > bw - r ? bw - r : x;
        const cy = y < r ? r : y > bh - r ? bh - r : y;
        if ((x < r || x > bw - r) && (y < r || y > bh - r) && Math.hypot(x - cx, y - cy) > r) a = 0;
      }
      out[o + 3] = a;
    }
  }
  let front = await sharp(out, { raw: { width: bw, height: bh, channels: 4 } }).png().toBuffer();
  const clumps = await sharp(await noiseBuffer(Math.round(bw / 5), Math.round(bh / 5), 30))
    .resize({ width: bw, height: bh, kernel: 'cubic' })
    .blur(2)
    .png()
    .toBuffer();
  const fibres = await sharp(await noiseBuffer(bw, bh, 22)).blur(0.7).png().toBuffer();
  // The reverse side, folded over the corner: plain cream fleece, lighter at
  // the tip, a soft roll of shadow along the fold line, and its shadow on the front.
  const A = [bw - fold, bh];
  const B = [bw, bh - fold];
  const Ct = [bw - fold, bh - fold];
  // Fold line A-B; the tip lands at Ct. Edges bow out a little and the tip
  // is rounded, as thick fabric does; along the fold runs a soft roll.
  const tipR = fold * 0.16;
  const bow = fold * 0.06;
  const mid = (p, q, k = 0.5) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  const tA = mid(Ct, A, tipR / fold);
  const tB = mid(Ct, B, tipR / fold);
  const cA = mid(A, Ct);
  const cB = mid(B, Ct);
  const flapPath =
    `M${A} Q${cA[0] - bow},${cA[1]} ${tA} Q${Ct} ${tB} Q${cB[0]},${cB[1] - bow} ${B} Z`;
  const flap =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}">` +
    `<defs>` +
    `<linearGradient id="fl" x1="${(A[0] + B[0]) / 2}" y1="${(A[1] + B[1]) / 2}" x2="${Ct[0]}" y2="${Ct[1]}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#c4bcae"/><stop offset="0.14" stop-color="#e3ddd1"/><stop offset="0.5" stop-color="#ece6dc"/><stop offset="1" stop-color="#f2eee6"/></linearGradient>` +
    `<filter id="sh" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="24"/></filter>` +
    `<filter id="roll" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>` +
    `<filter id="edge"><feGaussianBlur stdDeviation="1.4"/></filter>` +
    `</defs>` +
    `<path class="shadow" d="${flapPath}" transform="translate(-28 -26)" fill="#1e160d" fill-opacity="0.34" filter="url(#sh)"/>` +
    `<g class="flap" filter="url(#edge)">` +
    `<path d="${flapPath}" fill="url(#fl)"/>` +
    `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="#8f8576" stroke-opacity="0.55" stroke-width="30" filter="url(#roll)"/>` +
    `<line x1="${A[0] - 9}" y1="${A[1] - 9}" x2="${B[0] - 9}" y2="${B[1] - 9}" stroke="#fffdf8" stroke-opacity="0.55" stroke-width="10" filter="url(#roll)"/>` +
    // The hem seen from the back: a stitch line just inside the two outer edges.
    `<path d="M${A[0] - inset * 0.7},${A[1] - inset} L${Ct[0] + inset},${Ct[1] + inset + tipR * 0.6} Q${Ct[0] + inset},${Ct[1] + inset} ${Ct[0] + inset + tipR * 0.6},${Ct[1] + inset} L${B[0] - inset},${B[1] - inset * 0.7}" fill="none" stroke="#6d6253" stroke-opacity="0.45" stroke-width="2.4" stroke-dasharray="9 7"/>` +
    `</g>` +
    `</svg>`;
  front = await sharp(front)
    .composite([
      { input: clumps, blend: 'soft-light' },
      { input: fibres, blend: 'soft-light' },
    ])
    .png()
    .toBuffer();
  // Fuzzy edge: the silhouette, slightly blurred, is the alpha.
  const shapeRaw = Buffer.alloc(bw * bh);
  for (let i = 0; i < bw * bh; i++) shapeRaw[i] = out[i * 4 + 3];
  const shapePng = await sharp(shapeRaw, { raw: { width: bw, height: bh, channels: 1 } }).blur(1.8).png().toBuffer();
  const rgb = await sharp(front).removeAlpha().raw().toBuffer();
  front = await sharp(rgb, { raw: { width: bw, height: bh, channels: 3 } }).joinChannel(shapePng).png().toBuffer();
  // Flap texture: the same fleece grain over the reverse side.
  const flapOnly = Buffer.from(flap.replace(/<path class="shadow"[^>]*\/>/, ''));
  const flapShadow = Buffer.from(flap.replace(/<g class="flap"[\s\S]*<\/g>/, ''));
  const flapMask = Buffer.from(flap.replace(/<path class="shadow"[^>]*\/>/, '').replace(/<line[^>]*\/>/g, '').replace('fill="url(#fl)"', 'fill="#fff"'));
  const flapMasked = await sharp(flapOnly)
    .composite([
      { input: clumps, blend: 'soft-light' },
      { input: fibres, blend: 'soft-light' },
      { input: fibres, blend: 'soft-light' },
      { input: flapMask, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();
  const blanket = await sharp(front)
    .composite([
      { input: flapShadow, blend: 'over' },
      { input: flapMasked, blend: 'over' },
    ])
    .png()
    .toBuffer();

  // The bed: a light linen duvet with broad soft folds, daylight from the left.
  const W = SCENE_W;
  const H = SCENE_H;
  const bed =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<defs>` +
    `<linearGradient id="bed" x1="0" y1="0" x2="0.35" y2="1">` +
    `<stop offset="0" stop-color="#c9c3b8"/><stop offset="0.22" stop-color="#d4cfc5"/><stop offset="0.45" stop-color="#c4beb2"/>` +
    `<stop offset="0.72" stop-color="#cfc9be"/><stop offset="1" stop-color="#b6afa3"/></linearGradient>` +
    `<radialGradient id="light" cx="0.15" cy="0.1" r="1"><stop offset="0" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bed)"/>` +
    `<rect width="${W}" height="${H}" fill="url(#light)"/>` +
    `</svg>`;
  const linen = await sharp(await noiseBuffer(W, H, 16)).blur(0.6).png().toBuffer();
  const bedPng = await sharp(Buffer.from(bed)).composite([{ input: linen, blend: 'soft-light' }]).png().toBuffer();

  // Blanket shadow on the bed, then the blanket, both turned a little.
  const angle = -5;
  const shadowSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bw + 200}" height="${bh + 200}">` +
    `<filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="28"/></filter>` +
    `<path d="M100 100 H${bw + 100} V${bh + 100 - fold} L${bw + 100 - fold} ${bh + 100} H100 Z" fill="#2a2116" fill-opacity="0.32" filter="url(#s)"/></svg>`;
  const rotShadow = await sharp(Buffer.from(shadowSvg)).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const rotBlanket = await sharp(blanket).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const rb = await sharp(rotBlanket).metadata();
  const rs = await sharp(rotShadow).metadata();
  const left = Math.round((W - rb.width) / 2);
  const top = Math.round((H - rb.height) / 2) - 20;
  return sharp(bedPng)
    .composite([
      { input: rotShadow, left: Math.round((W - rs.width) / 2) + 22, top: Math.round((H - rs.height) / 2) + 6 },
      { input: rotBlanket, left, top },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

/**
 * Phone case seen from the back, lying on linen: rounded body, camera module,
 * gloss, soft shadow.
 */
export async function buildCaseMockup(posterPng, size, phoneModel) {
  const print = await trimPoster(posterPng, size.bleedPx);
  const cw = 760;
  const ch = Math.round((cw * size.heightMm) / size.widthMm);
  const rad = Math.round(cw * 0.15);
  const pad = 140;
  const W = cw + 2 * pad;
  const H = ch + 2 * pad;

  const art = await sharp(print).resize({ width: cw, height: ch, fit: 'fill' }).png().toBuffer();
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}"><rect width="${cw}" height="${ch}" rx="${rad}" fill="#fff"/></svg>`);
  const cam = CAMERA_LAYOUTS[cameraFor(phoneModel)];
  const u = (v) => Math.round(v * cw);
  const lens = (x, y, r) =>
    `<circle cx="${x}" cy="${y}" r="${r + 9}" fill="#2b2b2e"/>` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="#0c0c10"/>` +
    `<circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="#151a28"/>` +
    `<circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.18}" fill="#ffffff" fill-opacity="0.35"/>`;
  const m = cam.module;
  const camera =
    (m
      ? `<rect x="${u(m.x)}" y="${u(m.y)}" width="${u(m.w)}" height="${u(m.h)}" rx="${u(m.r)}" fill="#1a1a1d"/>` +
        `<rect x="${u(m.x) + 6}" y="${u(m.y) + 6}" width="${u(m.w) - 12}" height="${u(m.h) - 12}" rx="${u(m.r) - 4}" fill="#3a3a3f"/>`
      : cam.lenses.map(([x, y]) => `<circle cx="${u(x)}" cy="${u(y)}" r="${u(cam.lens) + 16}" fill="#1a1a1d"/>`).join('')) +
    cam.lenses.map(([x, y]) => lens(u(x), u(y), u(cam.lens))).join('') +
    `<circle cx="${u(cam.flash[0])}" cy="${u(cam.flash[1])}" r="${u(0.022)}" fill="#d9d2c0"/>`;
  const overlay =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}">` +
    `<defs>` +
    `<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.04"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/></linearGradient>` +
    `</defs>` +
    `<rect width="${cw}" height="${ch}" rx="${rad}" fill="url(#gloss)"/>` +
    // Raised rim of the case.
    `<rect x="3" y="3" width="${cw - 6}" height="${ch - 6}" rx="${rad - 3}" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="6"/>` +
    `<rect x="9" y="9" width="${cw - 18}" height="${ch - 18}" rx="${rad - 9}" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="3"/>` +
    camera +
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
    `<rect width="${W}" height="${H}" fill="#f1d9e4"/>` +
    `<rect x="${pad + 26}" y="${pad + 40}" width="${cw}" height="${ch}" rx="${rad}" fill="#2e2418" fill-opacity="0.35" filter="url(#sh)"/>` +
    `</svg>`;
  // Linen: crossed fine threads.
  const linen = await sharp(await noiseBuffer(W, H, 14)).blur(0.6).png().toBuffer();
  const base = await sharp(Buffer.from(scene)).composite([{ input: linen, blend: 'soft-light' }]).png().toBuffer();
  const flat = await sharp(base).composite([{ input: body, left: pad, top: pad }]).png().toBuffer();
  return sharp(flat)
    .rotate(-7, { background: '#f1d9e4' })
    .resize({ width: 1400, height: 2000, fit: 'cover' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

/** The right "how it looks" picture for any format. */
export async function buildProductMockup(posterPng, size, frameKey, opts = {}) {
  if (size.kind === 'pledas') return buildBlanketMockup(posterPng, size);
  if (size.kind === 'deklas') return buildCaseMockup(posterPng, size, opts.phoneModel);
  const { buildWallMockup } = await import('./mockup.js');
  return buildWallMockup(posterPng, size, frameKey);
}
