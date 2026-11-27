/* Coldline web: the same page as the Claude artifact, with window.claude backed by this server. */
(function(){
  const POLL=2500;
  async function api(method,url,body){
    const r=await fetch(url,{method,credentials:"same-origin",headers:body!==undefined?{"content-type":"application/json"}:{},body:body!==undefined?JSON.stringify(body):undefined});
    if(r.status===401){location.replace("/login");throw Object.assign(new Error("Reikia prisijungti"),{code:"unauthenticated"})}
    if(!r.ok){const e=await r.json().catch(()=>({}));throw Object.assign(new Error(e.error||r.statusText),{code:e.code||"failed"})}
    return r.status===204?null:r.json();
  }
  const cache={},subs=[];
  function snap(col,q){
    let docs=[...((cache[col]&&cache[col].docs)||new Map()).entries()].map(([id,d])=>({id,exists:true,data:()=>d}));
    if(q.order){const k=q.order,s=q.dir==="desc"?-1:1;docs.sort((a,b)=>{const x=a.data()[k]??0,y=b.data()[k]??0;return x>y?s:x<y?-s:0})}
    if(q.lim)docs=docs.slice(0,q.lim);
    return{docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f),metadata:{fromCache:false,hasPendingWrites:false},docChanges:()=>[]};
  }
  const inflight={};
  function pull(col){
    if(inflight[col])return inflight[col];
    const c=cache[col];
    return inflight[col]=api("GET","/api/db/"+col+(c&&c.v?"?v="+encodeURIComponent(c.v):"")).then(r=>{
      if(r.same)return false;
      cache[col]={v:r.v,docs:new Map(r.docs.map(d=>[d.id,d.data]))};return true;
    }).finally(()=>{delete inflight[col]});
  }
  const emit=col=>subs.filter(s=>s.col===col).forEach(s=>{try{s.next(snap(col,s.q))}catch(e){console.error(e)}});
  async function tick(){for(const col of new Set(subs.map(s=>s.col))){try{if(await pull(col))emit(col)}catch(e){subs.filter(s=>s.col===col&&s.err).forEach(s=>s.err(e))}}}
  setInterval(()=>{if(!document.hidden)tick()},POLL);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
  function local(col,id,d){cache[col]=cache[col]||{v:"",docs:new Map()};if(d===null)cache[col].docs.delete(id);else cache[col].docs.set(id,d);cache[col].v="";emit(col)}
  const path=(col,id)=>"/api/db/"+col+"/"+encodeURIComponent(id);
  function coll(col,q){q=q||{};return{
    doc:id=>({id,
      get:async()=>{await pull(col).catch(()=>{});const d=cache[col]&&cache[col].docs.get(id);return{id,exists:!!d,data:()=>d}},
      set:async d=>{await api("PUT",path(col,id),d);local(col,id,d)},
      update:async p=>{const r=await api("PATCH",path(col,id),p);local(col,id,r.data)},
      delete:async()=>{await api("DELETE",path(col,id));local(col,id,null)}}),
    orderBy:(k,dir)=>coll(col,Object.assign({},q,{order:k,dir})),
    limit:n=>coll(col,Object.assign({},q,{lim:n})),
    get:async()=>{await pull(col);return snap(col,q)},
    onSnapshot(next,err){const s={col,q,next,err};subs.push(s);
      (cache[col]&&cache[col].v?Promise.resolve():pull(col)).then(()=>s.next(snap(col,q))).catch(e=>err&&err(e));
      return()=>{const i=subs.indexOf(s);if(i>=0)subs.splice(i,1)}}
  }}
  const db={collection:c=>coll(c),doc:p=>{const [c,id]=String(p).split("/");return coll(c).doc(id)}};
  let mePromise=null;const meGet=()=>mePromise||(mePromise=api("GET","/api/me").then(m=>{window.COLDLINE_WEB.models=!!m.models;window.COLDLINE_WEB.aiFull=!!m.aiFull;return m}));
  const user={id:async()=>(await meGet()).id,isOwner:async()=>!!(await meGet()).owner,
    profiles:async ids=>api("POST","/api/profiles",{ids})};
  const downloads={save:async({filename,data,mimeType})=>{
    const blob=data instanceof Blob?data:new Blob([data],{type:mimeType||"text/plain;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename||"coldline.txt";document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}};
  const ai={async search(form,onEvent,signal){
    const r=await fetch("/api/search",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(form),signal});
    if(!r.ok||!r.body){const e=await r.json().catch(()=>({}));throw new Error(e.error||"Paieška nepavyko")}
    const rd=r.body.getReader(),dec=new TextDecoder();let buf="";
    for(;;){const{value,done}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
      while((i=buf.indexOf("\n"))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(line){try{onEvent(JSON.parse(line))}catch{}}}}
    tick();
  }};
  /* Free AI straight from the browser, used when the server can't reach any model (its IP can be refused). */
  const FREE="https://text.pollinations.ai/openai";
  async function freeAsk(system,turns,onText){
    const body=JSON.stringify({model:"openai",stream:!!onText,private:true,messages:[{role:"system",content:system},...turns]});
    let r;for(let a=0;a<2;a++){r=await fetch(FREE,{method:"POST",headers:{"content-type":"application/json"},body});if(r.ok||a||(r.status!==429&&r.status<500))break;await new Promise(ok=>setTimeout(ok,3000))}
    if(!r.ok)throw new Error(r.status===429||r.status===402?"Nemokamas AI leidžia 1 atsakymą per 45 s. Palauk minutę arba įjunk nemokamą raktą.":r.status===403?"Nemokamas AI šiuo metu atmeta užklausas. Įjunk nemokamą Gemini raktą – veiks visada.":"AI neatsakė ("+r.status+"). Pabandyk dar kartą.");
    if(!onText){const j=await r.json().catch(()=>({}));const t=((j.choices||[])[0]||{}).message;return(t&&t.content||"").trim()}
    const rd=r.body.getReader(),dec=new TextDecoder();let buf="",all="";
    for(;;){const{value,done}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
      while((i=buf.indexOf("\n"))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line.startsWith("data:"))continue;const d=line.slice(5).trim();if(d==="[DONE]")continue;
        try{const t=((JSON.parse(d).choices||[])[0]||{}).delta;if(t&&t.content){all+=t.content;onText(t.content)}}catch{}}}
    return all;
  }
  async function chat(messages,leadId,model,onEvent){
    const r=await fetch("/api/chat",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({messages,leadId,model})});
    if(r.status===401){location.replace("/login");return}
    if(!r.ok||!r.body){const e=await r.json().catch(()=>({}));throw new Error(e.error||"Claude neatsako")}
    const rd=r.body.getReader(),dec=new TextDecoder();let buf="",handoff=null;
    for(;;){const{value,done}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
      while((i=buf.indexOf("\n"))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line)continue;let e;try{e=JSON.parse(line)}catch{continue}
        if(e.type==="client"){handoff=e;continue}if(handoff&&e.type==="done")continue;onEvent(e)}}
    if(!handoff)return;
    try{let any=false;await freeAsk(handoff.system,handoff.messages,t=>{any=true;onEvent({type:"text",text:t})});if(!any)throw new Error("AI grąžino tuščią atsakymą. Pabandyk dar kartą.")}
    catch(err){onEvent({type:"error",message:err&&err.message||"AI nepasiekiamas. Patikrink internetą."})}
    onEvent({type:"done"});
  }
  async function brief(leadId,model,force){
    const post=b=>fetch("/api/brief",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json()).catch(()=>({error:"Nepavyko."}));
    const r=await post({leadId,model,force});
    if(!r.client)return r;
    try{const text=await freeAsk(r.client.system,[{role:"user",content:r.client.prompt}]);if(!text)return{error:"AI grąžino tuščią atsakymą."};return post({leadId,text})}
    catch(err){return{error:err&&err.message||"AI nepasiekiamas."}}
  }
  window.COLDLINE_WEB={
    me:meGet,
    chat,
    brief,
    logout:async()=>{try{await api("POST","/api/auth/logout")}catch{}location.replace("/login")},
  };
  window.claude={use:async name=>{
    if(name==="db")return db;
    if(name==="user")return user;
    if(name==="downloads")return downloads;
    if(name==="ai"){try{return(await meGet()).ai?ai:null}catch{return null}}
    return null;
  }};
})();
