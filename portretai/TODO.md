# TODO(savininkas): viskas, ko negaliu nuspręsti ar patikrinti už tave

Atnaujinta 2026-11-11, 0 etapo pabaigoje.

## Stabdo 0 etapo pabaigą

| # | Ką padaryti | Kodėl |
|---|---|---|
| 1 | Įkelti 3 savo augintinių nuotraukas į `portretai/pavyzdziai/` | Be jų nėra ko rodyti žmonėms. Visi dabartiniai bandymai daryti su kodu pieštais paveikslėliais |
| 2 | Susikurti fal.ai paskyrą ir įsigyti kreditų (arba pasidaryti 3 portretus kitu įrankiu) | Be rakto generavimas neveikia; veikia tik `--paruostas-portretas` |
| 3 | Pirmą kartą paleisti generavimą su tikru raktu | `src/generate.js` parašytas pagal dokumentaciją, bet su tikru API nepaleistas |
| 4 | Pereiti `KOKYBE.md` su kiekvienu iš 3 portretų | Panašumą ir grožį gali įvertinti tik žmogus |
| 5 | Parodyti `apklausa.html` bent 10 žmonių, kurie nėra tavo draugai | Draugai sako „taip“ iš mandagumo |

## Stabdo 1 etapą (svetainę)

| # | Ką padaryti | Kodėl |
|---|---|---|
| 6 | Užregistruoti individualią veiklą (arba MB) | Be registruotos veiklos mokėjimo paslaugos neaktyvuos paskyros |
| 7 | Išsiųsti užklausą 3 spaustuvėms: formatai, popierius, failo reikalavimai, terminas, kaina už 1, 10, 50 vnt. | Nuo to priklauso kaina, Kalėdų terminas ir spaudos failo formatas. Užklausos tekstą parašysiu, kai pasakysi „toliau“ |
| 8 | Pasirinkti rėmelio tiekėją, sužinoti kainą, išmatuoti, kiek rėmelio kraštas uždengia atspaudo | `src/config.js`: `SAFE_MM` dabar 10 mm, spėjant, kad kraštas uždengia 5 mm |
| 9 | Pasirinkti pavadinimą ir patikrinti domeną domreg.lt | Darbinis pavadinimas „Snukutis“ (`src/config.js`: `BRAND`). Domeno patikrinti negalėjau: mano aplinka neprieina prie domreg.lt |
| 10 | Nuspręsti, ar trinam picerijos kodą, ar kuriam naują saugyklą | Naujos saugyklos iš šios sesijos sukurti negaliu. Jei picerijos svetainė veikia, jos kodo trynimas ją išjungs |

## Patikrinti prieš pirmą tikrą užsakymą

| # | Ką padaryti | Kur kode |
|---|---|---|
| 11 | Spaustuvės failo reikalavimai: RGB ar CMYK, ICC profilis, PDF ar TIFF, užlaidos | `src/pdf.js`, `src/config.js`: `BLEED_PX` |
| 12 | Perskaityti fal.ai ir modelio kūrėjo sąlygas dėl komercinio naudojimo | Paieška rodo žymą „Commercial use“, bet pačių sąlygų teksto neskaičiau |
| 13 | Patikrinti dabartinę kainą fal.ai puslapyje | Paieškos duomenimis apie 0,15 $ už 2K vaizdą ir 0,30 $ už 4K; šaltiniai tarpusavyje nesutampa |
| 14 | Įkelti tikrą „iPhone“ HEIC nuotrauką ir paleisti `tikrinti-nuotrauka` | Testas naudoja kompiuteriu sukurtą HEIC |
| 15 | Perkalibruoti nuotraukos patikros slenksčius su 20+ tikrų nuotraukų | `src/config.js`: `PHOTO` |
| 16 | Atspausdinti vieną bandomąjį plakatą ir pereiti `KOKYBE.md` 6 skyrių | Ekranas nerodo, kaip atrodys popieriuje |
| 17 | Nuspręsti galutinę kainą | Darbinė: A4 su rėmeliu 35 €, 30×40 su rėmeliu 45 €. Tikslinsiu skaičiuokle, kai bus spaustuvės ir rėmelio kainos |
| 18 | Patvirtinti formuluotę apie DI | Darbinė: „kuriama skaitmeniškai, su dirbtinio intelekto įrankiais, prieš spaudą kiekvieną peržiūriu pats“ |
