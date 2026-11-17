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
