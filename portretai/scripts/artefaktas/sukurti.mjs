// Builds a static, self-contained preview of the website for a claude.ai
// artifact: the real pages as the running site renders them, the order flow
// running in the browser (flow.js), and snapshots of the customer preview and
// admin pages from a sample order. Payment, email and uploads are switched off
// and the page says so.
//
//   ADMIN_PASSWORD=... node scripts/artefaktas/sukurti.mjs http://127.0.0.1:3000
//
// The site must be running and have at least one order waiting for approval.
// Output: .artefaktas/index.html

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
process.chdir(root);

const base = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const password = process.env.ADMIN_PASSWORD;
if (!password) throw new Error('Set ADMIN_PASSWORD to the running site’s admin password.');

const { SETTINGS, STYLE_LABELS, SIZE_LABELS, FRAME_LABELS, formatPrice } = await import('../../server/settings.js');
const { deliveryStatus, formatDate } = await import('../../server/deadline.js');
const { loadStyle } = await import('../../src/styles.js');
const { SIZES } = await import('../../src/config.js');

const ROUTES = { '/': 'pradzia', '/uzsakymas': 'uzsakymas', '/taisykles': 'taisykles', '/grazinimas': 'grazinimas', '/privatumas': 'privatumas', '/valdymas': 'valdymas' };

/** Text of the first element with this opening tag, including nested ones. */
function outer(html, openRe) {
  const m = openRe.exec(html);
  if (!m) return null;
  const tag = m[0].match(/^<([a-z]+)/)[1];
  const re = new RegExp(`<${tag}[\\s>]|</${tag}>`, 'g');
  re.lastIndex = m.index + m[0].length;
  let depth = 1;
  let x;
  while ((x = re.exec(html))) {
    depth += x[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(m.index, x.index + x[0].length);
  }
  return null;
}
const inner = (html, tag) => {
  const o = outer(html, new RegExp(`<${tag}[^>]*>`));
  return o ? o.replace(new RegExp(`^<${tag}[^>]*>`), '').replace(new RegExp(`</${tag}>$`), '') : '';
};

function clean(fragment) {
  return fragment
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<template[\s\S]*?<\/template>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<input type="hidden" name="\$ACTION[^>]*>/g, '')
    .replace(/\s(action|formAction|formaction)="[^"]*"/g, '')
    .replace(/\shref="(\/[^"#?]*)(\?[^"]*)?"/g, (all, p) => {
      if (p.startsWith('/valdymas/') && p !== '/valdymas/patikra') return ' href="#valdymas-uzsakymas"';
      if (p.startsWith('/perziura/')) return ' href="#perziura"';
      if (p.startsWith('/kuponas/')) return ' href="#pradzia" data-demo="Dovanų kuponas (PDF) tikroje svetainėje atsisiunčiamas po apmokėjimo."';
      return ROUTES[p] ? ` href="#${ROUTES[p]}"` : ' href="#pradzia"';
    })
    .replaceAll(base, '');
}

async function inlineImages(fragment, request) {
  const srcs = [...new Set([...fragment.matchAll(/src="(\/(?:api|pavyzdziai)\/[^"]+)"/g)].map((m) => m[1].replaceAll('&amp;', '&')))];
  for (const src of srcs) {
    const res = await request.get(base + src);
    if (!res.ok()) throw new Error(`Could not fetch ${src}: ${res.status()}`);
    const uri = `data:${res.headers()['content-type'] || 'image/jpeg'};base64,${(await res.body()).toString('base64')}`;
    fragment = fragment.replaceAll(`src="${src.replaceAll('&', '&amp;')}"`, `src="${uri}"`).replaceAll(`src="${src}"`, `src="${uri}"`);
  }
  return fragment;
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const get = async (p) => {
  const res = await ctx.request.get(base + p);
  if (!res.ok()) throw new Error(`${p}: HTTP ${res.status()}`);
  return res.text();
};

const homeHtml = await get('/');
const header = clean(outer(homeHtml, /<header class="site-header">/));
const footer = clean(outer(homeHtml, /<footer class="site-footer">/));
const views = {
  pradzia: await inlineImages(clean(inner(homeHtml, 'main')), ctx.request),
  taisykles: clean(inner(await get('/taisykles'), 'main')),
  grazinimas: clean(inner(await get('/grazinimas'), 'main')),
  privatumas: clean(inner(await get('/privatumas'), 'main')),
};
const goodbad = outer(await get('/uzsakymas'), /<div class="goodbad"[^>]*>/);

// Admin and customer snapshots of the sample order.
await page.goto(base + '/valdymas/prisijungti');
await page.fill('#password', password);
await page.click('button[type=submit]');
await page.waitForURL(/\/valdymas$/);
const listHtml = await page.content();
const orderHref = listHtml.match(/href="(\/valdymas\/[0-9a-f-]{36})"/);
if (!orderHref) throw new Error('No order found in the admin list.');
await page.goto(base + orderHref[1]);
await page.waitForLoadState('networkidle');
const orderHtml = await page.content();
const token = orderHtml.replace(/<!--[\s\S]*?-->/g, '').match(/\/perziura\/([A-Za-z0-9_-]{20,64})/);
if (!token) throw new Error('The sample order has no customer link: send its preview first.');
const previewHtml = await get(`/perziura/${token[1]}`);

views.valdymas = await inlineImages(clean(inner(listHtml, 'main')), ctx.request);
views['valdymas-uzsakymas'] = await inlineImages(clean(inner(orderHtml, 'main')), ctx.request);
views.perziura = await inlineImages(clean(inner(previewHtml, 'main')), ctx.request);
await browser.close();

const d = deliveryStatus();
const config = {
  styles: SETTINGS.styles.map((key) => ({ key, title: STYLE_LABELS[key], description: loadStyle(key).description })),
  layouts: Object.fromEntries(
    SETTINGS.styles.map((key) => {
      const s = loadStyle(key);
      const font = (t) => {
        const map = {
          'CormorantGaramond_500Medium_Italic.ttf': ['Cormorant', 500, 'italic'],
          'CormorantGaramond_500Medium.ttf': ['Cormorant', 500, 'normal'],
          'PlayfairDisplay_500Medium.ttf': ['Playfair', 500, 'normal'],
          'Jost_600SemiBold.ttf': ['Jost', 600, 'normal'],
          'Jost_400Regular.ttf': ['Jost', 400, 'normal'],
        }[t.font];
        return { family: map[0], weight: map[1], style: map[2], size: t.size, spacing: t.spacing, uppercase: t.uppercase };
      };
      return [key, { layout: s.layout, name: font(s.name), secondLine: font(s.secondLine) }];
    }),
  ),
  sizes: SETTINGS.sizes.map((key) => ({ key, label: SIZE_LABELS[key], price: formatPrice(SETTINGS.prices[key]) })),
  dims: Object.fromEntries(SETTINGS.sizes.map((key) => [key, { w: SIZES[key].widthMm, h: SIZES[key].heightMm }])),
  frames: SETTINGS.frames.map((key) => ({ key, label: FRAME_LABELS[key] })),
  networks: SETTINGS.lockerNetworks,
  previewDays: SETTINGS.production.creationDays,
  aiDisclosure: SETTINGS.aiDisclosure,
  deliveryNote: d.beforeChristmas
    ? `Numatoma pristatymo data: apie ${formatDate(d.estimatedDelivery)}, jei peržiūrą patvirtinsite per vieną dieną.`
    : `Iki Kalėdų nebespėjame: pristatysime apie ${formatDate(d.estimatedDelivery)}.`,
  goodbad,
};

let css = fs.readFileSync('app/globals.css', 'utf8');
css = css.replace(/url\('\/sriftai\/([^']+\.woff2)'\)/g, (all, file) => `url(data:font/woff2;base64,${fs.readFileSync(path.join('public', 'sriftai', file)).toString('base64')})`);
css += `
.view { display: none; }
.view.on { display: block; }
.demo-bar { margin: 0; padding: 8px var(--pad); background: #fbf3df; border-bottom: 1px solid #a8791c; font-size: 13px; line-height: 1.45; text-align: center; }
.demo-bar a { white-space: nowrap; }
.snapshot-note { max-width: var(--max); margin: 12px auto 0; padding: 10px var(--pad); font-size: 14px; color: var(--muted); border-left: 3px solid #a8791c; background: #fbf3df; }
.demo-dialog { position: fixed; inset: 0; z-index: 50; display: none; align-items: flex-end; justify-content: center; background: rgba(20, 16, 12, 0.45); padding: 16px; }
.demo-dialog.on { display: flex; }
.demo-dialog > div { max-width: 460px; width: 100%; background: var(--paper); border: 1px solid var(--ink); padding: 20px; }
.demo-dialog p { margin: 0 0 14px; }
.demo-dialog .btn + .btn { margin-top: 10px; }
@media (min-width: 600px) { .demo-dialog { align-items: center; } }
`;

const viewHtml = Object.entries(views)
  .map(([name, html]) => {
    const note =
      name === 'perziura'
        ? '<p class="snapshot-note">Pavyzdys: taip klientas mato peržiūrą, atidaręs nuorodą iš laiško.</p>'
        : name.startsWith('valdymas')
          ? '<p class="snapshot-note">Pavyzdys: tavo valdymo puslapis su vienu pavyzdiniu užsakymu (Lego). Tikrame puslapyje jis apsaugotas slaptažodžiu.</p>'
          : '';
    return `<section class="view" id="v-${name}">${note}${html}</section>`;
  })
  .join('\n');

const routerJs = `
(function () {
  var names = ${JSON.stringify(['pradzia', 'uzsakymas', ...Object.keys(views).filter((n) => n !== 'pradzia')])};
  function show() {
    var h = (location.hash || '').slice(1);
    if (names.indexOf(h) < 0) h = 'pradzia';
    var all = document.querySelectorAll('.view');
    for (var i = 0; i < all.length; i++) all[i].classList.toggle('on', all[i].id === 'v-' + h);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', show);
  show();

  var dlg = document.getElementById('demo-dialog');
  window.demoDialog = function (text, linkText, linkHref) {
    dlg.querySelector('[data-text]').textContent = text;
    var a = dlg.querySelector('[data-link]');
    if (linkText) { a.textContent = linkText; a.href = linkHref; a.hidden = false; } else a.hidden = true;
    dlg.classList.add('on');
    dlg.querySelector('[data-close]').focus();
  };
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-close]') || e.target.closest('[data-link]')) dlg.classList.remove('on');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dlg.classList.remove('on'); });

  // Snapshots: buttons and forms explain what they do on the real site.
  var EXPLAIN = {
    perziura: 'Tikroje svetainėje „Tinka“ patvirtina portretą: tu ir klientas gaunate laišką, o spaudos failas atrakinamas. „Noriu pataisymo“ atveria laukelį pastabai.',
    valdymas: 'Tikrame valdymo puslapyje šis mygtukas pakeičia užsakymo būseną ir klientui išsiunčia atitinkamą laišką.',
  };
  function explain(el) {
    var v = el.closest('.view');
    if (!v || v.id === 'v-uzsakymas') return null;
    if (v.id === 'v-perziura') return EXPLAIN.perziura;
    if (v.id.indexOf('v-valdymas') === 0) return EXPLAIN.valdymas;
    return null;
  }
  document.addEventListener('submit', function (e) {
    var t = explain(e.target);
    if (t) { e.preventDefault(); window.demoDialog(t); }
  }, true);
  document.addEventListener('click', function (e) {
    var demo = e.target.closest('[data-demo]');
    if (demo) { e.preventDefault(); window.demoDialog(demo.getAttribute('data-demo')); return; }
    var b = e.target.closest('button, label.btn');
    if (!b) return;
    var t = explain(b);
    if (t) { e.preventDefault(); window.demoDialog(t); }
  }, true);
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="/api/"]');
    if (a) { e.preventDefault(); window.demoDialog('Tikrame valdymo puslapyje ši nuoroda atsiunčia failą (nuotrauką, maketą arba spaudos PDF).'); }
  }, true);
})();
`;

const flowJs = fs.readFileSync(path.join(here, 'flow.js'), 'utf8');
const html = `<!DOCTYPE html>
<html lang="lt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${SETTINGS.brand}: svetainės peržiūra</title>
<style>${css}</style>
</head>
<body>
<p class="demo-bar" role="note">Svetainės peržiūra: mokėjimai ir laiškai išjungti. Pažiūrėk ir <a href="#perziura">ką mato klientas</a>, ir <a href="#valdymas">tavo valdymo puslapį</a>.</p>
${header}
<main>
${viewHtml.replace('<section class="view" id="v-taisykles">', '<section class="view" id="v-uzsakymas"><div class="wrap flow" id="flow"></div></section>\n<section class="view" id="v-taisykles">')}
</main>
${footer}
<div class="demo-dialog" id="demo-dialog" role="dialog" aria-modal="true" aria-label="Paaiškinimas"><div>
<p data-text></p>
<a class="btn accent" data-link hidden href="#pradzia"></a>
<button type="button" class="btn ghost" data-close>Supratau</button>
</div></div>
<script>var CONFIG = ${JSON.stringify(config).replace(/</g, '\\u003c')};</script>
<script>${flowJs}</script>
<script>${routerJs}</script>
</body>
</html>
`;

fs.mkdirSync('.artefaktas', { recursive: true });
fs.writeFileSync('.artefaktas/index.html', html);
console.log(`.artefaktas/index.html: ${(html.length / 1024).toFixed(0)} KB, views: ${['pradzia', 'uzsakymas', ...Object.keys(views).filter((n) => n !== 'pradzia')].join(', ')}`);
