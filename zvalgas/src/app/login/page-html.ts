const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const G = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

/** The voice waveform: 28 bars whose height breathes like someone speaking. */
const WAVE = Array.from({ length: 28 }, (_, i) => {
  const h = [38, 62, 44, 80, 56, 92, 70, 100, 64, 86, 48, 74, 58, 96, 66, 88, 52, 78, 60, 94, 46, 72, 84, 54, 68, 42, 58, 36][i];
  return `<i style="--h:${h}%;--d:${(-i * 0.137).toFixed(2)}s;--t:${(0.9 + (i % 5) * 0.13).toFixed(2)}s"></i>`;
}).join("");

const MARK = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1c1e"/><stop offset="1" stop-color="#000"/></linearGradient><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#64d2ff"/><stop offset=".5" stop-color="#30d158"/><stop offset="1" stop-color="#a6f7c0"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#lb)"/><g fill="none" stroke="url(#lg)" stroke-linecap="round" stroke-width="4.4"><path d="M41.5 18.5a19 19 0 1 0 0 27"/><path d="M36.6 24.4a11 11 0 1 0 0 15.2"/></g><circle cx="27.5" cy="32" r="3.8" fill="#30d158"/></svg>`;

/** What Coldai whispers during a call: cycles under the headline. */
const LINES = [
  "Facebook gerai, bet nauji klientai ieško Google – ir jūsų neranda.",
  "Kaina? Nuo kelių šimtų eurų. Susiskambinam 15 minučių rytoj ar poryt?",
  "„Pagalvosiu“ dažniausiai slepia kitą priežastį. Paklausk kokią.",
  "Siūlyk du laikus. Neklausk „ar norit“, klausk „kada“.",
];

export function loginHtml({ error, missing, google, invite }: { error: string; missing: string[]; google: boolean; invite?: { name: string; token: string } | null }) {
  const ready = !missing.length;
  const join = invite && /^[\w-]{8,64}$/.test(invite.token) ? invite.token : "";
  return `<!DOCTYPE html>
<html lang="lt"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<title>Coldai</title>
<meta name="theme-color" content="#000000"><meta name="robots" content="noindex">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&display=swap&subset=latin-ext" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",system-ui,sans-serif;--display:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter",system-ui,sans-serif;--ease:cubic-bezier(.22,1,.36,1)}
html{height:100%;overflow:hidden;overscroll-behavior:none;background:#000;-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent}
body{position:fixed;inset:0;overflow:hidden;overscroll-behavior:none;font-family:var(--sans);color:#f5f5f7;background:#000;-webkit-font-smoothing:antialiased;letter-spacing:-.01em}

/* light that slowly moves behind everything */
.aura{position:fixed;inset:-30%;pointer-events:none;filter:blur(70px);opacity:.75}
.aura i{position:absolute;border-radius:50%;animation:float 18s ease-in-out infinite alternate}
.aura i:nth-child(1){width:46vmax;height:46vmax;left:18%;top:8%;background:radial-gradient(circle,rgba(48,209,88,.45),transparent 65%)}
.aura i:nth-child(2){width:40vmax;height:40vmax;right:12%;top:26%;background:radial-gradient(circle,rgba(100,210,255,.32),transparent 65%);animation-duration:22s;animation-delay:-6s}
.aura i:nth-child(3){width:36vmax;height:36vmax;left:34%;bottom:4%;background:radial-gradient(circle,rgba(94,92,230,.3),transparent 65%);animation-duration:26s;animation-delay:-12s}
@keyframes float{50%{transform:translate3d(6%,-5%,0) scale(1.12)}100%{transform:translate3d(-5%,4%,0) scale(.94)}}
.grain{position:fixed;inset:0;pointer-events:none;opacity:.07;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}

.wrap{position:fixed;left:0;right:0;top:0;height:var(--vh,100dvh);transform:translate3d(0,var(--vy,0px),0);z-index:1;display:flex;align-items:center;justify-content:center;
  padding:max(18px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))}
.col{width:100%;max-width:640px;display:flex;flex-direction:column;align-items:center;max-height:100%}

/* waveform */
.wave{display:flex;align-items:center;gap:4px;height:64px;margin-bottom:26px}
.wave i{display:block;width:5px;height:var(--h);border-radius:3px;transform-origin:center;
  background:linear-gradient(180deg,#64d2ff,#30d158 55%,#5e5ce6);box-shadow:0 0 18px rgba(48,209,88,.35);
  animation:speak var(--t) var(--d) ease-in-out infinite alternate}
@keyframes speak{0%{transform:scaleY(.18)}100%{transform:scaleY(1)}}
.wave.quiet i{animation-play-state:paused}

.brand{display:flex;align-items:center;gap:10px;font-family:var(--display);font-size:15px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#a1a1a6}
.brand svg{width:30px;height:30px;border-radius:8px;box-shadow:0 0 0 .5px rgba(255,255,255,.14),0 8px 20px -8px rgba(48,209,88,.5)}
h1{margin-top:12px;text-align:center;font-family:var(--display);font-size:clamp(38px,min(9vw,7.4vh),64px);line-height:1.02;letter-spacing:-.035em;font-weight:700}
h1 span{background:linear-gradient(92deg,#64d2ff 0%,#30d158 50%,#a6f7c0 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.whisper{margin-top:18px;min-height:46px;max-width:380px;text-align:center;font-size:15px;line-height:1.5;color:#a1a1a6;transition:opacity .5s var(--ease),transform .5s var(--ease)}
.whisper b{color:#f5f5f7;font-weight:500}
.whisper.out{opacity:0;transform:translateY(-6px)}

/* form */
.card{width:100%;max-width:420px;margin-top:28px;border-radius:26px;padding:22px 20px 18px;overflow:auto;
  background:rgba(28,28,30,.66);backdrop-filter:saturate(1.6) blur(30px);-webkit-backdrop-filter:saturate(1.6) blur(30px);
  border:1px solid rgba(255,255,255,.09);box-shadow:0 30px 80px -30px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.06)}
.inv{display:flex;flex-direction:column;gap:2px;margin-bottom:16px;padding:11px 14px;border-radius:14px;background:rgba(48,209,88,.14);color:#7ee2a0;font-size:12.5px}
.inv b{font-size:16px;color:#f5f5f7;font-weight:600}
.head h2{font-family:var(--display);font-size:22px;font-weight:600;letter-spacing:-.02em}
.head p{margin-top:4px;font-size:14px;color:#a1a1a6}
.tabs{position:relative;margin-top:16px;display:grid;grid-template-columns:1fr 1fr;padding:2px;border-radius:10px;background:rgba(118,118,128,.24)}
.tabs::before{content:"";position:absolute;top:2px;bottom:2px;left:2px;width:calc(50% - 2px);border-radius:8px;background:#636366;box-shadow:0 3px 8px rgba(0,0,0,.3);transition:transform .35s var(--ease)}
.tabs[data-m=register]::before{transform:translateX(100%)}
.tabs button{position:relative;height:32px;border:0;background:none;font:inherit;font-size:13.5px;font-weight:600;color:#a1a1a6;cursor:pointer;transition:color .2s}
.tabs button[aria-pressed=true]{color:#fff}
form{margin-top:16px;display:grid;gap:10px}
.field{position:relative}
input{width:100%;height:52px;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:18px 14px 4px;font:inherit;font-size:16px;color:#fff;background:rgba(0,0,0,.35);outline:none;
  transition:border-color .2s,box-shadow .2s,background .2s;-webkit-appearance:none;appearance:none}
input:focus{border-color:#30d158;box-shadow:0 0 0 4px rgba(48,209,88,.18);background:rgba(0,0,0,.5)}
.field label{position:absolute;left:15px;top:16px;font-size:16px;color:#8e8e93;pointer-events:none;transform-origin:left top;transition:transform .2s var(--ease),color .2s}
input:focus+label,input:not(:placeholder-shown)+label{transform:translateY(-9px) scale(.74);color:#a1a1a6}
.pw input{padding-right:78px}
.eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);height:38px;padding:0 12px;border:0;background:none;color:#64d2ff;font:inherit;font-size:14px;cursor:pointer;border-radius:10px}
.go{position:relative;margin-top:6px;height:52px;border:0;border-radius:14px;font:inherit;font-size:16.5px;font-weight:600;color:#000;background:#f5f5f7;cursor:pointer;transition:transform .15s var(--ease),background .2s,opacity .2s}
.go:hover{background:#fff}.go:active{transform:scale(.98)}.go:disabled{opacity:.55;cursor:default}
.go.busy{color:transparent}
.go.busy::after{content:"";position:absolute;left:50%;top:50%;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:2.5px solid rgba(0,0,0,.2);border-top-color:#000;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.err{border-radius:12px;background:rgba(255,69,58,.15);color:#ff8a80;padding:10px 13px;font-size:14px;line-height:1.4}
.err:empty{display:none}
.shake{animation:shake .45s var(--ease)}
@keyframes shake{20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}
.or{display:flex;align-items:center;gap:10px;margin:14px 0 2px;color:#636366;font-size:12px}
.or::before,.or::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.1)}
.gbtn{margin-top:10px;display:flex;align-items:center;justify-content:center;gap:10px;height:50px;border-radius:14px;border:1px solid rgba(255,255,255,.14);font-size:15px;font-weight:600;color:#f5f5f7;text-decoration:none;background:rgba(255,255,255,.04)}
.gbtn:hover{background:rgba(255,255,255,.08)}
.cfg{margin-top:12px;border-radius:12px;background:rgba(255,214,10,.12);color:#ffd60a;padding:10px 13px;font-size:13px;line-height:1.5}
.fine{margin-top:14px;font-size:12.5px;color:#8e8e93;line-height:1.5;text-align:center}

/* entrance */
.in{opacity:0;animation:rise .9s var(--ease) forwards}
.d1{animation-delay:.08s}.d2{animation-delay:.18s}.d3{animation-delay:.3s}
@keyframes rise{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
.wave.in{animation:pop 1.1s var(--ease) forwards}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}

@media(max-height:760px){.whisper{display:none}.card{margin-top:22px}}
@media(max-height:640px){.wave{height:44px;margin-bottom:14px}h1{font-size:34px}.head p{display:none}.fine{display:none}}
@media(max-height:540px){.wave,.brand{display:none}h1{margin-top:0}}
/* keyboard open on a touch screen: only the form, fitted to what is visible */
.kb .wave,.kb .brand,.kb h1,.kb .whisper,.kb .head,.kb .fine,.kb .or,.kb .gbtn,.kb .cfg,.kb .inv{display:none}
.kb .card{margin-top:0;padding:16px 16px 14px}.kb .tabs{margin-top:0}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.in{opacity:1}}
</style></head>
<body><div class="aura"><i></i><i></i><i></i></div><div class="grain"></div>
<main class="wrap"><div class="col">
  <div class="wave in" aria-hidden="true" id="wave">${WAVE}</div>
  <div class="brand in d1">${MARK}Coldai</div>
  <h1 class="in d1">Skambink drąsiai.<br><span>Coldai pakužda.</span></h1>
  <p class="whisper in d2" id="wh" aria-live="polite"><b>„</b>${esc(LINES[0])}<b>“</b></p>
  <section class="card in d3" id="card">
    ${join ? `<div class="inv"><span>Kvietimas į komandą</span><b>${esc(invite!.name || "Coldai")}</b></div>` : ""}
    <div class="head"><h2 id="t">Su sugrįžimu</h2><p id="s">Prisijunk ir tęsk ten, kur baigei.</p></div>
    <div class="tabs" role="tablist" data-m="login"><button type="button" data-m="login" aria-pressed="true">Prisijungti</button><button type="button" data-m="register" aria-pressed="false">Nauja paskyra</button></div>
    <form id="f" novalidate>
      <div class="err" id="e" role="alert">${esc(error)}</div>
      <div class="field"><input id="u" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required minlength="3" maxlength="32" placeholder=" "><label for="u">Vartotojo vardas</label></div>
      <div class="field pw"><input id="p" name="password" type="password" autocomplete="current-password" required minlength="6" maxlength="200" placeholder=" "><label for="p">Slaptažodis</label><button type="button" class="eye" id="eye">Rodyti</button></div>
      <button class="go" id="go" ${ready ? "" : "disabled"}>Prisijungti</button>
    </form>
    ${google ? `<div class="or">arba</div><a class="gbtn" href="/api/auth/google">${G}Tęsti su Google</a>` : ""}
    ${ready ? "" : `<div class="cfg">Serveryje trūksta: ${missing.map(esc).join(", ")}</div>`}
    <p class="fine">${join ? "Sukūręs paskyrą iškart matysi komandos kontaktus." : "Nauja paskyra – nauja tuščia komandos erdvė. Kolegas pakviesi nuoroda."}</p>
  </section>
</div></main>
<script>
(()=>{
const $=id=>document.getElementById(id),root=document.documentElement;
/* keep the page pinned to what is actually visible (the iOS keyboard pans the page otherwise) */
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
const JOIN=${JSON.stringify(join)},HAD_ERROR=${JSON.stringify(!!error)};
const T={login:["Su sugrįžimu","Prisijunk ir tęsk ten, kur baigei.","Prisijungti","current-password"],
  register:[JOIN?"Prisijunk prie komandos":"Sukurk paskyrą",JOIN?"Sugalvok vardą ir slaptažodį.":"Užtruks 5 sekundes. Kortelės nereikia.",JOIN?"Prisijungti prie komandos":"Sukurti paskyrą","new-password"]};
const set=m=>{mode=m;tabs.dataset.m=m;tabs.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.m===m)));
  const t=T[m];$("t").textContent=t[0];$("s").textContent=t[1];go.textContent=t[2];pw.autocomplete=t[3];e.textContent=""};
tabs.querySelectorAll("button").forEach(b=>b.onclick=()=>set(b.dataset.m));
$("eye").onclick=ev=>{const t=pw.type==="password";pw.type=t?"text":"password";ev.currentTarget.textContent=t?"Slėpti":"Rodyti"};
const fail=msg=>{e.textContent=msg;const c=$("card");c.classList.remove("shake");void c.offsetWidth;c.classList.add("shake")};
f.onsubmit=async ev=>{ev.preventDefault();e.textContent="";
  if(f.username.value.trim().length<3){fail("Vardas turi būti bent 3 simbolių.");f.username.focus();return}
  if(pw.value.length<6){fail("Slaptažodis turi būti bent 6 simbolių.");pw.focus();return}
  go.disabled=true;go.classList.add("busy");
  try{const r=await fetch("/api/auth/password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:f.username.value,password:pw.value,mode,join:JOIN})});
    const d=await r.json().catch(()=>({}));if(r.ok){document.body.style.transition="opacity .35s";document.body.style.opacity="0";setTimeout(()=>location.replace("/"),250);return}
    fail(d.error||"Nepavyko. Bandyk dar kartą.")}
  catch{fail("Nėra ryšio. Bandyk dar kartą.")}
  go.disabled=false;go.classList.remove("busy")};
if(JOIN&&!HAD_ERROR)set("register");
if(matchMedia("(pointer:fine)").matches)f.username.focus();

/* the whisper line changes every few seconds; the waveform rests while typing */
const LINES=${JSON.stringify(LINES)},wh=$("wh"),wave=$("wave");let k=0;
if(!matchMedia("(prefers-reduced-motion:reduce)").matches)setInterval(()=>{if(document.hidden||root.classList.contains("kb"))return;
  wh.classList.add("out");setTimeout(()=>{k=(k+1)%LINES.length;wh.innerHTML="<b>„</b>"+LINES[k].replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"})[c])+"<b>“</b>";wh.classList.remove("out")},450)},4200);
addEventListener("focusin",()=>wave.classList.add("quiet"));addEventListener("focusout",()=>wave.classList.remove("quiet"));
})();
</script>
</body></html>`;
}
