/* ===== Pakeiskite šiuos duomenis savo tikrais ===== */
var CONFIG = {
  brand: "Meistrui",
  owner: "Matas Miklovas",
  phoneDisplay: "+370 600 70822",
  phoneTel: "+37060070822",
  email: "matasmiklovas@gmail.com",
  area: "Palangoje, Klaipėdoje ir visoje Lietuvoje"
};

(async function () {
  "use strict";
  /* Ilgas paruošimas skaidomas į trumpas užduotis, kad naršyklė spėtų piešti ir reaguoti */
  const tick = () => new Promise(r => setTimeout(r, 0));
  const html = document.documentElement;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const I = window.ICONS || {};
  const ic = (n, cls) =>
    `<svg class="ic ${cls || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;
  const stars = () => `<span class="stars">${[0, 1, 2, 3, 4].map(() => ic("star")).join("")}</span>`;
  const mq = q => { try { return window.matchMedia(q).matches; } catch (e) { return false; } };

  /* ---------- Kontaktai ---------- */
  $$("[data-brand]").forEach(el => (el.textContent = CONFIG.brand));
  $$("[data-owner]").forEach(el => (el.textContent = CONFIG.owner));
  $$("[data-phone]").forEach(el => (el.textContent = CONFIG.phoneDisplay));
  $$("[data-email]").forEach(el => (el.textContent = CONFIG.email));
  $$("[data-area]").forEach(el => (el.textContent = CONFIG.area));
  $$("[data-tel]").forEach(el => (el.href = "tel:" + CONFIG.phoneTel));
  $$("[data-mail]").forEach(el => (el.href = "mailto:" + CONFIG.email));

  /* ---------- Pavyzdiniai prekių ženklai ---------- */
  const BRANDS = {
    vamzdis: {
      name: "Vamzdis", trade: "Santechnika", town: "Šiauliai", icon: "droplets",
      status: "Dirbame dabar · iki 21:00",
      h: "Prakiuro? Atvažiuojame tą pačią dieną.",
      lead: "Santechnikos darbai Šiauliuose ir rajone. Kaina žinoma iš anksto.",
      alt: "Kainos", rating: "4,9",
      services: [["wrench", "Meistro iškvietimas", "atvykstame per 2 val.", "25 €"], ["shower-head", "Maišytuvo keitimas", "apie 1 val.", "30 €"], ["droplets", "Kanalizacijos valymas", "su įranga", "nuo 40 €"], ["gauge", "Boilerio montavimas", "su garantija", "nuo 60 €"]],
      hours: [["I–V", "8:00–21:00"], ["VI", "9:00–15:00"], ["Avarijos", "visą parą"]], close: "21:00",
      addr: "Tilžės g., Šiauliai", form: ["Vardas", "Telefono numeris", "Kas atsitiko?"], cta: "Kviesti meistrą",
      line: "Aiški, patikima, su avariniu numeriu",
      features: ["Avarinis iškvietimas pačiame viršuje", "Kainos, kol dar nepaskambino", "Darbo laikas ir naktinis numeris"],
      pat: `<svg class="s-pat" viewBox="0 0 200 220" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M-20 40H80a36 36 0 0 1 36 36v160"/><path d="M-20 92H52a20 20 0 0 1 20 20v120"/><path d="M230 30h-40a24 24 0 0 0-24 24v54a24 24 0 0 0 24 24h40"/><rect x="104" y="128" width="24" height="16" rx="3" fill="currentColor" stroke="none"/><rect x="40" y="150" width="24" height="16" rx="3" fill="currentColor" stroke="none"/></svg>`
    },
    zirkles: {
      name: "Žirklės", trade: "Kirpykla", town: "Panevėžys", icon: "scissors",
      status: "Šiandien laisvi 3 laikai",
      h: "Kirpimas, kuriuo norisi pasigirti.",
      lead: "Moterų, vyrų ir vaikų kirpimai Panevėžio centre.",
      alt: "Registruotis", rating: "5,0",
      services: [["scissors", "Moterų kirpimas", "su plovimu", "nuo 20 €"], ["scissors", "Vyrų kirpimas", "30 min.", "12 €"], ["sparkles", "Plaukų dažymas", "su konsultacija", "nuo 40 €"], ["scissors", "Vaikų kirpimas", "iki 12 metų", "10 €"]],
      hours: [["I–V", "9:00–19:00"], ["VI", "9:00–14:00"], ["VII", "nedirbame"]], close: "19:00",
      addr: "Laisvės a., Panevėžys", form: ["Vardas", "Telefono numeris", "Norima diena ir laikas"], cta: "Registruotis",
      line: "Šilta, elegantiška, su registracija",
      features: ["Registracija be skambučio", "Kainos pagal paslaugą", "Elegantiška, šilta išvaizda"],
      pat: `<svg class="s-pat" viewBox="0 0 200 220" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M10 240V120a90 90 0 0 1 180 0v120"/><path d="M30 240V120a70 70 0 0 1 140 0v120"/><path d="M50 240V120a50 50 0 0 1 100 0v120"/><path d="M70 240V120a30 30 0 0 1 60 0v120"/></svg>`
    },
    ratas: {
      name: "Ratas", trade: "Autoservisas", town: "Utena", icon: "car",
      status: "Laisva rytoj 10:00",
      h: "Be eilių. Be staigmenų sąskaitoje.",
      lead: "Diagnostika, tepalai, padangos ir važiuoklė Utenoje.",
      alt: "Registruoti", rating: "4,8",
      services: [["gauge", "Kompiuterinė diagnostika", "per 30 min.", "20 €"], ["droplets", "Tepalų keitimas", "su filtru", "nuo 25 €"], ["disc-3", "Padangų montavimas", "4 ratai", "nuo 30 €"], ["wrench", "Stabdžių kaladėlės", "viena ašis", "nuo 35 €"]],
      hours: [["I–V", "8:00–18:00"], ["VI", "9:00–14:00"], ["VII", "nedirbame"]], close: "18:00",
      addr: "Pramonės g., Utena", form: ["Vardas", "Telefono numeris", "Automobilis ir gedimas"], cta: "Registruoti automobilį",
      line: "Griežta, greita, be nereikalingų žodžių",
      features: ["Automobilio registracija internetu", "Kainos be staigmenų", "Tiksli vieta žemėlapyje"],
      pat: `<svg class="s-pat" viewBox="0 0 200 220" fill="none" stroke="currentColor" stroke-width="16" aria-hidden="true"><path d="M-10 20l55 40 55-40 55 40 55-40"/><path d="M-10 80l55 40 55-40 55 40 55-40"/><path d="M-10 140l55 40 55-40 55 40 55-40"/><path d="M-10 200l55 40 55-40 55 40 55-40"/></svg>`
    },
    ramybe: {
      name: "Ramybė", trade: "Masažo kabinetas", town: "Alytus", icon: "leaf",
      status: "Laisvi laikai šią savaitę",
      h: "Valanda, po kurios nugara padėkos.",
      lead: "Klasikinis, sportinis ir atpalaiduojantis masažas Alytuje.",
      alt: "Kuponai", rating: "5,0",
      services: [["hand", "Nugaros masažas", "30 min.", "25 €"], ["leaf", "Klasikinis masažas", "60 min.", "35 €"], ["timer", "Sportinis masažas", "60 min.", "40 €"], ["flower-2", "Dovanų kuponas", "bet kuriai procedūrai", "nuo 25 €"]],
      hours: [["I–V", "10:00–20:00"], ["VI", "10:00–16:00"], ["VII", "pagal susitarimą"]], close: "20:00",
      addr: "Pulko g., Alytus", form: ["Vardas", "Telefono numeris", "Norima procedūra ir laikas"], cta: "Užsiregistruoti",
      line: "Rami, šviesi, su dovanų kuponais",
      features: ["Procedūros su trukme ir kaina", "Dovanų kuponai šventėms", "Rami, švari išvaizda"],
      pat: `<svg class="s-pat" viewBox="0 0 200 220" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="120" cy="78" r="58" fill="currentColor" stroke="none" opacity=".6"/><path d="M-10 150c30-16 60 16 100 0s70-16 120 0"/><path d="M-10 170c30-16 60 16 100 0s70-16 120 0"/><path d="M-10 190c30-16 60 16 100 0s70-16 120 0"/></svg>`
    }
  };

  const miniMap = `<svg viewBox="0 0 300 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <path d="M-10 112C60 92 120 132 200 102S290 72 320 82" stroke="#fff" stroke-opacity=".9" stroke-width="16" fill="none"/>
    <g stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"><path d="M-10 48H310"/><path d="M96 -10V150"/><path d="M214 -10L186 150"/></g>
    <g stroke="#fff" stroke-width="4" fill="none" opacity=".8"><path d="M-10 80H310"/><path d="M40 -10V150"/><path d="M150 -10V150"/><path d="M262 -10V150"/><path d="M-10 18H310"/></g>
    <g transform="translate(150 66)"><path d="M0-28C-13-28-20-18-20-9-20 5 0 18 0 18S20 5 20-9C20-18 13-28 0-28Z" style="fill:var(--s-strong)"/><circle cy="-10" r="6.5" fill="#fff"/></g></svg>`;

  function siteHTML(key, short) {
    const b = BRANDS[key];
    return `<div class="site b-${key}">
      <div class="s-head">${b.pat}
        <div class="s-status"><span>9:41</span><span class="s-sys">${ic("signal")}${ic("wifi")}${ic("battery-full")}</span></div>
        <div class="s-nav"><span class="s-logo"><span class="s-mark">${ic(b.icon)}</span>${b.name}</span>${ic("menu")}</div>
        <div class="s-hero">
          <span class="s-chip"><i></i>${b.status}</span>
          <p class="s-h">${b.h}</p>
          <p class="s-lead">${b.lead}</p>
          <div class="s-actions"><span class="s-btn s-call">${ic("phone")}Skambinti</span><span class="s-btn s-alt">${b.alt}</span></div>
          <div class="s-rating">${stars()}<b>${b.rating}</b><span>Google įvertinimas</span></div>
        </div>
      </div>
      <div class="s-sec"><p class="s-label">Paslaugos ir kainos</p>${b.services.map(s => `<div class="s-row"><span class="s-ico">${ic(s[0])}</span><span><b>${s[1]}</b><small>${s[2]}</small></span><em>${s[3]}</em></div>`).join("")}</div>
      ${short ? "" : `<div class="s-sec"><p class="s-label">Darbo laikas</p><div class="s-hours"><span class="s-open"><i></i>Atidaryta · uždaroma ${b.close}</span>${b.hours.map(h => `<div><span>${h[0]}</span><span>${h[1]}</span></div>`).join("")}</div></div>
      <div class="s-sec"><p class="s-label">Kur mus rasti</p><div class="s-map">${miniMap}<span class="s-addr">${ic("map-pin")}${b.addr}</span></div></div>
      <div class="s-sec"><p class="s-label">${b.cta}</p><div class="s-form">${b.form.map(f => `<span class="s-field">${f}</span>`).join("")}<span class="s-btn s-call">${b.cta}</span></div></div>
      <div class="s-foot">© ${b.name} · ${b.town}</div>`}
    </div>`;
  }
  const pinSvg = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2C9.4 2 4.5 7 4.5 13.3 4.5 21.6 16 30 16 30s11.5-8.4 11.5-16.7C27.5 7 22.6 2 16 2Z" fill="#EDECE7"/><circle cx="16" cy="13" r="4.6" fill="#FF4F12"/></svg>`;
  const shell = (inner, boot) => `<div class="phone-body"><div class="phone-screen"><div class="island"></div>${inner}${boot ? `<div class="boot">${pinSvg}</div>` : ""}<div class="phone-shine"></div></div></div>`;

  const reduce = mq("(prefers-reduced-motion: reduce)");
  const hasLibs = !!(window.gsap && window.ScrollTrigger);
  const motion = hasLibs && !reduce && !html.classList.contains("safe");

  /* Telefonai su pavyzdžiais */
  $$(".phone[data-site]").forEach(p => { if (!p.firstElementChild) p.innerHTML = shell(siteHTML(p.dataset.site, true), motion && !!p.closest(".stage")); });
  $$(".phone[data-img]").forEach(p => (p.firstElementChild ? 0 : p.innerHTML = shell(`<img src="${p.dataset.img}" alt="Manti Pizzeria meniu telefone" width="400" height="866" loading="lazy" decoding="async">`)));

  /* Kortelės */
  const track = $("#track");
  const order = ["vamzdis", "zirkles", "ratas", "ramybe"];
  if (!$(".card.k-vamzdis", track)) track.insertAdjacentHTML("afterbegin", order.map((k, i) => {
    const b = BRANDS[k];
    return `<article class="card k-${k}">
      <span class="card-big" aria-hidden="true">${ic(b.icon)}</span>
      <div class="card-copy">
        <div class="card-top"><span>${b.trade} · ${b.town}</span><b>0${i + 1} / 05</b></div>
        <h3>${b.name}</h3>
        <p class="c-trade">${b.line}</p>
        <ul>${b.features.map(f => `<li>${ic("check")}${f}</li>`).join("")}</ul>
      </div>
      <div class="card-ph" role="img" aria-label="${b.name}: ${b.trade.toLowerCase()} svetainės pavyzdys telefone"><div class="phone" data-lazy-site="${k}"></div></div>
    </article>`;
  }).join(""));
  const trackWrap = $("#trackWrap");
  /* Pavyzdinės svetainės kortelėse sukuriamos tik prie jų priartėjus */
  const fillLazy = p => { if (p.getAttribute("data-filled")) return; p.setAttribute("data-filled", "1"); p.innerHTML = shell(siteHTML(p.getAttribute("data-lazy-site"))); };
  const lazyPhones = $$(".phone[data-lazy-site]");
  if ("IntersectionObserver" in window) {
    const lio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { fillLazy(e.target); lio.unobserve(e.target); } }), { rootMargin: "900px 900px" });
    lazyPhones.forEach(p => lio.observe(p));
  } else lazyPhones.forEach(fillLazy);
  const resetTrack = () => { trackWrap.scrollLeft = 0; };
  requestAnimationFrame(resetTrack);
  addEventListener("load", resetTrack);

  /* Istorijos telefonas */
  const storyPhone = $("#storyPhone");
  const sk = `<div class="q-sk"><i></i><i></i><i></i><i></i></div>`;
  if (!storyPhone.firstElementChild) storyPhone.innerHTML = shell(`
    <div class="q">
      <div class="q-status"><span>21:40</span><span class="s-sys">${ic("signal")}${ic("wifi")}${ic("battery-full")}</span></div>
      <div class="q-bar">${ic("search")}<span id="qText">santechnikas Šiauliai</span><span class="q-caret"></span></div>
      <div class="q-tabs"><span class="on">Visi</span><span>Žemėlapiai</span><span>Vaizdai</span><span>Naujienos</span></div>
      <div class="q-res">
        <div class="q-you" id="qYou"><div class="q-you-in" id="qYouIn"><span class="q-you-tag">Jūsų svetainė</span>
          <div class="q-site"><span class="q-fav">${ic("droplets")}</span><span>Vamzdis<small>jusu-svetaine.lt</small></span></div>
          <p class="q-title">Santechnikas Šiauliuose. Atvažiuojame tą pačią dieną</p>
          <div class="q-meta"><span>4,9</span>${stars()}<span>· Santechnikas</span><span class="open">· Atidaryta</span></div>
          <div class="q-btns"><span>${ic("phone")}Skambinti</span><span>${ic("navigation")}Maršrutas</span></div>
        </div></div>
        ${sk}${sk}${sk}
      </div>
    </div>
    <div class="scr-site" id="scrSite">${siteHTML("vamzdis", true)}</div>
    <span class="tap" id="tap"></span>
    <div class="call" id="scrCall"><small>Skambinama…</small><b>Vamzdis</b><small>Santechnikas, Šiauliai</small><div class="call-av">${ic("droplets")}</div>
      <div class="call-grid"><span>${ic("mic-off")}</span><span>${ic("grid-3x3")}</span><span>${ic("volume-2")}</span><span>${ic("user-plus")}</span><span>${ic("video")}</span><span>${ic("pause")}</span><span class="end">${ic("phone")}</span></div>
    </div>`);

  /* ---------- Palyginimas: Facebook ir svetainė ---------- */
  if (!$("#cmpA").firstElementChild) $("#cmpA").innerHTML = `<div class="fb">
    <div class="fb-top"><span class="fb-s">${ic("search")}Ieškoti</span><span class="fb-ic"><span>${ic("house")}</span><span>${ic("users")}</span><span>${ic("bell")}</span></span></div>
    <div class="fb-body">
      <div class="fb-prof"><div class="fb-cover"></div><div class="fb-av">JS</div>
        <div class="fb-prof-in"><p class="fb-name">Jonas Santechnikas</p><p class="fb-sub">214 sekėjų · Santechnikas</p>
          <div class="fb-btns"><span>Sekti</span><span>Žinutė</span></div>
          <div class="fb-info"><span>Šiauliai</span><span>Atsako per kelias dienas</span></div>
        </div>
      </div>
      <div class="fb-post">
        <div class="fb-ph"><span class="fb-av">JS</span><span><b>Jonas Santechnikas</b><small>prieš 3 savaites</small></span></div>
        <p class="fb-txt">Atlieku santechnikos darbus Šiauliuose ir rajone. Dėl kainos rašykit į žinutes.</p>
        <div class="fb-img">${ic("wrench")}</div>
        <div class="fb-react"><span>${"12 patinka"}</span><span>3 komentarai</span></div>
        <div class="fb-com">
          <div class="fb-c"><span class="fb-av">R</span><div><span><b>Rūta</b>Kiek kainuoja maišytuvo keitimas?</span><small>Patinka · Atsakyti · 2 sav.</small></div></div>
          <div class="fb-c"><span class="fb-av">T</span><div><span><b>Tomas</b>Ar dirbat savaitgaliais?</span><small>Patinka · Atsakyti · 2 sav.</small></div></div>
          <div class="fb-c"><span class="fb-av">A</span><div><span><b>Asta</b>Koks jūsų telefono numeris?</span><small>Patinka · Atsakyti · 1 sav.</small></div></div>
        </div>
      </div>
    </div>
    <span class="cmp-note bad" style="left:44%;top:30%">${ic("circle-x")}Kainų nėra</span>
    <span class="cmp-note bad" style="left:4%;top:62%">${ic("circle-x")}Telefono nėra</span>
    <span class="cmp-note bad" style="left:52%;top:84%">${ic("circle-x")}3 klausimai be atsakymo</span>
  </div>`;
  if (!$("#cmpB").firstElementChild) $("#cmpB").innerHTML = `<div class="ws">
    <div class="ws-nav"><span class="ws-logo"><span class="ws-mark">${ic("droplets")}</span>Vamzdis</span><span class="ws-links"><span>Paslaugos</span><span>Kainos</span><span>Atsiliepimai</span><span>Kontaktai</span></span><span class="ws-cta">${ic("phone")}Skambinti</span></div>
    <div class="ws-hero">${BRANDS.vamzdis.pat}
      <div><span class="ws-chip"><i></i>Dirbame dabar · iki 21:00</span><p class="ws-h">Prakiuro? Atvažiuojame tą pačią dieną.</p><p class="ws-lead">Santechnikos darbai Šiauliuose ir rajone. Kaina žinoma iš anksto, darbams suteikiame garantiją.</p>
        <div class="ws-acts"><span>${ic("phone")}Skambinti</span><span>Visos kainos</span></div></div>
      <div class="ws-price"><p>Kainos</p><div><span>Meistro iškvietimas</span><b>25 €</b></div><div><span>Maišytuvo keitimas</span><b>30 €</b></div><div><span>Kanalizacijos valymas</span><b>nuo 40 €</b></div><div><span>Boilerio montavimas</span><b>nuo 60 €</b></div></div>
    </div>
    <div class="ws-feats"><div><span>${ic("timer")}</span>Atvykstame per 2 val.</div><div><span>${ic("receipt")}</span>Kaina žinoma iš anksto</div><div><span>${ic("shield-check")}</span>Garantija darbams</div></div>
    <span class="cmp-note good" style="right:4%;top:15%">${ic("circle-check")}Kainos matomos iš karto</span>
    <span class="cmp-note good" style="left:26%;top:58%">${ic("circle-check")}Skambinti vienu paspaudimu</span>
    <span class="cmp-note good" style="right:6%;top:88%">${ic("circle-check")}Darbo laikas ir garantija</span>
  </div>`;

  /* ---------- Lietuvos žemėlapis ---------- */
  const M = window.LTMAP;
  const QUERIES = [["santechnikas", "Šiauliai"], ["kirpykla", "Panevėžys"], ["autoservisas", "Utena"], ["masažas", "Alytus"], ["elektrikas", "Telšiai"], ["kosmetologė", "Mažeikiai"], ["stogdengys", "Rokiškis"]];
  const qTowns = QUERIES.map(q => q[1]);
  const LABELED = ["Vilnius", "Kaunas", "Klaipėda"].concat(qTowns);
  let mapEls = null;
  if (M) {
    const svg = $("#ltSvg");
    if (!svg.firstElementChild) {
    svg.setAttribute("viewBox", `0 0 ${M.w} ${M.h}`);
    $("#ltBox").style.paddingBottom = (M.h / M.w * 100).toFixed(3) + "%";
    svg.innerHTML = `<defs><radialGradient id="ltNbG" cx="50%" cy="50%" r="62%"><stop offset="58%" stop-color="#fff"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="ltNbM" maskUnits="userSpaceOnUse" x="0" y="0" width="${M.w}" height="${M.h}"><rect width="${M.w}" height="${M.h}" fill="url(#ltNbG)"/></mask></defs><path class="lt-nb" mask="url(#ltNbM)" d="${M.nb}"/><path class="lt-land" d="${M.lt}"/><path class="lt-edge" id="ltEdge" d="${M.lt}"/>
      <g id="ltTowns">${M.towns.map(t => `<g class="lt-town" data-n="${t[0]}" transform="translate(${t[1]} ${t[2]})"><g class="lt-ring"><circle class="lt-ring-in" r="13"/></g><circle class="lt-dot" r="5.5"/>${LABELED.indexOf(t[0]) > -1 ? `<text x="12" y="7">${t[0]}</text>` : ""}</g>`).join("")}</g>`;
    $("#ltBubs").innerHTML = QUERIES.map(q => {
      const t = M.towns.filter(x => x[0] === q[1])[0];
      return `<div class="lt-bub" style="left:${(t[1] / M.w * 100).toFixed(2)}%;top:${(t[2] / M.h * 100).toFixed(2)}%"><i>${ic("search")}</i><span>${q[0]} <b>${q[1]}</b></span></div>`;
    }).join("");
    }
    mapEls = {
      edge: $("#ltEdge"), land: $(".lt-land", svg), nb: $(".lt-nb", svg),
      dots: $$(".lt-dot", svg), labels: $$(".lt-town text", svg), bubs: $$(".lt-bub"),
      town: n => $(`.lt-town[data-n="${n}"]`, svg)
    };
  }

  /* Bento detalės */
  if (!$("#vStars").firstElementChild) $("#vStars").innerHTML = [0, 1, 2, 3, 4].map(i => ic("star", "f").replace('class="ic f"', `class="ic f" style="--i:${i}"`)).join("");
  if (!$("#vMap .streets")) $("#vMap").insertAdjacentHTML("afterbegin", `<svg class="streets" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect x="236" y="20" width="120" height="78" rx="10" fill="#CFE0C4"/><rect x="30" y="170" width="90" height="64" rx="10" fill="#CFE0C4"/>
    <path d="M-20 214C80 176 150 250 250 206S380 150 440 166" stroke="#BFD3E6" stroke-width="26" fill="none"/>
    <g stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round"><path d="M-20 120H420"/><path d="M200 -20V280"/><path d="M330 -20L290 280"/></g>
    <g stroke="#fff" stroke-width="6" fill="none" opacity=".9"><path d="M-20 60H420"/><path d="M80 -20V280"/><path d="M-20 160H420"/><path d="M140 -20L120 280"/></g></svg>`);

  /* Ikonos */
  $$("i[data-ic]").forEach(el => (el.outerHTML = ic(el.dataset.ic)));
  /* Kūrimo metu puslapis surenkamas iš anksto ir įrašomas į HTML */
  if (location.search.indexOf("prerender") > -1) return;

  /* DUK */
  $$(".qa").forEach(qa => {
    const b = $(".qa-q", qa);
    b.addEventListener("click", () => {
      const open = !qa.classList.contains("open");
      qa.classList.toggle("open", open);
      b.setAttribute("aria-expanded", String(open));
      setTimeout(() => window.ScrollTrigger && ScrollTrigger.refresh(), 600);
    });
  });

  /* Kopijavimas */
  $("#copyBtn").addEventListener("click", () => {
    const out = $("#copied");
    const fail = () => (out.textContent = "Nepavyko nukopijuoti. Numeris: " + CONFIG.phoneDisplay);
    try { navigator.clipboard.writeText(CONFIG.phoneDisplay).then(() => (out.textContent = "Numeris nukopijuotas."), fail); }
    catch (e) { fail(); }
  });

  /* ---------- Palyginimo slankiklis ---------- */
  const cmpScr = $("#cmpScr"), cmpB = $("#cmpB"), cmpH = $("#cmpHandle"), lblA = $("#cmpLA"), lblB = $("#cmpLB");
  const cmpState = { p: 50 };
  let cmpTouched = false, cmpDrag = false, cmpHint = null;
  const setCmp = p => {
    p = Math.max(0, Math.min(100, p));
    cmpState.p = p;
    const c = `inset(0 0 0 ${p.toFixed(2)}%)`;
    cmpB.style.webkitClipPath = c; cmpB.style.clipPath = c;
    cmpH.style.left = p + "%";
    cmpH.setAttribute("aria-valuenow", Math.round(p));
    lblA.style.opacity = p > 18 ? 1 : 0;
    lblB.style.opacity = p < 82 ? 1 : 0;
  };
  setCmp(50);
  const cmpMove = e => { const r = cmpScr.getBoundingClientRect(); setCmp((e.clientX - r.left) / r.width * 100); };
  const cmpStop = () => { cmpTouched = true; if (cmpHint) { cmpHint.kill(); cmpHint = null; } };
  let cmpStart = null;
  const cmpBegin = e => { cmpStop(); cmpDrag = true; cmpStart = null; try { cmpScr.setPointerCapture(e.pointerId); } catch (x) {} cmpMove(e); };
  cmpScr.addEventListener("pointerdown", e => {
    const onKnob = !!(e.target && e.target.closest && e.target.closest(".cmp-handle"));
    if (e.pointerType === "mouse" || onKnob) { cmpBegin(e); return; }
    cmpStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  cmpScr.addEventListener("pointermove", e => {
    if (cmpDrag) { cmpMove(e); return; }
    if (!cmpStart || e.pointerId !== cmpStart.id) return;
    const dx = e.clientX - cmpStart.x, dy = e.clientY - cmpStart.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) cmpBegin(e);
    else if (Math.abs(dy) > 10) cmpStart = null;
  });
  cmpScr.addEventListener("pointerup", e => { if (cmpStart && !cmpDrag) { cmpStop(); cmpMove(e); } cmpDrag = false; cmpStart = null; });
  ["pointercancel", "lostpointercapture"].forEach(t => cmpScr.addEventListener(t, () => { cmpDrag = false; cmpStart = null; }));
  cmpH.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); cmpStop(); setCmp(cmpState.p + (e.key === "ArrowLeft" ? -5 : 5)); }
  });

  /* ---------- Skaičiuoklė ---------- */
  const cC = $("#cClients"), cP = $("#cPrice"), rYear = $("#rYear"), rDays = $("#rDays");
  const calcState = { year: 0, days: 0 };
  const fmtEur = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
  let calcBreak = false;
  const renderCalc = () => {
    rYear.textContent = (calcState.year < 0 ? "−" : "") + fmtEur(Math.abs(calcState.year));
    rYear.classList.toggle("long", rYear.textContent.length > 9);
    if (calcBreak) rDays.textContent = "neatsipirks";
    else { const d = Math.round(calcState.days); rDays.textContent = d > 90 ? Math.round(d / 30) + " mėn." : d + " d."; }
  };
  /* Netiesinė skalė: mažas reikšmes lengva nustatyti tiksliai, o galima pasiekti 100 klientų ir 1000 € */
  const K = 2.2;
  const fromPos = (pos, min, max) => min + (max - min) * Math.pow(pos / 1000, K);
  const toPos = (v, min, max) => Math.round(1000 * Math.pow((v - min) / (max - min), 1 / K));
  const snapPrice = v => (v < 100 ? Math.round(v / 5) * 5 : v < 300 ? Math.round(v / 10) * 10 : Math.round(v / 50) * 50);
  const getClients = () => Math.max(1, Math.min(100, Math.round(fromPos(+cC.value, 1, 100))));
  const getPrice = () => Math.max(10, Math.min(1000, snapPrice(fromPos(+cP.value, 10, 1000))));
  cC.value = toPos(3, 1, 100);
  cP.value = toPos(60, 10, 1000);
  const calc = anim => {
    const c = getClients(), p = getPrice();
    $("#oClients").textContent = c;
    $("#oPrice").textContent = p + "\u00a0€";
    cC.setAttribute("aria-valuetext", c + " klientų per mėnesį");
    cP.setAttribute("aria-valuetext", p + " eurų už darbą");
    [cC, cP].forEach(i => i.style.setProperty("--p", (i.value / 10) + "%"));
    const monthly = c * p;
    const net = monthly - 15;
    const year = net * 12;
    calcBreak = net <= 0;
    const days = calcBreak ? 0 : Math.max(1, Math.ceil(250 / (net / 30)));
    if (window.gsap && anim) gsap.to(calcState, { year: year, days: days, duration: 0.7, ease: "power3.out", onUpdate: renderCalc, overwrite: true });
    else { calcState.year = year; calcState.days = days; renderCalc(); }
  };
  [cC, cP].forEach(i => i.addEventListener("input", () => calc(true)));
  /* Safari ant iPad leidžia tempti tik pataikius ant rutuliuko; čia veikia bet kurioje juostos vietoje */
  [cC, cP].forEach(inp => {
    let active = false;
    const setX = e => {
      const r = inp.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (e.clientX - r.left - 15) / Math.max(1, r.width - 30)));
      const v = Math.round(t * 1000);
      if (+inp.value !== v) { inp.value = v; calc(true); }
    };
    inp.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      active = true;
      try { inp.setPointerCapture(e.pointerId); } catch (x) {}
      setX(e);
    });
    inp.addEventListener("pointermove", e => { if (active) setX(e); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(t => inp.addEventListener(t, () => (active = false)));
  });
  calc(false);

  /* Teksto pritaikymas pločiui */
  function fitText(el, wdth, target) {
    if (!el.querySelector(".fi")) el.innerHTML = `<span class="fi">${el.innerHTML}</span>`;
    const fi = el.querySelector(".fi");
    const prev = el.style.getPropertyValue("--w");
    el.style.fontSize = "100px";
    el.style.setProperty("--w", wdth);
    const w = fi.offsetWidth;
    const avail = target || el.clientWidth;
    if (w > 0) el.style.fontSize = Math.max(40, (100 * avail / w) * 0.985) + "px";
    if (prev) el.style.setProperty("--w", prev);
  }
  const ctaBig = $("#ctaBig"), footWord = $("#footWord");
  if (!$(".ch", footWord)) footWord.innerHTML = Array.prototype.map.call(footWord.textContent, c => `<span class="ch">${c}</span>`).join("");
  footWord.style.fontVariationSettings = '"wdth" var(--w, 125)';
  const fitAll = () => { fitText(ctaBig, 125); fitText(footWord, 125, footWord.clientWidth - 8); };

  /* Mygtukų šviesa */
  $$(".btn, .plan").forEach(el => el.addEventListener("pointermove", e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }));

  /* Meniu */
  const nav = $("#nav"), navProg = $("#navProg");
  let lastY = 0;
  const onScroll = () => {
    const y = window.pageYOffset;
    nav.classList.toggle("scrolled", y > 24);
    if (y > 500 && y > lastY + 4) nav.classList.add("hide");
    else if (y < lastY - 4 || y < 500) nav.classList.remove("hide");
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    navProg.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ===== Be animacijų (sumažintas judesys arba nepavyko įkelti bibliotekų) ===== */
  if (!motion) {
    html.classList.remove("is-pre");
    if (mapEls) { mapEls.dots.forEach(d => (d.style.fill = "#FF4F12")); mapEls.bubs.forEach((b, i) => { b.style.transform = "translate(-50%, calc(-100% - 14px))"; b.style.display = i >= QUERIES.length - 3 ? "" : "none"; }); }
    const go = () => { ctaBig.style.setProperty("--w", 125); fitAll(); };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(go);
    addEventListener("resize", go);
    return;
  }

  try {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: "visibilitychange,resize" });
  /* Pasirodymo animacijos per IntersectionObserver: jis nematuoja viso puslapio, todėl nestabdo naršyklės */
  const onView = (el, fn, bottom) => {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { fn(); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: "0px 0px -" + (bottom || 12) + "% 0px" });
    io.observe(el);
  };
  const reveal = (targets, vars, trigger, bottom) => {
    const t = gsap.utils.toArray(targets);
    if (!t.length) return;
    const tw = gsap.from(t, Object.assign({ paused: true }, vars));
    onView(typeof trigger === "string" ? $(trigger) : (trigger || t[0]), () => tw.play(), bottom);
  };
  html.classList.add("motion");
  const fine = mq("(pointer: fine)");

  /* Natūralus naršyklės slinkimas: be „plaukiojimo“, ratukas reaguoja iš karto */
  const lenis = null;
  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    const target = id === "#top" ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else if (target === 0) { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (x) { window.scrollTo(0, 0); } }
    else target.scrollIntoView({ behavior: "smooth" });
    if (target && target.hasAttribute && target.hasAttribute("tabindex")) { try { target.focus({ preventScroll: true }); } catch (x) {} }
  }));

  /* ---------- Hero ---------- */
  const title = $("#heroTitle");
  title.setAttribute("aria-label", "Meistrams, kuriuos verta rasti.");
  if (fine) $$(".wi", title).forEach(wi => { wi.setAttribute("aria-hidden", "true"); wi.innerHTML = Array.prototype.map.call(wi.textContent, c => `<span class="ch">${c}</span>`).join(""); });
  const chars = $$(".ch", title);
  /* Pirmojo ekrano animacija vyksta CSS, nuo pirmo kadro; čia tik pažymime jos pabaigą */
  let introDone = false;
  setTimeout(() => { introDone = true; cacheChars(); }, 1800);


  /* Raidžių tempimas (pelė arba pirštas) */
  let charPos = [];
  function cacheChars() {
    const tr = title.getBoundingClientRect();
    charPos = chars.map(c => { const r = c.getBoundingClientRect(); return { el: c, x: r.left - tr.left + r.width / 2, y: r.top - tr.top + r.height / 2, cur: 100 }; });
  }
  if (fine) {
    let mx = -1e4, my = -1e4, live = false;
    const hero = $(".hero");
    const pm = e => { if (e.pointerType !== "mouse") return; const tr = title.getBoundingClientRect(); mx = e.clientX - tr.left; my = e.clientY - tr.top; live = true; };
    hero.addEventListener("pointermove", pm);
    ["pointerleave", "pointerup", "pointercancel"].forEach(t => hero.addEventListener(t, () => { mx = my = -1e4; }));
    gsap.ticker.add(() => {
      if (!introDone || !live) return;
      let moving = false;
      for (let i = 0; i < charPos.length; i++) {
        const s = charPos[i];
        const d = Math.hypot(mx - s.x, (my - s.y) * 1.25);
        const k = Math.max(0, 1 - d / 210);
        const tgt = 100 + 15 * k * k * (3 - 2 * k);
        const prev = s.cur;
        s.cur += (tgt - s.cur) * 0.14;
        if (Math.abs(tgt - s.cur) < 0.04) s.cur = tgt;
        if (s.cur === prev) continue;
        moving = true;
        s.el.style.setProperty("--cw", s.cur.toFixed(2));
        s.el.style.setProperty("--cg", Math.round(800 + 100 * (s.cur - 100) / 15));
      }
      if (!moving) live = false;
    });
  }

  await tick();
  /* Telefonų plūduriavimas, paralaksas ir 3D */
  gsap.to(".stage .px", { y: (i, el) => -150 * parseFloat(el.parentElement.getAttribute("data-depth") || 1), ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  const stageIn = $("#stageIn");
  if (fine) {
    const rx = gsap.quickTo(stageIn, "rotationX", { duration: 1.2, ease: "power3.out" });
    const ry = gsap.quickTo(stageIn, "rotationY", { duration: 1.2, ease: "power3.out" });
    const tags = $$(".stage-tag.t2").map(t => ({ d: parseFloat(t.getAttribute("data-depth")), x: gsap.quickTo(t, "x", { duration: 1, ease: "power3.out" }), y: gsap.quickTo(t, "y", { duration: 1, ease: "power3.out" }) }));
    $(".hero").addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      ry(nx * 10); rx(-ny * 7);
      tags.forEach(t => { t.x(nx * 26 * t.d); t.y(ny * 18 * t.d); });
    });
  } else {
    gsap.fromTo(stageIn, { rotationY: -7, rotationX: 3 }, { rotationY: 7, rotationX: -3, duration: 6, yoyo: true, repeat: -1, ease: "sine.inOut" });
  }

  await tick();
  /* ---------- Antraštės ---------- */
  $$(".rv-h").forEach(h => {
    h.innerHTML = h.textContent.trim().split(/\s+/).map(w => `<span class="wd"><span class="wi">${w}</span></span>`).join(" ");
    reveal($$(".wi", h), { yPercent: 118, rotation: 4, duration: 1.3, ease: "expo.out", stagger: 0.07 }, h, 12);
  });

  await tick();
  /* ---------- Žemėlapis ---------- */
  if (mapEls) {
    const len = mapEls.edge.getTotalLength();
    gsap.set(mapEls.edge, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set(mapEls.bubs, { xPercent: -50, yPercent: -100, y: -14, transformOrigin: "50% 100%", opacity: 0, scale: 0.4 });
    gsap.set(mapEls.dots, { transformOrigin: "50% 50%" });
    const mapQ = $("#mapQ");
    let curQ = -1;
    const setQ = i => {
      if (i === curQ) return;
      curQ = i;
      const q = QUERIES[Math.max(0, i)];
      mapQ.textContent = q[0] + " " + q[1];
      gsap.fromTo(mapQ, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out", overwrite: true });
    };
    gsap.set([mapEls.nb, mapEls.land], { opacity: 0 });
    gsap.set(mapEls.dots, { scale: 0 });
    gsap.set(mapEls.labels, { opacity: 0 });
    const mIntro = gsap.timeline({ paused: true })
      .to(mapEls.edge, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut" }, 0)
      .to(mapEls.nb, { opacity: 1, duration: 0.8 }, 0.3)
      .to(mapEls.land, { opacity: 1, duration: 0.7 }, 0.9)
      .to(mapEls.dots, { scale: 1, duration: 0.4, stagger: { each: 0.018, from: "random" }, ease: "back.out(3)" }, 0.9)
      .to(mapEls.labels, { opacity: 1, duration: 0.4, stagger: 0.02 }, 1.3);
    const mLoop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.8 });
    QUERIES.forEach((q, i) => {
      const t0 = i * 1.15;
      const town = mapEls.town(q[1]);
      const dot = $(".lt-dot", town), ring = $(".lt-ring", town);
      mLoop.call(setQ, [i], t0)
        .to(mapEls.bubs[i], { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.2)" }, t0)
        .to(dot, { fill: "#FF4F12", scale: 1.6, duration: 0.25 }, t0)
        .to(ring, { opacity: 1, duration: 0.2 }, t0)
        .to(mapEls.bubs[i], { opacity: 0, scale: 0.7, duration: 0.3 }, t0 + 2.5);
    });
    setQ(0);
    let mapStarted = false;
    const mapIO = "IntersectionObserver" in window ? new IntersectionObserver(es => {
      const vis = es.some(e => e.isIntersecting);
      if (vis && !mapStarted) { mapStarted = true; mIntro.play(); mLoop.delay(1.9).play(); }
      else if (vis) mLoop.resume();
      else mLoop.pause();
    }, { threshold: 0.3 }) : null;
    if (mapIO) mapIO.observe($("#mapPin")); else { mIntro.progress(1); mLoop.play(); }
  }

  await tick();
  /* ---------- Istorija ---------- */
  const qText = $("#qText"), qYou = $("#qYou"), qYouIn = $("#qYouIn"), scrSite = $("#scrSite"), tap = $("#tap"), call = $("#scrCall");
  const sks = $$(".q-sk", storyPhone);
  const steps = $$("#steps .step"), dots = $$("#stepDots i");
  const query = "santechnikas Šiauliai";
  const typing = { n: 0 };
  qText.textContent = "";
  gsap.set(qYou, { height: 0, opacity: 0 });
  gsap.set(sks, { opacity: 0, y: 12 });

  function offsetIn(el, root) { let x = 0, y = 0; while (el && el !== root) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return { x: x, y: y }; }
  function placeTap() {
    const btn = $(".s-call", scrSite);
    const o = offsetIn(btn, scrSite);
    tap.style.left = (o.x + btn.offsetWidth * 0.55 - tap.offsetWidth / 2) + "px";
    tap.style.top = (o.y + btn.offsetHeight / 2 - tap.offsetHeight / 2) + "px";
  }
  let curStep = -1;
  const setStep = i => {
    if (i === curStep) return;
    curStep = i;
    steps.forEach((s, k) => s.classList.toggle("on", k === i));
    dots.forEach((d, k) => d.classList.toggle("on", k === i));
  };
  const stl = gsap.timeline({
    paused: true, repeat: -1, repeatDelay: 2.4, defaults: { ease: "power2.out" },
    onUpdate: () => { const t = stl.time(); setStep(t >= stl.labels.call ? 2 : t >= stl.labels.find - 0.2 ? 1 : 0); }
  });
  stl.to(typing, { n: query.length, duration: 2, ease: "none", onUpdate: () => (qText.textContent = query.slice(0, Math.round(typing.n))) })
    .to(sks, { opacity: 1, y: 0, duration: 0.8, stagger: 0.2 })
    .addLabel("find", "+=0.4")
    .to(qYou, { height: "auto", opacity: 1, duration: 1.2 }, "find")
    .fromTo(qYouIn, { scale: 0.88, y: 12 }, { scale: 1, y: 0, duration: 1.2, ease: "back.out(1.6)" }, "find")
    .to({}, { duration: 1.1 })
    .addLabel("call")
    .fromTo(scrSite, { xPercent: 100 }, { xPercent: 0, duration: 1.3, ease: "power3.inOut" }, "call")
    .fromTo(tap, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35 }, "+=0.35")
    .to(tap, { scale: 0.72, duration: 0.2 })
    .to($(".s-call", scrSite), { scale: 0.94, duration: 0.2 }, "<")
    .to(tap, { opacity: 0, scale: 1.9, duration: 0.45 })
    .to($(".s-call", scrSite), { scale: 1, duration: 0.2 }, "<")
    .fromTo(call, { yPercent: 100 }, { yPercent: 0, duration: 1.2, ease: "power3.out" }, "-=0.3")
    .from($$(".call > *", storyPhone), { y: 20, opacity: 0, stagger: 0.08, duration: 0.6 }, "-=0.6")
    .to({}, { duration: 0.9 });
  stl.fromTo(storyPhone, { rotationY: -16, rotationX: 6 }, { rotationY: 12, rotationX: -4, duration: stl.duration(), ease: "none" }, 0);
  setStep(0);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) stl.resume(); else stl.pause(); }, { threshold: 0.35 }).observe($("#storyPin"));
  } else stl.play();
  /* Paspaudus žingsnį, telefonas peršoka į tą vietą */
  const stepAt = [0, "find", "call"];
  steps.forEach((st, i) => {
    const h = $("h3", st);
    if (!$(".step-go", h)) h.innerHTML = `<button class="step-go" type="button">${h.textContent}</button>`;
    const go = () => { stl.seek(stepAt[i]); stl.resume(); setStep(i); };
    st.addEventListener("click", go);
  });

  await tick();
  /* ---------- Palyginimas: užuomina ---------- */
  onView($("#cmp"), () => {
      if (cmpTouched) return;
      cmpHint = gsap.timeline({ onUpdate: () => setCmp(cmpState.p) })
        .to(cmpState, { p: 14, duration: 1.2, ease: "power3.inOut" })
        .to(cmpState, { p: 86, duration: 1.6, ease: "power3.inOut" })
        .to(cmpState, { p: 50, duration: 1.1, ease: "power3.inOut" });
  }, 30);
  reveal("#cmp", { y: 80, rotationX: 10, transformPerspective: 1400, transformOrigin: "50% 0%", opacity: 0, duration: 1.4, ease: "expo.out" }, "#cmp", 12);
  reveal(".cmp-note", { scale: 0.5, opacity: 0, duration: 0.6, stagger: 0.12, ease: "back.out(2)" }, "#cmp", 45);

  await tick();
  /* ---------- Pavyzdžiai: karuselė be puslapio prisegimo ---------- */
  const mm = gsap.matchMedia();
  {
    const bar = $("#demosBar");
    const cards = $$(".card", track);
    const padL = () => parseFloat(getComputedStyle(trackWrap).paddingLeft) || 0;
    const upd = () => {
      const max = trackWrap.scrollWidth - trackWrap.clientWidth;
      bar.style.transform = `scaleX(${max > 0 ? Math.max(0.06, trackWrap.scrollLeft / max).toFixed(4) : 1})`;
      const atStart = trackWrap.scrollLeft < 8, atEnd = trackWrap.scrollLeft > max - 8;
      $("#dPrev").disabled = atStart; $("#dNext").disabled = atEnd;
    };
    trackWrap.addEventListener("scroll", upd, { passive: true });
    addEventListener("resize", upd);
    upd();
    const nearest = () => {
      const x = trackWrap.scrollLeft + padL();
      let best = 0, bd = 1e9;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - x); if (d < bd) { bd = d; best = i; } });
      return best;
    };
    const goTo = i => {
      i = Math.max(0, Math.min(cards.length - 1, i));
      const left = cards[i].offsetLeft - padL();
      try { trackWrap.scrollTo({ left: left, behavior: "smooth" }); } catch (x) { trackWrap.scrollLeft = left; }
    };
    $("#dPrev").addEventListener("click", () => goTo(nearest() - 1));
    $("#dNext").addEventListener("click", () => goTo(nearest() + 1));
    /* Pele galima tempti į šonus */
    let dragX = null, startL = 0, moved = false;
    trackWrap.addEventListener("dragstart", e => e.preventDefault());
    trackWrap.addEventListener("pointerdown", e => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragX = e.clientX; startL = trackWrap.scrollLeft; moved = false;
    });
    addEventListener("pointermove", e => {
      if (dragX === null) return;
      const dx = e.clientX - dragX;
      if (!moved && Math.abs(dx) > 5) { moved = true; trackWrap.classList.add("dragging"); }
      if (moved) trackWrap.scrollLeft = startL - dx;
    });
    addEventListener("pointerup", () => {
      if (dragX === null) return;
      dragX = null;
      if (moved) { const i = nearest(); trackWrap.classList.remove("dragging"); goTo(i); }
    });
    trackWrap.addEventListener("click", e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    reveal(cards.slice(0, 3), { x: 140, opacity: 0, duration: 1.3, ease: "expo.out", stagger: 0.1 }, trackWrap, 15);
  }

  await tick();
  /* ---------- Kas įeina ---------- */
  reveal("#bento .tile", { y: 100, rotationX: -18, transformPerspective: 1000, transformOrigin: "50% 0%", opacity: 0, duration: 1.3, ease: "expo.out", stagger: 0.09 }, "#bento", 18);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle("play", e.isIntersecting)), { threshold: 0 });
    $$("#bento .tile").forEach(t => io.observe(t));
  }

  await tick();
  /* ---------- Kainos ---------- */
  reveal("#plans .plan", { y: 80, opacity: 0, duration: 1.3, ease: "expo.out", stagger: 0.1 }, "#plans", 15);
  $$(".amt b").forEach(b => {
    const end = parseInt(b.textContent, 10);
    const o = { v: 0 };
    b.textContent = "0";
    onView($("#plans"), () => gsap.to(o, { v: end, duration: 1.8, ease: "power3.out", onUpdate: () => (b.textContent = Math.round(o.v)) }), 20);
  });
  reveal(".price-foot > div", { y: 20, opacity: 0, duration: 1, stagger: 0.08, ease: "expo.out" }, ".price-foot", 8);
  reveal("#calc", { y: 80, scale: 0.96, opacity: 0, duration: 1.3, ease: "expo.out" }, "#calc", 12);
  onView($("#calc"), () => { calcState.year = 0; calcState.days = 0; calc(true); }, 12);

  await tick();
  /* ---------- Eiga ---------- */
  const tlSteps = $$("#tl .tl-step");
  reveal(tlSteps, { y: 40, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.1 }, "#tl", 15);
  mm.add({ desk: "(min-width: 901px)", mob: "(max-width: 900px)" }, ctx => {
    const desk = ctx.conditions.desk;
    const tl = $("#tl");
    const marks = () => tlSteps.map(s => desk ? s.offsetLeft / tl.offsetWidth : s.offsetTop / tl.offsetHeight);
    let m = marks();
    const prop = desk ? "scaleX" : "scaleY";
    const from = {}; from[prop] = 0;
    const to = { ease: "none", scrollTrigger: {
      trigger: tl, start: desk ? "top 75%" : "top 70%", end: desk ? "top 30%" : "bottom 55%", scrub: 0.5,
      onRefresh: () => (m = marks()),
      onUpdate: s => tlSteps.forEach((stp, i) => stp.classList.toggle("on", s.progress >= m[i] - 0.001 && s.progress > 0.002))
    } };
    to[prop] = 1;
    gsap.fromTo("#tlLine", from, to);
  });

  await tick();
  /* ---------- DUK ---------- */
  reveal(".qa", { y: 24, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.06 }, "#qas", 15);

  await tick();
  /* ---------- Kontaktai ---------- */
  fitAll();
  gsap.fromTo(ctaBig, { "--w": 62 }, { "--w": 125, ease: "none", scrollTrigger: { trigger: ".cta", start: "top 92%", end: "top 15%", scrub: 0.6 } });
  reveal(".cta-grid > *", { y: 40, opacity: 0, duration: 1.2, stagger: 0.1, ease: "expo.out" }, ".cta-grid", 12);
  gsap.fromTo(footWord, { yPercent: 55 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".foot", start: "top bottom", end: "bottom bottom", scrub: 0.5 } });

  /* Apatinis žodis šviečia po pele ar pirštu */
  {
    const fch = $$(".ch", footWord);
    const foot = $(".foot");
    let fx = -1e4, fOn = false;
    const st2 = fch.map(() => ({ v: 0 }));
    const fm = e => { fx = e.clientX; fOn = true; };
    foot.addEventListener("pointermove", fm);
    foot.addEventListener("pointerdown", fm);
    ["pointerleave", "pointerup", "pointercancel"].forEach(t => foot.addEventListener(t, () => (fx = -1e4)));
    gsap.ticker.add(() => {
      if (!fOn) return;
      let moving = false;
      fch.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const k = Math.max(0, 1 - Math.abs(fx - (r.left + r.width / 2)) / (r.width * 1.4));
        st2[i].v += (k - st2[i].v) * 0.14;
        if (Math.abs(k - st2[i].v) > 0.01) moving = true;
        c.style.color = `rgba(255,79,18,${(st2[i].v * 0.95).toFixed(3)})`;
        c.style.transform = `translateY(${(-st2[i].v * 10).toFixed(2)}%)`;
      });
      if (!moving && fx < -1e3) fOn = false;
    });
  }

  /* ---------- Magnetiniai mygtukai ---------- */
  if (fine) $$(".mag").forEach(el => {
    const xT = gsap.quickTo(el, "x", { duration: 0.7, ease: "elastic.out(1, 0.5)" });
    const yT = gsap.quickTo(el, "y", { duration: 0.7, ease: "elastic.out(1, 0.5)" });
    el.addEventListener("pointermove", e => { if (e.pointerType !== "mouse") return; const r = el.getBoundingClientRect(); xT((e.clientX - r.left - r.width / 2) * 0.25); yT((e.clientY - r.top - r.height / 2) * 0.35); });
    el.addEventListener("pointerleave", () => { xT(0); yT(0); });
  });

  await tick();
  /* Tamsios sekcijos: meniu pasikeičia (kuriama po prisegamų sekcijų) */
  $$(".story, .cta").forEach(sec => ScrollTrigger.create({ trigger: sec, start: "top 38px", end: "bottom 38px", toggleClass: { targets: nav, className: "dark" } }));

  /* ---------- Atnaujinimas ---------- */
  ScrollTrigger.sort();
  const refreshAll = () => { fitAll(); placeTap(); if (introDone) cacheChars(); ScrollTrigger.sort(); ScrollTrigger.refresh(); };
  let rT;
  addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { fitAll(); placeTap(); if (introDone) cacheChars(); }, 150); });
  addEventListener("orientationchange", () => setTimeout(refreshAll, 400));
  await (document.fonts ? document.fonts.ready : Promise.resolve());
  await tick();
  refreshAll();

  } catch (err) {
    /* Jei senesnė naršyklė ko nors nepalaiko, perkrauname be animacijų */
    if (window.console) console.error(err);
    let saved = false;
    try { sessionStorage.setItem("m-safe", "1"); saved = sessionStorage.getItem("m-safe") === "1"; } catch (e) {}
    if (saved) location.reload();
    else { html.classList.remove("is-pre", "motion", "motion-desk"); }
  }
})();
