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
  let mePromise=null;const meGet=()=>mePromise||(mePromise=api("GET","/api/me"));
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
  async function chat(messages,leadId,model,onEvent){
    const r=await fetch("/api/chat",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({messages,leadId,model})});
    if(r.status===401){location.replace("/login");return}
    if(!r.ok||!r.body){const e=await r.json().catch(()=>({}));throw new Error(e.error||"Claude neatsako")}
    const rd=r.body.getReader(),dec=new TextDecoder();let buf="";
    for(;;){const{value,done}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
      while((i=buf.indexOf("\n"))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(line){try{onEvent(JSON.parse(line))}catch{}}}}
  }
  window.COLDLINE_WEB={
    me:meGet,
    chat,
    brief:async(leadId,model,force)=>{const r=await fetch("/api/brief",{method:"POST",credentials:"same-origin",headers:{"content-type":"application/json"},body:JSON.stringify({leadId,model,force})});return r.json().catch(()=>({error:"Nepavyko."}))},
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
