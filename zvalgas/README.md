# Žvalgas

Vidinis įrankis: AI randa Lietuvos verslus, kuriems reikia svetainės ar sistemos, o tu žymi skambučių eigą.

- **Paieška**: sritis, miestas, metinės pajamos (pagal rekvizitai.lt intervalus), ko trūksta, kiekis.
  Serveris kviečia Claude su `web_search` + `web_fetch`, progresas rodomas gyvai.
- **Statusai**: Neskambinta · Neatsiliepė · Nenori · Pagalvos · Nori. Atidarius statusą veikia klavišai 1–5.
- **Pastabos**, filtrai, rankinis pridėjimas, dublikatų atmetimas (pagal įmonės kodą, telefoną, pavadinimą).
- **CSV eksportas** (Excel) ir JSON atsarginė kopija / įkėlimas.

## Paleidimas

```bash
cd zvalgas
cp .env.example .env.local   # įrašyk ANTHROPIC_API_KEY ir APP_PASSWORD
npm install
npm run dev
```

## Diegimas į Vercel

Naujas Vercel projektas iš šios repozitorijos, **Root Directory = `zvalgas`**.
Environment Variables: `ANTHROPIC_API_KEY`, `APP_PASSWORD`.
Paieška trunka 1–4 min., todėl `/api/search` turi `maxDuration = 300`. Patikrink, ar tavo Vercel planas leidžia tokią trukmę.

## Žinomi apribojimai

- Kontaktai saugomi **tik naršyklės localStorage**. Kitame įrenginyje sąrašas bus tuščias. Naudok atsarginę kopiją.
- AI gali suklysti (pasenęs telefonas, netiksliai įvertinta svetainė). Prieš skambindamas pažiūrėk šaltinį.
- Kiekviena paieška naudoja Anthropic API kreditus (web paieškos + modelio tokenai).
