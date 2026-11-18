# Meistrui: svetainė meistrams

Atskira statinė svetainė, nesusijusi su picerijos programa.

- `src/` – išeities failai. Keisti reikia čia.
- `../public/meistrui/` – optimizuota versija, kurią rodo naršyklė. Ranka nekeisti, ji surenkama.

## Kaip pakeisti ir surinkti

1. Pakeiskite failus `src/` aplanke (kontaktai yra `src/js/main.js` viršuje, `CONFIG`).
2. Paleiskite `./build.sh`. Reikia `node`, `python3` ir Playwright su Chromium.
3. Patikrinkite `public/meistrui/index.html` naršyklėje.

Šriftai `src/fonts/` apkarpyti iki svetainėje naudojamų simbolių. Jei pridėsite naujų
raidžių ar simbolių (pvz., kitos kalbos), šriftus reikės apkarpyti iš naujo.

## Nuorodos peržiūra (Messenger, Viber, Facebook)

`og:image`, `twitter:image` ir struktūrizuotų duomenų (`application/ld+json`) `image` faile
`src/index.html` rodo pilną paveikslėlio adresą GitHub'e. Kai svetainė persikels į savo domeną,
pakeiskite visus tris į `https://jūsų-domenas.lt/img/og.jpg`.

## Darbas be interneto ir versijos

- `src/sw.js` leidžia svetainę atidaryti ir be ryšio, jei ji buvo aplankyta bent kartą (pvz., iš iPad
  pradžios ekrano). Puslapis visada pirma imamas iš interneto. Jei ryšio nėra arba jis lėtesnis nei 3,5 s,
  rodoma išsaugota kopija. Failų sąrašą ir versiją į `sw.js` įrašo `build.sh`.
- `js/app.js` ir `js/qr.js` įkeliami su versijos žyme (`?v=...`), apskaičiuota iš turinio. Todėl naršyklė
  niekada nesujungs naujo puslapio su senu, talpykloje likusiu JS.
