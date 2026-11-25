/* Meistrui: svetainė atsidaro ir be interneto (pvz., rodant ją meistrui dirbtuvėse ar rūsyje, kur nėra ryšio).
   Puslapis: pirma internetas (naujausia versija); be ryšio arba jei ryšys labai lėtas, rodoma išsaugota kopija.
   Failai (JS su versijos žyme, šriftai, paveikslėliai): iš išsaugotų, o jei jų nėra, iš interneto.
   Versiją ir failų sąrašą įrašo build.sh. */
var CACHE = "meistrui-377b1875f7";
var FILES = ["./", "index.html", "manifest.webmanifest", "js/app.js?v=909ab1422f", "js/qr.js?v=3c1f372784", "fonts/archivo-normal-latin-ext.sub.woff2", "fonts/archivo-normal-latin.sub.woff2", "fonts/dm-serif-display-italic-latin-ext.sub.woff2", "fonts/dm-serif-display-italic-latin.sub.woff2", "fonts/dm-serif-display-normal-latin-ext.sub.woff2", "fonts/dm-serif-display-normal-latin.sub.woff2", "fonts/onest-normal-latin-ext.sub.woff2", "fonts/onest-normal-latin.sub.woff2", "img/icon-180.png", "img/icon-192.png", "img/icon-512-mask.png", "img/icon-512.png"];
var SLOW_MS = 3500;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("meistrui-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function saved() { return caches.match("index.html", { ignoreSearch: true }); }

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(new Promise(function (resolve) {
      var done = false;
      var finish = function (res) { if (!done && res) { done = true; resolve(res); } };
      var timer = setTimeout(function () { saved().then(finish); }, SLOW_MS);
      fetch(req).then(function (res) {
        clearTimeout(timer);
        if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put("index.html", copy); }); }
        finish(res);
      }).catch(function () {
        clearTimeout(timer);
        saved().then(function (hit) { finish(hit || Response.error()); });
      });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
