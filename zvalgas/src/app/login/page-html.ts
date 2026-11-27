const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const G = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

const LOGO = (k: string) => `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2ed47c"/><stop offset="1" stop-color="#0b7a40"/></linearGradient><linearGradient id="ls${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#lg${k})"/><rect width="64" height="64" rx="15" fill="url(#ls${k})"/><g fill="#fff"><rect x="13" y="26" width="6" height="12" rx="3"/><rect x="23" y="17" width="6" height="30" rx="3"/><rect x="33" y="11" width="6" height="42" rx="3"/><rect x="43" y="21" width="6" height="22" rx="3"/></g></svg>`;

export function loginHtml({ error, missing, google }: { error: string; missing: string[]; google: boolean }) {
  const ready = !missing.length;
  return `<!DOCTYPE html>
<html lang="lt"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>Coldai</title>
<meta name="theme-color" content="#f6f5f1"><meta name="robots" content="noindex">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@500&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap&subset=latin-ext" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html{height:100%;overflow:hidden;overscroll-behavior:none;background:#f6f5f1;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent}
body{position:fixed;inset:0;overflow:hidden;overscroll-behavior:none;font-family:Geist,ui-sans-serif,system-ui,sans-serif;color:#1b1a17;-webkit-font-smoothing:antialiased;background:#f6f5f1}
.bg{position:fixed;inset:-20%;pointer-events:none;
  background:radial-gradient(36% 40% at 80% 20%,rgba(46,180,110,.10),transparent 70%),radial-gradient(34% 40% at 15% 90%,rgba(46,180,110,.07),transparent 70%);
  animation:drift 22s ease-in-out infinite alternate}
@keyframes drift{to{transform:translate3d(-3%,2%,0) scale(1.06)}}
.grid{position:fixed;inset:0;pointer-events:none;background-image:radial-gradient(rgba(27,26,23,.07) 1px,transparent 1px);background-size:24px 24px;mask-image:radial-gradient(70% 70% at 50% 40%,#000,transparent)}
.wrap{position:fixed;left:0;right:0;top:0;height:var(--vh,100dvh);transform:translate3d(0,var(--vy,0px),0);z-index:1;
  display:grid;grid-template-columns:1fr;align-items:center;justify-items:center;
  padding:max(16px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left))}
@media(min-width:980px){.wrap{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);padding-inline:max(5vw,env(safe-area-inset-left));gap:4.5vw}}

/* left */
.pitch{display:none;width:100%;max-width:540px}
@media(min-width:980px){.pitch{display:block;justify-self:end}}
.brand{display:flex;align-items:center;gap:10px;font-family:Newsreader,Georgia,serif;font-weight:500;font-size:22px;letter-spacing:-.02em}
.brand svg{width:32px;height:32px}
h1{margin-top:min(5vh,40px);font-family:Newsreader,Georgia,serif;font-size:clamp(44px,min(5.6vw,8vh),78px);line-height:.98;letter-spacing:-.03em;font-weight:500}
h1 em{font-style:italic;color:#127a45}
.lead{margin-top:min(2.4vh,18px);font-size:16.5px;line-height:1.55;color:#5a5852;max-width:460px;letter-spacing:-.005em}
.lead b{color:#1b1a17;font-weight:600}

/* live call */
.live{position:relative;margin-top:min(3.6vh,30px);max-width:460px;border-radius:22px;padding:1px;
  background:linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.03) 40%,rgba(46,212,124,.2));
  box-shadow:0 30px 60px -28px rgba(27,26,23,.55),0 2px 6px rgba(27,26,23,.12)}
.live>div{border-radius:21px;color:#fff;background:linear-gradient(180deg,#1a2a20,#0f1812);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);overflow:hidden}
.lh{display:flex;align-items:center;gap:12px;padding:14px 16px 12px}
.av{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-weight:650;font-size:14px;letter-spacing:-.02em;color:#0b2a19;background:linear-gradient(160deg,#c9f7dc,#6fe0a1);flex-shrink:0;transition:opacity .3s}
.co{flex:1;min-width:0}
.co b{display:block;font-size:15px;font-weight:600;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.co span{display:block;font-size:12.5px;color:rgba(255,255,255,.5);margin-top:1px}
.tm{display:flex;align-items:center;gap:7px;height:28px;padding:0 10px 0 9px;border-radius:99px;background:rgba(46,212,124,.12);color:#8ff0b8;font:500 12.5px "Geist Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}
.tm i{width:7px;height:7px;border-radius:50%;background:#3ddc84;box-shadow:0 0 0 0 rgba(61,220,132,.6);animation:ping 1.6s infinite}
@keyframes ping{70%{box-shadow:0 0 0 7px rgba(61,220,132,0)}100%{box-shadow:0 0 0 0 rgba(61,220,132,0)}}
.wave{display:flex;align-items:center;gap:2px;height:14px}
.wave s{display:block;width:2px;height:100%;border-radius:2px;background:currentColor;transform:scaleY(.3);transform-origin:center;animation:wv 1s ease-in-out infinite}
.wave s:nth-child(2){animation-delay:-.2s}.wave s:nth-child(3){animation-delay:-.5s}.wave s:nth-child(4){animation-delay:-.7s}
@keyframes wv{50%{transform:scaleY(1)}}
.lb{position:relative;border-top:1px solid rgba(255,255,255,.07);padding:14px 16px 16px;height:212px}
.who{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;color:rgba(255,255,255,.4)}
.who.me{color:#6fe0a1}
.them{margin-top:6px;display:inline-block;max-width:88%;padding:8px 12px;border-radius:14px 14px 14px 4px;background:rgba(255,255,255,.08);font-size:14px;line-height:1.4}
.say{margin-top:12px}
.say p{margin-top:5px;font-size:15px;line-height:1.45;min-height:3em;color:rgba(255,255,255,.95);letter-spacing:-.008em}
.say p::after{content:"";display:inline-block;width:2px;height:1em;margin-left:2px;vertical-align:-2px;background:#6fe0a1;animation:blink 1s steps(1) infinite}
.say p.done::after{display:none}
@keyframes blink{50%{opacity:0}}
.chips{position:absolute;left:16px;right:16px;bottom:16px;display:flex;gap:7px;flex-wrap:wrap}
.chips b{height:30px;display:inline-flex;align-items:center;padding:0 12px;border-radius:99px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);font-size:12.5px;font-weight:500;color:rgba(255,255,255,.82);opacity:0;transform:translateY(6px);transition:opacity .35s,transform .35s cubic-bezier(.2,.8,.2,1),background .2s,border-color .2s,color .2s}
.chips.on b{opacity:1;transform:none}
.chips.on b:nth-child(2){transition-delay:.06s}.chips.on b:nth-child(3){transition-delay:.12s}
.chips b.hit{background:#2ed47c;border-color:#2ed47c;color:#05210f;transform:scale(.96)}
.res{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;text-align:center;gap:6px;background:rgba(12,20,15,.96);opacity:0;pointer-events:none;transition:opacity .4s}
.res.on{opacity:1}
.res .ok{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#2ed47c;color:#05210f;transform:scale(.6);transition:transform .5s cubic-bezier(.3,1.6,.5,1)}
.res.on .ok{transform:none}
.res b{margin-top:6px;font-size:18px;letter-spacing:-.025em;font-weight:650}
.res span{font-size:13px;color:rgba(255,255,255,.55)}
.lf{display:flex;align-items:center;gap:10px;border-top:1px solid rgba(255,255,255,.07);padding:10px 16px;font-size:12.5px;color:rgba(255,255,255,.5)}
.lf .bar{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.lf .bar i{display:block;height:100%;width:0;border-radius:3px;background:linear-gradient(90deg,#17a35a,#3ddc84);transition:width .6s cubic-bezier(.2,.8,.2,1)}
.lf em{font-style:normal;color:#8ff0b8;font-variant-numeric:tabular-nums}

/* card */
.side{width:100%;max-width:404px;display:flex;flex-direction:column;align-items:center;max-height:100%}
@media(min-width:980px){.side{justify-self:start}}
.mtop{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:22px}
.mtop svg{width:52px;height:52px;filter:drop-shadow(0 8px 18px rgba(18,122,69,.25))}
.mtop b{margin-top:12px;font-family:Newsreader,Georgia,serif;font-size:28px;letter-spacing:-.02em;font-weight:500}
.mtop span{margin-top:4px;font-size:14px;color:#88857c}
@media(min-width:980px){.mtop{display:none}}
@media(max-height:720px){.mtop{display:none}}
.card{width:100%;min-height:0;border-radius:26px;background:#fff;color:#0d0d0c;padding:28px 26px 22px;overflow:auto;
  border:1px solid #e5e2da;box-shadow:0 1px 2px rgba(27,26,23,.05),0 24px 60px -28px rgba(27,26,23,.25)}
@media(min-width:980px){.card{padding:36px 34px 28px}}
.card h2{font-family:Newsreader,Georgia,serif;font-size:32px;letter-spacing:-.02em;font-weight:500;line-height:1.1}
.card .sub{margin-top:6px;color:#6e6e67;font-size:14.5px;line-height:1.45}
.tabs{position:relative;margin-top:20px;display:grid;grid-template-columns:1fr 1fr;background:#efede7;border-radius:12px;padding:3px}
.tabs::before{content:"";position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:9px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08),0 3px 10px -3px rgba(0,0,0,.12);transition:transform .32s cubic-bezier(.3,.8,.2,1)}
.tabs[data-m=register]::before{transform:translateX(100%)}
.tabs button{position:relative;height:36px;border:0;border-radius:9px;background:none;font:inherit;font-size:14px;font-weight:500;color:#77776f;cursor:pointer;transition:color .2s}
.tabs button[aria-pressed=true]{color:#0d0d0c}
form{margin-top:18px;display:grid;gap:14px}
label{display:grid;gap:7px;font-size:13px;color:#55554e;font-weight:500}
.inp{position:relative}
input{width:100%;height:50px;border:1px solid #e0e0d9;border-radius:13px;padding:0 14px;font:inherit;font-size:16px;color:#0d0d0c;background:#f8f8f6;outline:none;transition:border-color .15s,background .15s,box-shadow .15s;-webkit-appearance:none;appearance:none}
input::placeholder{color:#a3a39b}
input:focus{border-color:#127a45;background:#fff;box-shadow:0 0 0 3px rgba(18,122,69,.14)}
.inp input{padding-right:78px}
.eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);height:38px;padding:0 10px;border:0;background:none;color:#6e6e67;font:inherit;font-size:13px;font-weight:500;cursor:pointer;border-radius:9px}
.eye:hover{background:#f0f0ec}
.go{position:relative;margin-top:4px;height:52px;border:0;border-radius:14px;font:inherit;font-size:16px;font-weight:600;letter-spacing:-.01em;color:#fff;cursor:pointer;
  background:#127a45;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 8px 20px -12px rgba(18,122,69,.8);transition:transform .1s,filter .15s}
.go:hover{filter:brightness(1.06)}.go:active{transform:scale(.985)}.go:disabled{opacity:.65;cursor:default}
.go.busy{color:transparent}
.go.busy::after{content:"";position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.err{border-radius:12px;background:#fdeeeb;color:#8a2416;padding:10px 13px;font-size:13.5px;line-height:1.4}
.err:empty{display:none}
.shake{animation:shake .4s}
@keyframes shake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
.or{display:flex;align-items:center;gap:10px;margin:16px 0 2px;color:#9a9a92;font-size:12px}
.or::before,.or::after{content:"";flex:1;height:1px;background:#ebebe6}
.gbtn{margin-top:10px;display:flex;align-items:center;justify-content:center;gap:10px;height:48px;border-radius:13px;border:1px solid #e0e0d9;font-size:15px;font-weight:600;color:#0d0d0c;text-decoration:none;background:#fff;transition:background .15s}
.gbtn:hover{background:#f8f8f6}
.cfg{margin-top:14px;border-radius:12px;background:#fbf6e8;border:1px solid #eadfbf;color:#5a4a1d;padding:10px 13px;font-size:13px;line-height:1.5}
.fine{margin-top:16px;font-size:12px;color:#8e8e86;line-height:1.5;text-align:center}

/* entrance */
.rise{animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
.d1{animation-delay:.06s}.d2{animation-delay:.12s}.d3{animation-delay:.2s}.d4{animation-delay:.28s}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

/* short screens */
@media(max-height:760px){.lead{display:none}}
@media(max-height:600px){.live{display:none}}
@media(max-height:680px){.card{padding:22px 22px 18px}.card h2{font-size:23px}.tabs{margin-top:14px}form{margin-top:14px;gap:10px}input{height:46px}.go{height:48px}.fine{display:none}}

/* keyboard open (touch): form only, fitted to what is visible */
.kb .wrap{grid-template-columns:1fr;padding-top:12px;padding-bottom:12px}
.kb .pitch,.kb .mtop,.kb .card h2,.kb .card .sub,.kb .fine,.kb .or,.kb .gbtn,.kb .cfg{display:none}
.kb .side{justify-self:center}
.kb .card{padding:18px 20px 18px}
.kb .tabs{margin-top:0}

@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
</style></head>
<body><div class="bg"></div><div class="grid"></div>
<main class="wrap">
<section class="pitch" aria-hidden="true">
  <div class="brand rise">${LOGO("a")}Coldai</div>
  <h1 class="rise d1">Skambink.<br>Susitark.<br><em>Parduok.</em></h1>
  <p class="lead rise d2">Tu kalbi, Coldai <b>pakužda kitą sakinį</b>. Atsakymai į prieštaravimus, įmonių eilė ir komandos rezultatai vienoje vietoje.</p>
  <div class="live rise d3"><div>
    <div class="lh"><span class="av" id="av">KV</span><span class="co"><b id="co">Kirpykla „Vilma“</b><span id="ci">Grožio salonas · Kaunas</span></span>
      <span class="tm"><span class="wave"><s></s><s></s><s></s><s></s></span><span id="tm">00:00</span></span></div>
    <div class="lb">
      <div class="who">Klientas</div><div class="them" id="them">…</div>
      <div class="say"><div class="who me">Tu sakai</div><p id="say"></p></div>
      <div class="chips" id="chips"></div>
      <div class="res" id="res"><span class="ok"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><b>Susitikimas sutartas</b><span id="when">Ketvirtadienis, 14:00</span></div>
    </div>
    <div class="lf"><span>Šiandien komandoje</span><span class="bar"><i id="bar"></i></span><em id="cnt">3 / 8</em></div>
  </div></div>
</section>
<section class="side">
  <div class="mtop rise">${LOGO("b")}<b>Coldai</b><span>Skambink. Susitark. Parduok.</span></div>
  <div class="card rise d2" id="card">
    <h2 id="t">Sveikas sugrįžęs</h2>
    <p class="sub" id="s">Prisijunk ir tęsk ten, kur baigei.</p>
    <div class="tabs" role="tablist" data-m="login"><button type="button" data-m="login" aria-pressed="true">Prisijungti</button><button type="button" data-m="register" aria-pressed="false">Sukurti paskyrą</button></div>
    <form id="f" novalidate>
      <div class="err" id="e" role="alert">${esc(error)}</div>
      <label>Vartotojo vardas<input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required minlength="3" maxlength="32" placeholder="pvz. matas"></label>
      <label>Slaptažodis<span class="inp"><input name="password" type="password" autocomplete="current-password" required minlength="6" maxlength="200" placeholder="bent 6 simboliai"><button type="button" class="eye" id="eye">Rodyti</button></span></label>
      <button class="go" id="go" ${ready ? "" : "disabled"}>Prisijungti</button>
    </form>
    ${google ? `<div class="or">arba</div><a class="gbtn" href="/api/auth/google">${G}Tęsti su Google</a>` : ""}
    ${ready ? "" : `<div class="cfg">Serveryje trūksta: ${missing.map(esc).join(", ")}</div>`}
    <p class="fine">Paskyrą susikuria kiekvienas pats. Pirmas užsiregistravęs tampa savininku.</p>
  </div>
</section>
</main>
<script>
(()=>{
const $=id=>document.getElementById(id),root=document.documentElement;
/* keep the page pinned to what is actually visible (iOS keyboard pans the page otherwise) */
const vv=window.visualViewport;let base=vv?vv.height:innerHeight;
const typing=()=>document.activeElement&&document.activeElement.tagName==="INPUT";
const fit=()=>{if(!vv||vv.scale>1.01)return;const h=vv.height;base=typing()?Math.max(base,h):h;
  root.style.setProperty("--vh",h+"px");root.style.setProperty("--vy",vv.offsetTop+"px");
  root.classList.toggle("kb",typing()&&base-h>160);if(scrollX||scrollY)scrollTo(0,0)};
if(vv){vv.addEventListener("resize",fit);vv.addEventListener("scroll",fit)}
addEventListener("focusin",()=>setTimeout(fit,60));addEventListener("focusout",()=>setTimeout(fit,60));
addEventListener("orientationchange",()=>setTimeout(()=>{base=0;fit()},300));fit();

/* form */
const f=$("f"),e=$("e"),go=$("go"),pw=f.password,tabs=document.querySelector(".tabs");let mode="login";
const T={login:["Sveikas sugrįžęs","Prisijunk ir tęsk ten, kur baigei.","Prisijungti","current-password"],
  register:["Sukurk paskyrą","Sugalvok vardą ir slaptažodį. Užtruks 5 sekundes.","Sukurti ir prisijungti","new-password"]};
const set=m=>{mode=m;tabs.dataset.m=m;tabs.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.m===m)));
  const t=T[m];$("t").textContent=t[0];$("s").textContent=t[1];go.textContent=t[2];pw.autocomplete=t[3];e.textContent=""};
tabs.querySelectorAll("button").forEach(b=>b.onclick=()=>set(b.dataset.m));
$("eye").onclick=ev=>{const t=pw.type==="password";pw.type=t?"text":"password";ev.currentTarget.textContent=t?"Slėpti":"Rodyti"};
const fail=msg=>{e.textContent=msg;const c=$("card");c.classList.remove("shake");void c.offsetWidth;c.classList.add("shake")};
f.onsubmit=async ev=>{ev.preventDefault();e.textContent="";
  if(f.username.value.trim().length<3){fail("Vardas turi būti bent 3 simbolių.");f.username.focus();return}
  if(pw.value.length<6){fail("Slaptažodis turi būti bent 6 simbolių.");pw.focus();return}
  go.disabled=true;go.classList.add("busy");
  try{const r=await fetch("/api/auth/password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:f.username.value,password:pw.value,mode})});
    const d=await r.json().catch(()=>({}));if(r.ok){location.replace("/");return}fail(d.error||"Nepavyko. Bandyk dar kartą.")}
  catch{fail("Nėra ryšio. Bandyk dar kartą.")}
  go.disabled=false;go.classList.remove("busy")};
if(matchMedia("(pointer:fine)").matches)f.username.focus();

/* live call demo */
if(!matchMedia("(min-width:980px)").matches)return;
const still=matchMedia("(prefers-reduced-motion:reduce)").matches;
const CALLS=[
  {av:"KV",co:"Kirpykla „Vilma“",ci:"Grožio salonas · Kaunas",when:"Ketvirtadienis, 14:00",steps:[
    ["Klientų gaunam per Facebook, pažįstamus.","Facebook gerai, jo nemeskit. Bet nauji žmonės ieško Google „kirpykla Kaunas“ ir jūsų neranda.",["Na, gal ir taip","O kiek kainuos?","Mums FB užtenka"],1],
    ["O kiek tai kainuos?","Nuo kelių šimtų eurų, viskas įskaičiuota. Tikslią sumą pasakysiu per 15 min. pokalbį. Rytoj ar poryt?",["Sutarėm laiką","Atsiųskit paštu","Pagalvosiu"],0]]},
  {av:"AR",co:"Autoservisas „Ratas“",ci:"Autoservisas · Vilnius",when:"Rytoj, 10:30",steps:[
    ["Svetainę jau turim.","Puiku. O ar ji atneša klientų? Galiu nemokamai peržiūrėti ir pasakyti, ką verta pataisyti.",["Gerai, pažiūrėkit","Brangu","Nereikia"],1],
    ["Brangu, pinigų nėra.","Suprantu. Bet jei svetainė atveda bent du klientus per mėnesį, ji atsiperka per kelis mėnesius. Pažiūrim 15 minučių?",["Sutarėm laiką","Pagalvosiu"],0]]},
  {av:"OK",co:"Odontologija „Šypsena“",ci:"Klinika · Klaipėda",when:"Penktadienis, 9:00",steps:[
    ["Klientų ir taip užtenka.","Gerai girdėti. Bet kai klientų daugiau, galit rinktis geresnius užsakymus ir kelti kainą.",["Galima pažiūrėti","Pagalvosiu","Ne, nereikia"],0],
    ["Gerai, parodykit.","Susitinkam 15 minučių, parodysiu, kaip atrodytų, ir pasakysiu tikslią kainą. Kada geriau?",["Sutarėm laiką","Geriau atsiųskit"],0]]}];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const say=$("say"),chips=$("chips"),res=$("res");let sec=0,done=3;
setInterval(()=>{sec++;$("tm").textContent=String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")},1000);
const type=async s=>{say.classList.remove("done");say.textContent="";if(still){say.textContent=s;say.classList.add("done");return}
  for(let i=0;i<s.length;i++){say.textContent=s.slice(0,i+1);await wait(s[i]===" "?28:16)}say.classList.add("done")};
const tally=()=>{$("cnt").textContent=done+" / 8";$("bar").style.width=Math.min(100,done/8*100)+"%"};tally();
const show=(c,s)=>{$("av").textContent=c.av;$("co").textContent=c.co;$("ci").textContent=c.ci;$("them").textContent=s[0];say.textContent=s[1];say.classList.add("done");
  chips.innerHTML=s[2].map((x,i)=>"<b"+(i===s[3]?' class="hit"':"")+">"+x+"</b>").join("");chips.classList.add("on")};
if(still){show(CALLS[0],CALLS[0].steps[1]);return}
(async()=>{let k=0;await wait(900);for(;;){const c=CALLS[k++%CALLS.length];sec=0;
  $("av").textContent=c.av;$("co").textContent=c.co;$("ci").textContent=c.ci;$("when").textContent=c.when;
  for(const s of c.steps){chips.classList.remove("on");chips.innerHTML="";$("them").textContent=s[0];await wait(700);await type(s[1]);
    chips.innerHTML=s[2].map(x=>"<b>"+x+"</b>").join("");void chips.offsetWidth;chips.classList.add("on");await wait(1300);
    chips.children[s[3]].classList.add("hit");await wait(700)}
  res.classList.add("on");done=done>=8?1:done+1;tally();await wait(2400);res.classList.remove("on");await wait(400)}})();
})();
</script>
</body></html>`;
}
