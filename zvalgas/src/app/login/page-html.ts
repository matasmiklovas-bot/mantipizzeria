const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const G = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

export function loginHtml({ error, missing, google }: { error: string; missing: string[]; google: boolean }) {
  const ready = !missing.length;
  return `<!DOCTYPE html>
<html lang="lt"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Coldline</title>
<meta name="theme-color" content="#0d1611"><meta name="robots" content="noindex">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap&subset=latin-ext" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
body{font-family:Geist,ui-sans-serif,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;
  background:radial-gradient(70% 60% at 85% 0%,rgba(34,197,94,.30),transparent 60%),radial-gradient(60% 50% at 0% 100%,rgba(34,197,94,.16),transparent 60%),linear-gradient(160deg,#0a110d,#122219)}
body::after{content:"";position:fixed;inset:0;background-image:radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px);background-size:22px 22px;mask-image:linear-gradient(180deg,#000,transparent 80%);pointer-events:none}
.wrap{position:relative;z-index:1;height:100dvh;display:grid;grid-template-columns:1fr;align-items:center;justify-items:center;padding:max(16px,env(safe-area-inset-top)) 18px max(16px,env(safe-area-inset-bottom))}
@media(min-width:980px){.wrap{grid-template-columns:1.05fr 1fr;padding:0 6vw;gap:5vw}}
.pitch{display:none}
@media(min-width:980px){.pitch{display:block;max-width:520px}}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px;letter-spacing:-.02em}
.brand img{width:34px;height:34px;border-radius:10px;box-shadow:0 6px 18px -6px rgba(34,197,94,.7)}
h1{margin-top:28px;font-size:clamp(40px,5.2vw,66px);line-height:1;letter-spacing:-.05em;font-weight:700}
h1 em{font-style:normal;background:linear-gradient(90deg,#86f5b1,#2fbf6b);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{margin-top:16px;font-size:16px;line-height:1.55;color:rgba(255,255,255,.7);max-width:440px}
.demo{margin-top:26px;border-radius:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(8px);padding:16px 18px;max-width:440px}
.demo small{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:#86f5b1;font-weight:600}
.demo p{margin-top:6px;font-size:16px;line-height:1.45}
.demo .row{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}
.demo .row b{border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);padding:6px 12px;font-size:12.5px;font-weight:500}
.stats{margin-top:26px;display:flex;gap:28px}
.stats div{font-size:12px;color:rgba(255,255,255,.55)}
.stats b{display:block;font-size:20px;color:#fff;letter-spacing:-.03em;font-weight:650}
.card{width:100%;max-width:400px;border-radius:24px;background:#fff;color:#0d0d0c;padding:26px 24px 22px;box-shadow:0 30px 80px -30px rgba(0,0,0,.7)}
@media(min-width:980px){.card{padding:34px 32px 28px}}
.card .brand{color:#0d0d0c;font-size:17px}
@media(min-width:980px){.card .brand{display:none}}
.card h2{margin-top:18px;font-size:26px;letter-spacing:-.035em;font-weight:700}
@media(min-width:980px){.card h2{margin-top:0}}
.card .sub{margin-top:6px;color:#6b6b64;font-size:14.5px}
.tabs{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;background:#f0f1ee;border-radius:12px;padding:3px}
.tabs button{height:38px;border:0;border-radius:9px;background:none;font:inherit;font-size:14px;font-weight:500;color:#6b6b64;cursor:pointer}
.tabs button[aria-pressed=true]{background:#fff;color:#0d0d0c;box-shadow:0 1px 2px rgba(0,0,0,.08),0 2px 8px -2px rgba(0,0,0,.1)}
form{margin-top:16px;display:grid;gap:12px}
label{display:grid;gap:6px;font-size:13px;color:#5f5f58;font-weight:500}
.inp{position:relative}
input{width:100%;height:50px;border:1px solid #dcdcd5;border-radius:13px;padding:0 14px;font:inherit;font-size:16px;color:#0d0d0c;background:#fafaf8;outline:none;transition:border-color .15s,background .15s,box-shadow .15s}
input:focus{border-color:#0e7a43;background:#fff;box-shadow:0 0 0 4px rgba(14,122,67,.12)}
.eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);height:38px;padding:0 10px;border:0;background:none;color:#6b6b64;font:inherit;font-size:13px;cursor:pointer;border-radius:9px}
.go{margin-top:4px;height:52px;border:0;border-radius:14px;font:inherit;font-size:16px;font-weight:600;color:#fff;cursor:pointer;
  background:linear-gradient(180deg,#22b061,#0e8a49);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 12px 26px -12px rgba(14,138,73,.8);transition:transform .08s,filter .15s}
.go:hover{filter:brightness(1.06)}.go:active{transform:scale(.98)}.go:disabled{opacity:.6;cursor:default}
.err{border-radius:12px;background:#fdecea;color:#8a2416;padding:10px 13px;font-size:13.5px}
.err:empty{display:none}
.or{display:flex;align-items:center;gap:10px;margin:14px 0 2px;color:#9a9a92;font-size:12px}
.or::before,.or::after{content:"";flex:1;height:1px;background:#e7e7e1}
.gbtn{margin-top:10px;display:flex;align-items:center;justify-content:center;gap:10px;height:48px;border-radius:13px;border:1px solid #dcdcd5;font-size:15px;font-weight:600;color:#0d0d0c;text-decoration:none;background:#fff}
.cfg{margin-top:14px;border-radius:12px;background:#fbf6e8;border:1px solid #eadfbf;color:#5a4a1d;padding:10px 13px;font-size:13px;line-height:1.5}
.fine{margin-top:14px;font-size:12px;color:#8a8a82;line-height:1.5}
@media(max-height:640px){.card{padding:18px 18px 16px}.card h2{margin-top:10px;font-size:22px}.tabs{margin-top:12px}form{gap:9px}input{height:46px}.go{height:48px}.fine{display:none}}
</style></head>
<body><main class="wrap">
<section class="pitch">
  <div class="brand"><img src="/icon.svg" alt="">Coldline</div>
  <h1>Skambink.<br>Susitark.<br><em>Parduok.</em></h1>
  <p class="lead">Įmonių eilė, pokalbio vedlys su atsakymais į prieštaravimus, sandoriai ir komandos rezultatai vienoje vietoje.</p>
  <div class="demo"><small>Tu sakai</small><p>Facebook gerai, jo nemeskit. Bet nauji žmonės ieško Google ir jūsų neranda.</p>
    <div class="row"><b>O kiek kainuos? →</b><b>Sutarėm laiką →</b><b>Pagalvosiu →</b></div></div>
  <div class="stats"><div><b>1 bakstelėjimas</b>rezultatas</div><div><b>26 žingsniai</b>pokalbio vedlys</div><div><b>Gyvai</b>visa komanda</div></div>
</section>
<section class="card">
  <div class="brand"><img src="/icon.svg" alt="">Coldline</div>
  <h2 id="t">Prisijunk</h2>
  <p class="sub" id="s">Įvesk savo vardą ir slaptažodį.</p>
  <div class="tabs" role="tablist"><button type="button" data-m="login" aria-pressed="true">Prisijungti</button><button type="button" data-m="register" aria-pressed="false">Sukurti paskyrą</button></div>
  <form id="f" novalidate>
    <div class="err" id="e" role="alert">${esc(error)}</div>
    <label>Vartotojo vardas<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required minlength="3" maxlength="32" placeholder="pvz. matas"></label>
    <label>Slaptažodis<span class="inp"><input name="password" type="password" autocomplete="current-password" required minlength="6" maxlength="200" placeholder="bent 6 simboliai"><button type="button" class="eye" id="eye">Rodyti</button></span></label>
    <button class="go" id="go" ${ready ? "" : "disabled"}>Prisijungti</button>
  </form>
  ${google ? `<div class="or">arba</div><a class="gbtn" href="/api/auth/google">${G}Tęsti su Google</a>` : ""}
  ${ready ? "" : `<div class="cfg">Serveryje trūksta: ${missing.map(esc).join(", ")}</div>`}
  <p class="fine">Paskyrą susikuria kiekvienas pats. Pirmas užsiregistravęs tampa savininku.</p>
</section>
</main>
<script>
(()=>{const f=document.getElementById("f"),e=document.getElementById("e"),go=document.getElementById("go"),pw=f.password;let mode="login";
const set=m=>{mode=m;document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.m===m)));
  document.getElementById("t").textContent=m==="login"?"Prisijunk":"Sukurk paskyrą";
  document.getElementById("s").textContent=m==="login"?"Įvesk savo vardą ir slaptažodį.":"Sugalvok vardą ir slaptažodį. Užtruks 5 sekundes.";
  go.textContent=m==="login"?"Prisijungti":"Sukurti ir prisijungti";pw.autocomplete=m==="login"?"current-password":"new-password";e.textContent=""};
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>set(b.dataset.m));
document.getElementById("eye").onclick=ev=>{const t=pw.type==="password";pw.type=t?"text":"password";ev.target.textContent=t?"Slėpti":"Rodyti"};
f.onsubmit=async ev=>{ev.preventDefault();e.textContent="";go.disabled=true;const old=go.textContent;go.textContent="Palauk…";
  try{const r=await fetch("/api/auth/password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:f.username.value,password:pw.value,mode})});
    const d=await r.json().catch(()=>({}));if(r.ok){location.replace("/");return}e.textContent=d.error||"Nepavyko. Bandyk dar kartą."}
  catch{e.textContent="Nėra ryšio. Bandyk dar kartą."}
  go.disabled=false;go.textContent=old};
f.username.focus();})();
</script>
</body></html>`;
}
