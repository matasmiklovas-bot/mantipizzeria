# Coldline

Darbo vieta šaltiems skambučiams: įmonių eilė, pokalbio vedlys, sandoriai ir komandos rezultatai. Prisijungimas su Google, visa komanda mato tuos pačius duomenis.

Tas pats puslapis veikia ir kaip Claude artefaktas (`artifact/index.html`). Web versijoje `scripts/embed.mjs` prideda nedidelį adapterį (`src/client/shim.js`), kuris duomenis saugo Postgres per `/api/db/*`.

## Paleidimas Vercel

1. **Vercel → Add New → Project →** pasirink šitą repozitoriją. **Root Directory: `zvalgas`**. Spausk Deploy (pirmas kartas gali nepavykti, nes dar nėra nustatymų, tai normalu).
2. Projekte **Storage → Create Database → Neon → Connect**. `DATABASE_URL` atsiras pats.
3. **Google prisijungimas:** [console.cloud.google.com](https://console.cloud.google.com) → *APIs & Services* → *OAuth consent screen* (External, užpildyk pavadinimą ir el. paštą, *Publish app*) → *Credentials* → *Create credentials* → *OAuth client ID* → *Web application*.
   *Authorized redirect URIs:* `https://TAVO-PROJEKTAS.vercel.app/api/auth/callback`
4. **Vercel → Settings → Environment Variables:**
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` iš 3 žingsnio
   - `AUTH_SECRET` – bet koks ilgas atsitiktinis tekstas (pvz. `openssl rand -base64 32`)
   - nebūtina: `ANTHROPIC_API_KEY` – įjungia „Ieškoti su AI“ (Kontaktai → Rasti naujų)
   - nebūtina: `OWNER_EMAIL` – savininkas; jei nenurodyta, savininkas yra pirmas prisijungęs
   - nebūtina: `ALLOWED_EMAILS` – kas gali prisijungti, pvz. `@imone.lt,jonas@gmail.com`; tuščia = bet kas su Google paskyra
5. **Deployments → … → Redeploy.** Atidaryk nuorodą, prisijunk su Google (pirmas tampa savininku).
6. **Kontaktai → Importuoti** ir įkelk kontaktų JSON (artefakte: Kontaktai → Kopija).

Jei kažko trūksta, prisijungimo puslapis parodo, kurio nustatymo.

## Teisės

- Visi prisijungę mato ir redaguoja bendrus kontaktus, skambučius ir sandorius.
- Trinti ir keisti kitų roles bei komisinius gali tik savininkas ir vadovai.

## Lokaliai

```bash
cd zvalgas
cp .env.example .env.local   # užpildyk
npm install
npm run dev                  # http://localhost:3000, Google redirect URI: http://localhost:3000/api/auth/callback
```
