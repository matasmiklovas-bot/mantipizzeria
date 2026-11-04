# Žvalgas

Komandos skambučių darbo vieta: AI randa Lietuvos įmones, kurioms reikia svetainės ar sistemos, o komanda joms skambina.

- **Skambinti** – eilė (nauji, perskambinti, neatsiliepę po 3 val.), didelis „Skambinti“ mygtukas, rezultatas vienu paspaudimu (klavišai 1–4), „Pagalvos“ su perskambinimo data, istorija ir komandos pastabos prie kiekvieno kontakto.
- **Kontaktai** – visas sąrašas, filtrai, statuso keitimas, rankinis pridėjimas, JSON importas, CSV eksportas.
- **Paieška** – Claude su `web_search` + `web_fetch` ieško įmonių pagal sritį, miestą, pajamas ir poreikį; rezultatai iš karto patenka į bendrą sąrašą (be dublikatų).
- **Statistika** – skambučiai šiandien / per 7 d. pagal žmogų, pasiekiamumas, 14 dienų grafikas.

Prisijungimas: vardas + bendras komandos slaptažodis (`APP_PASSWORD`). Duomenys – Postgres (Neon).

## Paleidimas Vercel (≈5 min.)

1. **Vercel → Add New → Project →** šita repozitorija. **Root Directory: `zvalgas`**. Deploy.
2. Projekte **Storage → Create Database → Neon → Connect**. `DATABASE_URL` atsiras pats.
3. **Settings → Environment Variables:** `APP_PASSWORD` (sugalvok) ir `ANTHROPIC_API_KEY` (console.anthropic.com, reikia papildyti kreditų). Tada **Deployments → Redeploy**.
4. Atidaryk svetainę, prisijunk, **Kontaktai → Importuoti** – įkelk `zvalgas-kontaktai.json`.

Lentelės susikuria pačios pirmo užklausimo metu.

## Lokaliai

```bash
cd zvalgas
cp .env.example .env.local   # DATABASE_URL=postgres://… APP_PASSWORD=… ANTHROPIC_API_KEY=…
npm install
npm run dev
```

## Ribos

- AI paieška trunka 1–4 min. (`maxDuration = 300`) ir naudoja API kreditus. AI gali suklysti – žiūrėk šaltinį.
- Pajamų duomenų AI dažnai negauna (rekvizitai.lt riboja automatinį skaitymą).
- Vienas bendras slaptažodis: vardą įrašo pats žmogus, todėl tai ne apsauga nuo savų, tik nuo pašalinių.
