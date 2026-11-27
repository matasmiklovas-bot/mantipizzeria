const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const G = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

export function loginHtml({ error, missing }: { error: string; missing: string[] }) {
  const ready = !missing.length;
  return `<!DOCTYPE html>
<html lang="lt"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prisijungti · Coldline</title>
<meta name="theme-color" content="#0d1611"><meta name="robots" content="noindex">
<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap&subset=latin-ext" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font-family:Geist,ui-sans-serif,system-ui,sans-serif;background:#f4f5f2;color:#0d0d0c;-webkit-font-smoothing:antialiased}
.wrap{min-height:100dvh;display:grid;grid-template-columns:1fr}
@media(min-width:960px){.wrap{grid-template-columns:1.1fr 1fr}}
.art{position:relative;overflow:hidden;color:#fff;padding:28px 24px 36px;display:flex;flex-direction:column;
  background:radial-gradient(90% 70% at 100% 0%,rgba(34,197,94,.32),transparent 60%),radial-gradient(60% 60% at 0% 100%,rgba(34,197,94,.14),transparent 60%),linear-gradient(160deg,#0b130f,#13241a)}
@media(min-width:960px){.art{padding:40px 56px}}
.art::after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px);background-size:22px 22px;mask-image:linear-gradient(180deg,#000,transparent 75%);pointer-events:none}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px;letter-spacing:-.02em;position:relative;z-index:1}
.brand img{width:34px;height:34px;border-radius:10px;box-shadow:0 6px 18px -6px rgba(34,197,94,.7)}
h1{margin-top:44px;font-size:clamp(36px,6vw,62px);line-height:1.02;letter-spacing:-.045em;font-weight:700;position:relative;z-index:1}
h1 em{font-style:normal;background:linear-gradient(90deg,#7cf0a9,#2fbf6b);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{margin-top:16px;max-width:460px;font-size:16px;line-height:1.55;color:rgba(255,255,255,.72);position:relative;z-index:1}
.demo{margin-top:34px;max-width:440px;position:relative;z-index:1;display:none}
@media(min-width:960px){.demo{display:block}}
.card{border-radius:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(8px);padding:18px}
.card small{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7cf0a9;font-weight:600}
.card p{margin-top:8px;font-size:17px;line-height:1.45}
.bub{display:flex;justify-content:flex-end;margin-top:12px}
.bub span{background:#fff;color:#0d0d0c;border-radius:14px 14px 4px 14px;padding:7px 12px;font-size:13.5px;font-weight:500}
.row{margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.row b{display:block;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);padding:10px 12px;font-size:13px;font-weight:500}
.stats{margin-top:auto;padding-top:34px;display:flex;gap:28px;position:relative;z-index:1;flex-wrap:wrap}
.stats div{font-size:12.5px;color:rgba(255,255,255,.6)}
.stats b{display:block;font-size:22px;color:#fff;letter-spacing:-.03em;font-weight:650}
.side{display:grid;place-items:center;padding:32px 20px 48px}
.box{width:100%;max-width:400px}
.box h2{font-size:28px;letter-spacing:-.035em;font-weight:700}
.box p.sub{margin-top:8px;color:#5f5f58;font-size:15px;line-height:1.5}
.gbtn{margin-top:26px;display:flex;align-items:center;justify-content:center;gap:12px;width:100%;height:54px;border-radius:14px;border:1px solid #d9d9d3;background:#fff;font:inherit;font-size:16px;font-weight:600;color:#0d0d0c;text-decoration:none;
  box-shadow:0 1px 2px rgba(0,0,0,.05),0 10px 28px -16px rgba(0,0,0,.35);transition:transform .08s ease,box-shadow .15s ease,border-color .15s ease}
.gbtn:hover{border-color:#0e7a43;box-shadow:0 1px 2px rgba(0,0,0,.05),0 14px 32px -16px rgba(14,122,67,.55)}
.gbtn:active{transform:scale(.98)}
.gbtn[aria-disabled=true]{opacity:.45;pointer-events:none}
.err{margin-top:18px;border-radius:12px;background:#fdecea;color:#8a2416;padding:11px 14px;font-size:14px}
.cfg{margin-top:18px;border-radius:14px;border:1px solid #e5d9b8;background:#fbf6e8;padding:14px 16px;font-size:13.5px;line-height:1.55;color:#5a4a1d}
.cfg code{font-family:"Geist Mono",monospace;font-size:12.5px}
.cfg ul{margin:6px 0 0 18px}
.fine{margin-top:22px;font-size:12.5px;color:#7a7a72;line-height:1.5}
.feat{margin-top:28px;display:grid;gap:10px}
.feat div{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:#3f3f3a}
.feat i{flex-shrink:0;display:grid;place-items:center;width:22px;height:22px;border-radius:7px;background:#e3f3ea;color:#0e7a43;font-style:normal;font-size:12px;font-weight:700}
</style></head>
<body><div class="wrap">
<section class="art">
  <div class="brand"><img src="/icon.svg" alt="">Coldline</div>
  <h1>Skambink.<br>Susitark.<br><em>Parduok.</em></h1>
  <p class="lead">Darbo vieta šaltiems skambučiams: įmonių eilė, pokalbio vedlys su atsakymais į prieštaravimus, sandoriai ir komandos rezultatai vienoje vietoje.</p>
  <div class="demo"><div class="card"><small>Tu sakai</small><p>Facebook gerai, jo nemeskit. Bet nauji žmonės ieško Google ir jūsų neranda.</p>
    <div class="bub"><span>O kiek kainuos?</span></div>
    <div class="row"><b>Sutarėm laiką →</b><b>Atsiųskit kainą →</b></div></div></div>
  <div class="stats"><div><b>1 bakstelėjimas</b>rezultatas po skambučio</div><div><b>26 žingsniai</b>pokalbio vedlys</div><div><b>Gyvai</b>visa komanda mato tą patį</div></div>
</section>
<section class="side"><div class="box">
  <h2>Prisijunk</h2>
  <p class="sub">Su Google paskyra. Pirmą kartą prisijungus tave iškart įtrauks į komandą.</p>
  ${error ? `<div class="err">${esc(error)}</div>` : ""}
  <a class="gbtn" href="/api/auth/google" ${ready ? "" : 'aria-disabled="true"'}>${G}Tęsti su Google</a>
  ${ready ? "" : `<div class="cfg"><b>Serveris dar nesukonfigūruotas.</b> Vercel projekte trūksta:<ul>${missing.map((m) => `<li><code>${esc(m)}</code></li>`).join("")}</ul></div>`}
  <div class="feat">
    <div><i>✓</i>Skambinimo eilė su pajamomis ir „kodėl skambinti“</div>
    <div><i>✓</i>Pokalbio vedlys: spaudi, ką atsakė, matai, ką sakyti</div>
    <div><i>✓</i>Sandoriai, pelnas, komisiniai ir komandos lyderiai</div>
  </div>
  <p class="fine">Prisijungdamas gauni prieigą prie bendro komandos kontaktų sąrašo. Mes matome tik tavo vardą, el. paštą ir nuotrauką iš Google.</p>
</div></section>
</div></body></html>`;
}
