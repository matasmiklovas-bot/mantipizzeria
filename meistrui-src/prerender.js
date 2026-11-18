// Surenka puslapį iš anksto: paleidžia tik turinio kūrimo dalį ir įrašo gautą HTML
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [, , url, out] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '?prerender', { waitUntil: 'load' });
  await p.waitForTimeout(400);
  const html = await p.evaluate(() => {
    const r = document.documentElement;
    r.removeAttribute('class');
    return '<!DOCTYPE html>\n' + r.outerHTML;
  });
  if (errs.length) { console.error('prerender errors:', errs); process.exit(1); }
  if (!/class="phone-body"/.test(html) || !/lt-town/.test(html) || /data-ic=/.test(html)) { console.error('prerender incomplete'); process.exit(1); }
  fs.writeFileSync(out, html);
  console.log('prerendered', Math.round(html.length / 1024), 'KB');
  await b.close();
})();
