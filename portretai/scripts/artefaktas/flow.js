// Order flow for the static preview (claude.ai artifact). It runs entirely in
// the browser: the photo check, the name preview and the choices work as on
// the real site; payment is switched off and says so.
/* global CONFIG */
(function () {
  'use strict';

  var root = document.getElementById('flow');
  if (!root) return;

  var STEP_TITLES = ['Nuotrauka', 'Vardas', 'Gaminys ir stilius', 'Pristatymas ir apmokėjimas'];
  var NAME_OK = /^[\p{Script=Latin}\p{N} .,'’&!\-–]+$/u;
  var state = {
    step: 0,
    photo: null,
    errors: [],
    busy: false,
    f: {
      name: '', second: '', style: CONFIG.styles[0].key, product: CONFIG.products[0].key, phone: '', size: CONFIG.sizes[0].key, frame: CONFIG.frames[0].key,
      network: CONFIG.networks[0], city: '', address: '', customer: '', email: '', phone: '', terms: false,
    },
    fieldError: null,
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function find(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return list[0];
  }
  function upperLt(s) {
    try { return s.toLocaleUpperCase('lt-LT'); } catch (e) { return s.toUpperCase(); }
  }

  // ---- Photo check: same rules as the server (src/validate.js) -----------

  function sniff(b) {
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
    var tag = String.fromCharCode.apply(null, Array.prototype.slice.call(b, 4, 12));
    if (tag.indexOf('ftyp') === 0 && ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].indexOf(tag.slice(4)) >= 0) return 'heic';
    return 'other';
  }

  function measure(img) {
    var max = 1024;
    var scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    var w = Math.max(3, Math.round(img.naturalWidth * scale));
    var h = Math.max(3, Math.round(img.naturalHeight * scale));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    var px = ctx.getImageData(0, 0, w, h).data;
    var g = new Float32Array(w * h), sum = 0;
    for (var i = 0, j = 0; i < px.length; i += 4, j++) {
      g[j] = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      sum += g[j];
    }
    var grid = 8, tw = Math.floor((w - 2) / grid), th = Math.floor((h - 2) / grid), vars = [];
    for (var ty = 0; ty < grid; ty++) for (var tx = 0; tx < grid; tx++) {
      var s = 0, s2 = 0, n = 0, x0 = 1 + tx * tw, y0 = 1 + ty * th;
      for (var y = y0; y < y0 + th; y++) for (var x = x0; x < x0 + tw; x++) {
        var k = y * w + x, lap = g[k - 1] + g[k + 1] + g[k - w] + g[k + w] - 4 * g[k];
        s += lap; s2 += lap * lap; n++;
      }
      if (n) vars.push(s2 / n - (s / n) * (s / n));
    }
    vars.sort(function (a, b) { return b - a; });
    var top = vars.slice(0, Math.max(1, Math.round(vars.length / 10)));
    var sharp = top.reduce(function (a, b) { return a + b; }, 0) / top.length;
    var thumb = document.createElement('canvas');
    thumb.width = 192; thumb.height = 192;
    var t = thumb.getContext('2d'), side = Math.min(img.naturalWidth, img.naturalHeight);
    t.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 192, 192);
    // 4:5 crop for the poster preview: centred, slightly above the middle,
    // where a pet's face usually is.
    var pv = document.createElement('canvas');
    pv.width = 560; pv.height = 700;
    var iw = img.naturalWidth, ih = img.naturalHeight, cw = iw, chh = iw * 1.25;
    if (chh > ih) { chh = ih; cw = ih / 1.25; }
    var sx = (iw - cw) / 2, sy = Math.max(0, Math.min(ih - chh, ih * 0.42 - chh / 2));
    pv.getContext('2d').drawImage(img, sx, sy, cw, chh, 0, 0, 560, 700);
    return { luma: sum / (w * h), sharp: sharp, thumb: thumb.toDataURL('image/jpeg', 0.75), preview: pv.toDataURL('image/jpeg', 0.72) };
  }

  function checkFile(file) {
    state.errors = []; state.photo = null; state.busy = true; render();
    if (file.size > 15 * 1024 * 1024) {
      state.busy = false;
      state.errors = ['Failas per didelis: ' + (file.size / 1048576).toFixed(1) + ' MB. Didžiausias leidžiamas dydis – 15 MB.'];
      return render();
    }
    var head = new FileReader();
    head.onload = function () {
      var kind = sniff(new Uint8Array(head.result));
      if (kind === 'other') {
        state.busy = false;
        state.errors = ['Šio failo formato nepriimame. Tinka JPG, PNG ir HEIC (iPhone) nuotraukos.'];
        return render();
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var W = img.naturalWidth, H = img.naturalHeight, short = Math.min(W, H), errs = [], warns = [];
        var m = measure(img);
        if (short < 800) errs.push('Per maža raiška: ' + W + '×' + H + ' px. Trumpoji kraštinė turi būti bent 800 px. Dažna priežastis – nuotrauka atsiųsta per „Messenger“ ar ekrano kopija. Įkelkite originalą iš telefono galerijos.');
        else if (short < 1200) warns.push('Raiška nedidelė (' + W + '×' + H + ' px). Portretas pavyks, bet smulkios detalės (akys, ūsai) gali būti netikslios.');
        if (m.luma < 30) errs.push('Nuotrauka per tamsi: nesimato kailio ir akių detalių. Nufotografuokite prie lango dienos šviesoje.');
        else if (m.luma < 55) warns.push('Nuotrauka tamsoka. Jei augintinis tamsaus kailio, geriau tiktų nuotrauka dienos šviesoje.');
        else if (m.luma > 240) errs.push('Nuotrauka peršviesta: šviesios vietos išdegusios. Parinkite nuotrauką be tiesioginės saulės ar blykstės.');
        if (m.luma >= 30) {
          if (m.sharp < 35) errs.push('Nuotrauka išplaukusi: nėra nė vienos ryškios vietos. Reikia nuotraukos, kurioje aiškiai matosi akys.');
          else if (m.sharp < 90) warns.push('Nuotrauka nelabai ryški. Jei turite ryškesnę, kurioje aiškiai matosi akys, įkelkite ją.');
        }
        URL.revokeObjectURL(url);
        state.busy = false;
        if (errs.length) state.errors = errs;
        else state.photo = { thumb: m.thumb, preview: m.preview, warnings: warns };
        render();
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        state.busy = false;
        if (kind === 'heic') {
          // Older browsers cannot show HEIC. The real site checks it on the server.
          state.photo = { thumb: null, warnings: ['Ši naršyklė HEIC nuotraukos parodyti negali. Tikroje svetainėje ją patikriname ir paverčiame JPG serveryje.'] };
        } else {
          state.errors = ['Failas sugadintas arba ne paveikslėlis.'];
        }
        render();
      };
      img.src = url;
    };
    head.readAsArrayBuffer(file.slice(0, 16));
  }

  // ---- Poster preview: same geometry as components/PosterPreview.tsx -----

  var ART = {
    akvarele: { bg: 'linear-gradient(#e9dfcf 0%, #efe7da 60%, #fdfcf9 100%)', fg: '#7a6f60', paper: '#fdfcf9', ink: '#2a2622' },
    aliejus: { bg: '#2a211a', fg: '#b9a98f', paper: '#f4efe4', ink: '#2b2620' },
    grafika: { bg: 'linear-gradient(#e2d3b6 0%, #e2d3b6 78%, #efe7d6 100%)', fg: '#6d6046', paper: '#efe7d6', ink: '#2a2622' },
  };

  function isPoster() { return state.f.product === 'plakatas'; }
  // Print format the preview mirrors (keys of src/config SIZES).
  function format() { return isPoster() ? state.f.size : state.f.product; }

  function cameraHtml() {
    var cam = CONFIG.cameraLayouts[CONFIG.cameraByModel[state.f.phone] || 'pro'], m = cam.module;
    var u = function (v) { return (v * 100) + 'cqw'; };
    return '<span class="camera" aria-hidden="true">' +
      (m ? '<span class="camera-module" style="left:' + u(m.x) + ';top:' + u(m.y) + ';width:' + u(m.w) + ';height:' + u(m.h) + ';border-radius:' + u(m.r) + '"></span>' : '') +
      cam.lenses.map(function (p) { return '<span class="camera-lens" style="left:' + u(p[0] - cam.lens) + ';top:' + u(p[1] - cam.lens) + ';width:' + u(2 * cam.lens) + ';height:' + u(2 * cam.lens) + '"></span>'; }).join('') +
      '</span>';
  }

  function posterHtml() {
    var spec = CONFIG.layouts[state.f.style], art = ART[state.f.style], kind = isPoster() ? 'plakatas' : state.f.product, dims = CONFIG.dims[format()];
    var ratio = dims.h / dims.w, safe = dims.safe / dims.w, reserve = dims.reserve * ratio, box, textTop, maxText;
    if (spec.layout === 'margins') {
      var m = 0.085;
      box = { l: m, t: Math.max(m, reserve), w: 1 - 2 * m, h: (1 - 2 * m) / 0.8 };
      textTop = box.t + box.h; maxText = box.w;
    } else {
      var imgH = 1 / 0.8, band = Math.max(0.19 * ratio, ratio - reserve - imgH + 0.1 * imgH);
      box = { l: 0, t: reserve, w: 1, h: ratio - band - reserve };
      textTop = ratio - band; maxText = 1 - 2 * safe;
    }
    var name = state.f.name.trim() || 'Vardas', second = state.f.second.trim();
    if (spec.name.uppercase) name = upperLt(name);
    if (second && spec.secondLine.uppercase) second = upperLt(second);
    var pct = function (v) { return (v * 100) + 'cqw'; };
    var font = function (t) { return "font-family:'" + t.family + "',serif;font-weight:" + t.weight + ';font-style:' + t.style + ';letter-spacing:' + t.spacing + 'em;margin-right:-' + t.spacing + 'em;'; };
    return '<div class="poster poster--' + kind + '" data-max="' + maxText + '" style="aspect-ratio:' + dims.w + ' / ' + dims.h + ';background:' + art.paper + '">' +
      '<div class="art" aria-hidden="true" style="left:' + pct(box.l) + ';top:' + pct(box.t) + ';width:' + pct(box.w) + ';height:' + pct(box.h) + ';background:' + art.bg + ';color:' + art.fg + '">' +
      (state.photo && state.photo.preview
        ? '<img class="art-photo" src="' + state.photo.preview + '" alt="">' +
          (spec.layout === 'full' ? '<span class="art-fade" style="background:linear-gradient(transparent,' + art.paper + ')"></span>' : '') +
          (spec.layout === 'full' && reserve > 0 ? '<span class="art-fade art-fade--top" style="background:linear-gradient(' + art.paper + ',transparent)"></span>' : '') +
          '<span class="art-tag">Jūsų nuotrauka · portretą nupiešime</span>'
        : 'Čia bus<br>portretas') +
      '</div>' +
      (kind === 'deklas' ? cameraHtml() : '') +
      '<div class="text" aria-hidden="true" style="top:' + pct(textTop) + ';height:' + pct(ratio - safe - textTop) + ';padding-top:' + (spec.layout === 'margins' ? pct(spec.name.size * 0.45) : '0') + ';color:' + art.ink + '">' +
      '<span class="name" data-size="' + spec.name.size + '" style="' + font(spec.name) + 'font-size:' + pct(spec.name.size) + '">' + esc(name) + '</span>' +
      (second ? '<span class="second" data-size="' + spec.secondLine.size + '" style="' + font(spec.secondLine) + 'font-size:' + pct(spec.secondLine.size) + ';margin-top:' + pct(spec.secondLine.size * 1.1) + ';opacity:.82">' + esc(second) + '</span>' : '') +
      '</div></div>';
  }

  function fitPoster() {
    var p = root.querySelector('.poster');
    if (!p) return;
    var limit = p.clientWidth * Number(p.getAttribute('data-max'));
    ['.name', '.second'].forEach(function (sel) {
      var el = p.querySelector(sel);
      if (!el) return;
      el.style.fontSize = (Number(el.getAttribute('data-size')) * 100) + 'cqw';
      var w = el.getBoundingClientRect().width;
      if (w > limit && w > 0) el.style.fontSize = 'calc(' + (Number(el.getAttribute('data-size')) * 100) + 'cqw * ' + (limit / w * 0.995) + ')';
    });
  }

  function framedPoster() {
    if (!isPoster()) return '<div class="poster-wrap poster-wrap--' + state.f.product + '">' + posterHtml() + '</div>';
    return '<div class="poster-wrap"><div class="frame frame--' + state.f.frame + '"><div class="glass">' + posterHtml() + '</div></div></div>';
  }

  // ---- Rendering ----------------------------------------------------------

  function nameProblem() {
    var n = state.f.name.trim(), s = state.f.second.trim();
    if (!n) return 'Įrašykite vardą.';
    if (!NAME_OK.test(n)) return 'Varde gali būti tik raidės, skaitmenys ir paprasti skyrybos ženklai. Jaustukų atspausdinti negalime.';
    if (s && !NAME_OK.test(s.replace(/[/:()]/g, ''))) return 'Antroje eilutėje gali būti tik raidės, skaitmenys ir paprasti skyrybos ženklai.';
    return null;
  }

  function field(id, label, key, opts) {
    opts = opts || {};
    var err = state.fieldError && state.fieldError.field === key ? state.fieldError.message : null;
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<input id="' + id + '" data-key="' + key + '" type="' + (opts.type || 'text') + '"' + (opts.mode ? ' inputmode="' + opts.mode + '"' : '') +
      ' maxlength="' + (opts.max || 120) + '" autocomplete="' + (opts.ac || 'off') + '" value="' + esc(state.f[key]) + '"' + (err ? ' aria-invalid="true"' : '') + '>' +
      (opts.hint ? '<span class="hint">' + opts.hint + '</span>' : '') +
      (err ? '<p class="error" role="alert">' + esc(err) + '</p>' : '') + '</div>';
  }

  function radios(name, list, current, extra) {
    return '<div class="choices">' + list.map(function (o) {
      return '<label class="choice"><input type="radio" name="' + name + '" value="' + o.key + '"' + (o.key === current ? ' checked' : '') + '>' +
        '<span><strong>' + esc(o.title || o.label) + '</strong>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</span>' + (extra ? extra(o) : '') + '</label>';
    }).join('') + '</div>';
  }

  function render() {
    var s = state, f = s.f, h = '';
    h += '<ol class="progress" aria-hidden="true">' + STEP_TITLES.map(function (t, i) { return '<li class="' + (i <= s.step ? 'done' : '') + '"></li>'; }).join('') + '</ol>';
    h += '<p class="step-count">' + (s.step + 1) + ' žingsnis iš ' + STEP_TITLES.length + '</p>';
    h += '<h1 tabindex="-1">' + STEP_TITLES[s.step] + '</h1>';

    if (s.step === 0) {
      if (s.errors.length) h += '<div class="alert" role="alert"><p><strong>Ši nuotrauka netinka.</strong></p><ul>' + s.errors.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>';
      if (s.photo) {
        h += '<div class="upload-done">' + (s.photo.thumb ? '<img src="' + s.photo.thumb + '" alt="Jūsų įkelta nuotrauka" width="96" height="96">' : '<div class="ph ph-photo" style="width:96px;height:96px"><span>HEIC</span></div>') +
          '<div><strong>Nuotrauka tinka.</strong><label class="small" style="display:block;margin-top:4px;color:var(--accent);text-decoration:underline;cursor:pointer">Įkelti kitą<input type="file" class="visually-hidden" data-file accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"></label></div></div>';
        if (s.photo.warnings.length) h += '<div class="alert warn" role="status"><ul>' + s.photo.warnings.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>';
      } else if (s.busy) {
        h += '<div class="upload" role="status"><strong>Tikriname nuotrauką…</strong></div>';
      } else {
        h += '<label class="upload"><input type="file" data-file accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"><strong>Pasirinkite nuotrauką</strong><span class="small muted">JPG, PNG arba HEIC, iki 15 MB</span></label>';
      }
      h += CONFIG.goodbad;
      h += '<div class="flow-nav"><button type="button" class="btn" data-go="1"' + (s.photo ? '' : ' disabled') + '>Toliau: vardas</button></div>';
    }

    if (s.step === 1) {
      var np = nameProblem();
      h += framedPoster() + '<p class="poster-note">Vardas bus parašytas šiuo šriftu. Nuotrauka čia tik vietai parodyti: portretą nupiešime ir atsiųsime jums peržiūrėti.</p>';
      h += field('name', 'Augintinio vardas', 'name', { max: 30, hint: 'Iki 30 ženklų. Lietuviškos raidės (ą, č, ę, ė, į, š, ų, ū, ž) bus atspausdintos tiksliai taip, kaip įrašysite.' });
      h += field('second', 'Antra eilutė (nebūtina)', 'second', { max: 40, hint: 'Pavyzdžiui, metai „2014 – 2026“ arba trumpas tekstas. Iki 40 ženklų.' });
      h += '<p class="error" data-name-problem role="alert"' + (f.name.trim() && np ? '' : ' hidden') + '>' + esc(np || '') + '</p>';
      h += '<div class="flow-nav"><button type="button" class="btn" data-go="2"' + (np ? ' disabled' : '') + '>Toliau: gaminys ir stilius</button><button type="button" class="btn ghost" data-go="0">Atgal</button></div>';
    }

    if (s.step === 2) {
      h += framedPoster();
      h += '<fieldset><legend>Ant ko spausdinti</legend>' + radios('product', CONFIG.products, f.product, function (o) { return '<span class="price">' + esc(o.price) + '</span>'; }) + '</fieldset>';
      if (f.product === 'deklas') {
        h += '<div class="field"><label for="phone-model">Telefono modelis</label><select id="phone-model" data-phone><option value="">Pasirinkite…</option>' +
          CONFIG.phoneModels.map(function (m) { return '<option' + (m === f.phone ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') +
          '</select><span class="hint">Jei savo modelio sąraše nerandate, parašykite mums prieš užsakydami.</span></div>';
      }
      h += '<fieldset><legend>Stilius</legend>' + radios('style', CONFIG.styles.map(function (o) { return { key: o.key, title: o.title, sub: o.description }; }), f.style, function (o) { return '<span class="style-chip style-chip--' + o.key + '" aria-hidden="true"></span>'; }) + '</fieldset>';
      if (isPoster()) h += '<fieldset><legend>Dydis</legend>' + radios('size', CONFIG.sizes.map(function (o) { return { key: o.key, label: o.label, sub: 'Su rėmeliu ir pristatymu į paštomatą', price: o.price }; }), f.size, function (o) { return '<span class="price">' + esc(o.price) + '</span>'; }) + '</fieldset>';
      if (isPoster()) h += '<fieldset><legend>Rėmelio spalva</legend>' + radios('frame', CONFIG.frames, f.frame, function (o) { return '<span class="frame frame--' + o.key + ' mini" aria-hidden="true"><span class="glass"></span></span>'; }) + '</fieldset>';
      h += '<div class="flow-nav"><button type="button" class="btn" data-go="3"' + (f.product === 'deklas' && !f.phone ? ' disabled' : '') + '>Toliau: pristatymas</button><button type="button" class="btn ghost" data-go="1">Atgal</button></div>';
    }

    if (s.step === 3) {
      var size = find(CONFIG.sizes, f.size), style = find(CONFIG.styles, f.style), frame = find(CONFIG.frames, f.frame), product = find(CONFIG.products, f.product);
      var total = isPoster() ? size.price : product.total;
      var rows = isPoster()
        ? '<div><dt>Dydis</dt><dd>' + esc(size.label) + '</dd></div><div><dt>Rėmelis</dt><dd>' + esc(frame.label) + '</dd></div>'
        : f.product === 'deklas' ? '<div><dt>Telefono modelis</dt><dd>' + esc(f.phone) + '</dd></div>' : '<div><dt>Dydis</dt><dd>100×150 cm</dd></div>';
      h += '<form data-pay novalidate>';
      h += '<fieldset><legend>Paštomatų tinklas</legend>' + radios('network', CONFIG.networks.map(function (n) { return { key: n, label: n }; }), f.network) + '</fieldset>';
      h += field('city', 'Miestas', 'city', { max: 60, ac: 'address-level2' });
      h += field('address', 'Paštomato adresas arba pavadinimas', 'address', { hint: 'Pavyzdžiui: „Ozo g. 25, Akropolis“.' });
      h += field('customer', 'Vardas ir pavardė', 'customer', { max: 80, ac: 'name' });
      h += field('email', 'El. paštas', 'email', { type: 'email', mode: 'email', ac: 'email', hint: 'Čia per ' + CONFIG.previewDays + ' darbo d. atsiųsime portreto peržiūrą. Be jūsų patvirtinimo nespausdiname.' });
      h += field('phone', 'Telefonas', 'phone', { type: 'tel', mode: 'tel', max: 30, ac: 'tel', hint: 'Į šį numerį paštomatas atsiųs atsiėmimo kodą.' });
      h += '<h2 style="font-size:26px;margin:26px 0 6px">Jūsų užsakymas</h2><dl class="summary">' +
        '<div><dt>Gaminys</dt><dd>' + esc(product.label) + '</dd></div>' +
        '<div><dt>Vardas</dt><dd>' + esc(f.name.trim()) + '</dd></div>' +
        (f.second.trim() ? '<div><dt>Antra eilutė</dt><dd>' + esc(f.second.trim()) + '</dd></div>' : '') +
        '<div><dt>Stilius</dt><dd>' + esc(style.title) + '</dd></div>' + rows +
        '<div><dt>Pristatymas</dt><dd>Į paštomatą, įskaičiuotas</dd></div>' +
        '<div class="total"><dt>Iš viso</dt><dd>' + esc(total) + '</dd></div></dl>';
      h += '<p class="small muted">' + esc(CONFIG.deliveryNote) + '</p><p class="small muted">' + esc(CONFIG.aiDisclosure) + '</p>';
      var termsErr = s.fieldError && s.fieldError.field === 'terms';
      h += '<label class="check"><input type="checkbox" data-key="terms"' + (f.terms ? ' checked' : '') + (termsErr ? ' aria-invalid="true"' : '') + '><span>Sutinku su <a href="#taisykles">pirkimo taisyklėmis</a> ir <a href="#privatumas">privatumo politika</a>. Žinau, kad pagal mano užsakymą pagaminto portreto grąžinti negalima, nebent jis su defektu.</span></label>';
      if (termsErr) h += '<p class="error" role="alert">' + esc(s.fieldError.message) + '</p>';
      h += '<div class="flow-nav"><button type="submit" class="btn accent">Apmokėti ' + esc(total) + '</button><button type="button" class="btn ghost" data-go="2">Atgal</button></div></form>';
    }

    root.innerHTML = h;
    fitPoster();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPoster);
  }

  function go(step) {
    state.step = step; state.fieldError = null; render();
    var h1 = root.querySelector('h1');
    if (h1) h1.focus();
    window.scrollTo(0, 0);
  }

  function validateDelivery() {
    var f = state.f;
    if (f.customer.trim().length < 2) return { field: 'customer', message: 'Įrašykite savo vardą ir pavardę.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) return { field: 'email', message: 'El. pašto adresas neteisingas. Į jį siųsime portreto peržiūrą.' };
    if (f.phone.replace(/\D/g, '').length < 8) return { field: 'phone', message: 'Įrašykite telefono numerį: jo reikia paštomato SMS žinutei.' };
    if (f.city.trim().length < 2) return { field: 'city', message: 'Įrašykite miestą.' };
    if (f.address.trim().length < 3) return { field: 'address', message: 'Įrašykite paštomato adresą arba pavadinimą.' };
    if (!f.terms) return { field: 'terms', message: 'Pažymėkite, kad sutinkate su pirkimo taisyklėmis.' };
    return null;
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b && !b.disabled) go(Number(b.getAttribute('data-go')));
  });
  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-file') && t.files && t.files[0]) return checkFile(t.files[0]);
    if (t.type === 'radio') { state.f[t.name] = t.value; if (state.step === 2) render(); }
    if (t.hasAttribute('data-phone')) { state.f.phone = t.value; render(); }
    if (t.type === 'checkbox') state.f.terms = t.checked;
  });
  root.addEventListener('input', function (e) {
    var t = e.target, key = t.getAttribute('data-key');
    if (!key || t.type === 'checkbox') return;
    state.f[key] = t.value;
    if (state.fieldError && state.fieldError.field === key) { state.fieldError = null; t.removeAttribute('aria-invalid'); }
    if (state.step === 1) {
      root.querySelector('.poster').outerHTML = posterHtml();
      fitPoster();
      var np = nameProblem(), msg = root.querySelector('[data-name-problem]'), next = root.querySelector('[data-go="2"]');
      msg.textContent = np || '';
      msg.hidden = !(state.f.name.trim() && np);
      next.disabled = Boolean(np);
    }
  });
  root.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = validateDelivery();
    if (err) {
      state.fieldError = err; render();
      var el = root.querySelector('[aria-invalid="true"]');
      if (el) el.focus();
      return;
    }
    window.demoDialog('Čia klientas būtų nukreiptas į „Stripe“ mokėjimo puslapį. Šioje peržiūroje mokėjimas išjungtas, užsakymas nesukuriamas.', 'Kas būna po apmokėjimo', '#perziura');
  });
  window.addEventListener('resize', fitPoster);
  // "Užsakyti pledą" on the home page opens the flow with that product chosen.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-product]');
    if (a) { state.f.product = a.getAttribute('data-product'); render(); }
  });

  render();
})();
