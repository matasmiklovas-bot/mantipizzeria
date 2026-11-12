// Builds one self-contained HTML page: "before and after" for up to three
// examples plus a short survey. No external requests, no tracking: images are
// embedded, and the answer leaves the page only when the respondent shares it.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { FILES } from './pipeline.js';
import { SIZES } from './config.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function dataUri(file, width) {
  const buf = await sharp(file).resize({ width, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

/**
 * @param {string[]} dirs output folders produced by "portretas kurti"
 * @param {{ price?: number, email?: string }} opts
 * @returns {Promise<string>} HTML
 */
export async function buildSurveyHtml(dirs, opts = {}) {
  const price = opts.price ?? 35;
  if (dirs.length === 0) throw new Error('Nurodykite bent vieną aplanką su sukurtu portretu.');
  const examples = [];
  for (const dir of dirs) {
    let report;
    try {
      report = JSON.parse(await fs.readFile(path.join(dir, FILES.report), 'utf8'));
    } catch {
      throw new Error(`Aplanke ${dir} nėra ${FILES.report}. Pirma paleiskite „portretas kurti“.`);
    }
    const originalFile = path.join(dir, FILES.original);
    const hasOriginal = await fs.access(originalFile).then(() => true, () => false);
    examples.push({
      name: report.name,
      style: report.styleTitle || report.style,
      size: SIZES[report.size]?.label || report.size,
      before: hasOriginal ? await dataUri(originalFile, 520) : null,
      after: await dataUri(path.join(dir, FILES.clean), 900),
      wall: await dataUri(path.join(dir, FILES.wall), 900),
    });
  }

  const sizeLabel = examples[0].size;
  const cards = examples
    .map(
      (e, i) => `
    <section class="ex">
      <h2><span class="n">${i + 1}</span>${esc(e.name)} <small>${esc(e.style)}</small></h2>
      <div class="pair${e.before ? '' : ' solo'}">
        ${e.before ? `<figure class="before"><img src="${e.before}" alt="${esc(e.name)}: nuotrauka" loading="lazy"><figcaption>Nuotrauka</figcaption></figure>` : ''}
        <figure class="after"><img src="${e.after}" alt="${esc(e.name)}: portretas" loading="lazy"><figcaption>Portretas</figcaption></figure>
      </div>
      <details><summary>Kaip atrodytų ant sienos</summary><img src="${e.wall}" alt="${esc(e.name)}: įrėmintas portretas ant sienos" loading="lazy"></details>
    </section>`,
    )
    .join('\n');

  const styleOptions = examples
    .map((e, i) => `<label><input type="radio" name="stilius" value="${i + 1}. ${esc(e.style)}"><span>${i + 1}. ${esc(e.style)}</span></label>`)
    .join('\n          ');

  return `<!doctype html>
<html lang="lt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Ar pirktum tokį portretą?</title>
<style>
  :root { --paper:#f6f2ea; --ink:#26221d; --muted:#6e665b; --line:#d9d1c3; --accent:#8a4b2a; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font:17px/1.55 -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  main { max-width: 640px; margin: 0 auto; padding: 28px 18px 64px; }
  h1 { font: 500 34px/1.12 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif; margin: 0 0 14px; letter-spacing: -0.01em; }
  p { margin: 0 0 14px; }
  .lead { color: var(--muted); }
  .ex { margin: 40px 0 0; padding-top: 22px; border-top: 1px solid var(--line); }
  h2 { font: 500 24px/1.2 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif; margin: 0 0 14px; }
  h2 small { font: 400 15px/1 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: var(--muted); margin-left: 6px; }
  .n { display:inline-block; min-width: 1.5em; color: var(--accent); }
  .pair { display: grid; grid-template-columns: 36fr 64fr; gap: 10px; align-items: start; }
  .pair.solo { grid-template-columns: 1fr; }
  figure { margin: 0; }
  figure img, details img { display:block; width:100%; height:auto; background:#e8e2d6; }
  .after img { box-shadow: 0 1px 2px rgba(40,30,15,.18), 0 10px 26px rgba(40,30,15,.14); }
  figcaption { font-size: 13px; color: var(--muted); margin-top: 6px; }
  details { margin-top: 14px; }
  summary { cursor: pointer; color: var(--accent); padding: 8px 0; font-size: 15px; }
  form { margin-top: 44px; padding-top: 26px; border-top: 2px solid var(--ink); }
  fieldset { border: 0; padding: 0; margin: 0 0 26px; }
  legend { font-weight: 600; padding: 0; margin-bottom: 10px; }
  .hint { font-weight: 400; color: var(--muted); font-size: 15px; }
  .opts { display: grid; gap: 8px; }
  .opts label { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 8px 14px; border: 1px solid var(--line); border-radius: 6px; background: #fbf9f4; cursor: pointer; }
  .opts input { width: 20px; height: 20px; accent-color: var(--accent); margin: 0; flex: none; }
  .opts label:has(input:checked) { border-color: var(--ink); background: #fff; }
  input[type=number], textarea { width: 100%; font: inherit; color: inherit; padding: 12px 14px; border: 1px solid var(--line); border-radius: 6px; background: #fff; }
  input[type=number] { max-width: 160px; }
  textarea { min-height: 110px; resize: vertical; }
  :focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  button { font: inherit; font-weight: 600; color: #fff; background: var(--ink); border: 0; border-radius: 6px; padding: 17px 22px; width: 100%; cursor: pointer; }
  button.second { background: transparent; color: var(--ink); border: 1px solid var(--ink); margin-top: 10px; }
  #done { display:none; margin-top: 26px; }
  #done pre { white-space: pre-wrap; background:#fff; border:1px solid var(--line); border-radius:6px; padding:14px; font: 15px/1.5 ui-monospace, Menlo, Consolas, monospace; }
  .err { color: #a3261a; margin: -14px 0 18px; display:none; }
</style>
</head>
<body>
<main>
  <h1>Ar pirktum tokį portretą?</h1>
  <p>Ketinu daryti augintinių portretus pagal nuotrauką: atspausdintus, įrėmintus, su vardu. Portretai piešiami kompiuterinėmis programomis, o prieš spaudą kiekvieną peržiūriu pats.</p>
  <p class="lead">Prieš pradėdamas noriu žinoti, ar už tai verta mokėti. Sąžiningas „ne“ man naudingesnis už mandagų „taip“.</p>
${cards}

  <form id="f" novalidate>
    <p>Įrėmintas ${esc(sizeLabel)} portretas su vardu kainuotų <strong>${price} €</strong>.</p>
    <fieldset>
      <legend>Ar pirktum už ${price} €?</legend>
      <div class="opts">
        <label><input type="radio" name="pirktu" value="Taip"><span>Taip</span></label>
        <label><input type="radio" name="pirktu" value="Galbūt"><span>Galbūt</span></label>
        <label><input type="radio" name="pirktu" value="Ne"><span>Ne</span></label>
      </div>
    </fieldset>
    <p class="err" id="err">Pažymėk, ar pirktum.</p>
    <fieldset>
      <legend><label for="kiek">Jei ne, kiek daugiausia mokėtum? <span class="hint">(eurais)</span></label></legend>
      <input type="number" id="kiek" name="kiek" min="0" max="500" step="1" inputmode="numeric">
    </fieldset>
    <fieldset>
      <legend>Kuris stilius patinka labiausiai?</legend>
      <div class="opts">
          ${styleOptions}
          <label><input type="radio" name="stilius" value="Nė vienas"><span>Nė vienas</span></label>
      </div>
    </fieldset>
    <fieldset>
      <legend><label for="pigu">Kas čia atrodo pigiai ar keistai?</label></legend>
      <textarea id="pigu" name="pigu" placeholder="Pvz.: akys, kailis, šriftas, spalvos…"></textarea>
    </fieldset>
    <button type="submit">Išsiųsti atsakymą</button>
  </form>

  <div id="done" role="status">
    <h2>Ačiū</h2>
    <p id="how"></p>
    <pre id="out"></pre>
    <button type="button" class="second" id="copy">Nukopijuoti tekstą</button>
  </div>
</main>
<script>
(function () {
  var EMAIL = ${JSON.stringify(opts.email || '')};
  var f = document.getElementById('f');
  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var d = new FormData(f);
    if (!d.get('pirktu')) { document.getElementById('err').style.display = 'block'; return; }
    var text = 'Portretų apklausa\\n' +
      'Ar pirktų už ${price} €: ' + d.get('pirktu') + '\\n' +
      'Mokėtų daugiausia: ' + (d.get('kiek') ? d.get('kiek') + ' €' : '-') + '\\n' +
      'Patinka stilius: ' + (d.get('stilius') || '-') + '\\n' +
      'Kas atrodo pigiai: ' + (d.get('pigu') || '-');
    document.getElementById('out').textContent = text;
    f.style.display = 'none';
    var done = document.getElementById('done');
    done.style.display = 'block';
    var how = document.getElementById('how');
    if (navigator.share) {
      how.textContent = 'Atsidarys siuntimo langas: nusiųsk šį tekstą man.';
      navigator.share({ text: text }).catch(function () {});
    } else if (EMAIL) {
      how.innerHTML = 'Nusiųsk šį tekstą el. paštu: ';
      var a = document.createElement('a');
      a.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Portretų apklausa') + '&body=' + encodeURIComponent(text);
      a.textContent = EMAIL;
      how.appendChild(a);
    } else {
      how.textContent = 'Nukopijuok šį tekstą ir nusiųsk man žinute.';
    }
    done.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('copy').addEventListener('click', function () {
    var t = document.getElementById('out').textContent;
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
      function () { b.textContent = 'Nukopijuota'; },
      function () { var r = document.createRange(); r.selectNodeContents(document.getElementById('out')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    );
  });
})();
</script>
</body>
</html>
`;
}
