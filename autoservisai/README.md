# Autoservisų svetainės

Dvi naujos svetainės, kiekviena viename `index.html` faile (`public/autoservisai/`):

| Svetainė | Failas | Pranešimų kanalas (ntfy) |
|---|---|---|
| megamesta.lt | `public/autoservisai/megamesta/index.html` | `megamesta-2b041afb1892` |
| naujospadangosinternetu.lt | `public/autoservisai/naujospadangos/index.html` | `naujospadangos-2f0d59dcdef5` |

## Pranešimai į telefoną (2 minutės)

Kai klientas užsiregistruoja į servisą ar montavimą, arba palieka numerį, kad perskambintumėte,
telefonas iškart gauna pranešimą. Jame yra kliento vardas, automobilis, paslauga, laikas ir
mygtukas **„Skambinti“**. Padangų pirkimas vyksta dabartiniame naujospadangosinternetu.lt
krepšelyje: mygtukas „Pirkti“ įdeda pasirinktą padangą ir kiekį ten.

1. Įdiekite nemokamą programėlę **ntfy**: [App Store](https://apps.apple.com/app/ntfy/id1625396347) arba [Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy).
2. Spauskite **+** ir įrašykite kanalo pavadinimą iš lentelės aukščiau.
3. Atlikite bandomąją registraciją svetainėje: pranešimas ateis per kelias sekundes.

Kanalą galima užprenumeruoti keliuose telefonuose (pvz., administratoriaus ir meistro).
Kanalo pavadinimą saugokite kaip slaptažodį. Norėdami jį pakeisti, `index.html` faile
pakeiskite `NTFY_TOPIC` reikšmę.

Jei pranešimo išsiųsti nepavyksta (pvz., klientas be interneto), svetainė to nenuslepia:
klientas mato klaidą ir serviso telefono numerį, registracija neprarandama tyliai.

## Paskelbimas

Įkelkite aplanko turinį (`index.html`, `og.png`, `apple-touch-icon.png`) į bet kurį talpinimą.
Prieš paleidžiant tikrame domene:

1. Ištrinkite eilutę `<meta name="robots" content="noindex">` (ji neleidžia Google indeksuoti peržiūros adreso).
2. `og:image` nuorodoje pakeiskite peržiūros adresą į tikrą domeną.
3. NaujosPadangos svetainei reikia ir maršruto `src/app/api/autoservisai/padangos` (gyvos kainos).
   Be jo svetainė naudoja įrašytus duomenis.

## Padangų kainų atnaujinimas

`public/autoservisai/naujospadangos/index.html` turi dabartinės parduotuvės pasiūlymus populiariausiems
dydžiams (pigiausius ir aukščiausios klasės, visiems trims sezonams). Atnaujinti:

```
python3 autoservisai/naujospadangos/atnaujinti_padangas.py
```

Skriptas surenka kainas iš naujospadangosinternetu.lt ir įrašo jas į svetainės failą
(trunka apie pusvalandį). Ieškant dydžio, kurio nėra sąraše, klientui siūloma palikti
numerį. Parduotuvė gauna pranešimą ir paskambina su pasiūlymu.

## Žemėlapis

`map.jpg` sukurtas iš OpenStreetMap duomenų (`python3 autoservisai/zemelapis.py`). Pasikeitus adresams,
paleiskite skriptą iš naujo ir įrašykite atspausdintas taškų koordinates į `PINS` abiejuose `index.html`.
