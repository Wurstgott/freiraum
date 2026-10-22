/* ===== Luftholen: Zustand, Logik, Ansichten ===== */
const BUILD="__BUILD__";
const KEY="lichtung-v1";
try{ history.scrollRestoration="manual" }catch(e){}
const DAY=864e5;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const now=()=>Date.now();
const uid=()=>Math.random().toString(36).slice(2,9);
function dkey(t){ const d=new Date(t==null?now():t); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0") }
function day0(t){ const d=new Date(t==null?now():t); d.setHours(0,0,0,0); return d.getTime() }
function daysBetween(a,b){ return Math.round((day0(b)-day0(a))/DAY) }
function fdate(t){ return new Date(t).toLocaleDateString("de-DE",{day:"numeric",month:"long"}).replace(" ","\u00a0") }
function fdateY(t){ return new Date(t).toLocaleDateString("de-DE",{day:"numeric",month:"long",year:"numeric"}).replace(/ /g,"\u00a0") }
function hsh(s){ let h=2166136261; for(const c of String(s)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619) } return h>>>0 }
const plural=(n,a,b)=>n===1?a:b;
const IMP=Object.fromEntries(IMPULSE.map(i=>[i.id,i]));
const UEB=Object.fromEntries(UEBUNGEN.map(u=>[u.id,u]));
const BEG=Object.fromEntries(BEGRIFFE.map(b=>[b.id,b]));
const AUF=Object.fromEntries(AUFGABEN.map(a=>[a.id,a]));
const KAT=Object.fromEntries(KATEGORIEN.map(k=>[k.id,k]));
const CHAL=Object.fromEntries(KATEGORIEN.flatMap(k=>k.ch.map(c=>[c.id,Object.assign({kat:k.id,cat:k.cat},c)])));
const CHALCAP=8;
const ORT={regal:"im Regal",oben:"oben auf dem Regal",wand:"an der Wand",pinn:"an der Pinnwand",fenster:"auf der Fensterbank",tisch:"auf dem Tisch",stuhl:"auf dem Stuhl",unter:"unter dem Tisch",vorn:"vorn am Boden",boden:"am Boden"};
/* Schwerpunkt aus der Bestandsaufnahme: welche Sorten im Bild nach vorn treten. Die Menge im Bild ändert sich nicht. */
const Q2K={c01:["kleidung"],c02:["kleidung"],c03:["deko","moebel"],c04:["moebel","kueche"],c05:["papier"],c06:["technik"],c07:["erinnerung","deko"],c08:["erinnerung"],c09:["verpackung"],c10:["verpackung"],c11:["moebel"]};
function focusKats(ans){ if(!ans&&S.settings&&S.settings.nofocus) return []; ans=ans||(S.check&&S.check.ans); if(!ans) return []; const sc={};
  Object.entries(ans).forEach(([q,v])=>(Q2K[q]||[]).forEach(k=>sc[k]=(sc[k]||0)+(+v||0)));
  let F=Object.keys(sc).filter(k=>sc[k]>=2&&KAT[k]).sort((a,b)=>sc[b]-sc[a]||KATEGORIEN.findIndex(x=>x.id===a)-KATEGORIEN.findIndex(x=>x.id===b)).slice(0,3);
  // Wer bei der Möbelfrage „ein oder zwei“ oder mehr sagt, bekommt Möbel sicher in den Schwerpunkt
  if((+ans.c11||0)>=2&&!F.includes("moebel")){ F=F.slice(0,2); F.push("moebel") }
  return F }
const katOfStelle=id=>String(id||"").split("@")[0];
const AUFCAP=6;

/* ---------- Zustand ---------- */
function fresh(){ return {gv:3,gv3ts:0,spend:[],created:now(),settings:{theme:"system",vib:true,mode:null},seen:false,
  log:[],keep:[],wishes:[],box:[],ex:{},read:{},saved:{},quiz:{},lk:{},check:null,pr:[],mom:{},
  hint:{day:"",key:"",later:"",off:{}},inflow:{},pre:{},shown:null,rehDay:"",readRun:{day:"",n:0,t:0,warned:""},exported:0} }
let S=fresh();
function load(){
  try{ const raw=localStorage.getItem(KEY); if(raw){ const o=JSON.parse(raw); S=merge(fresh(),o); S.gv=o.gv||1; if(o.gv3ts==null&&S.gv<3) delete S.gv3ts } }catch(e){}
  migrate();
}
function merge(a,b){ for(const k in b){ if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==="object"&&!Array.isArray(a[k])) a[k]=merge(a[k],b[k]); else a[k]=b[k] } return a }
/* Fassungen des Speicherstands. gv 1: Einheit „Weite“, Schwellen 0/1/5/12/…, Tagesdeckel 12.
   gv 2: Einheit „Handbreit“, langsamere Schwellen. Wer schon eine Stufe erreicht hatte, behält sie
   als Untergrenze (S.stFloor), bis die neue Rechnung sie einholt. Es wird nie zurückgestuft. */
const STUFEN_GV1=[0,1,5,12,24,44,75,115,170,250];
function migrate(){
  if(!S.gv) S.gv=1;
  if(S.gv<2){
    if(S.log&&S.log.length){ const W1=tally(12).W; let s=0; STUFEN_GV1.forEach((w,i)=>{ if(W1>=w) s=i }); S.stFloor=Math.max(S.stFloor||0,s) }
    S.gv=2;
  }
  /* gv 3: Schwung wird verdient und im Bild eingesetzt. Was bisher im Bild frei war, bleibt frei:
     Es gilt als schon eingesetzt (in der festen Reihenfolge des Bildes). Eine Untergrenze aus gv 1 kommt kostenlos dazu. */
  if(S.gv<3){
    if(!Array.isArray(S.spend)) S.spend=[];
    const W=tally().W; if(W>0) S.spend.push({k:"_alt",n:W,ts:now(),alt:1});
    const fl=S.stFloor?STUFEN[Math.min(9,S.stFloor)].w:0; if(fl>W) S.spend.push({k:"_alt",n:fl-W,ts:now(),alt:1,frei:1});
    S.gv=3; S.gv3ts=now();
  }
  if(!Array.isArray(S.spend)) S.spend=[];
}
function persist(){ try{ localStorage.setItem(KEY,JSON.stringify(S)) }catch(e){} }
function save(){ persist() }
const school=()=>S.settings.mode==="school";

/* ---------- Handbreit: Platz, der entstanden ist ----------
   Regeln: Größe zählt (Ding 1, Tüte 3, Karton 6, Möbel 10; alte Einträge „Etwas Großes“ 5).
   Recyceltes und Entsorgtes zählt halb. Einzelne Dinge zählen höchstens fünfmal am Tag,
   alles Losgelassene zusammen höchstens LOSCAP am Tag (ein Möbel und ein Karton).
   Statt neu: 3, gebraucht gekauft 1, höchstens zweimal am Tag. Ein Wunsch, der seine volle
   Wartezeit bekommt: 2, egal wie man danach entscheidet; gelassen, geliehen oder gebraucht: +2. Übung: 2 bis 4. */
const LOSCAP=16, ENTCAP=16; /* ENTCAP: Entscheidungen (Loslassen, Behalten, Vielleicht-Kiste) ab Fassung D, zusammen höchstens 16 am Tag */
function tally(losCap){ const LC=losCap||LOSCAP;
  const parts={los:0,teil:0,wunsch:0,ueb:0,aufg:0,chal:0,keep:0,kiste:0}, cap={}, uebLast={}, aufOnce={};
  for(const e of S.log){
    const d=dkey(e.ts); let p=0;
    if(e.k==="los"&&e.ts>=(S.gv3ts==null?9e15:S.gv3ts)){ /* ab Fassung D: jede Entscheidung gleich viel, Größe zählt nicht */
      let v=(e.weg==="mue"||e.weg==="rec")?1:2; const used=cap["l"+d]||0; p=Math.max(0,Math.min(v,ENTCAP-used)); cap["l"+d]=used+p }
    else if(e.k==="los"){ let v=e.size;
      if(e.size===1){ cap["s"+d]=(cap["s"+d]||0)+1; if(cap["s"+d]>5) v=0 }
      if(e.weg==="mue"||e.weg==="rec") v=Math.ceil(v/2);
      const used=cap["l"+d]||0; p=Math.max(0,Math.min(v,LC-used)); cap["l"+d]=used+p }
    else if(e.k==="teil"){ cap["t"+d]=(cap["t"+d]||0)+1; p=cap["t"+d]<=2?(e.how==="gebr"?1:3):0 }
    else if(e.k==="aufg"){ const a=AUF[e.aid]; if(a&&!S.pre[e.aid]){ const key=a.art==="einmal"?"once"+e.aid:"day"+e.aid+d;
        if(!aufOnce[key]){ aufOnce[key]=1;
          if(a.zu==="teil"){ cap["t"+d]=(cap["t"+d]||0)+1; p=cap["t"+d]<=2?a.w:0 }
          else { const used=cap["a"+d]||0; p=Math.max(0,Math.min(a.w,AUFCAP-used)); cap["a"+d]=used+p } } } }
    else if(e.k==="wunsch"){ if(e.waited&&e.dec!=="mehr"){ cap["w"+d]=(cap["w"+d]||0)+1; p=cap["w"+d]<=2?2+(e.ts<(S.gv3ts==null?9e15:S.gv3ts)&&(e.dec==="lass"||e.dec==="leih")?2:0):0 } }
    else if((e.k==="keep"||e.k==="kiste")&&e.ts>=(S.gv3ts==null?9e15:S.gv3ts)){ const used=cap["l"+d]||0; p=Math.max(0,Math.min(2,ENTCAP-used)); cap["l"+d]=used+p }
    else if(e.k==="chal"){ const c=CHAL[e.cid]; if(c){ const key="c"+e.cid+d; if(!cap[key]){ cap[key]=1; const used=cap["c"+d]||0; p=Math.max(0,Math.min(c.w,CHALCAP-used)); cap["c"+d]=used+p } } }
    else if(e.k==="ueb"){ const l=uebLast[e.uid]; p=(l==null||e.ts-l>=60*DAY)?(e.p||0):0; if(p) uebLast[e.uid]=e.ts }
    e._p=p; if(parts[e.k]!=null) parts[e.k]+=p;
  }
  return {W:parts.los+parts.teil+parts.wunsch+parts.ueb+parts.aufg+parts.chal+parts.keep+parts.kiste,parts};
}
const weite=()=>tally().W;            // bekommene Handbreit gesamt (Name aus der ersten Fassung)
/* Schwung einsetzen: Was man verdient, setzt man im Bild ein. Das Bild zeigt, was eingesetzt ist. */
const EIN="Handbreit", PREIS=3;
const eingesetzt=()=>(S.spend||[]).filter(x=>!x.frei).reduce((s,x)=>s+x.n,0);
const raum=()=>(S.spend||[]).reduce((s,x)=>s+x.n,0);
const guthaben=()=>Math.max(0,weite()-eingesetzt());
function rawStage(W){ let s=0; STUFEN.forEach((x,i)=>{ if(W>=x.w) s=i }); return s }
function stageOf(W){ return Math.max(rawStage(W),Math.min(9,S.stFloor||0)) }
const sizeName=v=>(SIZES.find(s=>s.v===v)||{}).n||SIZE_ALT[v]||"Etwas";
const hb=n=>n+"\u00a0"+EIN;
/* Was ein Loslassen-Eintrag jetzt wirklich bringt (mit Halbierung und Tagesgrenzen) */
function losGain(size,weg){ const w0=tally().W; S.log.push({id:"_probe",k:"los",ts:now(),size,weg,cat:"wo"}); const w1=tally().W; S.log.pop(); return w1-w0 }
function rOf(W){ return 0.14+0.78*Math.pow(Math.min(W,300)/300,0.4) }

/* ---------- Abgeleitete Listen ---------- */
const losE=()=>S.log.filter(e=>e.k==="los");
const pathN=()=>S.log.filter(e=>e.k==="teil"||(e.k==="aufg"&&AUF[e.aid]&&AUF[e.aid].zu==="teil")).length;
/* Taschen an der Tür: Weitergegebenes für jemanden (30 Tage, mit Namen) und „Statt neu“ (ohne Namen) */
function bagList(){
  const named=losE().filter(e=>e.who&&WEG[e.weg]&&WEG[e.weg].g&&now()-e.ts<30*DAY).sort((a,b)=>b.ts-a.ts).map(e=>({n:e.who}));
  return [...named,...Array.from({length:pathN()},()=>({n:""}))];
}
const aufDone=id=>S.log.some(e=>e.k==="aufg"&&e.aid===id)||!!S.pre[id];
const aufToday=id=>S.log.some(e=>e.k==="aufg"&&e.aid===id&&dkey(e.ts)===dkey());
const aufCount=id=>S.log.filter(e=>e.k==="aufg"&&e.aid===id).length;
const keepers=()=>S.keep.filter(k=>!k.gone);
const waiting=()=>S.wishes.filter(w=>w.st==="wait");
const isDue=t=>day0(now())>=day0(t);
const wishDue=()=>waiting().filter(w=>isDue(w.due));
const askDue=()=>losE().filter(e=>e.ask&&now()>=e.ask&&e.miss==null);
const keepAskDue=()=>keepers().filter(k=>k.next&&now()>=k.next);
const boxIn=()=>S.box.filter(b=>b.st==="in");
const boxDue=()=>boxIn().filter(b=>isDue(b.due));
const exRun=()=>Object.entries(S.ex).filter(([id,e])=>e.st==="run"&&UEB[id]);
function exDay(e){ return daysBetween(e.start,now())+1 }
function exTodayOpen(){ return exRun().filter(([id,e])=>exDay(e)<=UEB[id].d&&e.days[dkey()]==null) }
function exEvalDue(){ return exRun().filter(([id,e])=>exDay(e)>UEB[id].d||(exDay(e)===UEB[id].d&&e.days[dkey()]!=null)) }
function stats(){
  const L=losE(), asked=L.filter(e=>e.miss!=null&&e.miss!=="wn"), missed=asked.filter(e=>e.miss==="ja");
  const given=L.filter(e=>WEG[e.weg]&&WEG[e.weg].g).length;
  const dec=S.wishes.filter(w=>w.st!=="wait");
  return {L,asked,missed,given,dec,lass:dec.filter(w=>w.st==="lass"||w.st==="leih").length,kauf:dec.filter(w=>w.st==="kauf").length,
    teil:S.log.filter(e=>e.k==="teil").length, exDone:Object.values(S.ex).filter(e=>e.st==="done"&&e.lived).length};
}

/* ---------- Stationen je Bereich ---------- */
function stations(a){
  const hs=(S.check&&CHECK.some(c=>c.cat===a&&S.check.ans[c.id]!=null))||S.pr.some(p=>p.cat===a);
  const exd=Object.entries(S.ex).some(([id,e])=>e.st==="done"&&e.lived&&UEB[id]&&UEB[id].cat===a);
  if(a==="ko") return [hs, S.wishes.length>0, S.log.some(e=>e.k==="teil"), exd, S.wishes.some(w=>w.st!=="wait"&&w.waited)];
  const n2=a==="er"?losE().filter(e=>e.cat==="er").length+S.pr.filter(p=>p.cat==="er"&&p.choice!=="none").length+S.keep.filter(k=>k.cat==="er").length:losE().filter(e=>e.cat===a).length;
  return [hs, n2>=3, keepers().some(k=>k.cat===a)||S.keep.some(k=>k.cat===a),
    exd, losE().some(e=>e.cat===a&&e.miss!=null)||S.keep.some(k=>k.cat===a&&k.answered)||S.box.some(b=>b.cat===a&&b.st!=="in")];
}
function areaOrder(){ const top=S.check?S.check.top:[]; return [...top,...AREAS.map(a=>a.id).filter(id=>!top.includes(id))] }

/* ---------- Genau ein nächster Schritt ---------- */
function nextStep(){
  const wd=wishDue(); if(wd.length) return {m:"Ein Wunsch hat gewartet",t:"„"+wd[0].name+"“: Willst du es noch?",x:"Die Wartezeit ist vorbei. Jetzt entscheidest du mit kühlem Kopf.",a:"open",v:"wishdec",w:wd[0].id,b:"Entscheiden"};
  if(boxDue().length) return {m:"Vielleicht-Kiste",t:"Die Kiste ist dreißig Tage zu",x:"Schau nach, was du in der Zeit gebraucht hast und was gehen kann.",a:"open",v:"kistedue",b:"Kiste öffnen"};
  const ad=askDue(); if(ad.length) return {m:"Nachfrage",t:ad.length===1?"Hast du „"+(ad[0].name||"es")+"“ vermisst?":"Hast du etwas vermisst?",x:(ad.length===1?"Am "+fdate(ad[0].ts)+" hast du es weitergegeben.":"Seit dem "+fdate(Math.min(...ad.map(e=>e.ts)))+" hast du "+ad.length+" Dinge weitergegeben.")+" Deine Antwort zeigt dir, wie leicht dir Loslassen fällt.",a:"open",v:"ask",b:"Antworten"};
  const kd=keepAskDue(); if(kd.length) return {m:"Nachfrage",t:"Stimmt der Grund noch?",x:"Du hast „"+kd[0].name+"“ bewusst behalten. Gilt dein Grund noch?",a:"open",v:"keepask",w:kd[0].id,b:"Nachsehen"};
  const ee=exEvalDue(); if(ee.length) return {m:"Übung vorbei",t:UEB[ee[0][0]].t,x:"Das war der letzte Tag. Wie ist es gelaufen?",a:"open",v:"ueb",w:ee[0][0],b:"Auswerten"};
  const et=exTodayOpen(); if(et.length) return {m:"Übung läuft",t:UEB[et[0][0]].t,x:"Tag "+exDay(et[0][1])+" von "+UEB[et[0][0]].d+". Wie lief es heute?",a:"open",v:"ueb",w:et[0][0],b:"Eintragen"};
  if(!S.check) return {m:"Zum Anfang",t:"Mach die Bestandsaufnahme",x:"Kurze Fragen zeigen, wo Besitz dir gerade am meisten Druck macht. Das dauert etwa zwei Minuten.",a:"open",v:"check",b:"Beginnen"};
  for(const a of areaOrder()){
    const st=stations(a), i=st.indexOf(false); if(i<0) continue;
    const n=AREA[a].n;
    if(i===0) return {m:n,t:"Prüfe ein Ding aus „"+n+"“",x:"Fünf Fragen helfen dir, ehrlich zu entscheiden, ob es bleibt.",a:"open",v:"pruef",w:a,b:"Ding prüfen"};
    if(a==="ko"){
      if(i===1) return {m:n,t:"Parke deinen nächsten Kaufwunsch",x:"Schreib ihn auf und lass ihn warten. Was nach der Wartezeit noch zählt, war ein echter Wunsch.",a:"open",v:"wish",b:"Wunsch parken"};
      if(i===2) return {m:n,t:"Leih, tausch oder reparier etwas",x:"Wenn du das nächste Mal etwas brauchst, frag zuerst in deiner Nähe oder probier eine Reparatur.",a:"open",v:"teil",b:"Eintragen, wenn es geklappt hat"};
      if(i===4){ if(waiting().length) continue; return {m:n,t:"Lass einen Wunsch die volle Zeit warten",x:"Parke einen Wunsch und entscheide erst, wenn die Wartezeit um ist.",a:"open",v:"wish",b:"Wunsch parken"} }
    } else {
      if(i===1&&a==="er") return {m:n,t:"Entscheide über ein Erinnerungsstück",x:"Ein Foto und eine kurze Geschichte helfen beim Entscheiden. Es kann bleiben, in die Kiste kommen oder weitergehen. Drei Entscheidungen ergeben die nächste Station.",a:"open",v:"pruef",w:a,b:"Ding prüfen"};
      if(i===1){ const c=losE().filter(e=>e.cat===a).length; return {m:n,t:"Gib etwas aus „"+n+"“ weiter",x:c?"Noch "+(3-c)+" bis zur nächsten Station. Eine Tüte zählt als ein Eintrag.":"Such dir ein Ding, das jemand anderes besser brauchen kann.",a:"open",v:"los",w:a,b:"Loslassen eintragen"} }
      if(i===2) return {m:n,t:"Was aus „"+n+"“ darf bleiben?",x:"Nenne ein Ding, das du bewusst behältst, und den Grund dafür.",a:"open",v:"keep",w:a,b:"Behalten eintragen"};
      if(i===4){ const pend=losE().some(e=>e.cat===a&&e.miss==null)||boxIn().some(b=>b.cat===a); if(pend) continue;
        return {m:n,t:"Leg Unsicheres in die Vielleicht-Kiste",x:"Dinge aus „"+n+"“, bei denen du schwankst, kommen für dreißig Tage in eine Kiste. Danach fällt die Entscheidung leichter.",a:"open",v:"kiste",w:a,b:"Zur Kiste"} }
    }
    if(i===3){ const u=pickUeb(a); if(u&&!S.ex[u.id]) return {m:n,t:"Probier die Übung „"+u.t+"“",x:u.d===1?"Dauert einen Tag.":"Dauert "+u.d+" Tage.",a:"open",v:"ueb",w:u.id,b:"Ansehen"}; if(exRun().length) continue }
  }
  return {m:"Für heute",t:"Prüfe ein Ding",x:"Nimm ein Ding in die Hand, bei dem du unsicher bist. Fünf Fragen helfen beim Entscheiden.",a:"open",v:"pruef",b:"Ding prüfen"};
}
function pickUeb(a){ const L=UEBUNGEN.filter(u=>u.cat===a&&!(S.ex[u.id]&&S.ex[u.id].st!=="stop")); return L.sort((x,y)=>x.d-y.d)[0]||null }

/* ---------- Rendern ---------- */
let TAB="home", SH=null, lastFocus=null, homeMoment=null;
function render(){
  const m=$("#main"); const y=scrollY;
  const keep=TAB; disarmTimers();
  const top=goTop&&!SH&&TAB==="home"; if(!SH) goTop=false;
  FADE_DELAY=top&&y>40&&!RM()?Math.min(1000,350+y*0.5):250;
  if(TAB==="home") autoSpend();
  m.innerHTML=TAB==="home"?vHome():TAB==="wissen"?vWissen():TAB==="ueben"?vUeben():vWeg();
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-current",t.dataset.tab===TAB?"page":"false"));
  document.body.classList.toggle("sub-tab",TAB!=="home");
  moveDot();
  if(TAB==="home") mountBild(); else Bild.stop();
  settleSel(m);
  if(top) scrollTo({top:0,behavior:RM()?"auto":"smooth"});
  else if(keep===TAB) scrollTo(0,y);
}
/* Nach einem Eintrag mit Schwung: zurück zum Bild, dort spielt die Überblendung */
let goTop=false, FADE_DELAY=250;
function moveDot(){ const t=document.querySelector('.tab[aria-current="page"]'), d=$(".tabdot"); if(!t||!d) return;
  const r=t.getBoundingClientRect(), n=$(".tabs").getBoundingClientRect(); d.style.transform=`translateX(${r.left-n.left+r.width/2-2.5}px)` }
let timers=[]; function later(fn,ms){ const tab=TAB; const id=setTimeout(()=>{ if(TAB===tab) fn() },ms); timers.push(id) }
function disarmTimers(){ timers.forEach(clearTimeout); timers=[] }

function areaChips(sel,act,opt){ opt=opt||{};
  return `<div class="chips" role="group" aria-label="Bereich">${AREAS.map(a=>`<button class="chip${sel===a.id?" on":""}" aria-pressed="${sel===a.id}" data-a="${act}" data-v="${a.id}"><i class="dot ${a.id}"></i>${esc(a.n)}</button>`).join("")}</div>` }
const SIZEICO={
  1:`<svg viewBox="0 0 30 24" aria-hidden="true"><rect x="10" y="8" width="10" height="14" rx="1.5" fill="currentColor"/></svg>`,
  3:`<svg viewBox="0 0 30 24" aria-hidden="true"><path d="M11 9l4-5 4 5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="8" y="8" width="14" height="14" rx="2" fill="currentColor"/></svg>`,
  6:`<svg viewBox="0 0 30 24" aria-hidden="true"><rect x="5" y="7" width="20" height="15" rx="1.5" fill="currentColor"/><rect x="13.5" y="7" width="3" height="7" fill="var(--surface)"/></svg>`,
  10:`<svg viewBox="0 0 30 24" aria-hidden="true"><rect x="3" y="6" width="24" height="4" rx="1" fill="currentColor"/><rect x="5" y="10" width="3" height="12" fill="currentColor"/><rect x="22" y="10" width="3" height="12" fill="currentColor"/></svg>`};
const WEGICO={
  ver:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M12 9v11M4 13h16M12 9c-2-4-6-3-5-1s5 1 5 1 4 1 5-1-3-3-5 1"/></svg>`,
  vk:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l8-8h7v7l-8 8z"/><circle cx="15.5" cy="8.5" r="1.3"/></svg>`,
  spe:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10l1.5-5h9L18 10M5 10h14v10H5z"/><path d="M9.5 14h5"/></svg>`,
  rec:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l3-3 3 3M10 4v8M17 17l-3 3-3-3M14 20v-8M4 15l2.5-4M20 9l-2.5 4"/></svg>`,
  mue:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13"/></svg>`};
const MARK=`<svg class="mark" viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="11" width="12" height="2" rx="1" fill="currentColor"/><rect x="3" y="3" width="3" height="8" rx=".8" fill="currentColor"/><rect x="8" y="3.4" width="2.8" height="7.6" rx=".8" fill="currentColor" transform="rotate(-24 8 11)"/></svg>`;
const evDots=n=>`<span class="ev" aria-label="Belegstufe: ${EV[n].n}">${[0,1,2].map(i=>`<i class="${i<n?"on":""}"></i>`).join("")}</span>`;
const chev=`<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>`;
const ICON={
  los:`<svg class="fx" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="var(--surface2)"/><path d="M15 15l5-6 5 6" fill="none" stroke="var(--c-ko)" stroke-width="2"/><rect x="11" y="14" width="18" height="18" rx="2.5" fill="var(--c-ko)"/><path d="M27 19l4 6" stroke="var(--ink)" stroke-width="1" opacity=".5"/><circle cx="31" cy="27.5" r="3.4" fill="var(--surface)" stroke="var(--ink)" stroke-opacity=".4"/></svg>`,
  keep:`<svg class="fx" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="var(--surface2)"/><ellipse cx="20" cy="30" rx="12" ry="2.6" fill="var(--surface)" stroke="var(--ink)" stroke-opacity=".45"/><rect x="14" y="13" width="10" height="15" rx="1.5" fill="var(--c-wo)" stroke="var(--ink)" stroke-opacity=".45"/><path d="M24 16.5a3.6 3.6 0 010 6" fill="none" stroke="var(--c-wo)" stroke-width="2"/></svg>`,
  wish:`<svg class="fx" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="var(--surface2)"/><rect x="11" y="22" width="18" height="9" rx="2" fill="var(--c-pa)" opacity=".3"/><rect x="11" y="13" width="18" height="18" rx="2.5" fill="none" stroke="var(--c-pa)" stroke-width="2" stroke-dasharray="3.5 2.6"/><path d="M20 13v5" stroke="var(--c-pa)" stroke-width="2"/></svg>`,
  teil:`<svg class="fx" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="var(--surface2)"/><path d="M12 22a8 8 0 0113.6-5.6M28 18a8 8 0 01-13.6 5.6" fill="none" stroke="var(--c-wo)" stroke-width="2" stroke-linecap="round"/><path d="M25.8 12.6l.2 4.4-4.4-.2M14.2 27.4l-.2-4.4 4.4.2" fill="none" stroke="var(--c-wo)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};
const LEG={keep:`<svg viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="8" cy="13.5" rx="6.5" ry="1.6" fill="var(--surface)" stroke="var(--muted)" stroke-width="1"/><rect x="5" y="4" width="6" height="8.5" rx="1" fill="var(--c-wo)" stroke="var(--ink)" stroke-opacity=".5" stroke-width=".8"/></svg>`,
  wish:`<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="var(--c-pa)" stroke-width="1.5" stroke-dasharray="2.6 1.8"/></svg>`,
  bag:`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 6.5L7.5 2.5 10 6.5" fill="none" stroke="var(--c-ko)" stroke-width="1.3"/><rect x="3" y="6" width="9" height="9" rx="1.5" fill="var(--c-ko)"/><circle cx="12.6" cy="11.6" r="2.6" fill="var(--surface)" stroke="var(--c-ko)" stroke-width="1"/></svg>`};

function bildModel(R,keepL,bags,spend){
  const st=stageOf(R), B=bags||bagList();
  const faded=S.wishes.filter(w=>w.st==="lass"||w.st==="leih").length;
  const Wt=waiting();
  return {r:rOf(R),w:R,stage:st,keep:keepL.map(k=>Object.assign({id:k.id,cat:k.cat,why:k.why},k.motif?{motif:k.motif}:{})),paths:B.length,bags:B,
    wishes:Wt.map(w=>({cat:w.cat,p:Math.max(0,Math.min(1,(now()-w.ts)/Math.max(1,w.due-w.ts)))})),motes:faded,date:new Date(now()),
    focus:focusKats(),spend:(spend||S.spend||[]).map(x=>Object.assign({k:x.k,z:x.z,n:x.n},x.alt?{alt:1}:{}))};
}
/* Hinweis auf die Stellen: beim ersten Besuch (gestrichelte Kreise und ein Etikett am oberen Bildrand).
   Er geht beim ersten Antippen, beim ersten Eintrag oder nach 8 s weg. */
let zHintNow=false, zMarkNext=null;
function zHintOff(){ zHintNow=false; document.querySelectorAll(".zone-hit.zeig").forEach(e=>e.classList.remove("zeig")); const p=$(".zhint"); if(p) p.remove() }
/* Was im Bild noch liegt, je Kategorie (in Schwung bis alles fort ist) */
function katRest(k){ return Bild.restKat(bildModel(raum(),keepers()).spend,k,keepers()) }
function katOffen(){ return KATEGORIEN.filter(k=>katRest(k.id)>0) }
/* Wer nicht wählen will: alles Bekommene wird in der festen Reihenfolge des Bildes eingesetzt */
function autoSpend(){ if(!S.settings.auto) return; const G=guthaben(); if(G>0) S.spend.push({k:"_alt",n:G,ts:now(),auto:1}) }
/* Vor der Bestandsaufnahme zeigt das Bild das Ziel: ein ruhiges Zimmer. Danach zieht der Kram ein (dein Stand gerade). */
const vorher=()=>!S.check&&!S.spend.length&&weite()===0&&!S.skipCheck;
function cleanModel(K,BL){ const m=bildModel(210,K,BL,[{k:"_alt",n:210,alt:1}]); m.focus=[]; return m }
function capt(cv,txt,ms){ const st=cv.parentNode; if(!st) return; st.querySelectorAll(".zverw").forEach(e=>e.remove()); const o=document.createElement("p"); o.className="zverw"; o.setAttribute("aria-live","polite"); o.textContent=txt; st.appendChild(o);
  if(ms){ setTimeout(()=>o.classList.add("weg"),ms); setTimeout(()=>o.remove(),ms+800) } }
function mountBild(){
  const cv=$("#bild"); if(!cv) return; autoSpend();
  const R=raum(), K=keepers(), st=stageOf(R);
  const BL=bagList(), V=vorher(), sig={w:R,ns:S.spend.length,k:K.map(k=>k.id).join(","),p:BL.length,s:waiting().length,f:focusKats().join(),c:S.check?S.check.ts:0,v:V?1:0};
  const sh=S.shown;
  if(V){ const mc=cleanModel(K,BL); mc.delay=0; Bild.mount(cv,mc,null); const ov=$("#hits"); if(ov) ov.innerHTML=""; const zl=$(".zliste"); if(zl) zl.hidden=true; const zp=$(".zhint"); if(zp) zp.remove();
    capt(cv,"So kann es bei dir aussehen. Die Bestandsaufnahme zeigt, wo du gerade stehst.",0); S.shown=sig; save(); return }
  let from=null;
  // Verwandlung nach einer (neuen) Bestandsaufnahme oder geändertem Schwerpunkt. Ältere Stände ohne f/c gelten als „vorher ohne Schwerpunkt“.
  // Einzug: nach jeder neuen Bestandsaufnahme (oder wenn man sie überspringt) vom ruhigen Ziel-Zimmer zum Stand gerade
  const einzug=!!(sh&&(sh.v===1||((sh.c||0)!==sig.c&&sig.c)));
  const fChange=einzug||!!(sh&&sh.f!=null&&sh.f!==sig.f);
  if(sh&&(sh.w!==R||sh.k!==sig.k||sh.p!==sig.p||fChange)){
    const oldK=K.filter(k=>sh.k.split(",").includes(k.id)), ns=sh.ns==null?S.spend.length:Math.min(sh.ns,S.spend.length);
    const oldSp=sh.w<R?S.spend.slice(0,ns):S.spend, oldR=oldSp.reduce((s,x)=>s+x.n,0);
    from=bildModel(oldR,oldK,BL.slice(BL.length-Math.min(sh.p,sig.p)),oldSp);
    if(fChange) from.focus=sh.f&&(sh.c||0)===sig.c?sh.f.split(","):[];
  }
  if(einzug){ from=cleanModel(K,BL) }
  const m=bildModel(R,K,BL);
  const newK=from?K.filter(k=>!sh.k.split(",").includes(k.id)):[];
  if(from){ if(newK.length) m.ringKeep=newK[newK.length-1].id; else if(st>stageOf(from.w)) m.ringStage=true }
  m.delay=FADE_DELAY;
  // Neuer Schwerpunkt: langsame, gut sichtbare Verwandlung, das Bild steht dafür oben im Blick
  if(einzug){ m.delay=1100; m.fadeDur=3400; if(scrollY>0) scrollTo({top:0,behavior:"auto"});
    capt(cv,"So ruhig kann es werden",1000);
    setTimeout(()=>{ if(cv.isConnected) capt(cv,m.focus.length?"Dein Zimmer gerade. Schwerpunkt: "+m.focus.map(k=>KAT[k].n).join(", "):"Dein Zimmer gerade. Stück für Stück wird es wieder ruhig.",5200) },1300) }
  else if(fChange){ m.delay=900; m.fadeDur=2600; if(scrollY>0) scrollTo({top:0,behavior:"auto"});
    // Etikett im Bild, damit man den Zusammenhang sieht
    const st=cv.parentNode; if(st&&m.focus.length){ const o=document.createElement("p"); o.className="zverw"; o.setAttribute("aria-live","polite");
      o.textContent="Dein Schwerpunkt: "+m.focus.map(k=>KAT[k].n).join(", "); st.appendChild(o); setTimeout(()=>o.classList.add("weg"),5200); setTimeout(()=>o.remove(),6000) }
    else if(st){ const o=document.createElement("p"); o.className="zverw"; o.textContent="Kein Schwerpunkt: alle Sorten sehen gleich aus"; st.appendChild(o); setTimeout(()=>o.classList.add("weg"),4200); setTimeout(()=>o.remove(),5000) } }
  const info=Bild.mount(cv,m,from);
  const ov=$("#hits"); if(ov){ const Wc=cv.clientWidth, Hc=cv.clientHeight;
    // Tastatur: Die Flächen im Bild sind aus der Tab-Reihenfolge genommen (tabindex -1). Die Liste „Was liegt hier?“ führt zu denselben Blättern.
    const hintOn=!S.mom["zonen-tipp"]||zHintNow;
    ov.innerHTML=(info.zones||[]).filter(z=>z.dot&&KAT[z.kat]).map(z=>`<button class="zone-hit${hintOn?" zeig":""}" tabindex="-1" data-a="zone" data-v="${z.id}" style="left:${z.hx/Wc*100}%;top:${z.hy/Hc*100}%" aria-label="${esc(KAT[z.kat].n)}, ${esc(ORT[z.id.split("@")[1]]||"im Zimmer")}"></button>`).join("")+info.hits.map(k=>{ const kk=S.keep.find(x=>x.id===k.id)||{};
      return `<button class="ding-hit" data-a="open" data-v="keepview" data-w="${k.id}" style="left:${k.hx/Wc*100}%;top:${k.hy/Hc*100}%;width:${Math.round(k.hr*2)}px;height:${Math.round(k.hr*2)}px" aria-label="${esc(kk.name||k.ding||"Behaltenes Ding")}, ${esc(AREA[k.cat]?AREA[k.cat].n:"")}, ${esc(GRUND[k.why]?GRUND[k.why].n:"bewusst behalten")}"></button>` }).join("") }
  if(fChange&&ov){ ov.style.transition="opacity .5s"; ov.style.opacity="0"; const zp0=$(".zhint"); if(zp0) zp0.style.visibility="hidden";
    setTimeout(()=>{ ov.style.opacity="1"; const z=$(".zhint"); if(z) z.style.visibility="" },einzug?5200:3800) }
  const stUp=from&&st>stageOf(from.w);
  S.shown=sig;
  // Liste „Was liegt hier?“: die Kategorien, die im Bild noch etwas haben, je mit ihrer größten Stelle
  const zl=$(".zliste"); if(zl){ const seen=new Set(), F=m.focus||[], Z=(info.zones||[]).filter(z=>KAT[z.kat]&&!seen.has(z.kat)&&seen.add(z.kat)).sort((a,b)=>(F.includes(a.kat)?0:1)-(F.includes(b.kat)?0:1));
    zl.hidden=!Z.length; zl.querySelector(".list").innerHTML=Z.map(z=>`<button class="row" data-a="zone" data-v="${z.id}"><i class="dot ${KAT[z.kat].cat}"></i><span class="t"><b>${esc(KAT[z.kat].n)}</b><span>${F.includes(z.kat)?"Dein Schwerpunkt · ":""}${esc(KAT[z.kat].kurz)}</span></span>${chev}</button>`).join("") }
  const zp=$(".zhint"); if(zp&&!(info.zones||[]).length) zp.remove();
  if(!S.mom["zonen-tipp"]&&!SH&&(info.zones||[]).length){ S.mom["zonen-tipp"]=now(); zHintNow=true; setTimeout(zHintOff,fChange?13000:8000) }
  // Nach dem Abräumen: die Stelle während der Überblendung markieren
  if(zMarkNext&&from){ Bild.markGone(from,m,FADE_DELAY) } else if(fChange&&m.focus.length) Bild.markFocus(m,einzug?1100+3400:900+2600); zMarkNext=null;
  save();
  later(()=>maybeMoment(),fChange?7200:from?(stUp?2600:1500)+FADE_DELAY-250:700);
}

let NXALT=0;
/* ---------- Heute: ein geführter Weg in drei Schritten ----------
   1 Eine Aufgabe aus einer Sorte machen (mit Zeitgeber), 2 im Bild abräumen, 3 eintragen, was geht, oder sagen, dass alles bleibt.
   Die Sorte des Tages folgt den Bereichen aus der Bestandsaufnahme; „Andere Sorte“ wechselt. */
const KAT_AREA=k=>({kl:0,pa:1,er:2,wo:3,ko:4})[KAT[k].cat];
function heuteKat(n){ const L=katOffen(); if(!L.length) return null; const ord=areaOrder();
  const F=focusKats(), sc=k=>(F.includes(k.id)?F.indexOf(k.id)*3-100:0)+ord.indexOf(k.cat)*10+(S.log.some(e=>e.k==="chal"&&e.kat===k.id&&now()-e.ts<3*DAY)?50:0)+hsh(k.id+dkey())%7;
  const A=L.slice().sort((a,b)=>sc(a)-sc(b)); return A[(n||0)%A.length].id }
function heute(){ const d=dkey();
  if(!S.heute||S.heute.day!==d||!KAT[S.heute.kat]) S.heute={day:d,n:0,kat:heuteKat(0)};
  const H=S.heute; if(!H.kat) return null; const k=KAT[H.kat];
  const done=c=>S.log.some(e=>e.k==="chal"&&e.cid===c.id&&dkey(e.ts)===d);
  const chalToday=S.log.some(e=>dkey(e.ts)===d&&((e.k==="chal"&&e.kat===k.id)||(e.k==="los"&&e.z===k.id)))||S.box.some(b=>dkey(b.ts)===d&&b.cat===k.cat);
  const spentToday=S.spend.some(x=>dkey(x.ts)===d&&(x.auto||(!x.alt&&x.k===k.id)));
  const c=k.ch.find(c=>!done(c))||k.ch[0], rest=katRest(k.id), cost=Math.min(PREIS,rest), G=guthaben();
  const entered=S.log.some(e=>e.k==="los"&&e.z===k.id&&dkey(e.ts)===d)||S.box.some(b=>dkey(b.ts)===d&&b.cat===k.cat)||S.log.some(e=>e.k==="keep"&&dkey(e.ts)===d&&e.cat===k.cat);
  const step=!chalToday?0:H.fertig?3:(!spentToday&&rest>0)?1:!entered?2:3;
  return {k,c,step,cost,G,rest,first:k.ch.indexOf(c)===0&&!chalToday} }
function stelleFor(kid){ const P=Bild.placed().filter(z=>z.kat===kid); return (P.find(z=>z.dot)||P[0]||{id:kid+"@"}).id }
const URGENT=["Ein Wunsch hat gewartet","Vielleicht-Kiste","Nachfrage","Übung vorbei","Übung läuft","Zum Anfang"];
function heuteHTML(){
  const eng=nextStep();
  if(URGENT.includes(eng.m)&&!(S.urgLater===dkey()&&eng.m!=="Zum Anfang")) return `<section class="next" aria-labelledby="nx-t">
    <div class="next-h">${MARK}Zuerst das · ${esc(eng.m)}</div>
    <h3 id="nx-t">${esc(eng.t)}</h3><p>${esc(eng.x)}</p>
    <div class="next-b"><button class="btn" data-a="${eng.a}" data-v="${eng.v}" data-w="${esc(eng.w||"")}">${esc(eng.b)}</button>${eng.m!=="Zum Anfang"?`<button class="btn quiet" data-a="urg-later">Später</button>`:`<button class="btn quiet" data-a="check-skip">Ohne Bestandsaufnahme starten</button>`}</div></section>`;
  const h=heute(); if(!h) return `<section class="next"><div class="next-h">${MARK}Heute</div><h3 id="nx-t">Im Bild ist alles abgeräumt</h3><p>Was du jetzt tust, hält es so. Parke den nächsten Kaufwunsch, bevor du kaufst.</p><div class="next-b"><button class="btn" data-a="open" data-v="wish">Wunsch parken</button></div></section>`;
  const {k,c,step,cost,G}=h, dots=`<span class="hdots" aria-hidden="true">${[0,1,2].map(i=>`<i class="${i<step?"on":i===step?"cur":""}"></i>`).join("")}</span>`;
  const head=t=>`<div class="next-h">${MARK}<span>${t}</span>${dots}</div>`;
  if(step===0) return `<section class="next heute" aria-labelledby="nx-t">${head("Vorschlag für heute · Schritt 1 von 3")}
    <p class="hk"><i class="dot ${k.cat}"></i>${esc(k.n)}${h.first?" · fang hiermit an":""}</p>
    <h3 id="nx-t">${esc(c.t)}</h3><p>${esc(school()&&c.s?c.s:c.x)}</p>
    <div class="next-b"><button class="btn" data-a="heute-go">Los<small>· ${c.min}\u00a0Min. mit Zeitgeber</small></button><button class="btn quiet" data-a="chal" data-v="${c.id}">Schon erledigt</button><button class="btn quiet" data-a="heute-alt">Andere Sorte</button></div>
    <p class="hfuss">Ob danach etwas geht oder alles bleibt, entscheidest du.</p></section>`;
  if(step===1) return G>=cost?`<section class="next heute" aria-labelledby="nx-t">${head("Vorschlag für heute · Schritt 2 von 3")}
    <h3 id="nx-t">Räum im Bild ab: ${esc(k.n)}</h3><p>Du hast ${hb(G)}. Ein Tipp, und im Bild wird bei ${esc(k.n)} Platz frei.</p>
    <div class="next-b"><button class="btn" data-a="spend" data-v="${esc(stelleFor(k.id))}">Abräumen<small>· ${hb(cost)}</small></button></div>
    <p class="hfuss">Du kannst auch selbst wählen: Tipp im Bild auf etwas anderes.</p></section>`
   :`<section class="next heute" aria-labelledby="nx-t">${head("Vorschlag für heute · Schritt 2 von 3")}
    <h3 id="nx-t">Wenn du magst: ${esc(c.t)}</h3><p>${esc(school()&&c.s?c.s:c.x)}</p>
    <div class="next-b"><button class="btn" data-a="heute-go">Los<small>· ${c.min}\u00a0Min.</small></button><button class="btn quiet" data-a="heute-fertig">Für heute reicht es</button></div>
    <p class="hfuss">Im Bild abräumen kannst du ab ${hb(cost)}. Du hast ${hb(G)}, sie bleiben dir.</p></section>`;
  if(step===2) return `<section class="next heute" aria-labelledby="nx-t">${head("Vorschlag für heute · Schritt 3 von 3")}
    <h3 id="nx-t">Geht etwas aus ${esc(k.n)} weiter?</h3><p>Trag ein, was gehen soll. Wenn alles bleiben darf, ist das auch eine Antwort.</p>
    <div class="next-b"><button class="btn" data-a="zone-go" data-v="los" data-w="${k.id}">Loslassen eintragen</button><button class="btn quiet" data-a="heute-fertig">Alles bleibt</button></div>
    <p class="hfuss">Unsicher? <button class="lnk inl" data-a="zone-go" data-v="kiste" data-w="${k.id}">In die Vielleicht-Kiste</button></p></section>`;
  return `<section class="next heute" aria-labelledby="nx-t">${head("Heute geschafft")}
    <h3 id="nx-t">Für heute reicht das</h3><p>Morgen ist die nächste Sorte dran. Wenn du Lust auf mehr hast: noch eine Aufgabe aus ${esc(k.n)}.</p>
    <div class="next-b"><button class="btn quiet" data-a="zone" data-v="${esc(stelleFor(k.id))}">${esc(k.n)} ansehen</button><button class="btn quiet" data-a="heute-alt">Andere Sorte</button></div></section>`;
}
/* Ein Schritt aus dem Bild: eine Sorte, die im Bild noch liegt, mit ihrer ersten offenen Aufgabe von heute */
function roomStep(st){ const L=katOffen(); if(!L.length){ const s=SCHRITTE[st]||SCHRITTE[0]; return {m:"Im Zimmer",t:s[0],x:s[1],min:s[2],a:"open",v:"timer",w:String(s[2]),b:"Los",step:1} }
  const k=L[hsh(dkey()+S.spend.length)%L.length], c=k.ch.find(c=>!S.log.some(e=>e.k==="chal"&&e.cid===c.id&&dkey(e.ts)===dkey()))||k.ch[0];
  return {m:"Im Bild: "+k.n,t:c.t,x:c.x,min:c.min,a:"zone",v:k.id,b:"Ansehen"} }
function vHome(){
  const W=raum(), st=stageOf(W), S1=STUFEN[st], S2=STUFEN[st+1], G=guthaben();
  const pct=S2?Math.round((W-S1.w)/(S2.w-S1.w)*100):100;
  const hint=pickHint();
  const box=boxIn().length;
  const nK=keepers().length, nW=waiting().length, nP=bagList().length;
  const leg=[nK&&`<span>${LEG.keep}${nK} behalten</span>`,nW&&`<span>${LEG.wish}${nW} ${plural(nW,"Wunsch wartet","Wünsche warten")}</span>`,nP&&`<span>${LEG.bag}${nP} geteilt</span>`].filter(Boolean).join("");
  return `<h1 class="sr">Luftholen</h1>
  <div class="stage"><canvas id="bild" role="img" aria-label="Dein Zimmer, Stufe ${st+1} von 10: ${esc(S1.n)}. ${esc(S1.x)}"></canvas>
    <button class="img-hit" data-a="imgtap" aria-label="Was in deinem Zimmer zu sehen ist"></button><div id="hits"></div>
    ${!S.mom["zonen-tipp"]||zHintNow?`<p class="zhint" aria-hidden="true">Tipp auf etwas im Bild</p>`:""}</div>
  ${leg?`<div class="legende" aria-hidden="true">${leg}</div>`:""}
  ${focusKats().length?`<p class="fokus-z">Schwerpunkt: ${focusKats().map(k=>esc(KAT[k].n)).join(", ")} <button class="lnk inl" data-a="fokus-off">ausblenden</button></p>`:S.settings.nofocus&&S.check?`<p class="fokus-z"><button class="lnk inl" data-a="fokus-off">Schwerpunkt wieder zeigen</button></p>`:""}
  ${heuteHTML()}
  <button class="stufe" data-a="open" data-v="stufen" aria-label="Stufe ${st+1} von 10: ${esc(S1.n)}. ${G} ${EIN} zum Einsetzen. Alle Stufen ansehen">
    <span class="stufe-kopf"><span class="stufe-n"><small>Stufe ${st+1} von 10</small><b>${esc(S1.n)}</b></span>${st>=9?`<span class="weite">Zimmer frei</span>`:`<span class="weite${G>=1?" voll":""}"><b>${G}</b> ${EIN}</span>`}</span>
    <span class="raster" aria-hidden="true">${STUFEN.map((x,i)=>`<i class="${i<=st?"v":i===st+1?"j":""}"${i===st+1?` style="--p:${Math.max(0,Math.min(100,pct))}%"`:""}></i>`).join("")}</span></button>
  <p class="stufe-p">${vorher()?`So kann dein Zimmer aussehen, wenn du fertig bist. Mach die Bestandsaufnahme, dann siehst du dein Zimmer, wie es gerade ist.`:G>=PREIS&&st<9?`<b>Du hast ${hb(G)}.</b> Tipp im Bild auf etwas, das du abräumen willst. Was bleibt, entscheidest du.`:`${esc(S1.x)} ${st>=9?"Handbreit zählen jetzt nur noch für dich. ":""}${S2?`Noch <b>${hb(S2.w-W)}</b> einsetzen bis „${esc(S2.n)}“.`:"Was du jetzt tust, hält es so."}`}${weite()<1&&!S.spend.length?` Handbreit bekommst du für Aufgaben und Entscheidungen: Loslassen, Behalten, Vielleicht-Kiste.`:""}</p>
  ${st<9?`<details class="zliste" hidden><summary>Was liegt hier?</summary>
    <p class="small muted" style="margin:0 0 6px">Jedes Ding im Bild steht für eine Sorte, die es fast überall gibt. Tipp auf eine, um zu sehen, was du in deinem Zuhause tun kannst.</p>
    <div class="list"></div></details>`:""}
  ${hint?hintHTML(hint):""}
  <h2 class="acts-h">Was hast du gemacht?</h2>
  <div class="acts">
    <button class="tile" data-a="open" data-v="los">${ICON.los}<div><b>Loslassen</b><span>Weitergeben, verschenken, verkaufen</span></div></button>
    <button class="tile" data-a="open" data-v="keep">${ICON.keep}<div><b>Behalten</b><span>Was bleibt, bekommt einen Grund</span></div></button>
    <button class="tile" data-a="open" data-v="wish">${ICON.wish}<div><b>Wunsch parken</b><span>Erst warten, dann entscheiden</span></div></button>
    <button class="tile" data-a="open" data-v="teil">${ICON.teil}<div><b>Statt neu</b><span>Geliehen, gebraucht, repariert</span></div></button>
  </div>
  <div class="links"><button class="lnk" data-a="open" data-v="pruef">Ein Ding prüfen</button><button class="lnk" data-a="open" data-v="kiste">Vielleicht-Kiste${box?" ("+box+")":""}</button>${waiting().length?`<button class="lnk" data-a="open" data-v="wishes">Geparkte Wünsche (${waiting().length})</button>`:""}</div>
  ${aufgSection()}`;
}
/* Kleine Aufgaben auf der Startseite: drei, zuerst neutrale Aufräum-Aufgaben, keine Konsum-Aufgaben vorn */
/* a31 (Kleiderstuhl) und a15 (Papierstapel) gibt es als Aufgaben im Bild, auf der Startseite stehen sie nicht doppelt */
const AUF_RAUM=["a06","a30","a33","a05","a32","a29","a03","a04","a19","a10","a16","a17","a18"];
const AUF_KONSUM=["a08","a09","a11","a12","a13","a14","a22","a23","a24","a28"];
const AUF_N=3;
function aufgPick(){
  const order=areaOrder(), today=dkey();
  const open=AUFGABEN.filter(a=>(a.art==="oft"||!aufDone(a.id))&&a.id!=="a31"&&a.id!=="a15");
  const doneToday=open.filter(a=>a.art==="oft"&&aufToday(a.id));
  const ri=a=>AUF_RAUM.indexOf(a.id);
  const score=a=>(AUF_KONSUM.includes(a.id)?5000:0)+(ri(a)<0?2000:ri(a)*25)+order.indexOf(a.cat)*10+hsh(a.id+today)%90;
  const rest=open.filter(a=>!doneToday.includes(a)).map(a=>[score(a),a]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
  const n=AUF_N-Math.min(1,doneToday.length), out=[], per={};
  for(const a of rest){ if(out.length>=n) break; if(per[a.cat]) continue; per[a.cat]=1; out.push(a) }
  // Eine der drei verändert etwas dauerhaft (einmalige Aufgabe), wenn es noch eine gibt
  if(!out.some(a=>a.art==="einmal")){ const e=rest.find(a=>a.art==="einmal"&&!out.includes(a)&&!AUF_KONSUM.includes(a.id)); if(e&&out.length) out[out.length-1]=e }
  return [...doneToday.slice(0,1),...out];
}
function aufgTile(a){ const today=a.art==="oft"&&aufToday(a.id), done=a.art==="einmal"&&aufDone(a.id), n=aufCount(a.id);
  return `<button class="aufg${today||done?" done":""}" data-a="aufg" data-v="${a.id}" aria-pressed="${today||done}" aria-label="${esc(a.t)}${today?", heute erledigt":done?", erledigt":""}"><span class="aufg-tx"><span class="aufg-t">${esc(a.t)}</span><span class="aufg-m"><i class="dot ${a.cat}"></i>${esc(AREA[a.cat].n)} · ${today?"heute erledigt":done?"erledigt":a.art==="einmal"?"einmalig · +"+a.w:"wiederholbar · +"+a.w+(n?", schon "+n+"×":"")}</span></span><span class="aufg-ok" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4.5 10.5l3.5 3.5 7.5-8"/></svg></span></button>` }
function aufgSection(){ const L=aufgPick(); if(!L.length) return "";
  return `<section class="sec"><div class="sec-h"><h2>Kleine Aufgaben</h2><button class="lnk nowrap" data-a="open" data-v="aufgaben">Alle\u00a0${AUFGABEN.length}</button></div>
  <div class="aufg-list">${L.map(aufgTile).join("")}</div>
  <p class="muted small" style="margin:8px 2px 0">Antippen, wenn erledigt. Nichts verfällt.</p></section>` }
function firstSentence(t){ const m=String(t).match(/^.+?[.!?](\s|$)/); return m?m[0].trim():t }
function monthCard(){ const M=MONATE[new Date(now()).getMonth()]; if(!M) return ""; const u=UEB[M.u];
  return `<section class="sec"><div class="sec-h"><h2>Gerade dran</h2><span class="meta">${new Date(now()).toLocaleDateString("de-DE",{month:"long"})}</span></div>
  <button class="card" data-a="open" data-v="${u?"ueb":"none"}" data-w="${u?u.id:""}"><div class="meta"><i class="dot ${M.cat}"></i>${esc(AREA[M.cat]?AREA[M.cat].n:"")}</div><h3>${esc(M.t)}</h3><p>${esc(M.x)}</p>${u?`<p class="meta" style="margin-top:8px">Dazu passt: ${esc(u.t)}</p>`:""}</button></section>` }
function impOfDay(){ if(!IMPULSE.length) return null; const today=dkey();
  const readT=IMPULSE.find(i=>S.read[i.id]&&dkey(S.read[i.id])===today&&S.dayImp===today+i.id); if(readT) return readT;
  if(S.dayImpPick&&S.dayImpPick.d===today&&IMP[S.dayImpPick.id]) return IMP[S.dayImpPick.id];
  const un=IMPULSE.filter(i=>!S.read[i.id]); const L=un.length?un:IMPULSE; const p=L[hsh(today)%L.length];
  S.dayImpPick={d:today,id:p.id}; return p }

/* ---------- Hinweise: höchstens einer am Tag ---------- */
function pickHint(){
  const today=dkey(), H=S.hint;
  if(H.later===today) return null;
  if(H.day===today) return H.key&&!H.off[H.key]?hintDef(H.key):null;
  const d=new Date(now()), C=[];
  const pm=prevMonth(); if(pm&&!askDue().length&&S.inflow[pm.k]==null&&!H.off["zufluss-"+pm.k]) C.push("zufluss-"+pm.k);
  const losToday=losE().filter(e=>dkey(e.ts)===today).length;
  const recentWish=S.wishes.some(w=>now()-w.ts<7*DAY);
  if(losToday>=3&&!recentWish) C.push("lizenz-"+today);
  if(d.getDay()===0&&S.log.some(e=>now()-e.ts<7*DAY)) C.push("woche-"+today);
  if(IOS&&/Safari/.test(navigator.userAgent)&&!/CriOS|FxiOS/.test(navigator.userAgent)&&navigator.standalone===false&&now()-S.created>2*DAY) C.push("home");
  const k=C.find(c=>!H.off[c]); if(!k) return null;
  H.day=today; H.key=k; save(); return hintDef(k);
}
const INF=[["0","Nichts"],["1","1 bis 3 Dinge"],["4","4 bis 10 Dinge"],["11","Mehr als 10"]];
function prevMonth(){ const d=new Date(now()); const p=new Date(d.getFullYear(),d.getMonth()-1,1);
  if(S.created>new Date(d.getFullYear(),d.getMonth(),1).getTime()-20*DAY) return null;
  return {k:p.getFullYear()+"-"+String(p.getMonth()+1).padStart(2,"0"),n:p.toLocaleDateString("de-DE",{month:"long"})} }
function hintDef(k){
  if(k.startsWith("zufluss-")){ const pm=prevMonth(); if(!pm) return null; return {k,t:"Was kam im "+pm.n+" dazu?",x:"Zähl grob, was neu in deinen Besitz gekommen ist: Gekauftes, Geschenke, Gratisdinge. Verbrauchsgüter wie Essen zählen nicht. Die Antwort zeigt dir, wie viel hereinkommt, nicht nur, wie viel geht.",inf:pm.k} }
  if(k.startsWith("lizenz")) return {k,t:"Viel Platz gemacht",x:"Der größte Hebel ist, was gar nicht erst hereinkommt. Wenn du das nächste Mal etwas kaufen willst, parke es zuerst.",b:"Wunsch parken",a:"open",v:"wish"};
  if(k.startsWith("woche")){ const L=S.log.filter(e=>now()-e.ts<7*DAY), l=L.filter(e=>e.k==="los").length, w=L.filter(e=>e.k==="wunsch").length, t=L.filter(e=>e.k==="teil").length, ag=L.filter(e=>e.k==="aufg").length;
    const parts=[]; if(l) parts.push(l+" "+plural(l,"Eintrag","Einträge")+" losgelassen"); if(w) parts.push(w+" "+plural(w,"Wunsch","Wünsche")+" entschieden"); if(t) parts.push(t+"-mal statt neu"); if(ag) parts.push(ag+" kleine "+plural(ag,"Aufgabe","Aufgaben"));
    return {k,t:"Deine Woche",x:(parts.length?parts.join(", ")+". ":"")+"Was soll nächste Woche Platz bekommen?",b:"Ein Ding prüfen",a:"open",v:"pruef"} }
  if(k==="sichern") return {k,t:"Sichere deine Daten",x:"Alles liegt nur auf diesem Gerät. Eine Sicherung schützt deine Einträge, falls der Browser Daten löscht.",b:"Jetzt sichern",a:"open",v:"daten"};
  if(k==="home") return {k,t:"Leg Luftholen auf den Home-Bildschirm",x:"Tipp in Safari auf Teilen und dann auf „Zum Home-Bildschirm“. Dann öffnet sich Luftholen wie eine App, und Safari löscht deine Daten nicht.",b:null};
  return null;
}
function hintHTML(h){ if(h.inf) return `<section class="box" style="margin-top:14px" aria-label="Frage zum Monat"><b>${esc(h.t)}</b><p class="small" style="margin:4px 0 10px">${esc(h.x)}</p>
  <div class="chips">${INF.map(([v,n])=>`<button class="chip" data-a="inflow" data-v="${h.inf}" data-w="${v}">${n}</button>`).join("")}</div>
  <div class="links"><button class="lnk" data-a="hint" data-v="off">Nicht beantworten</button></div></section>`;
  return `<section class="box" style="margin-top:14px" aria-label="Hinweis"><b>${esc(h.t)}</b><p class="small" style="margin:4px 0 8px">${esc(h.x)}</p>
  <div class="links" style="margin-top:0">${h.b?`<button class="lnk" data-a="${h.a}" data-v="${h.v}">${esc(h.b)}</button>`:""}<button class="lnk" data-a="hint" data-v="off">Passt so</button><button class="lnk" data-a="hint" data-v="later">Später</button></div></section>` }

/* ---------- Wissen ---------- */
let WF="all";
function vWissen(){
  const L=IMPULSE.filter(i=>WF==="all"||(WF==="myth"?i.myth:WF==="beleg"?(!i.myth&&i.ev>=2):WF==="saved"?S.saved[i.id]:i.cat===WF));
  const due=lkDue().length, qn=QUIZ.filter(q=>!S.quiz[q.id]).length;
  const f=(v,n)=>`<button class="chipx${WF===v?" on":""}" aria-pressed="${WF===v}" data-a="wf" data-v="${v}">${n}</button>`;
  const imp=impOfDay(), readToday=imp&&S.read[imp.id]&&dkey(S.read[imp.id])===dkey();
  return `<h1 class="sr">Luftholen</h1><h2 class="tab-h">Wissen</h2>
  <p class="muted" style="margin:6px 0 14px">Was die Forschung über Besitz, Kaufen und Loslassen weiß. Jeder Impuls nennt Quelle und Belegstufe.</p>
  ${imp&&WF==="all"?`<button class="card" style="margin-bottom:14px" data-a="open" data-v="imp" data-w="${imp.id}"><div class="meta"><i class="dot ${imp.cat}"></i>${readToday?"Heute gelesen":"Impuls des Tages"} · ${esc(AREA[imp.cat].n)}${imp.myth?' <span class="tag myth">Oft gehört, schlecht belegt</span>':""}</div><h3>${esc(imp.t)}</h3>${readToday?"":`<p>${esc(school()&&imp.s?imp.s:imp.tip)}</p>`}</button>`:""}
  <div class="acts" style="margin-top:0">
    <button class="tile" data-a="open" data-v="quiz"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 7h18v14H15l-5 4v-4H7z"/><path d="M14 12a2.5 2.5 0 1 1 3 2.4V16M16 18.6v.2"/></svg><div><b>Was stimmt?</b><span>${qn?qn+" Fragen offen":"Fragen wiederholen"}</span></div></button>
    <button class="tile" data-a="open" data-v="lk"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 9h14v16H6zM10 9V6h16v16h-6"/><path d="M9 14h8M9 18h6"/></svg><div><b>Begriffe</b><span>${due?due+" zum Wiederholen":BEGRIFFE.some(b=>!S.lk[b.id])?"Neue Begriffe lernen":"Alles sitzt gerade"}</span></div></button>
  </div>
  <div class="chips" style="margin:22px 0 10px;gap:6px">${f("all","Alle")}${f("beleg","Gut belegt und solide")}${f("myth","Mythen")}${AREAS.map(a=>f(a.id,`<i class="dot ${a.id}"></i>${esc(a.n)}`)).join("")}${f("saved","Gemerkt")}</div>
  <div class="list">${L.length?L.map(i=>`<button class="row${S.read[i.id]?" read":""}" data-a="open" data-v="imp" data-w="${i.id}"><i class="dot ${i.cat}"></i><span class="t"><b>${esc(i.t)}</b><span>${i.myth?"Oft gehört, schlecht belegt":esc(i.evn||EV[i.ev].n)+", "+esc(i.typ)}${S.saved[i.id]?", gemerkt":""}</span></span>${chev}</button>`).join(""):`<p class="empty">${WF==="saved"?"Du hast noch nichts gemerkt. Im Impuls tippst du dafür auf „Merken“.":"Hier ist nichts."}</p>`}</div>
  <div class="links" style="margin-top:14px"><button class="lnk" data-a="open" data-v="ev">Wie Belege eingestuft werden</button><button class="lnk" data-a="open" data-v="begriffe">Alle Begriffe</button></div>`;
}
/* ---------- Üben ---------- */
function vUeben(){
  const run=exRun(), sug=suggestUeb();
  return `<h1 class="sr">Luftholen</h1><h2 class="tab-h">Üben</h2>
  <p class="muted" style="margin:6px 0 4px">Kleine Experimente im Alltag. Du planst, probierst und schaust danach ehrlich zurück. Höchstens zwei laufen gleichzeitig.</p>
  ${monthCard()}
  ${run.length?`<section class="sec"><h2>Läuft gerade</h2>${run.map(([id,e])=>exCard(id,e)).join("")}</section>`:""}
  ${sug.length?`<section class="sec"><h2>Passt gerade zu dir</h2>${sug.map(u=>`<button class="card" data-a="open" data-v="ueb" data-w="${u.id}"><div class="meta"><i class="dot ${u.cat}"></i>${esc(AREA[u.cat].n)}, ${u.d===1?"1 Tag":u.d+" Tage"}</div><h3>${esc(u.t)}</h3><p>${esc(uebX(u))}</p></button>`).join("")}</section>`:""}
  ${(()=>{ const D=Object.entries(S.ex).filter(([id,e])=>e.st==="done"&&UEB[id]).sort((a,b)=>b[1].end-a[1].end); return D.length?`<section class="sec"><h2>Abgeschlossen</h2><div class="list">${D.map(([id,e])=>`<button class="row" data-a="open" data-v="ueb" data-w="${id}"><i class="dot ${UEB[id].cat}"></i><span class="t"><b>${esc(UEB[id].t)}</b><span>${fdate(e.end)}, ${e.daysDone} von ${UEB[id].d} Tagen${e.note?", „"+esc(e.note)+"“":""}</span></span>${chev}</button>`).join("")}</div></section>`:"" })()}
  <section class="sec"><h2>Alle Übungen</h2>${AREAS.map(a=>{ const L=UEBUNGEN.filter(u=>u.cat===a.id); return `<details><summary><span style="display:flex;align-items:center;gap:10px"><i class="dot ${a.id}"></i>${esc(a.n)}</span></summary><div class="list dn">${L.map(u=>{ const e=S.ex[u.id];
    return `<button class="row" data-a="open" data-v="ueb" data-w="${u.id}"><span class="t"><b>${esc(u.t)}</b><span>${u.d===1?"1 Tag":u.d+" Tage"}${e?e.st==="run"?", läuft":e.st==="done"?(e.lived?", durchgezogen":", ausprobiert"):"":""}</span></span>${chev}</button>` }).join("")}</div></details>` }).join("")}</section>`;
}
const uebX=u=>school()&&u.s?u.s:u.x;
function suggestUeb(){ const out=[]; for(const a of areaOrder()){ const u=pickUeb(a); if(u&&!out.includes(u)) out.push(u); if(out.length>=3) break } return exRun().length>=2?[]:out }
function exCard(id,e){ const u=UEB[id], dn=exDay(e), over=exEvalDue().some(([x])=>x===id), v=e.days[dkey()];
  return `<div class="card"><div class="meta"><i class="dot ${u.cat}"></i>${over?"Vorbei, bereit zur Auswertung":"Tag "+dn+" von "+u.d}</div><h3>${esc(u.t)}</h3>
   ${over?`<div class="btns" style="margin-top:12px"><button class="btn" data-a="open" data-v="ueb" data-w="${id}">Auswerten</button></div>`:
   `<p>${v==null?"Wie lief es heute?":"Heute eingetragen. Du kannst es noch ändern."}</p><div class="chips" style="margin-top:10px">${[[2,"Geschafft"],[1,"Teilweise"],[0,"Heute nicht"]].map(([n,l])=>`<button class="chip${v===n?" on":""}" aria-pressed="${v===n}" data-a="exday" data-v="${id}" data-w="${n}">${l}</button>`).join("")}</div>
   <div class="links"><button class="lnk" data-a="open" data-v="ueb" data-w="${id}">Details und Plan</button></div>`}</div>` }

/* ---------- Dein Weg ---------- */
function vWeg(){
  const T=tally(), s=stats(), K=keepers();
  return `<h1 class="sr">Luftholen</h1><h2 class="tab-h">Dein Weg</h2>
  ${S.log.length||K.length?"":`<p class="muted" style="margin:6px 0 0">Hier sammelt sich, was du tust. Fang mit einem Ding an. Es muss nichts Großes sein.</p>`}
  <div class="nums" style="margin-top:16px">
    <button class="num" data-a="open" data-v="handbreit"><b class="gold">${T.W}</b><span>Handbreit bekommen</span></button>
    <button class="num" data-a="open" data-v="losstat"><b>${s.L.length}</b><span>${plural(s.L.length,"Eintrag","Einträge")} losgelassen${s.L.length?", "+Math.round(s.given/s.L.length*100)+"\u00a0% weitergegeben":""}</span></button>
    <button class="num" data-a="open" data-v="losstat"><b>${s.asked.length?s.missed.length+"<small> von </small>"+s.asked.length:"–"}</b><span>${s.asked.length?"nachgefragten Dingen vermisst":"Nach einem Monat fragt die App, ob du etwas vermisst"}</span></button>
    <button class="num" data-a="open" data-v="wishes"><b>${s.dec.length?s.dec.filter(w=>w.waited).length+"<small> von </small>"+s.dec.length:waiting().length||"–"}</b><span>${s.dec.length?"Wünschen nach voller Wartezeit entschieden":waiting().length?plural(waiting().length,"Wunsch wartet","Wünsche warten"):"Geparkte Wünsche erscheinen hier"}</span></button>
  </div>
  ${(()=>{ const ks=Object.keys(S.inflow).sort().slice(-6); if(!ks.length) return "";
    const lab={0:"nichts",1:"1 bis 3",4:"4 bis 10",11:"mehr als 10"};
    return `<section class="sec"><div class="sec-h"><h2>Neu dazugekommen</h2><span class="meta">deine Schätzung</span></div><div class="list">${ks.map(k=>{ const [y,mo]=k.split("-"); const n=new Date(+y,+mo-1,1).toLocaleDateString("de-DE",{month:"long",year:"numeric"}); const L=losE().filter(e=>dkey(e.ts).startsWith(k)), one=L.filter(e=>e.size===1).length, more=L.length-one;
      return `<div class="row"><span class="t"><b style="font-weight:500">${esc(n)}</b><span>Losgelassen: ${one} ${plural(one,"Ding","Dinge")}${more?" und "+more+" "+plural(more,"Tüte oder Großes","Tüten oder Großes"):""}</span></span><span class="ui" style="font-weight:600">${lab[S.inflow[k]]} neu</span></div>` }).join("")}</div></section>` })()}
  <section class="sec"><div class="sec-h"><h2>Bewusst behalten</h2><span class="meta">${K.length} von ${MAXKEEP}</span></div>
  <div class="list">${K.length?K.map(k=>`<button class="row" data-a="open" data-v="keepview" data-w="${k.id}"><i class="dot ${k.cat}"></i><span class="t"><b>${esc(k.name)}</b><span>${esc(GRUND[k.why].n)}</span></span>${chev}</button>`).join(""):`<p class="empty">Noch nichts. Was du mit Grund behältst, bekommt einen eigenen Platz in deinem Zimmer.</p>`}</div>
  <div class="links"><button class="lnk" data-a="open" data-v="keep">Etwas bewusst behalten</button></div></section>
  <section class="sec"><h2>Wege durch die Bereiche</h2><p class="small muted" style="margin:-4px 0 8px">Jeder Bereich hat fünf Stationen. Sie verlangen jeweils eine andere Art von Handlung.</p>
  <div class="wege">${areaOrder().map(a=>{ const st=stations(a); return `<button class="weg" data-a="open" data-v="area" data-w="${a}"><b><i class="dot ${a}"></i>${esc(AREA[a].n)}</b><span class="st" aria-label="${st.filter(Boolean).length} von 5 Stationen">${st.map(x=>`<i class="${x?"on":""}"></i>`).join("")}</span></button>` }).join("")}</div></section>
  <section class="sec"><h2>Mehr</h2><div class="list">
   <button class="row" data-a="open" data-v="stufen"><span class="t"><b>Die zehn Stufen deines Zimmers</b><span>Stufe ${stageOf(raum())+1}: ${esc(STUFEN[stageOf(raum())].n)}</span></span>${chev}</button>
   <button class="row" data-a="open" data-v="verlauf"><span class="t"><b>Verlauf</b><span>${S.log.length?S.log.length+" "+plural(S.log.length,"Eintrag","Einträge"):"Noch leer"}</span></span>${chev}</button>
   <button class="row" data-a="open" data-v="check"><span class="t"><b>Bestandsaufnahme</b><span>${S.check?"Zuletzt am "+fdateY(S.check.ts)+(now()-S.check.ts>90*DAY?". Zeit für eine neue Messung.":""):"Noch nicht gemacht"}</span></span>${chev}</button>
   <button class="row" data-a="open" data-v="hilfe"><span class="t"><b>Wenn es schwer wird</b><span>Hilfe bei Horten, Kaufdruck und Sorgen</span></span>${chev}</button>
  </div></section>
  <section class="sec"><h2>Einstellungen</h2>
   <div class="set" style="display:block"><b>Wo stehst du gerade?</b><span style="margin-bottom:10px">Für die Schule gibt es eigene Fassungen der Übungen.</span>
    <div class="chips">${[["school","Ich gehe zur Schule"],["adult","Ich bin erwachsen"]].map(([v,n])=>`<button class="chip${(S.settings.mode||"adult")===v?" on":""}" aria-pressed="${(S.settings.mode||"adult")===v}" data-a="mode" data-v="${v}">${n}</button>`).join("")}</div></div>
   <div class="set" style="display:block"><b>Darstellung</b><div class="chips" style="margin-top:10px">${[["system","Automatisch"],["light","Hell"],["dark","Dunkel"]].map(([v,n])=>`<button class="chip${S.settings.theme===v?" on":""}" aria-pressed="${S.settings.theme===v}" data-a="theme" data-v="${v}">${n}</button>`).join("")}</div></div>
   <div class="set"><div><b>Selbst abräumen lassen</b><span>Das Bild setzt deine Handbreit von allein ein, du wählst nichts aus</span></div><button class="switch" role="switch" aria-checked="${!!S.settings.auto}" aria-label="Selbst abräumen lassen" data-a="autospend"></button></div>
   <div class="set"><div><b>Vibration</b><span>Ein kurzer Tick bei Berührung</span></div><button class="switch" role="switch" aria-checked="${S.settings.vib!==false}" aria-label="Vibration" data-a="vib"></button></div>
   <div class="list" style="border-top:0">
    <button class="row" data-a="open" data-v="daten"><span class="t"><b>Daten sichern und laden</b><span>${S.exported?"Zuletzt gesichert am "+fdateY(S.exported):S.log.length>=5?"Noch nie gesichert. Alles liegt nur auf diesem Gerät.":"Alles bleibt auf deinem Gerät"}</span></span>${chev}</button>
    <button class="row" data-a="open" data-v="about"><span class="t"><b>Über Luftholen</b><span>Version vom ${esc(BUILD)}</span></span>${chev}</button>
    <button class="row" data-a="open" data-v="reset"><span class="t"><b>Neu beginnen</b><span>Löscht alle Einträge auf diesem Gerät</span></span>${chev}</button>
   </div></section>`;
}

/* ---------- Blätter ---------- */
function openSheet(type,arg,data){
  const wasOpen=!!SH;
  if(!wasOpen) lastFocus=document.activeElement;
  SH={type,arg,d:data||{},step:0};
  const L=$("#layer"); L.hidden=false; $("#sheet").classList.remove("out");
  if(!wasOpen){ try{ history.pushState({lsh:1},"") }catch(e){} document.documentElement.style.overflow="hidden" }
  drawSheet(true);
}
/* Kleine Kacheln mit allen Figuren aus dem Bild; vorgeschlagen nach Name, sonst nach Bereich und Grund */
function motifPicker(sel,cat,act,guess,bare){
  return `<div class="fld mot"${bare?' style="margin-top:8px"':""}>${bare?"":`<span>Im Bild als <small class="muted" style="font-weight:400">(freiwillig${guess?", vorgeschlagen":""})</small></span>`}<div class="mot-g" role="group" aria-label="Figur im Bild">${Bild.MOTIVE.map(([m])=>`<button class="mot-b${m===sel?" on":""}" aria-pressed="${m===sel}" data-a="${act}" data-v="${esc(m)}" aria-label="${esc(m)}" title="${esc(m)}"><canvas data-motif="${esc(m)}" data-cat="${cat||"wo"}" aria-hidden="true"></canvas><small>${esc(m).replace(/^(Bilder|Wander|Trink|Näh|Espresso|Kopf|Werk|Tage|Brett|Foto|Fach|Wind|Tee)(?=.)/,"$1&shy;")}</small></button>`).join("")}</div></div>` }
function paintMotifs(root){ const dark=document.documentElement.dataset.dark==="1"; root.querySelectorAll("canvas[data-motif]").forEach(c=>Bild.motifIcon(c,c.dataset.motif,c.dataset.cat,dark,40)) }
document.addEventListener("input",e=>{ if(!SH||SH.type!=="keep"||e.target.id!=="f-name"||SH.d.motif) return;
  const g=Bild.guessMotif(e.target.value,SH.d.cat,SH.d.why); document.querySelectorAll(".mot-b").forEach(b=>{ const on=b.dataset.v===g; b.classList.toggle("on",on); b.setAttribute("aria-pressed",on) }) });
function paintPrev(){ const c=document.getElementById("prev"); if(!c||!Bild||!Bild.paint) return; const W=Math.min(c.parentNode.clientWidth||320,420);
  Bild.paint(c,Object.assign(bildModel(raum(),keepers()),{focus:focusKats(SH&&SH.d&&SH.d.ans)}),W); c.style.width="100%"; c.style.height="auto" }
function drawSheet(focus){
  if(!SH) return; const el=$("#sheet-in"); const y=el.scrollTop;
  el.innerHTML=sheetHTML(); paintMotifs(el);
  const zc=el.querySelector("canvas.zcrop"); if(zc) Bild.crop(zc,zc.dataset.z);
  if(el.querySelector("#prev")) paintPrev();
  settleSel(el);
  if(focus){ el.scrollTop=0; const f=el.querySelector("[data-autofocus]:not(input):not(textarea)")||el.querySelector("#sh-t")||el.querySelector(".sh-close"); if(f) f.focus({preventScroll:true}) } else el.scrollTop=y;
}
function closeSheet(fromPop){
  if(!SH) return; if(SH.type==="moment"&&SH.d.undo) undoFn=null; SH=null;
  const sh=$("#sheet"), L=$("#layer");
  const done=()=>{ if(SH) return; L.hidden=true; $("#sheet-in").innerHTML=""; sh.classList.remove("out"); sh.style.transform="" };
  if(RM()) done(); else { sh.classList.add("out"); setTimeout(done,240) }
  document.documentElement.style.overflow="";
  if(!fromPop&&history.state&&history.state.lsh){ ignorePop=true; history.back() }
  const lf=lastFocus, sig=lf&&lf.dataset?[lf.dataset.a,lf.dataset.v,lf.dataset.w]:null;
  render();
  // Fokus zurück an das auslösende Element (nach dem Neuzeichnen das gleichwertige)
  let t=lf&&lf.isConnected?lf:null;
  if(!t&&sig&&sig[0]) t=[...document.querySelectorAll(`[data-a="${sig[0]}"]`)].find(e=>e.dataset.v==sig[1]&&(e.dataset.w||null)==(sig[2]||null))||document.querySelector(`[data-a="${sig[0]}"]`);
  if(t&&t.tagName!=="BODY") t.focus({preventScroll:true});
}
let ignorePop=false;
addEventListener("popstate",()=>{ if(ignorePop){ ignorePop=false; return } if(SH) closeSheet(true); else if(TAB!=="home"){ TAB="home"; render(); scrollTo(0,0) } });
const shTop=(title,meta)=>`<div class="sh-top"><span class="meta">${meta||""}</span><button class="sh-close" data-a="close">Schließen</button></div><h2 id="sh-t" tabindex="-1">${title}</h2>`;
const prog=(i,n)=>`<div class="prog" aria-label="Schritt ${i+1} von ${n}">${Array.from({length:n},(_,k)=>`<i class="${k<=i?"on":""}"></i>`).join("")}</div>`;
const need=(miss)=>miss.length?`<p class="note">Noch offen: ${miss.join(", ")}.</p>`:"";
const phx=(a,s)=>school()?s:a;
const schoolNote=()=>school()?`<p class="note">Nur eigene Dinge. Bei Familiensachen vorher fragen.</p>`:"";

function sheetHTML(){
  const t=SH.type, d=SH.d;
  switch(t){
  case "welcome": return `<div class="sh-top"><span class="meta">Willkommen</span><button class="sh-close" data-a="close">Schließen</button></div>
    <h2 id="sh-t" tabindex="-1">Schön, dass du da bist.</h2>
    <p>Oben siehst du ein Zimmer, in dem jemand wohnt. Überall liegt etwas: Kleidung, Bücher, Papier, Kabel, Andenken. Jedes Ding steht für eine Sorte, die es fast überall gibt. Tipp darauf, und du siehst kleine Aufgaben für dein Zuhause. Was du tust, bringt Handbreit, und mit Handbreit räumst du im Bild ab, was du willst.</p>
    <ul class="steps"><li><b>Loslassen:</b> Du gibst weiter, was du nicht brauchst. Auch das bringt Handbreit.</li><li><b>Behalten:</b> Was dir dient, bekommt mit Grund einen eigenen Platz.</li><li><b>Wunsch parken:</b> Kaufwünsche warten erst eine Weile vor der Tür, dann entscheidest du.</li><li><b>Statt neu:</b> Leihen, gebraucht holen oder reparieren hängt eine Tasche an die Tür.</li></ul>
    <div class="box"><b>Drei Wörter, die du hier oft liest</b><p class="small" style="margin:6px 0 0"><b class="ui">Handbreit</b> ist das Maß für Platz. Du bekommst sie für Aufgaben und Entscheidungen und setzt sie im Bild ein, wo du willst. <b class="ui">Statt neu</b> heißt leihen, gebraucht holen oder reparieren, statt neu zu kaufen. Die <b class="ui">Vielleicht-Kiste</b> ist eine echte Kiste für Dinge, bei denen du schwankst; nach 30 Tagen schaust du hinein.</p></div>
    <p class="muted small" style="margin-top:12px">Es gibt keinen Druck und nichts verfällt. Alles bleibt auf deinem Gerät.</p>
    <hr class="sep"><p class="meta" style="margin-bottom:8px">Wo stehst du gerade?</p>
    <div class="chips">${[["school","Ich gehe zur Schule"],["adult","Ich bin erwachsen"]].map(([v,n])=>`<button class="chip${S.settings.mode===v?" on":""}" aria-pressed="${S.settings.mode===v}" data-a="mode" data-v="${v}">${n}</button>`).join("")}</div>
    <p class="note">Für die Schule gibt es eigene Fassungen der Übungen. Ohne Auswahl siehst du die Fassung für Erwachsene. Du kannst das jederzeit unter „Dein Weg“ ändern.</p>
    <div class="btns"><button class="btn" data-a="open" data-v="check">Bestandsaufnahme machen</button><button class="btn sec2" data-a="close">Erst umsehen</button></div>
    <p class="note">Die Bestandsaufnahme hat ${CHECK.length} Fragen und dauert etwa zwei Minuten.</p>`;
  case "check": { const i=SH.step, ans=d.ans||(d.ans={});
    if(i>=CHECK.length) return checkResult();
    const q=CHECK[i];
    return `${shTop("Bestandsaufnahme","Frage "+(i+1)+" von "+CHECK.length)}${prog(i,CHECK.length)}<p class="meta"><i class="dot ${q.cat}"></i> ${esc(AREA[q.cat].n)}</p><h3 style="margin:6px 0 14px">${esc(school()&&q.s?q.s:q.q)}</h3>
    <div class="opts">${q.o.map((o,k)=>`<button class="opt${ans[q.id]===k?" on":""}" aria-pressed="${ans[q.id]===k}" data-a="checkans" data-v="${k}">${esc(o)}</button>`).join("")}</div>
    <div class="btns">${i>0?`<button class="btn sec2" data-a="step" data-v="-1">Zurück</button>`:""}</div>` }
  case "los": { const v=d.size&&d.weg?losGain(d.size,d.weg):0, nominal=d.weg?(d.weg==="mue"||d.weg==="rec"?1:2):0, ask=d.ask!==false;
    return `${shTop("Loslassen","Weitergeben, was du nicht brauchst")}
    <label class="fld"><span>Was ist es? (freiwillig)</span><input class="inp" id="f-name" maxlength="60" placeholder="${phx("z.\u00a0B. Winterjacke","z.\u00a0B. alte Turnschuhe")}" value="${esc(d.name||"")}" autocomplete="off"></label>
    <div class="fld"><span>Wie viel?</span><div class="groesse">${SIZES.map(s=>`<button class="opt${d.size===s.v?" on":""}" aria-pressed="${d.size===s.v}" data-a="set-size" data-v="${s.v}" aria-label="${esc(s.n)}">${SIZEICO[s.v]}<b>${esc(s.n)}</b><small>${esc(s.x)}</small></button>`).join("")}</div></div>
    <div class="fld"><span>Wohin geht es?</span><div class="wohin">${WEGE.map(w=>`<button class="chip${d.weg===w.id?" on":""}" aria-pressed="${d.weg===w.id}" data-a="set-weg" data-v="${w.id}">${WEGICO[w.id]||""}${esc(w.n)}</button>`).join("")}</div>
    <p class="note">${d.weg==="mue"?"Wenn es noch brauchbar ist, freut sich vielleicht jemand darüber. Verschenkbörsen, Sozialkaufhäuser und Nachbarschaftsgruppen nehmen vieles. ":""}Jede Entscheidung bringt gleich viel, egal wie groß: 2 Handbreit, wenn es zu Menschen geht, 1, wenn es recycelt oder entsorgt wird. Die Größe hilft dir nur beim Überblick.${d.weg&&v<nominal?` Heute zählt davon nur noch ${hb(v)}, weil Entscheidungen zusammen höchstens ${ENTCAP} am Tag bringen.`:""}</p></div>
    ${!d.weg||WEG[d.weg].g?`<label class="fld"><span>Für wen? (freiwillig)</span><input class="inp" id="f-who" maxlength="30" placeholder="z.\u00a0B. Lena, Nachbar, Kleiderkammer" value="${esc(d.who||"")}" autocomplete="off"><small class="note" style="display:block">Mit Namen hängt die Tasche einen Monat lang mit Anhänger an der Tür deines Zimmers.</small></label>`:""}
    <div class="fld"><span>Bereich</span>${areaChips(d.cat,"set-cat")}</div>
    ${d.cat==="er"?`<p class="note hl">Bei Erinnerungen sind ein Foto davon, die Weitergabe an Angehörige und Behalten mit Grund gleich gute Wege.</p>`:""}
    ${schoolNote()}
    <div class="set" style="margin-top:14px"><div><b>In 30 Tagen nachfragen</b><span>„Hast du es vermisst?“ Einmal, ohne Push-Nachricht.</span></div><button class="switch" role="switch" aria-checked="${ask}" aria-label="In 30 Tagen nachfragen" data-a="set-ask"></button></div>
    <details style="margin-top:4px"><summary>Vor dem Weitergeben</summary><ul class="small dn" style="padding-left:20px;margin:0"><li>Auf Handys und Rechnern die Daten löschen.</li><li>Akkus, Batterien und Elektrogeräte gehören zur Sammelstelle, nicht in den Restmüll.</li><li>Alte Medikamente nicht in die Toilette. Wie man sie entsorgt, sagt die Apotheke.</li><li>Papiere mit Aufbewahrungsfrist nicht wegwerfen, Persönliches schreddern.</li></ul></details>
    ${need([!d.size&&"wie viel",!d.weg&&"wohin es geht",!d.cat&&"Bereich"].filter(Boolean))}
    <div class="btns fuss"><button class="btn" data-a="do-los" ${d.cat&&d.size&&d.weg?"":"disabled"}>Eintragen${d.size&&d.weg?" · "+hb(v):""}</button></div>` }
  case "timer": { const min=+(SH.arg||10), left=Math.max(0,d.end?d.end-now():min*60000), mm=Math.floor(left/60000), ss=Math.floor(left%60000/1000);
    const st=SCHRITTE[(stageOf(raum())+new Date(now()).getDate())%SCHRITTE.length]||SCHRITTE[0], ch=d.cid&&CHAL[d.cid], frei=!d.step&&!ch;
    return `${shTop(ch?esc(ch.t):frei?"10 Minuten aufräumen":esc(st[0]),(ch?esc(KAT[ch.kat].n)+" · ":"")+min+" Minuten")}
    <p>${ch?esc(school()&&ch.s?ch.s:ch.x):frei?"Such dir eine Stelle aus und fang einfach an. Ein Vorschlag: "+esc(st[0])+". "+esc(st[1]):esc(st[1])}</p>
    <div class="uhr" aria-live="off"><b id="uhr">${d.end?String(mm).padStart(2,"0")+":"+String(ss).padStart(2,"0"):min+":00"}</b><span>${d.end?(left>0?"Danach hörst du auf. Was du nicht geschafft hast, bleibt für ein anderes Mal.":"Die Zeit ist um. Gut gemacht ist, was du gemacht hast."):"Ein Zeitgeber hilft beim Anfangen und beim Aufhören."}</span></div>
    <div class="btns">${ch?(d.end?`<button class="btn" data-a="chal" data-v="${ch.id}">Erledigt · +${hb(ch.w)}</button><button class="btn sec2" data-a="close">${left>0?"Aufhören":"Später"}</button>`:`<button class="btn" data-a="timer-go" data-autofocus>Los · ${min}\u00a0Min.</button><button class="btn sec2" data-a="chal" data-v="${ch.id}">Schon erledigt</button>`):d.end?`<button class="btn" data-a="open" data-v="los">Loslassen eintragen</button><button class="btn sec2" data-a="close">${left>0?"Aufhören":"Fertig"}</button>`:`<button class="btn" data-a="timer-go" data-autofocus>Los · ${min}\u00a0Min.</button><button class="btn sec2" data-a="close">Später</button>`}</div>
    <p class="note">Die Uhr läuft nur, solange die App offen ist. Es gibt keinen Ton und keine Nachricht.</p>` }
  case "mehr": return `${shTop("Mehr")}
    <div class="set" style="display:block"><b>Darstellung</b><div class="chips" style="margin-top:10px">${[["system","Automatisch"],["light","Hell"],["dark","Dunkel"]].map(([v,n])=>`<button class="chip${S.settings.theme===v?" on":""}" aria-pressed="${S.settings.theme===v}" data-a="theme" data-v="${v}">${n}</button>`).join("")}</div></div>
    <div class="list" style="border-top:0">
     <button class="row" data-a="open" data-v="daten"><span class="t"><b>Daten sichern und laden</b><span>Alles bleibt auf deinem Gerät</span></span>${chev}</button>
     <button class="row" data-a="share" data-v="app"><span class="t"><b>Luftholen weiterempfehlen</b><span>Link teilen</span></span>${chev}</button>
     <button class="row" data-a="tab" data-v="weg"><span class="t"><b>Einstellungen</b><span>Schule oder erwachsen, Vibration, neu beginnen</span></span>${chev}</button>
     <button class="row" data-a="open" data-v="about"><span class="t"><b>Über Luftholen</b><span>Version vom ${esc(BUILD)}</span></span>${chev}</button>
    </div>`;
  case "keep": { const full=keepers().length>=MAXKEEP;
    return `${shTop("Bewusst behalten","Was bleibt, hat einen Grund")}
    ${full?`<p>Dein Zimmer hat Platz für ${MAXKEEP} behaltene Dinge, und alle Plätze sind vergeben. Du kannst ein Ding gehen lassen, wenn sein Grund nicht mehr stimmt.</p><div class="btns"><button class="btn sec2" data-a="tab" data-v="weg">Zur Liste</button></div>`:
    `<p class="muted small">Behalten ist keine Niederlage. Wer bewusst behält, weiß, warum ein Ding bleibt. Es bekommt einen festen Platz in deinem Zimmer, in der Farbe seines Bereichs, auf einem Untersetzer für den Grund.</p>
    <label class="fld"><span>Was ist es?</span><input class="inp" id="f-name" maxlength="60" placeholder="${phx("zum Beispiel: Omas Teekanne","zum Beispiel: Gitarre")}" value="${esc(d.name||"")}" autocomplete="off" data-autofocus></label>
    <div class="fld"><span>Bereich</span>${areaChips(d.cat,"set-cat")}</div>
    <div class="fld"><span>Warum bleibt es?</span><div class="opts">${GRUENDE.map(g=>`<button class="opt${d.why===g.id?" on":""}" aria-pressed="${d.why===g.id}" data-a="set-why" data-v="${g.id}"><span>${esc(g.n)}<small>${esc(g.x)}</small></span></button>`).join("")}</div></div>
    ${motifPicker(d.motif||Bild.guessMotif(d.name,d.cat,d.why),d.cat,"set-motif",!d.motif)}
    <label class="fld"><span>In einem Satz, wenn du magst</span><textarea class="inp" id="f-note" maxlength="200" placeholder="Ich behalte es, weil …">${esc(d.note||"")}</textarea></label>
    <div class="btns"><button class="btn" data-a="do-keep" ${d.cat&&d.why?"":"disabled"}>Behalten</button></div>${need([!d.cat&&"Bereich",!d.why&&"Grund"].filter(Boolean))}
    <p class="note">Nach drei Monaten und nach einem Jahr fragt die App, ob der Grund noch stimmt.</p>`}` }
  case "keepview": { const k=S.keep.find(x=>x.id===SH.arg); if(!k) return shTop("Nicht gefunden");
    return `${shTop(esc(k.name),`<i class="dot ${k.cat}"></i> ${esc(AREA[k.cat].n)}`)}
    <p><b class="ui">${esc(GRUND[k.why].n)}.</b> ${esc(GRUND[k.why].x)}</p>${(()=>{ const K=keepers(), i=K.findIndex(x=>x.id===k.id); return i>=0&&i<Bild.SLOTS.length?`<details class="mot-d"><summary>Im Bild: ${esc(Bild.motifOf(k))}</summary>${motifPicker(Bild.motifOf(k),k.cat,"set-kmotif",false,true)}</details>`:"" })()}${k.note?`<blockquote>${esc(k.note)}</blockquote>`:""}
    <p class="meta">Bewusst behalten seit ${fdateY(k.ts)}${k.gone?". Inzwischen losgelassen.":""}</p>
    ${GRUND[k.why].imp&&IMP[GRUND[k.why].imp]?`<div class="links"><button class="lnk" data-a="open" data-v="imp" data-w="${GRUND[k.why].imp}">Warum das ein guter Grund sein kann</button></div>`:""}
    ${k.gone?"":`<div class="btns"><button class="btn sec2" data-a="keepgo" data-v="${k.id}">Ich kann es gehen lassen</button></div>`}` }
  case "keepask": { const k=S.keep.find(x=>x.id===SH.arg)||keepAskDue()[0]; if(!k) return shTop("Alles beantwortet");
    return `${shTop("Stimmt der Grund noch?","Nachfrage")}
    <p>Am ${fdateY(k.ts)} hast du <b>${esc(k.name)}</b> bewusst behalten. Dein Grund war: „${esc(GRUND[k.why].n)}“.</p>${k.note?`<blockquote>${esc(k.note)}</blockquote>`:""}
    <div class="opts"><button class="opt" data-a="keepans" data-v="ja">Ja, das stimmt noch</button>
    ${GRUENDE.filter(g=>g.id!==k.why).map(g=>`<button class="opt" data-a="keepans" data-v="why:${g.id}">Es bleibt, aber eher: ${esc(g.n)}</button>`).join("")}
    <button class="opt" data-a="keepans" data-v="go">Ich kann es gehen lassen</button></div>` }
  case "wish": return `${shTop("Wunsch parken","Erst warten, dann entscheiden")}
    <p class="muted small">Im Moment des Wollens fühlt sich ein Wunsch dringend an. Mit etwas Abstand entscheidest du ruhiger. So lange wartet der Wunsch als gestricheltes Paket vor der Tür deines Zimmers.</p>
    <label class="fld"><span>Was möchtest du haben?</span><input class="inp" id="f-name" maxlength="60" placeholder="${phx("zum Beispiel: neue Kopfhörer","zum Beispiel: neue Sneaker")}" value="${esc(d.name||"")}" autocomplete="off" data-autofocus></label>
    <label class="fld"><span>Ungefährer Preis in Euro (freiwillig)</span><input class="inp" id="f-price" inputmode="decimal" maxlength="9" value="${esc(d.price||"")}" autocomplete="off"></label>
    <div class="fld"><span>Bereich</span>${areaChips(d.cat,"set-cat")}</div>
    <div class="fld"><span>Wie lange soll er warten?</span><p class="note" style="margin:-4px 0 8px">Die Zeiten sind Erfahrungsregeln. Warum Abstand hilft, steht im Impuls zur Empathielücke.</p><div class="opts">${WAITS.map(w=>`<button class="opt${d.days===w.d?" on":""}" aria-pressed="${d.days===w.d}" data-a="set-days" data-v="${w.d}"><span>${esc(w.n)}<small>${esc(w.x)}</small></span></button>`).join("")}</div></div>
    <div class="btns"><button class="btn" data-a="do-wish" ${d.days&&d.cat?"":"disabled"}>Parken</button></div>${need([!d.cat&&"Bereich",!d.days&&"Wartezeit"].filter(Boolean))}`;
  case "wishes": { const Wt=waiting(), D=S.wishes.filter(w=>w.st!=="wait");
    return `${shTop("Geparkte Wünsche")}
    ${Wt.length?`<div class="list">${Wt.map(w=>{ const left=daysBetween(now(),w.due); return `<button class="row" data-a="open" data-v="wishdec" data-w="${w.id}"><i class="dot ${w.cat}"></i><span class="t"><b>${esc(w.name)}</b><span>${isDue(w.due)?"Wartezeit vorbei":"Noch "+left+" "+plural(left,"Tag","Tage")}</span></span>${chev}</button>` }).join("")}</div>`:`<p class="empty">Gerade wartet kein Wunsch.</p>`}
    <div class="btns"><button class="btn" data-a="open" data-v="wish">Neuen Wunsch parken</button></div>
    ${D.length?`<section class="sec"><h3>Entschieden</h3><div class="list">${D.slice().reverse().map(w=>`<div class="row"><i class="dot ${w.cat}"></i><span class="t"><b>${esc(w.name)}</b><span>${{lass:"Nicht mehr gewollt",leih:"Geliehen oder gebraucht",kauf:"Bewusst gekauft"}[w.st]}${w.waited?", nach voller Wartezeit":", vorher entschieden"}</span></span></div>`).join("")}</div></section>`:""}` }
  case "wishdec": { const w=S.wishes.find(x=>x.id===SH.arg); if(!w) return shTop("Nicht gefunden");
    const left=daysBetween(now(),w.due), due=isDue(w.due);
    if(w.st!=="wait") return `${shTop(esc(w.name))}<p>Schon entschieden.</p>`;
    return `${shTop(esc(w.name),`<i class="dot ${w.cat}"></i> Geparkt am ${fdate(w.ts)}`)}
    <p>${due?"Die Wartezeit ist vorbei. Stell dir vor, du hättest es nie aufgeschrieben. Würdest du heute losgehen und es kaufen?":"Noch "+left+" "+plural(left,"Tag","Tage")+" Wartezeit, bis zum "+fdate(w.due)+"."}${w.price?" Notierter Preis: etwa "+esc(w.price)+" Euro.":""}</p>
    ${due?"":`<p class="note">Du kannst schon jetzt entscheiden. Dann gibt es dafür aber keine Handbreit, denn das Warten ist der Kern.</p>`}
    <div class="opts" style="margin-top:12px">
     <button class="opt" data-a="wishans" data-v="lass"><span>Ich will es nicht mehr<small>${due?"Das Paket vor der Tür verschwindet. 2 Handbreit fürs Warten.":"Gut so. Handbreit gibt es nur nach voller Wartezeit."}</small></span></button>
     <button class="opt" data-a="wishans" data-v="leih"><span>Ich leihe es oder hole es gebraucht<small>Du bekommst es, ohne dass etwas Neues hergestellt wird.${due?" 2 Handbreit fürs Warten.":""}</small></span></button>
     <button class="opt" data-a="wishans" data-v="kauf"><span>Ich kaufe es bewusst<small>Auch das ist eine gute Entscheidung, wenn sie nach dem Warten noch steht.${due?" Für das Warten gibt es 2 Handbreit.":""}</small></span></button>
     ${due?`<button class="opt" data-a="wishans" data-v="mehr"><span>Ich brauche noch eine Woche</span></button>`:""}
    </div>${due?"":calLinks("Wunsch entscheiden: "+w.name,"Die Wartezeit ist vorbei. Willst du es noch?",w.due)}` }
  case "teil": return `${shTop("Statt neu","Geliehen, getauscht, gebraucht, repariert")}
    <p class="muted small">Jedes Mal, wenn du etwas bekommst, ohne dass es neu hergestellt wird, hängt eine Tasche mehr an der Tür deines Zimmers. Sie steht für Dinge, die zwischen Menschen wandern.</p>
    <label class="fld"><span>Was war es?</span><input class="inp" id="f-name" maxlength="60" placeholder="${phx("zum Beispiel: Bohrmaschine vom Nachbarn","zum Beispiel: Buch aus der Bücherei")}" value="${esc(d.name||"")}" autocomplete="off" data-autofocus></label>
    <div class="fld"><span>Wie?</span><div class="chips">${[["leih","Geliehen"],["tausch","Getauscht"],["gebr","Gebraucht gekauft"],["rep","Repariert"],["teil","Mit anderen geteilt"]].map(([v,n])=>`<button class="chip${d.how===v?" on":""}" aria-pressed="${d.how===v}" data-a="set-how" data-v="${v}">${n}</button>`).join("")}</div></div>
    <div class="fld"><span>Bereich</span>${areaChips(d.cat,"set-cat")}</div>
    <div class="btns"><button class="btn" data-a="do-teil" ${d.how&&d.cat?"":"disabled"}>Eintragen</button></div>${need([!d.how&&"wie",!d.cat&&"Bereich"].filter(Boolean))}`;
  case "pruef": return pruefHTML();
  case "kiste": { const B=boxIn();
    return `${shTop("Vielleicht-Kiste","Für Dinge, bei denen du schwankst")}
    <p class="muted small">Leg unsichere Dinge in eine echte Kiste und schreib das Datum darauf. Nach dreißig Tagen schaust du nach. Was du in der Zeit nicht gebraucht hast, kannst du dann mit mehr Erfahrung entscheiden. Das ist eine bewährte Aufräumregel, keine untersuchte Methode.</p>
    <label class="fld"><span>Was kommt in die Kiste?</span><input class="inp" id="f-name" maxlength="60" placeholder="${phx("zum Beispiel: Fondue-Set","zum Beispiel: alte Spielesammlung")}" value="${esc(d.name||"")}" autocomplete="off"></label>
    <div class="fld"><span>Bereich</span>${areaChips(d.cat,"set-cat")}</div>
    ${schoolNote()}
    <div class="btns"><button class="btn" data-a="do-kiste" ${d.cat?"":"disabled"}>In die Kiste</button>${boxDue().length?`<button class="btn sec2" data-a="open" data-v="kistedue">Kiste öffnen</button>`:""}</div>${need([!d.cat&&"Bereich"].filter(Boolean))}
    ${B.length?`<section class="sec"><h3>In der Kiste</h3><div class="list">${B.map(b=>`<div class="row"><i class="dot ${b.cat}"></i><span class="t"><b>${esc(b.name||"Ohne Namen")}</b><span>${now()>=b.due?"Bereit zum Nachsehen":"Bis "+fdate(b.due)}</span></span></div>`).join("")}</div>${calLinks("Vielleicht-Kiste öffnen","Was hast du in dreißig Tagen gebraucht?",Math.min(...B.map(b=>b.due)))}</section>`:""}` }
  case "kistedue": { const B=boxDue(); if(!B.length) return `${shTop("Vielleicht-Kiste")}<p>Gerade ist nichts fällig.</p>`;
    return `${shTop("Kiste öffnen","Nach dreißig Tagen")}
    <p>Hast du in den letzten dreißig Tagen etwas aus der Kiste geholt? Entscheide für jedes Ding.</p>
    ${B.map(b=>`<div class="box"><b>${esc(b.name||"Ohne Namen")}</b><span class="meta"> ${esc(AREA[b.cat].n)}, seit ${fdate(b.ts)}</span>
     <div class="chips" style="margin-top:10px">${[["geht","Kann gehen"],["raus","Herausgeholt"],["bleibt","Doch behalten"]].map(([v,n])=>`<button class="chip${d[b.id]===v?" on":""}" aria-pressed="${d[b.id]===v}" data-a="boxans" data-v="${b.id}" data-w="${v}">${n}</button>`).join("")}</div></div>`).join("")}
    ${B.some(b=>d[b.id]==="geht")?`<div class="fld"><span>Wohin gehen die Dinge?</span><div class="chips">${WEGE.map(w=>`<button class="chip${d.weg===w.id?" on":""}" aria-pressed="${d.weg===w.id}" data-a="set-weg" data-v="${w.id}">${esc(w.n)}</button>`).join("")}</div></div>`:""}
    <div class="btns"><button class="btn" data-a="do-boxdue" ${B.every(b=>d[b.id])&&(!B.some(b=>d[b.id]==="geht")||d.weg)?"":"disabled"}>Fertig</button></div>` }
  case "ask": { const A=askDue(); if(!A.length) return `${shTop("Nachfrage")}<p>Alles beantwortet.</p>`;
    return `${shTop("Hast du etwas vermisst?","Nachfrage nach einem Monat")}
    <p class="muted small">Ehrliche Antworten helfen dir am meisten. Vermissen ist kein Fehler. Es zeigt dir, was wirklich gebraucht wird.</p>
    ${(e=>`<p class="meta" style="margin-top:12px">${A.length===1?"Ein Ding":"Noch "+A.length+" Dinge"}</p><div class="box" style="margin-top:6px"><h3 style="margin:0 0 2px">${esc(e.name||sizeName(e.size))}</h3><span class="meta">${esc(AREA[e.cat].n)}, ${esc(WEG[e.weg].n.toLowerCase())} am ${fdate(e.ts)}</span>
     <div class="opts" style="margin-top:12px">${[["nein","Nicht vermisst"],["ja","Vermisst"],["wn","Weiß ich nicht mehr"]].map(([v,n])=>`<button class="opt" data-a="askans" data-v="${e.id}" data-w="${v}">${n}</button>`).join("")}</div></div>`)(A[0])}` }
  case "imp": return impHTML();
  case "ev": return `${shTop("Wie Belege eingestuft werden")}
    <p>Nicht jeder Befund ist gleich sicher. Jeder Impuls bekommt deshalb eine von vier Stufen.</p>
    <div class="list">${EV.map((e,i)=>`<div class="row" style="align-items:flex-start"><span style="padding-top:5px">${evDots(i)}</span><span class="t"><b>${esc(e.n)}</b><span style="font-size:14.5px;color:var(--muted)">${esc(e.x)}</span></span></div>`).join("")}</div>
    <p class="small" style="margin-top:14px">Dazu steht die Art des Befunds. Ein <b>Experiment</b> verändert gezielt etwas und vergleicht. Eine <b>Beobachtung</b> misst, was ohnehin passiert; sie zeigt Zusammenhänge, aber nicht sicher die Ursache. Eine <b>Übersicht</b> fasst viele Studien zusammen. Eine <b>Idee</b> ist eine Theorie oder ein Denkmodell. Eine <b>Empfehlung</b> stammt von einer Behörde oder Fachstelle.</p>
    <p class="small">Unter „Mythen“ stehen Zahlen, die oft zitiert werden, aber schlecht belegt sind.</p>`;
  case "quiz": return quizHTML();
  case "lk": return lkHTML();
  case "begriffe": return `${shTop("Begriffe")}<div class="list">${BEGRIFFE.map(b=>`<button class="row" data-a="open" data-v="begriff" data-w="${b.id}"><span class="t"><b>${esc(b.t)}</b></span>${chev}</button>`).join("")}</div>`;
  case "begriff": { const b=BEG[SH.arg]; return `${shTop(esc(b.t),"Begriff")}<p>${esc(b.x)}</p><div class="box"><b>Zum Beispiel</b><p class="small" style="margin:4px 0 0">${esc(b.bsp)}</p></div>${b.imp&&IMP[b.imp]?`<div class="links"><button class="lnk" data-a="open" data-v="imp" data-w="${b.imp}">Der Befund dazu</button></div>`:""}` }
  case "ueb": return uebHTML();
  case "bild": return bildHTML();
  case "stufen": { const W=raum(), st=stageOf(W); return `${shTop("Die zehn Stufen",hb(W)+" eingesetzt")}
    <p class="small muted">Mit jeder Stufe wird das Zimmer ruhiger. Die Zahl links sagt, wie viele Handbreit bis dahin im Bild eingesetzt sind. Was abgeräumt wird, wählst du selbst.</p>
    <ol class="stufen">${STUFEN.map((s,i)=>`<li class="${i>st?"off":""}${i===st?" cur":""}"><span class="w">${s.w}</span><div><b>${esc(s.n)}</b><span>${esc(s.x)}</span></div></li>`).join("")}</ol>
    <div class="links"><button class="lnk" data-a="open" data-v="handbreit">Wofür es Schwung gibt</button></div>` }
  case "weite": case "handbreit": { const T=tally(); return `${shTop("Handbreit",hb(T.W)+" bekommen, "+hb(guthaben())+" frei")}
    <p>Eine Handbreit ist der Platz, den ein Ding im Regal braucht. Du bekommst Handbreit für das, was du in deinem Zuhause tust: für Aufgaben, fürs Loslassen, fürs Behalten mit Grund und fürs Warten bei Wünschen. Im Bild setzt du sie ein: Tipp auf etwas, das gehen darf, und räum es ab. Ein Abräumen braucht ${PREIS}.</p>
    <p class="small muted">Gezählt wird, was du tust, nicht wie viel du wegwirfst. Eine Aufgabe bringt gleich viele Handbreit, ob danach alles bleibt oder vieles geht. Was weitergegeben wird, zählt mehr als Müll. Nichts verfällt, und es gibt nichts zu kaufen.</p>
    <div class="list">${[["los","Losgelassen","2 je Eintrag, egal wie groß, 1, wenn es recycelt oder entsorgt wird. Loslassen, Behalten und Vielleicht-Kiste bringen zusammen höchstens "+ENTCAP+" am Tag. Einträge aus der Zeit vor dieser Fassung zählen weiter nach Größe."],["teil","Statt neu","3 für Leihen, Tauschen, Teilen und Reparieren, 1 für gebraucht Gekauftes. Höchstens zweimal am Tag."],["wunsch","Wünsche","2, wenn ein Wunsch seine volle Wartezeit bekommen hat, ganz gleich, wie du dich danach entscheidest. Wie du dich danach entscheidest, ändert nichts daran. Wer vor Ablauf der Wartezeit entscheidet, bekommt keine Handbreit."],["keep","Behalten mit Grund","2 je Ding, so viel wie Loslassen. Entscheiden zählt, nicht Weggeben."],["kiste","Vielleicht-Kiste","2 je Eintrag. Auch Aufschieben mit Datum ist eine Entscheidung."],["chal","Aufgaben im Bild","2 bis 5 je nach Dauer, jede höchstens einmal am Tag. Aus diesen Aufgaben gibt es höchstens "+CHALCAP+" am Tag. Das Ergebnis ist egal: Behalten zählt wie Weggeben."],["aufg","Kleine Aufgaben","Einmalige Aufgaben zählen einmal, wiederholbare höchstens einmal am Tag. Aus Aufgaben gibt es höchstens "+AUFCAP+" am Tag. Leihen und Reparieren zählen wie „Statt neu“."],["ueb","Übungen","2 bis 4 für eine Übung, die du an mindestens der Hälfte der Tage gemacht hast. Dieselbe Übung zählt erst nach 60 Tagen wieder."]].map(([k,n,x])=>`<div class="row" style="align-items:flex-start"><span class="t"><b>${n}</b><span style="font-size:14px;color:var(--muted)">${x}</span></span><b class="ui" style="font-size:18px">${T.parts[k]}</b></div>`).join("")}</div>
    <p class="note">Behalten bringt so viel wie Loslassen. Es bekommt dafür einen festen Platz in deinem Zimmer.${S.spend.some(x=>x.alt)?" Was vor dieser Fassung im Bild frei war, bleibt frei. Es gilt als schon eingesetzt.":""}</p>` }
  case "losstat": { const s=stats(), by=WEGE.map(w=>[w,s.L.filter(e=>e.weg===w.id).length]);
    return `${shTop("Losgelassen")}
    ${s.L.length?`<div class="list">${by.map(([w,n])=>`<div class="row"><span class="t"><b>${esc(w.n)}</b></span><b class="ui">${n}</b></div>`).join("")}</div>
    <p class="small" style="margin-top:12px">${Math.round(s.given/s.L.length*100)} % deiner Einträge sind an andere Menschen gegangen. ${s.L.filter(e=>e.weg==="mue").length?"Was entsorgt wurde, zählt auch als Platz. Beim nächsten Mal lohnt sich vielleicht ein Blick, ob es noch jemand brauchen kann.":""}</p>
    <h3 style="margin-top:20px">Vermisst?</h3><p class="small">${s.asked.length?`Von ${s.asked.length} nachgefragten ${plural(s.asked.length,"Ding","Dingen")} hast du ${s.missed.length} vermisst. Das ist dein eigener Beleg dafür, was dir gefehlt hat und was nicht.`:"Einen Monat nach jedem Eintrag fragt die App einmal nach. So sammelst du deinen eigenen Beleg."}</p>`:`<p class="empty">Noch nichts losgelassen.</p>`}` }
  case "area": { const a=SH.arg, st=stations(a), L=a==="ko"?STATIONEN.ko:STATIONEN.std;
    return `${shTop(esc(AREA[a].n),"Fünf Stationen")}<p class="small muted">${esc(AREA[a].lang)}.</p>
    <div class="list">${L.map((x,i)=>`<div class="row" style="align-items:flex-start"><span class="stat${st[i]?" on":""}" aria-label="${st[i]?"erledigt":"offen"}">${st[i]?"✓":(i+1)}</span><span class="t"><b>${esc(x.n)}</b><span style="font-size:14px;color:var(--muted)">${esc(x.x)}</span></span></div>`).join("")}</div>
    <p class="small muted" style="margin-top:12px">${st.filter(Boolean).length} von 5 Stationen erledigt.${st.every(Boolean)?" Dieser Bereich ist ganz durchlaufen.":""}</p>` }
  case "verlauf": { const L=S.log.slice().reverse().slice(0,60);
    const lab=e=>e.k==="los"?WEG[e.weg].n+": "+(e.name||sizeName(e.size))+(e.who?" (für "+e.who+")":""):e.k==="teil"?"Statt neu: "+(e.name||"ohne Namen"):e.k==="wunsch"?({lass:"Wunsch gelassen",leih:"Wunsch geliehen oder gebraucht",kauf:"Wunsch bewusst gekauft"}[e.dec])+": "+e.name:e.k==="ueb"?"Übung: "+(UEB[e.uid]?UEB[e.uid].t:""):e.k==="keep"?"Bewusst behalten: "+e.name:e.k==="kiste"?"Vielleicht-Kiste: "+(e.name||"ohne Namen"):e.k==="chal"?"Aufgabe: "+(CHAL[e.cid]?CHAL[e.cid].t:""):e.k==="aufg"?"Aufgabe: "+(AUF[e.aid]?AUF[e.aid].t:""):"";
    return `${shTop("Verlauf")}${L.length?`<div class="list">${L.map(e=>`<div class="row"><i class="dot ${e.cat||(UEB[e.uid]||{}).cat||""}"></i><span class="t"><b style="font-weight:500">${esc(lab(e))}</b><span>${fdateY(e.ts)}${e._p?", "+hb(e._p):""}</span></span></div>`).join("")}</div>`:`<p class="empty">Noch leer.</p>`}` }
  case "hilfe": { const H=school()?[3,4,2,0,1,5].map(i=>HILFE[i]):HILFE;
    return `${shTop("Wenn es schwer wird")}
    <p>Manchen Menschen fällt Loslassen so schwer, dass es den Alltag stark einschränkt. Andere kaufen, obwohl sie es nicht wollen, und geraten in Schulden. Beides kommt häufiger vor, als man denkt. Beides lässt sich behandeln. Oft wird es deutlich besser, es braucht aber Zeit. Diese App ersetzt keine Hilfe und keinen Behandlungsplan. Wenn Loslassen dir große Angst macht, setz dich mit den Handbreit und dem Bild nicht unter Druck.</p>
    <div class="box" style="margin:10px 0 14px"><b>Bei akuter Gefahr: 112</b></div>
    <div class="list">${H.map(h=>`<div class="row" style="align-items:flex-start"><span class="t"><b>${esc(h.n)}</b><span style="font-size:14.5px;color:var(--muted)">${esc(h.x)}</span></span>${h.tel?`<a class="btn quiet" style="min-height:44px;padding:0 14px" href="tel:${h.tel}">Anrufen</a>`:h.u?`<a class="btn quiet" style="min-height:44px;padding:0 14px" href="${h.u}" target="_blank" rel="noopener">Öffnen</a>`:""}</div>`).join("")}</div>
    <p class="small muted" style="margin-top:12px">Für Angehörige: Gegen den Willen eines Menschen zu entrümpeln hilft meist nicht und kann schaden. Beratungsstellen helfen auch Familien.</p>
    ${IMP.i22?`<div class="links"><button class="lnk" data-a="open" data-v="imp" data-w="i22">Mehr über Horten</button>${IMP.i21?`<button class="lnk" data-a="open" data-v="imp" data-w="i21">Mehr über Kaufsucht</button>`:""}</div>`:""}` }
  case "daten": return `${shTop("Daten sichern und laden")}
    <p>Deine Einträge liegen nur auf diesem Gerät, in diesem Browser. Eine Sicherung kannst du auf ein anderes Gerät übertragen.</p>
    <div class="btns"><button class="btn" data-a="export">Sicherung speichern</button><button class="btn sec2" data-a="copy">In Zwischenablage kopieren</button></div>
    <div class="fld"><span>Sicherung laden</span><label class="btn sec2 filebtn">Datei wählen<input type="file" id="f-file" accept=".json,application/json" class="sr" data-a="filepick"></label> <span class="note" id="f-fname"></span></div>
    <textarea class="inp" id="f-paste" placeholder="Oder den kopierten Text hier einfügen" style="margin-top:8px"></textarea>
    <div class="btns"><button class="btn sec2" data-a="import">Laden</button></div>
    ${d.err?`<p class="note" style="color:var(--err)">${esc(d.err)}</p>`:""}
    ${d.confirm?`<div class="box"><b>Sicherung vom ${esc(d.confirm.date)}</b><p class="small" style="margin:4px 0 10px">${d.confirm.n} Einträge. Dein jetziger Stand wird dabei ersetzt.</p><button class="btn" data-a="import-ok">Ersetzen und laden</button></div>`:""}
    <p class="note">Tipp: Leg Luftholen auf den Home-Bildschirm. Dann löscht Safari die Daten nicht nach längerer Pause.</p>`;
  case "reset": return `${shTop("Neu beginnen")}<p>Das löscht alle Einträge, Wünsche, Übungen und Einstellungen auf diesem Gerät. Dein Zimmer ist danach wieder voll.</p>
    ${d.sure?`<div class="box"><b>Bist du sicher?</b><p class="small" style="margin:4px 0 10px">Das lässt sich nicht rückgängig machen, außer du hast eine Sicherung.</p><button class="btn" data-a="reset-ok" style="background:var(--err);color:#fff">Ja, alles löschen</button></div>`:`<div class="btns"><button class="btn sec2" data-a="reset-1">Alles löschen</button><button class="btn quiet" data-a="open" data-v="daten">Vorher sichern</button></div>`}`;
  case "about": return `${shTop("Über Luftholen")}
    <p>Luftholen hilft dir zu entscheiden, was bleibt: weniger besitzen und das Richtige behalten. Die App ist kostenlos, braucht kein Konto und schickt keine Nachrichten. Alles bleibt auf deinem Gerät.</p>
    <p>Alle Befunde nennen ihre Quelle und eine ehrliche Belegstufe. Wo Studien sich nicht wiederholen ließen, steht das dabei. Die App sagt nie, dass Besitz schlecht ist. Sie fragt, welcher Besitz dir dient.</p>
    <p class="small muted">Idee und Auftrag: Carlo Maximilian Engeländer. Alle Rechte vorbehalten. Schriften: TeX Gyre Schola (GUST Font License) und Inter (SIL Open Font License), lokal eingebettet, ohne Anfrage an fremde Server.</p>
    <p class="meta">Version vom ${esc(BUILD)}</p>`;
  case "aufgaben": return `${shTop("Kleine Aufgaben",AUFGABEN.filter(a=>a.art==="einmal"&&aufDone(a.id)).length+" von "+AUFGABEN.filter(a=>a.art==="einmal").length+" einmaligen erledigt")}
    <p class="small muted">Einmalige Aufgaben verändern etwas dauerhaft und zählen einmal. Wiederholbare zählen höchstens einmal am Tag. Was du schon vor der App erledigt hattest, markierst du mit „Hatte ich schon“. Das bringt ehrlich keine Handbreit.</p>
    ${areaOrder().map(c=>`<h3 style="margin:20px 0 6px;display:flex;align-items:center;gap:8px"><i class="dot ${c}"></i>${esc(AREA[c].n)}</h3><div class="list">${AUFGABEN.filter(a=>a.cat===c).map(a=>{ const dn=a.art==="einmal"?aufDone(a.id):aufToday(a.id), n=aufCount(a.id);
      return `<div class="row" style="align-items:flex-start"><span class="t"><b>${esc(a.t)}</b><span style="font-size:14px;color:var(--muted)">${esc(school()&&a.s?a.s:a.x)}</span><span>${a.art==="einmal"?"einmalig, +"+hb(a.w):"wiederholbar, +"+hb(a.w)+(n?", schon "+n+"×":"")}${S.pre[a.id]?", hattest du schon":""}</span>${a.imp&&IMP[a.imp]?`<button class="lnk inl" data-a="open" data-v="imp" data-w="${a.imp}">Der Befund dazu</button>`:""}</span>
        <span style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">${dn?`<span class="stat on" aria-label="erledigt">✓</span>`:`<button class="chip" data-a="aufg" data-v="${a.id}" aria-label="${esc(a.t)}: erledigt">Erledigt</button>${a.art==="einmal"?`<button class="lnk inl" data-a="aufg-pre" data-v="${a.id}">Hatte ich schon</button>`:""}`}</span></div>` }).join("")}</div>`).join("")}`;
  case "moment": return momentHTML();
  case "zone": { const kid=katOfStelle(SH.arg), k=KAT[kid]; if(!k) return shTop("Nicht gefunden");
    const zi=Bild.placed().find(x=>x.id===SH.arg), rest=katRest(kid), G=guthaben(), cost=Math.min(PREIS,rest), imp=k.imp&&IMP[k.imp];
    const chs=k.ch.map((c,ci)=>{ const dn=S.log.some(e=>e.k==="chal"&&e.cid===c.id&&dkey(e.ts)===dkey()), n=S.log.filter(e=>e.k==="chal"&&e.cid===c.id).length;
      return `<div class="row chal${SH.d&&SH.d.hl===c.id?" hl":""}" style="align-items:flex-start"><span class="t">${ci===0?`<span class="anf">Fang hiermit an</span>`:""}<b>${esc(c.t)}</b><span class="cx">${esc(school()&&c.s?c.s:c.x)}</span><span>${c.min}\u00a0Min. · +${hb(c.w)}${n?" · schon "+n+"×":""}</span></span>
        <span>${dn?`<span class="stat on" aria-label="heute erledigt">✓</span>`:`<button class="chip" data-a="chal" data-v="${c.id}" aria-label="${esc(c.t)}: erledigt">Erledigt</button>`}</span></div>` }).join("");
    const ABR=`<div class="box abr">${rest<=0?`<b>Im Bild ist hier alles abgeräumt.</b>`:G>=cost?`<div class="abr-z"><span><b>${kid==="erinnerung"?"Im Bild in eine Kiste räumen":"Im Bild abräumen"}</b><span class="small">Du hast ${hb(G)}.${S.spend.some(x=>!x.alt)?"":" Das Bild ist nicht dein echtes Zimmer. Was du abräumst, steht für das, was du getan hast."}</span></span><button class="btn" data-a="spend" data-v="${esc(SH.arg)}">${kid==="erinnerung"?"Wegräumen":"Abräumen"} · ${hb(cost)}</button></div>`
      :`<b>Im Bild abräumen · ${hb(cost)}</b><p class="small" style="margin:4px 0 0">${G?"Du hast "+hb(G)+". Dir "+(cost-G===1?"fehlt":"fehlen")+" noch "+hb(cost-G)+".":"Du hast noch keine Handbreit."} Handbreit bekommst du für die Aufgaben unten und für jeden Eintrag.</p>`}</div>
`, WAYS=kid=>`<p class="small muted zw">Behalten ist dabei genauso gut wie Weggeben. Es zählt, dass du hingesehen und entschieden hast.</p>
     <p class="small zw2"><b class="ui">Hast du schon entschieden?</b> Trag es ein, das bringt auch Handbreit.</p>
     <div class="opts drei"><button class="opt" data-a="zone-go" data-v="keep" data-w="${kid}"><span>Mit Grund behalten</span></button>
      <button class="opt" data-a="zone-go" data-v="kiste" data-w="${kid}"><span>In die Vielleicht-Kiste</span></button>
      <button class="opt" data-a="zone-go" data-v="los" data-w="${kid}"><span>Weiter&shy;geben</span></button></div>
`;
    return `${shTop(esc(k.n),`<i class="dot ${k.cat}"></i> ${esc(k.kurz)}`)}
    ${zi?`<canvas class="zcrop" data-z="${esc(SH.arg)}" role="img" aria-label="Ausschnitt aus dem Bild, markiert: ${esc(k.n)}"></canvas>`:""}
    <h3 class="zh">Aufgaben für dein Zuhause</h3>
    <div class="list">${chs}</div>
    ${kid==="moebel"?WAYS(kid)+ABR:ABR+WAYS(kid)}
    <div class="box zs"><b>Was die Forschung sagt</b>${k.fakt.slice(0,1).map(f=>`<p class="small" style="margin:4px 0 0">${esc(f.t)} ${evDots(f.ev)}</p>`).join("")}
      ${k.halten?`<p class="small" style="margin:8px 0 0"><b class="ui">Eher aufheben:</b> ${esc(k.halten)}</p>`:""}${k.los?`<p class="small" style="margin:6px 0 0"><b class="ui">Gut loslassen:</b> ${esc(k.los)}</p>`:""}</div>
    <details class="mehr"><summary>Mehr dazu</summary>
     ${k.fakt.slice(1).map(f=>`<p class="small">${esc(f.t)} ${evDots(f.ev)}</p>`).join("")}
     <p class="small muted">Quellen: ${k.fakt.map(f=>f.u?`<a href="${esc(f.u)}" target="_blank" rel="noopener">${esc(f.q)}</a>`:esc(f.q)).join("; ")}.</p>
     ${schoolNote()}
     <div class="links">${imp?`<button class="lnk" data-a="open" data-v="imp" data-w="${imp.id}">Befund: ${esc(imp.t)}</button>`:""}<button class="lnk" data-a="open" data-v="timer" data-w="10">10 Minuten mit Zeitgeber</button></div>
     <p class="note">Das Bild steht für Sorten von Dingen, die es in fast jedem Zuhause gibt, nicht für dein Zimmer. Was du abräumst, wählst du selbst.</p>
    </details>` }
  case "none": return shTop("");
  }
  return shTop("");
}
function calLinks(title,desc,ts){
  const d=new Date(ts), ymd=d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0");
  const n=new Date(ts+DAY), ymd2=n.getFullYear()+String(n.getMonth()+1).padStart(2,"0")+String(n.getDate()).padStart(2,"0");
  const g="https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(title)+"&details="+encodeURIComponent(desc)+"&dates="+ymd+"/"+ymd2;
  return `<div class="links"><button class="lnk" data-a="ics" data-v="${esc(title)}" data-w="${ts}">Termin im Kalender</button><a class="lnk" href="${g}" target="_blank" rel="noopener">Google Kalender</a></div>` }

/* ---------- Ding prüfen ---------- */
const PQ=[
  {k:"use",q:"Wann hast du es zuletzt benutzt?",o:[["w","In den letzten sieben Tagen"],["m","Im letzten Monat"],["y","Im letzten Jahr"],["l","Vor mehr als einem Jahr"],["n","Noch nie, und ich habe es schon länger"],["neu","Noch nie, es ist ganz neu"]]},
  {k:"again",q:"Wenn du es heute nicht hättest: Würdest du dir genau dieses Ding wieder besorgen?",o:[["ja","Ja, sofort"],["vl","Vielleicht"],["nein","Nein"]],x:"Diese Frage dreht den Besitztumseffekt um. Was wir haben, bewerten wir oft höher, als wir es selbst kaufen würden."},
  {k:"why",multi:true,q:"Was spricht fürs Behalten? Wähle alles, was stimmt.",o:[["oft","Ich brauche es regelmäßig"],["kann","Damit kann ich etwas selbst"],["sinn","Es trägt eine Erinnerung"],["gut","Ich freue mich, wenn ich es sehe"],["teuer","Es war teuer"],["mal","Ich könnte es irgendwann brauchen"],["gesch","Es war ein Geschenk"],["mehr","Ich habe davon mehrere"],["nix","Nichts davon"]]},
  {k:"repl",q:"Könntest du es leicht leihen oder wieder besorgen, falls du es doch brauchst?",o:[["ja","Ja, ziemlich leicht"],["nein","Eher nicht"]]}
];
function pruefHTML(){
  const d=SH.d, i=SH.step;
  if(i===0) return `${shTop("Ein Ding prüfen","Vier Fragen")}${prog(0,5)}
    <p class="muted small">Nimm das Ding am besten in die Hand. Die Fragen helfen dir, ehrlich zu entscheiden. Die Entscheidung liegt am Ende bei dir.</p>
    <label class="fld"><span>Was ist es?</span><input class="inp" id="f-name" maxlength="60" placeholder="${phx("zum Beispiel: Raclette-Gerät","zum Beispiel: altes Federmäppchen")}" value="${esc(d.name||"")}" autocomplete="off" data-autofocus></label>
    <div class="fld"><span>Bereich</span>${areaChips(d.cat,"set-cat")}</div>
    <div class="btns"><button class="btn" data-a="step" data-v="1" ${d.cat?"":"disabled"}>Weiter</button></div>${need([!d.cat&&"Bereich"].filter(Boolean))}`;
  if(i<=PQ.length){ const q=PQ[i-1], v=d[q.k];
    return `${shTop("Ein Ding prüfen",esc(d.name||AREA[d.cat].n))}${prog(i,5)}<h3 style="margin:6px 0 14px">${esc(q.q)}</h3>
    <div class="opts">${q.o.map(([k,n])=>{ const on=q.multi?(v||[]).includes(k):v===k; return `<button class="opt${on?" on":""}" aria-pressed="${on}" data-a="pq" data-v="${q.k}" data-w="${k}">${esc(n)}</button>` }).join("")}</div>
    ${q.x?`<p class="note">${esc(q.x)}</p>`:""}
    <div class="btns"><button class="btn sec2" data-a="step" data-v="-1">Zurück</button>${q.multi?`<button class="btn" data-a="step" data-v="1" ${(v||[]).length?"":"disabled"}>Weiter</button>`:""}</div>`; }
  const R=pruefResult(d);
  return `${shTop("Ergebnis",esc(d.name||AREA[d.cat].n))}${prog(5,5)}
    <div class="box lit"><b>Vorschlag: ${esc(R.n)}</b><p class="small" style="margin:4px 0 0">${esc(R.x)}</p></div>
    ${R.why.length?`<h3 style="margin:18px 0 6px">Warum</h3><ul style="padding-left:20px;margin:0">${R.why.map(w=>`<li class="small" style="margin:6px 0">${esc(w.t)}${w.imp&&IMP[w.imp]?` <button class="lnk inl" data-a="open" data-v="imp" data-w="${w.imp}">Zum Befund</button>`:""}</li>`).join("")}</ul>`:""}
    <h3 style="margin:20px 0 10px">Du entscheidest</h3>
    <div class="opts">${[["keep","Bewusst behalten"],["kiste","In die Vielleicht-Kiste"],["los","Weitergeben"],["none","Erst mal nichts tun"]].map(([k,n])=>`<button class="opt${R.k===k?" on":""}" data-a="pruefdo" data-v="${k}">${n}${R.k===k?"<small>Vorschlag</small>":""}</button>`).join("")}</div>`;
}
function pruefResult(d){
  const w=d.why||[], use=d.use, again=d.again, why=[];
  const recent=use==="w"||use==="m", old=use==="l"||use==="n", fresh=use==="neu";
  const strong=w.filter(z=>["oft","kann","sinn","gut"].includes(z));
  let k="kiste", n="In die Vielleicht-Kiste", x="Du bist unsicher. Leg es für dreißig Tage weg. Wenn du es in der Zeit nicht holst, weißt du mehr.";
  if(recent||again==="ja"||(strong.length&&!old)||(w.includes("sinn")&&again!=="nein")){
    k="keep"; n="Bewusst behalten"; x="Es spricht einiges dafür, dass dieses Ding dir dient. Gib ihm einen Grund und einen Platz."; }
  else if(old&&again==="nein"&&!strong.length&&!(w.includes("mal")&&d.repl==="nein")){ k="los"; n=d.cat==="pa"?"Aufräumen oder vernichten":"Weitergeben";
    x=d.cat==="pa"?"Du brauchst es nicht und würdest es nicht wieder besorgen. Bei Papieren gilt: Was keine Aufbewahrungsfrist hat, kann ins Altpapier. Persönliches vorher schreddern.":"Du nutzt es nicht und würdest es nicht wieder besorgen. Jemand anderes kann es vermutlich besser brauchen."; }
  else if(w.includes("sinn")&&old){ k="kiste"; n="Erinnerung festhalten, dann entscheiden"; x="Die Erinnerung ist dir wichtig, das Ding selbst nutzt du nicht. Mach ein Foto und schreib auf, was es dir bedeutet. Dann entscheide mit etwas Abstand."; }
  if(fresh&&k!=="keep"){ k="kiste"; n="Erst prüfen, ob Rückgabe geht"; x="Es ist neu und noch ungenutzt. Vielleicht kannst du es zurückgeben oder umtauschen. Sonst hilft die Vielleicht-Kiste beim Entscheiden."; }
  if(recent) why.push({t:"Du hast es in letzter Zeit benutzt. Was gebraucht wird, verdient seinen Platz."});
  if(old) why.push({t:use==="n"?"Du hast es noch nie benutzt, obwohl du es schon länger hast.":"Du hast es seit über einem Jahr nicht benutzt. Ein Jahr umfasst alle Jahreszeiten und die meisten Anlässe. Das ist eine Erfahrungsregel, keine Studie."});
  if(fresh) why.push({t:"Neue Dinge brauchen manchmal etwas Zeit, bis sie ihren Platz finden. Rückgabe lohnt sich zu prüfen, solange es geht."});
  if(again==="nein"&&!recent&&!w.includes("sinn")&&!w.includes("gesch")) why.push({t:"Du würdest es dir heute nicht wieder besorgen. Das kann ein Hinweis auf den Besitztumseffekt sein: Was uns gehört, schätzen wir oft höher ein.",imp:"i05"});
  if(w.includes("teuer")) why.push({t:"Dass es teuer war, ist ein schlechter Grund zum Behalten. Das Geld ist ausgegeben, ob es bleibt oder nicht.",imp:"i06"});
  if(w.includes("mal")) why.push({t:d.repl==="ja"?"Für „irgendwann“ kannst du es leihen oder wieder besorgen. Das Risiko ist klein.":"Wenn es schwer zu ersetzen ist, kann „irgendwann“ ein fairer Grund sein. Die Vielleicht-Kiste hilft beim Abwägen."});
  if(w.includes("gesch")) why.push({t:GESCHENK.t,imp:GESCHENK.imp});
  if(w.includes("mehr")) why.push({t:"Wenn du mehrere davon hast, behalte das beste und gib die anderen weiter."});
  if(w.includes("sinn")) why.push({t:"Ein Foto vom Erinnerungsstück kann helfen, die Erinnerung zu behalten und das Ding gehen zu lassen.",imp:"i07"});
  if(w.includes("kann")) why.push({t:"Dinge, mit denen du etwas selbst kannst, stärken Selbstständigkeit.",imp:KANN_IMP});
  return {k,n,x,why};
}
const GESCHENK={t:"Ein Geschenk hat seinen Zweck oft schon im Moment des Schenkens erfüllt. Erste Studien mit gedachten Situationen deuten an: Schenkende sind weniger gekränkt, wenn ein Geschenk weitergeht, als Beschenkte glauben.",imp:"i46"};
const KANN_IMP="i45";

/* ---------- Impuls ---------- */
/* Führung: Jede Wissenskarte endet mit einem klaren Schritt und einem Knopf dorthin */
function tunHTML(i,tip){ const T=typeof TUN!=="undefined"&&TUN[i.id];
  if(!T) return `<div class="box"><b>Was das für dich heißen kann</b><p class="small" style="margin:4px 0 0">${esc(tip)}</p></div>`;
  const c=T.a==="chal"&&CHAL[T.v];
  const btn=c?`data-a="zone" data-v="${c.kat}" data-w="${c.id}"`:T.a==="ueb"?`data-a="open" data-v="ueb" data-w="${T.v}"`:T.a==="aufg"?`data-a="aufg-sheet" data-v="${T.v}"`:`data-a="open" data-v="${T.v}"`;
  return `<h3 style="margin:18px 0 6px">Was das für dich heißen kann</h3><p>${esc(tip)}</p>
    <div class="box tun"><b>Probier es so</b><p style="margin:4px 0 12px">${esc(school()&&T.s?T.s:T.tun)}</p><button class="btn" ${btn}>${esc(T.b)}</button></div>` }
function impHTML(){
  const i=IMP[SH.arg]; if(!i) return shTop("Nicht gefunden");
  const tip=school()&&i.s?i.s:i.tip;
  const ex=UEBUNGEN.find(u=>u.imp===i.id);
  const run=S.readRun, warn=run.n>=5&&run.warned!==dkey();
  if(warn){ run.warned=dkey(); save() }
  return `${shTop(esc(i.t),`<i class="dot ${i.cat}"></i> ${esc(AREA[i.cat].n)}`)}
   <p class="meta" style="margin:-4px 0 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">${i.myth?'<span class="tag myth">Oft gehört, schlecht belegt</span>':`<button class="chipx" data-a="open" data-v="ev">${evDots(i.ev)} ${esc(i.evn||EV[i.ev].n)}</button><span class="tag">${esc(i.typ)}</span>`}</p>
   ${school()?`<p class="lead">${esc(firstSentence(i.x))}</p>${tunHTML(i,tip)}
   <details style="margin-top:10px"><summary>Mehr lesen: Befund und Einordnung</summary><div class="dn"><p>${esc(i.x)}</p><p class="muted">${esc(i.c)}</p></div></details>`:
   `<p class="lead">${esc(i.x)}</p>
   <h3 style="margin:18px 0 6px">Einordnung</h3><p>${esc(i.c)}</p>
   ${tunHTML(i,tip)}`}
   <p class="src" style="margin-top:16px">${esc(i.src)}</p><div class="links" style="margin-top:0">${i.u?`<a class="lnk" href="${esc(i.u)}" target="_blank" rel="noopener">Quelle öffnen</a>`:""}${(i.links||[]).map(l=>`<a class="lnk" href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.n)}</a>`).join("")}</div>
   ${ex?`<button class="card" style="margin-top:14px" data-a="open" data-v="ueb" data-w="${ex.id}"><div class="meta">Dazu passt die Übung</div><h3>${esc(ex.t)}</h3></button>`:""}
   <div class="btns"><button class="btn sec2" data-a="save" data-v="${i.id}" aria-pressed="${!!S.saved[i.id]}">${S.saved[i.id]?"Gemerkt":"Merken"}</button><button class="btn sec2" data-a="share" data-v="i-${i.id}">Teilen</button></div>
   ${warn?`<div class="box" style="margin-top:18px"><b>Fünf Impulse am Stück</b><p class="small" style="margin:4px 0 8px">Lesen ist gut, Tun verändert mehr. Vielleicht prüfst du jetzt ein Ding.</p><button class="lnk" data-a="open" data-v="pruef">Ein Ding prüfen</button></div>`:""}`;
}
/* ---------- Quiz ---------- */
function quizHTML(){
  const d=SH.d;
  if(!d.list){ const QZ=QUIZ.filter(q=>!(school()&&q.jung===false)); const un=QZ.filter(q=>!S.quiz[q.id]), wr=QZ.filter(q=>S.quiz[q.id]&&!S.quiz[q.id].ok), rest=QZ.filter(q=>S.quiz[q.id]&&S.quiz[q.id].ok);
    const seed=hsh(dkey()+"q"); const sh=a=>a.map(q=>[hsh(q.id+seed),q]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
    d.list=[...sh(un),...sh(wr),...sh(rest)].slice(0,5).map(q=>q.id); d.i=0; d.score=0 }
  if(!d.list.length) return shTop("Was stimmt?")+`<p class="empty">Noch keine Fragen.</p>`;
  if(d.i>=d.list.length) return `${shTop("Was stimmt?","Fertig")}<p class="lead">${d.score} von ${d.list.length} richtig.</p><p class="muted">${d.score===d.list.length?"Alles richtig.":"Falsch beantwortete Fragen kommen beim nächsten Mal wieder."}</p><div class="btns"><button class="btn" data-a="quiz-new">Neue Runde</button><button class="btn sec2" data-a="close">Schließen</button></div>`;
  const q=QUIZ.find(x=>x.id===d.list[d.i]), p=d.picked;
  const ord=q.o.map((_,k)=>k).sort((a,b)=>hsh(q.id+"m"+a)-hsh(q.id+"m"+b));
  return `${shTop("Was stimmt?","Frage "+(d.i+1)+" von "+d.list.length)}${prog(d.i,d.list.length)}<h3 style="margin:6px 0 14px">${esc(q.q)}</h3>
   <div class="opts">${ord.map(k=>[q.o[k],k]).map(([o,k])=>`<button class="ans${p!=null&&k===q.r?" ok":""}${p===k&&k!==q.r?" no":""}${p===k?" on":""}" data-a="qans" data-v="${k}" ${p!=null?"disabled":""}>${p!=null&&k===q.r?"✓ ":p===k?"✕ ":""}${esc(o)}</button>`).join("")}</div>
   ${p!=null?`<div class="box"><b>${p===q.r?"Richtig.":"Nicht ganz."}</b><p class="small" style="margin:4px 0 0">${esc(q.x)}</p>${q.imp&&IMP[q.imp]?`<button class="lnk" data-a="open" data-v="imp" data-w="${q.imp}">Zum Befund</button>`:""}</div><div class="btns"><button class="btn" data-a="qnext" data-autofocus>Weiter</button></div>`:""}`;
}
/* ---------- Begriffe mit Lernkasten ---------- */
const LKI=[0,1,3,7,16,35,90];
function lkDue(){ return BEGRIFFE.filter(b=>S.lk[b.id]&&now()>=S.lk[b.id].due) }
const AVOID=[["b15","b17"],["b06","b14"]];
function lkHTML(){
  const d=SH.d;
  if(!d.list){ const due=lkDue().map(b=>b.id), neu=BEGRIFFE.filter(b=>!S.lk[b.id]).slice(0,due.length>=5?0:3).map(b=>b.id); d.list=[...due.slice(0,7),...neu]; d.i=0; d.score=0 }
  if(!d.list.length){ const nxt=Math.min(...Object.values(S.lk).map(x=>x.due)); return `${shTop("Begriffe")}<p>Gerade ist nichts fällig.${isFinite(nxt)?" Der nächste Begriff kommt am "+fdate(nxt)+" wieder.":""}</p><div class="btns"><button class="btn sec2" data-a="open" data-v="begriffe">Alle Begriffe ansehen</button></div>` }
  if(d.i>=d.list.length) return `${shTop("Begriffe","Fertig")}<p class="lead">${d.score} von ${d.list.length} erkannt.</p><p class="muted">Erkannte Begriffe kommen in immer größeren Abständen wieder. So bleiben sie hängen.</p><div class="btns"><button class="btn sec2" data-a="close">Schließen</button></div>`;
  const b=BEG[d.list[d.i]], isNew=!S.lk[b.id];
  if(isNew&&!d.intro){ return `${shTop("Neuer Begriff",(d.i+1)+" von "+d.list.length)}${prog(d.i,d.list.length)}<h3 style="font-size:22px;margin:4px 0 10px">${esc(b.t)}</h3><p>${esc(b.x)}</p><div class="btns"><button class="btn" data-a="lk-intro" data-autofocus>Verstanden, jetzt erkennen</button></div>` }
  if(!d.opts){ const others=BEGRIFFE.filter(x=>x.id!==b.id&&!AVOID.some(p=>p.includes(x.id)&&p.includes(b.id)));
    const pick=others.map(x=>[hsh(x.id+dkey()+b.id),x]).sort((p,q)=>p[0]-q[0]).slice(0,2).map(p=>p[1]);
    d.opts=[b,...pick].map(x=>[hsh(x.id+"o"+b.id),x.id]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]) }
  const p=d.picked;
  return `${shTop("Welcher Begriff passt?",(d.i+1)+" von "+d.list.length)}${prog(d.i,d.list.length)}<div class="box" style="margin-top:4px"><p style="margin:0">${esc(b.bsp)}</p></div>
   <div class="opts" style="margin-top:14px">${d.opts.map(id=>`<button class="ans${p&&id===b.id?" ok":""}${p===id&&id!==b.id?" no":""}${p===id?" on":""}" data-a="lkans" data-v="${id}" ${p?"disabled":""}>${p&&id===b.id?"✓ ":p===id?"✕ ":""}${esc(BEG[id].t)}</button>`).join("")}</div>
   ${p?`<div class="box"><b>${p===b.id?"Richtig.":"Gemeint war: "+esc(b.t)+"."}</b><p class="small" style="margin:4px 0 0">${esc(b.x)}</p></div><div class="btns"><button class="btn" data-a="lknext" data-autofocus>Weiter</button></div>`:""}`;
}
/* ---------- Übung ---------- */
function uebHTML(){
  const u=UEB[SH.arg]; if(!u) return shTop("Nicht gefunden");
  const e=S.ex[u.id], d=SH.d, ph=d.ph||"info", imp=IMP[u.imp];
  const head=shTop(esc(u.t),`<i class="dot ${u.cat}"></i> ${esc(AREA[u.cat].n)}, ${u.d===1?"1 Tag":u.d+" Tage"}`);
  if(ph==="plan") return `${head}${prog(0,2)}<p class="muted small">Ein konkreter Plan macht es deutlich wahrscheinlicher, dass du es wirklich tust.</p>
    <label class="fld"><span>Wann und wo fängst du an?</span><input class="inp" id="f-wo" maxlength="80" placeholder="${phx("zum Beispiel: heute Abend im Flur","zum Beispiel: nach der Schule am Schreibtisch")}" value="${esc(d.wo||"")}" data-autofocus></label>
    <label class="fld"><span>Dein Wenn-dann-Plan</span><textarea class="inp" id="f-wenn" maxlength="200">${esc(d.wenn!=null?d.wenn:u.wenn)}</textarea></label>
    <div class="fld"><span>Wie schwer wird es wohl?</span><div class="scale">${[1,2,3,4,5].map(n=>`<button class="${d.erw===n?"on":""}" aria-pressed="${d.erw===n}" data-a="set-erw" data-v="${n}">${n}</button>`).join("")}</div><div class="scale-l"><span>ganz leicht</span><span>sehr schwer</span></div></div>
    ${need([!d.erw&&"wie schwer es wohl wird"].filter(Boolean))}<div class="btns"><button class="btn" data-a="ex-start" ${d.erw?"":"disabled"}>Übung beginnen</button><button class="btn sec2" data-a="ex-ph" data-v="info">Zurück</button></div>
    ${exRun().length>=2?`<p class="note" style="color:var(--err)">Es laufen schon zwei Übungen. Schließ zuerst eine ab.</p>`:""}`;
  if(ph==="early") { const nd=Object.keys(e.days).length; return `${head}<h3 style="margin:8px 0 10px">An wie vielen Tagen hast du es gemacht?</h3><p class="small muted">${nd?"Du hast "+nd+" "+plural(nd,"Tag","Tage")+" eingetragen. Wenn du an einem weiteren Tag dabei warst, kannst du ihn noch dazuzählen. ":"Du hast keinen Tag eingetragen. Das ist nicht schlimm. "}Sei ehrlich: Die Übung bringt Handbreit, wenn du sie an mindestens der Hälfte der Tage gemacht hast.</p>
    <div class="chips">${Array.from({length:Math.min(u.d,exDay(e),nd+1)+1},(_,n)=>n).map(n=>`<button class="chip${d.dd===n?" on":""}" aria-pressed="${d.dd===n}" data-a="set-dd" data-v="${n}">${n}</button>`).join("")}</div>
    <div class="btns"><button class="btn" data-a="ex-ph" data-v="eval" ${d.dd!=null?"":"disabled"}>Weiter zur Auswertung</button></div>` }
  const evalDue=e&&e.st==="run"&&exEvalDue().some(([id])=>id===u.id);
  if(ph==="info"&&evalDue&&d.dd==null){ d.dd=daysDone(e,u); d.ph="early"; return uebHTML() }
  if(ph==="eval"){ if(d.dd==null) d.dd=daysDone(e,u);
    return `${head}${prog(1,2)}<h3 style="margin:8px 0 6px">Wie schwer war es wirklich?</h3><p class="small muted">Vorher hast du ${e.plan.erw} von 5 erwartet.</p>
    <div class="scale">${[1,2,3,4,5].map(n=>`<button class="${d.erl===n?"on":""}" aria-pressed="${d.erl===n}" data-a="set-erl" data-v="${n}">${n}</button>`).join("")}</div><div class="scale-l"><span>ganz leicht</span><span>sehr schwer</span></div>
    ${d.erl?`<p class="small" style="margin-top:12px">${d.erl<e.plan.erw?"Es war leichter, als du gedacht hast.":d.erl>e.plan.erw?"Es war schwerer, als du gedacht hast. Auch das ist ein ehrliches Ergebnis.":"Es war so schwer, wie du erwartet hast."} Erwartungen färben, wie wir etwas erleben. Dein Eindruck ist deshalb ein Hinweis, kein Beweis.</p>`:""}
    <div class="fld"><span>Was nimmst du mit?</span><div class="chips">${[["ja","Behalte ich bei"],["manch","Mache ich ab und zu"],["nein","Passt nicht zu mir"]].map(([v,n])=>`<button class="chip${d.keep===v?" on":""}" aria-pressed="${d.keep===v}" data-a="set-ekeep" data-v="${v}">${n}</button>`).join("")}</div></div>
    <label class="fld"><span>Notiz, wenn du magst</span><textarea class="inp" id="f-enote" maxlength="240">${esc(d.note||"")}</textarea></label>
    <div class="btns"><button class="btn" data-a="ex-done" ${d.erl&&d.keep?"":"disabled"}>Abschließen</button></div>${need([!d.erl&&"wie schwer es war",!d.keep&&"was du mitnimmst"].filter(Boolean))}` }
  const steps=`<ol class="steps">${u.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>`;
  const shared=d.shared?`<div class="box lit" style="margin-bottom:12px"><b>Jemand möchte das mit dir ausprobieren.</b></div>`:"";
  return `${head}${shared}<p class="lead">${esc(uebX(u))}</p>${school()&&u.s?"":""}${steps}
   <div class="box"><b>Warum das hilft</b><p class="small" style="margin:4px 0 0">${esc(u.warum)}</p>${imp?`<button class="lnk" data-a="open" data-v="imp" data-w="${imp.id}">Befund: ${esc(imp.t)}</button>`:""}</div>
   ${!school()&&u.s?`<details style="margin-top:8px"><summary>Fassung für die Schule</summary><p class="small dn">${esc(u.s)}</p></details>`:school()&&u.s?`<details style="margin-top:8px"><summary>Fassung für Erwachsene</summary><p class="small dn">${esc(u.x)}</p></details>`:""}
   ${e&&e.st==="run"?`<div class="box"><b>Läuft seit ${fdate(e.start)}: Tag ${exDay(e)} von ${u.d}</b>${e.plan.wenn?`<p class="small" style="margin:4px 0 0">Dein Plan: ${esc(e.plan.wenn)}</p>`:""}</div>
     ${evalDue?`<div class="btns"><button class="btn" data-a="ex-ph" data-v="early">Auswerten</button></div>`:""}${exDay(e)<=u.d?`<p class="meta" style="margin-top:14px">Heute</p><div class="chips" style="margin-top:6px">${[[2,"Geschafft"],[1,"Teilweise"],[0,"Heute nicht"]].map(([n,l])=>`<button class="chip${e.days[dkey()]===n?" on":""}" aria-pressed="${e.days[dkey()]===n}" data-a="exday" data-v="${u.id}" data-w="${n}">${l}</button>`).join("")}</div>`:""}
     <div class="btns">${exDay(e)>=Math.ceil(u.d/2)&&exDay(e)<=u.d?`<button class="btn sec2" data-a="ex-ph" data-v="early">Früher abschließen</button>`:""}</div><div class="links"><button class="lnk" data-a="ex-stop">Übung abbrechen</button></div>
     ${calLinks("Übung: "+u.t,"Letzter Tag der Übung. Danach auswerten.",e.start+(u.d-1)*DAY)}`:
   `<div class="btns"><button class="btn" data-a="ex-ph" data-v="plan">${e&&e.st==="done"?"Noch einmal machen":"Annehmen"}</button><button class="btn sec2" data-a="share" data-v="u-${u.id}">Mit jemandem machen</button></div>
    ${e&&e.st==="done"?`<p class="note">Zuletzt abgeschlossen am ${fdate(e.end)}${e.lived?"":", nicht genug Tage für Handbreit"}.${e.note?" Deine Notiz: „"+esc(e.note)+"“":""}</p>`:""}`}`;
}
function daysDone(e,u){ let n=0; Object.values(e.days).forEach(v=>{ n+=v===2?1:v===1?0.5:0 }); return Math.min(u.d,Math.floor(n+1e-9)) }

/* ---------- Bild-Erklärung ---------- */
function bildHTML(){ const W=raum(), st=stageOf(W), K=keepers(), nW=waiting().length, nB=bagList().length;
  const ico=(p)=>`<svg viewBox="0 0 40 40" aria-hidden="true">${p}</svg>`;
  return `${shTop("Dein Zimmer","Stufe "+(st+1)+" von 10: "+esc(STUFEN[st].n))}
  <p>${esc(STUFEN[st].x)}</p>
  <div class="legend">
   <div>${ico('<rect x="8" y="22" width="16" height="10" rx="1.5" fill="var(--c-pa)" opacity=".55"/><rect x="11" y="15" width="12" height="7" rx="1" fill="var(--c-kl)" opacity=".55"/><path d="M24 31c3-4 6 1 9-3" fill="none" stroke="var(--muted)" stroke-width="1.6"/><rect x="25" y="12" width="7" height="9" fill="var(--surface)" stroke="var(--muted)"/>')}<p><b class="ui">Zeug überall</b>: Kleidung, Bücher, Papier, Tassen, Kabel, Deko, Andenken, Kartons, Spielzeug. Jedes Ding steht für eine Sorte, die es fast überall gibt. Tipp darauf, um Aufgaben dafür zu sehen und es mit Handbreit abzuräumen. Möbel, Lampe, Pflanze, Bild und ein paar Bücher bleiben immer.</p></div>
   <div>${ico('<ellipse cx="20" cy="31" rx="12" ry="2.6" fill="var(--surface)" stroke="var(--ink)" stroke-opacity=".5"/><rect x="14" y="13" width="11" height="16" rx="1.5" fill="var(--c-er)" stroke="var(--ink)" stroke-opacity=".6"/>')}<p><b class="ui">Dinge mit Kontur</b> behältst du bewusst. Die Farbe zeigt den Bereich, der Untersetzer den Grund: runder Untersetzer für „oft genutzt“, Holzklotz für „macht mich fähig“, Spitzendeckchen für „trägt Bedeutung“, Kissen für „tut mir gut“. ${K.length?"Du hast "+K.length+".":"Noch steht keins da."} Tipp auf ein Ding, um es anzusehen.</p></div>
   <div>${ico('<rect x="11" y="13" width="18" height="16" rx="2.5" fill="none" stroke="var(--c-pa)" stroke-width="2" stroke-dasharray="3.5 2.6"/><rect x="12" y="22" width="16" height="6" rx="1.5" fill="var(--c-pa)" opacity=".35"/>')}<p><b class="ui">Gestrichelte Pakete</b> vor der Tür sind Wünsche, die gerade warten. Mit der Wartezeit füllen sie sich von unten. ${nW?"Es "+plural(nW,"wartet einer","warten "+nW)+".":""}</p></div>
   <div>${ico('<path d="M14 15l4-6 4 6" fill="none" stroke="var(--c-ko)" stroke-width="1.8"/><rect x="11" y="14" width="14" height="17" rx="2" fill="var(--c-ko)"/><circle cx="28" cy="26" r="5" fill="var(--surface)" stroke="var(--c-ko)" stroke-width="1.4"/><text x="28" y="28.6" font-size="7" font-weight="700" text-anchor="middle" fill="var(--c-ko)" font-family="Inter">L</text>')}<p><b class="ui">Taschen an der Tür</b> gehen zu Menschen. Mit einem Namen bei „Für wen?“ hängt die Tasche einen Monat lang mit Anhänger dort. Leihen, gebraucht holen oder reparieren hängt ebenfalls eine Tasche dazu. ${nB?"Gerade "+plural(nB,"hängt eine","hängen "+nB)+".":""}</p></div>
  </div>
  <p class="note">${(()=>{ const dk=document.documentElement.dataset.dark==="1", nacht=Bild.dayPhase(new Date(now())).k==="nacht";
    return dk?"Im dunklen Modus ist im Bild Abend: Die Lampe brennt, und gegenüber sind die Fenster hell."+(nacht?"":" Im hellen Modus folgt das Licht der Tageszeit.")
      :nacht?"Jetzt ist im Bild Abend: Die Lampe brennt, und gegenüber sind die Fenster hell. Tagsüber scheint die Sonne herein."
      :"Jetzt scheint die Sonne herein. Abends brennt die Lampe, und gegenüber gehen die Fenster an." })()} Über der Tasse steigt Dampf auf. Nichts, was du dir erarbeitet hast, verschwindet aus dem Bild.</p>
  ${focusKats().length?`<p class="note">Nach deiner Bestandsaufnahme haben ${focusKats().map(k=>"„"+esc(KAT[k].n)+"“").join(", ")} im Bild volle Farbe, der übrige Kram ist etwas ruhiger. Das ist dein Schwerpunkt.</p>`:""}<p class="note">Das Bild ist nicht dein echtes Zimmer. Es zeigt, wie viele Handbreit du eingesetzt hast, und was du abräumst, wählst du selbst.</p>
  <div class="btns"><button class="btn sec2" data-a="open" data-v="stufen">Alle Stufen</button></div>` }

/* ---------- Bestandsaufnahme ---------- */
/* Momentaufnahme nach der Bestandsaufnahme: ein Name für das Zuhause gerade, nie für die Person (runde7/typ1.md, typ2.md) */
const PROFILE={
  kl:["Volle Schränke","Bei der Kleidung ist gerade am meisten los."],
  pa:["Stapel und Speicher","Papiere und Daten brauchen gerade die meiste Aufmerksamkeit."],
  er:["Kiste voller Geschichten","Erinnerungen und Geschenke nehmen gerade viel Raum ein."],
  wo:["Zugestellte Flächen","Flächen und Schränke sind gerade voller, als dir lieb ist."],
  ko:["Viel Nachschub","Gerade kommt mehr herein, als du willst."],
  "kl+ko":["Kleiderberg mit Neuzugängen","Kleidung stapelt sich, und es kommt laufend Neues dazu."],
  "pa+wo":["Ablage überall","Papiere und Kleinkram verteilen sich gerade auf viele Flächen."],
  "er+wo":["Schränke voller Gestern","Viel Platz gehört gerade Dingen mit Geschichte."],
  "er+kl":["Kleider mit Geschichte","Im Schrank hängt gerade viel, an dem Erinnerungen hängen."],
  "ko+wo":["Kartonvorrat","Neues kommt herein, und die Flächen werden knapp."],
  ruhig:["Ruhige Ecken","Gerade drückt kaum etwas. Du kannst in Ruhe schauen, was bleiben soll."],
  viel:["Viel auf einmal","Gerade drückt vieles gleichzeitig. Ein sehr kleiner erster Schritt reicht."]
};
function profilOf(sum,ans){ const ids=AREAS.map(a=>a.id), max=Math.max(...ids.map(a=>sum[a]));
  if(Object.values(ans).filter(v=>v===3).length>=4||ids.filter(a=>sum[a]>=5).length>=4) return "viel";
  if(max<=2) return "ruhig";
  const o=ids.slice().sort((x,y)=>sum[y]-sum[x]||ids.indexOf(x)-ids.indexOf(y)), a=o[0], b=o[1];
  if(sum[b]>=3&&sum[b]>=sum[a]-1){ const k=[a,b].sort().join("+"); if(PROFILE[k]) return k }
  return a }
function checkResult(){
  const d=SH.d, ans=d.ans, sum={};
  AREAS.forEach(a=>sum[a.id]=0); CHECK.forEach(c=>{ if(!c.fokus) sum[c.cat]+=ans[c.id]||0 }); /* Fragen mit fokus zählen nur für den Schwerpunkt im Bild */
  const top3=AREAS.map(a=>a.id).sort((x,y)=>sum[y]-sum[x]||AREAS.findIndex(a=>a.id===x)-AREAS.findIndex(a=>a.id===y)).slice(0,3);
  const pk=profilOf(sum,ans), P=PROFILE[pk], viel=pk==="viel";
  if(!d.saved){ d.saved=true; d.vorher=S.check&&S.check.profil&&S.check.profil!==pk?S.check.profil:null; S.check={ts:now(),ans:Object.assign({},ans),top:top3,sum,profil:pk}; S.settings.nofocus=false; save() }
  const names=top3.map(a=>"„"+AREA[a].n+"“");
  const max=Math.max(...Object.values(sum)), F=focusKats(ans);
  return `${shTop("Deine Bestandsaufnahme","Ergebnis")}
   ${F.length&&!viel?`<div class="prevw"><canvas class="prev" id="prev" role="img" aria-label="Vorschau: So sieht dein Zimmer mit Schwerpunkt aus"></canvas></div>`:""}
   <p class="meta" style="margin:14px 0 2px">Dein Zuhause gerade</p>
   <h3 class="profil">${esc(P[0])}</h3>
   <p style="margin:4px 0 6px">${esc(P[1])}</p>
   ${viel?`<div class="box"><p class="small" style="margin:0">Wenn dich das stark belastet, musst du da nicht allein durch. ${school()?"Sprich mit deinen Eltern, einer Lehrkraft oder der Schulsozialarbeit.":"Unter „Wenn es schwer wird“ findest du Anlaufstellen, etwa die Hausarztpraxis oder eine Beratungsstelle."}</p><button class="lnk" data-a="open" data-v="hilfe">Wenn es schwer wird</button></div>`:""}
   <p class="small muted" style="margin:0">Eine Momentaufnahme deines Zuhauses, kein Urteil über dich. Bei der nächsten Bestandsaufnahme kann sie anders heißen.${d.vorher&&PROFILE[d.vorher]?" Beim letzten Mal hieß sie „"+esc(PROFILE[d.vorher][0])+"“.":""}</p>
   <details class="mehr" style="margin-top:14px"><summary>So hast du geantwortet</summary>
   <p class="small">${(()=>{ const G=AREAS.map(a=>a.id).filter(a=>sum[a]===max), q=a=>"„"+AREA[a].n+"“", list=L=>L.length===1?q(L[0]):L.slice(0,-1).map(q).join(", ")+" und "+q(L[L.length-1]);
     if(max===0) return "Besitz macht dir gerade kaum Druck. Wir fangen mit "+names[0]+" an.";
     if(G.length===AREAS.length) return "Gerade drückt kein Bereich besonders. Wir fangen mit "+names[0]+" an.";
     if(G.length===1) return "Am meisten Druck macht gerade "+q(G[0])+". Danach folgen "+names[1]+" und "+names[2]+".";
     return "Gleich stark drücken gerade "+list(G)+". Wir fangen mit "+names[0]+" an." })()} Der Name oben kommt aus den ein oder zwei stärksten Bereichen.</p>
   <div class="list">${AREAS.map(a=>a.id).sort((x,y)=>sum[y]-sum[x]).map(a=>`<div class="row"><i class="dot ${a}"></i><span class="t"><b style="font-weight:500">${esc(AREA[a].n)}</b></span><span class="weg" style="width:auto;border:0;min-height:0;padding:0"><span class="st">${[0,1,2,3,4,5].map(k=>`<i class="${k<sum[a]?"on":""}" style="width:12px"></i>`).join("")}</span></span></div>`).join("")}</div>
   ${(+ans.c11||0)>=1?`<p class="small muted" style="margin-top:8px">Deine Antwort zu Möbeln zählt nicht in die Balken. Sie bestimmt, ob „Möbel und Stauraum“ im Bild nach vorn tritt.</p>`:""}
   </details>
   ${ans.c11===3&&!viel?`<p class="small" style="margin-top:10px">Wenn ganze Zimmer nicht mehr nutzbar sind oder Loslassen dir große Angst macht, findest du unter „Wenn es schwer wird“ Anlaufstellen.</p>`:""}
   ${F.length?`<p class="small" style="margin-top:12px">Gleich verwandelt sich dein Zimmer: ${F.map(k=>"„"+esc(KAT[k].n)+"“").join(F.length>2?", ":" und ").replace(/, (?=[^,]*$)/," und ")} ${F.length>1?"treten":"tritt"} nach vorn, der Rest wird ruhiger. Dein Fortschritt bleibt.</p>`:""}
   <div class="btns"><button class="btn" data-a="close">${F.length?"Zimmer verwandeln":"Zum Zimmer"}</button></div>
   <p class="small muted" style="margin-top:8px">In drei Monaten kannst du die Bestandsaufnahme wiederholen.</p>`;
}

/* ---------- Momente ---------- */
const MOM=[
  {k:"stage",pri:10},{k:"first-keep",pri:6,c:()=>S.keep.length>0,t:"Das erste Ding mit Grund",x:"Du hast zum ersten Mal ein Ding bewusst behalten. Es steht jetzt auf seinem Platz in deinem Zimmer, mit einem Untersetzer für den Grund."},
  {k:"first-wish",pri:7,c:()=>S.wishes.some(w=>w.waited&&(w.st==="lass"||w.st==="leih")),t:"Ein Wunsch hat gewartet",x:"Ein Wunsch hat seine Zeit bekommen, und danach wolltest du ihn nicht mehr. Das Paket vor der Tür ist weg, der Platz bleibt frei."},
  {k:"first-box",pri:5,c:()=>S.box.some(b=>b.st!=="in"),t:"Die erste Kiste ist offen",x:"Du hast nach dreißig Tagen nachgesehen. Was du nicht gebraucht hast, weißt du jetzt aus eigener Erfahrung."},
  {k:"first-ex",pri:6,c:()=>Object.values(S.ex).some(e=>e.st==="done"&&e.lived),t:"Eine Übung durchgezogen",x:"Du hast eine Übung an genug Tagen gemacht. Aus einem Vorsatz ist etwas geworden, das du kennst."},
  {k:"first-teil",pri:4,c:()=>S.log.some(e=>e.k==="teil"),t:"Die erste Tasche an der Tür",x:"Du hast etwas bekommen, ohne dass es neu hergestellt wurde. In deinem Zimmer hängt jetzt eine Tasche an der Tür."},
  {k:"neu-d",pri:9,c:()=>S.spend.some(x=>x.alt),t:"Neu: Du räumst selbst ab",x:"Deine bisherigen Handbreit stecken schon im Bild, es sieht aus wie vorher. Ab jetzt sammelst du neue Handbreit für Aufgaben und Entscheidungen und setzt sie selbst ein: Tipp im Bild auf etwas, das du abräumen willst. Jedes Ding steht für eine Sorte, die es fast überall gibt."},
  {k:"nomiss",pri:5,c:()=>{ const s=stats(); return s.asked.length>=5 },t:"Dein eigener Beleg",x:null}
];
function maybeMoment(){
  if(SH||TAB!=="home") return;
  const W=raum(), st=stageOf(W), due=[];
  if(st>0&&!S.mom["stage-"+st]) due.push({k:"stage-"+st,pri:10,t:STUFEN[st].n,x:STUFEN[st].x,art:true});
  MOM.forEach(m=>{ if(m.c&&!S.mom[m.k]&&m.c()) due.push(m) });
  if(!due.length) return;
  due.sort((a,b)=>b.pri-a.pri);
  const main=due[0], more=due.slice(1);
  if(main.k==="nomiss"){ const s=stats(); main.x="Von "+s.asked.length+" Dingen, nach denen die App gefragt hat, hast du "+s.missed.length+" vermisst. Das ist dein eigener Beleg dafür, was dir gefehlt hat und was nicht." }
  // Ältere Stufen, die man übersprungen hat, gelten als gesehen
  for(let i=1;i<=st;i++) S.mom["stage-"+i]=now();
  due.forEach(m=>S.mom[m.k]=now()); save();
  // Gibt es noch ein Rückgängig, wandert es aus der Meldung ins Blatt und bleibt, bis das Blatt zu ist
  const u=!!undoFn; if(u){ clearTimeout(toastT); $("#toast").classList.remove("show") }
  openSheet("moment",null,{m:main,more,undo:u});
}
function momentHTML(){ const {m,more}=SH.d;
  return `<div class="sh-top"><span class="meta">${m.k&&m.k.startsWith("stage")?"Neue Stufe":"Neu in deinem Zimmer"}</span><button class="sh-close" data-a="close">Schließen</button></div><h2 id="sh-t" tabindex="-1">${esc(m.t)}</h2><p class="lead">${esc(m.x)}</p>
  ${more&&more.length?`<p class="small muted">Auch neu: ${more.map(x=>esc(x.t)).join(", ")}.</p>`:""}
  <div class="btns"><button class="btn" data-a="close" data-autofocus>Weiter</button>${SH.d.undo&&undoFn?`<button class="btn quiet" data-a="undo">Rückgängig</button>`:""}</div>` }

/* ---------- Meldung mit Rückgängig ---------- */
let toastT=0, undoFn=null;
function toast(msg,opt){ opt=opt||{};
  const t=$("#toast"); undoFn=opt.undo||null;
  t.innerHTML=`${opt.ok!==false?`<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>`:""}<span class="tx">${esc(msg)}</span>${undoFn?`<button data-a="undo">Rückgängig</button>`:""}`;
  t.classList.toggle("up",TAB!=="home"); t.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>{ t.classList.remove("show"); undoFn=null },opt.ms||(undoFn?6000:3500));
  $("#live").textContent=msg;
}
function act(msg,fn,opt){ const snap=JSON.stringify(S), w0=weite(); zHintOff(); fn(); save(); if(typeof msg==="function") msg=msg(weite()-w0); if(weite()>w0&&TAB==="home") goTop=true; toast(msg,Object.assign({undo:()=>{ S=JSON.parse(snap); save(); render(); toast("Rückgängig gemacht",{ok:false,ms:2500}) }},opt||{})) }

/* ---------- Aktionen ---------- */
function readFields(){ const g=id=>{ const e=document.getElementById(id); return e?e.value.trim():undefined };
  if(!SH) return; const d=SH.d; [["f-name","name"],["f-who","who"],["f-note","note"],["f-price","price"],["f-wo","wo"],["f-wenn","wenn"],["f-enote","note"]].forEach(([id,k])=>{ const v=g(id); if(v!==undefined) d[k]=v }) }
const A={
  logo(){ if(TAB!=="home"){ TAB="home"; render() } scrollTo({top:0,behavior:RM()?"auto":"smooth"}) },
  tab(el){ go(el.dataset.v) },
  open(el){ const v=el.dataset.v, w=el.dataset.w||null; if(v==="none") return;
    if(SH) readFields();
    const pre={};
    if(["los","keep","pruef","kiste"].includes(v)&&w&&AREA[w]) pre.cat=w;
    if(v==="wish") pre.cat="ko";
    else if(["los","keep","kiste"].includes(v)&&!pre.cat&&S.check&&S.check.top&&S.check.top[0]) pre.cat=S.check.top[0];
    if(v==="timer"){ NXALT=0; if(el.dataset.step) pre.step=1 }
    if(v==="imp") markRead(w);
    openSheet(v,w,pre) },
  close(){ closeSheet() },
  step(el){ readFields(); SH.step=Math.max(0,SH.step+parseInt(el.dataset.v,10)); drawSheet(true) },
  "set-cat"(el){ readFields(); SH.d.cat=el.dataset.v; drawSheet() },
  "set-size"(el){ readFields(); const v=+el.dataset.v; SH.d.size=SH.d.size===v?null:v; drawSheet() },
  "set-weg"(el){ readFields(); SH.d.weg=SH.d.weg===el.dataset.v?null:el.dataset.v; drawSheet() },
  "set-why"(el){ readFields(); SH.d.why=SH.d.why===el.dataset.v?null:el.dataset.v; drawSheet() },
  "set-days"(el){ readFields(); const v=+el.dataset.v; SH.d.days=SH.d.days===v?null:v; drawSheet() },
  "set-how"(el){ readFields(); SH.d.how=SH.d.how===el.dataset.v?null:el.dataset.v; drawSheet() },
  "set-erw"(el){ readFields(); SH.d.erw=+el.dataset.v; drawSheet() },
  "set-erl"(el){ readFields(); SH.d.erl=+el.dataset.v; drawSheet() },
  "set-ekeep"(el){ readFields(); SH.d.keep=el.dataset.v; drawSheet() },
  "set-dd"(el){ SH.d.dd=+el.dataset.v; drawSheet() },
  "do-los"(){ readFields(); const d=SH.d; const e={id:uid(),k:"los",ts:now(),cat:d.cat,size:d.size,weg:d.weg,name:d.name||"",ask:d.ask===false?null:now()+30*DAY};
    if(d.who&&WEG[d.weg]&&WEG[d.weg].g) e.who=d.who.slice(0,30);
    // Die Stelle zählt fürs Bild nur, wenn dort in der laufenden Stufe noch etwas liegt
    if(d.z&&KAT[d.z]) e.z=d.z;
    const full=d.weg==="mue"||d.weg==="rec"?1:2;
    closeSheet(); act(g=>{ const bag=e.who?"Die Tasche für "+e.who+" hängt an der Tür. ":"";
      if(g<=0) return "Eingetragen. "+bag+"Für heute kommen keine Handbreit mehr dazu.";
      if(g<full) return "Eingetragen. "+bag+"Heute zählen davon noch "+hb(g)+".";
      return "Eingetragen, +"+hb(g)+". "+bag+"Im Bild kannst du jetzt etwas abräumen." },()=>{ S.log.push(e) }); render() },
  "set-motif"(el){ readFields(); SH.d.motif=el.dataset.v; drawSheet() },
  "set-kmotif"(el){ const k=S.keep.find(x=>x.id===SH.arg); if(!k) return; k.motif=el.dataset.v; save(); drawSheet(); const dd=document.querySelector(".mot-d"); if(dd) dd.open=true; toast("Im Bild steht es jetzt als "+el.dataset.v+".") },
  "set-ask"(){ readFields(); SH.d.ask=SH.d.ask===false; drawSheet() },
  nxalt(){ NXALT++; render(); const h=$("#nx-t"); if(h) h.closest(".next").querySelector(".btn").focus({preventScroll:true}) },
  "timer-go"(){ SH.d.end=now()+(+(SH.arg||10))*60000; drawSheet(); timerTick() },
  "do-keep"(){ readFields(); const d=SH.d; if(keepers().length>=MAXKEEP) return;
    const k={id:uid(),ts:now(),name:d.name||"Ohne Namen",cat:d.cat,why:d.why,note:d.note||"",next:now()+90*DAY,asks:0,motif:d.motif||Bild.guessMotif(d.name,d.cat,d.why)};
    closeSheet(); act(g=>"Behalten. Es hat jetzt seinen Platz in deinem Zimmer"+(g>0?", +"+hb(g)+".":"."),()=>{ S.keep.push(k); S.log.push({id:uid(),k:"keep",ts:now(),cat:k.cat,name:k.name}) }); render() },
  keepgo(el){ const k=S.keep.find(x=>x.id===el.dataset.v); if(!k) return; const name=k.name, cat=k.cat;
    act("Sein Platz ist jetzt frei. Trag ein, wohin das Ding geht.",()=>{ k.gone=true; k.answered=true }); openSheet("los",null,{name,cat}) },
  keepans(el){ const k=S.keep.find(x=>x.id===SH.arg)||keepAskDue()[0]; if(!k) return; const v=el.dataset.v;
    if(v==="go"){ const name=k.name, cat=k.cat; k.gone=true; k.answered=true; save(); openSheet("los",null,{name,cat}); return }
    if(v.startsWith("why:")) k.why=v.slice(4);
    k.answered=true; k.asks=(k.asks||0)+1; k.next=k.asks>=2?null:k.ts+365*DAY; if(k.next&&k.next<=now()) k.next=null; save(); buzz("ok");
    closeSheet(); toast(v==="ja"?"Gut. Der Grund gilt weiter.":"Der Grund ist angepasst.") },
  "do-wish"(){ readFields(); const d=SH.d; const w={id:uid(),name:d.name||"Ohne Namen",cat:d.cat,price:d.price||"",ts:now(),days:d.days,due:day0(now())+d.days*DAY,st:"wait"};
    closeSheet(); act("Geparkt bis zum "+fdate(w.due)+".",()=>{ S.wishes.push(w) }); render() },
  wishans(el){ const w=S.wishes.find(x=>x.id===SH.arg); if(!w) return; const v=el.dataset.v;
    if(v==="mehr"){ w.due=day0(now())+7*DAY; save(); closeSheet(); toast("Noch eine Woche bis zum "+fdate(w.due)+"."); return }
    const waited=isDue(w.due);
    closeSheet(); act(v==="lass"?(waited?"Gelassen. Das Paket vor der Tür ist weg, +2 Handbreit.":"Gelassen. Das Paket vor der Tür ist weg."):v==="leih"?"Gut. Nichts Neues muss dafür hergestellt werden.":(waited?"Entschieden, nach voller Wartezeit. +2 Handbreit fürs Warten.":"Entschieden. Du hast es dir überlegt."),()=>{
      w.st=v; w.dts=now(); w.waited=waited; S.log.push({id:uid(),k:"wunsch",ts:now(),wid:w.id,name:w.name,cat:w.cat,dec:v,waited}) }); render() },
  "do-teil"(){ readFields(); const d=SH.d; const e={id:uid(),k:"teil",ts:now(),name:d.name||"",how:d.how,cat:d.cat};
    closeSheet(); act("Eingetragen. Gut, dass es nicht neu sein musste.",()=>{ S.log.push(e) }); render() },
  "do-kiste"(){ readFields(); const d=SH.d; const b={id:uid(),name:d.name||"",cat:d.cat,ts:now(),due:day0(now())+30*DAY,st:"in"};
    closeSheet(); act(g=>"In der Kiste bis zum "+fdate(b.due)+". Schreib das Datum auf die Kiste."+(g>0?" +"+hb(g)+".":""),()=>{ S.box.push(b); S.log.push({id:uid(),k:"kiste",ts:now(),cat:b.cat,name:b.name}) }); render() },
  boxans(el){ SH.d[el.dataset.v]=el.dataset.w; drawSheet() },
  "do-boxdue"(){ const d=SH.d, B=boxDue();
    closeSheet(); act("Die Kiste ist aufgelöst.",()=>{ B.forEach(b=>{ b.st=d[b.id]; if(d[b.id]==="geht") S.log.push({id:uid(),k:"los",ts:now(),cat:b.cat,size:1,weg:d.weg,name:b.name,ask:now()+30*DAY,box:true}) }) }); render() },
  askans(el){ const e=S.log.find(x=>x.id===el.dataset.v); if(!e) return; e.miss=el.dataset.w; save(); buzz("ok");
    if(!askDue().length){ closeSheet(); toast("Danke. Deine Antworten stehen unter „Dein Weg“.") } else drawSheet() },
  checkans(el){ const q=CHECK[SH.step]; SH.d.ans[q.id]=+el.dataset.v; drawSheet(); later(()=>{ if(SH&&SH.type==="check"){ SH.step++; drawSheet(true) } },RM()?0:260) },
  pq(el){ const k=el.dataset.v, v=el.dataset.w, q=PQ.find(x=>x.k===k), d=SH.d;
    if(q.multi){ let L=d[k]||[]; if(v==="nix") L=L.includes("nix")?[]:["nix"]; else { L=L.filter(x=>x!=="nix"); L=L.includes(v)?L.filter(x=>x!==v):[...L,v] } d[k]=L; drawSheet() }
    else { d[k]=v; drawSheet(); later(()=>{ if(SH&&SH.type==="pruef"){ SH.step++; drawSheet(true) } },RM()?0:260) } },
  pruefdo(el){ const d=SH.d, v=el.dataset.v, R=pruefResult(d);
    S.pr.push({ts:now(),name:d.name||"",cat:d.cat,use:d.use,again:d.again,why:d.why,repl:d.repl,sug:R.k,choice:v}); save();
    if(v==="none"){ closeSheet(); toast("Gespeichert. Du kannst jederzeit neu prüfen."); return }
    if(v==="keep"){ const why=(d.why||[]).find(x=>GRUND[x]); openSheet("keep",null,{name:d.name,cat:d.cat,why}); return }
    if(v==="kiste"){ const b={id:uid(),name:d.name||"",cat:d.cat,ts:now(),due:day0(now())+30*DAY,st:"in"}; closeSheet(); act(g=>"In der Vielleicht-Kiste bis zum "+fdate(b.due)+"."+(g>0?" +"+hb(g)+".":""),()=>{ S.box.push(b); S.log.push({id:uid(),k:"kiste",ts:now(),cat:b.cat,name:b.name}) }); render(); return }
    openSheet("los",null,{name:d.name,cat:d.cat,size:1}) },
  qans(el){ const d=SH.d, q=QUIZ.find(x=>x.id===d.list[d.i]), k=+el.dataset.v; d.picked=k; const ok=k===q.r; if(ok) d.score++;
    S.quiz[q.id]={ok,ts:now()}; save(); buzz(ok?"ok":"err"); drawSheet(); if(!ok) shake(document.querySelector(".ans.no")) },
  qnext(){ const d=SH.d; d.i++; d.picked=null; drawSheet(true) },
  "quiz-new"(){ SH.d={}; drawSheet(true) },
  "lk-intro"(){ SH.d.intro=true; drawSheet(true) },
  lkans(el){ const d=SH.d, b=BEG[d.list[d.i]], v=el.dataset.v; d.picked=v; const ok=v===b.id; if(ok) d.score++;
    const cur=S.lk[b.id]||{lvl:0}; const lvl=ok?Math.min(LKI.length-1,(cur.lvl||0)+1):1;
    S.lk[b.id]={lvl,due:day0(now())+LKI[lvl]*DAY+(lvl===0?0:0)}; save(); buzz(ok?"ok":"err"); drawSheet(); if(!ok) shake(document.querySelector(".ans.no")) },
  lknext(){ const d=SH.d; d.i++; d.picked=null; d.opts=null; d.intro=false; drawSheet(true) },
  "ex-ph"(el){ readFields(); SH.d.ph=el.dataset.v; drawSheet(true) },
  "ex-start"(){ readFields(); if(exRun().length>=2) return; const u=UEB[SH.arg], d=SH.d;
    act("Die Übung läuft. Viel Erfolg.",()=>{ S.ex[u.id]={st:"run",start:now(),plan:{wo:d.wo||"",wenn:d.wenn!=null?d.wenn:u.wenn,erw:d.erw},days:{}} });
    SH.d={}; drawSheet(true) },
  exday(el){ const e=S.ex[el.dataset.v]; if(!e) return; const v=+el.dataset.w, k=dkey(); if(e.days[k]===v) delete e.days[k]; else e.days[k]=v; save();
    if(SH) drawSheet(); else render() },
  "ex-stop"(){ const u=UEB[SH.arg]; closeSheet(); act("Abgebrochen. Du kannst jederzeit neu anfangen.",()=>{ S.ex[u.id].st="stop" },{ok:false}) },
  "ex-done"(){ readFields(); const u=UEB[SH.arg], e=S.ex[u.id], d=SH.d; const dd=d.dd!=null?d.dd:daysDone(e,u);
    const lived=dd>=Math.ceil(u.d/2), p=lived?(u.d<=3?2:u.d<=7?3:4):0;
    closeSheet(); act(lived?"Abgeschlossen. Du bekommst Handbreit dazu.":"Abgeschlossen. Für Handbreit waren es zu wenige Tage, aber du hast es ausprobiert.",()=>{
      Object.assign(e,{st:"done",end:now(),erl:d.erl,keep:d.keep,note:d.note||"",daysDone:dd,lived}); if(p) S.log.push({id:uid(),k:"ueb",ts:now(),uid:u.id,cat:u.cat,p}) }); render() },
  save(el){ const id=el.dataset.v; if(S.saved[id]) delete S.saved[id]; else S.saved[id]=now(); save(); drawSheet() },
  share(el){ shareIt(el.dataset.v) },
  wf(el){ WF=WF===el.dataset.v&&el.dataset.v!=="all"?"all":el.dataset.v; render() },
  mode(el){ S.settings.mode=el.dataset.v; save(); if(SH){ drawSheet(); return } render(); toast(el.dataset.v==="school"?"Die Fassungen für die Schule sind aktiv.":"Die Fassungen für Erwachsene sind aktiv.") },
  theme(el){ S.settings.theme=el.dataset.v; save(); applyTheme(); render() },
  autospend(){ S.settings.auto=!S.settings.auto; autoSpend(); save(); render(); toast(S.settings.auto?"Das Bild räumt jetzt von allein ab.":"Du wählst wieder selbst, was abgeräumt wird.") },
  vib(){ S.settings.vib=S.settings.vib===false; save(); if(S.settings.vib) armHaptics(); else disarmHaptics(); render() },
  aufg(el){ const a=AUF[el.dataset.v]; if(!a) return;
    if(a.art==="oft"&&aufToday(a.id)){ toast("Heute schon eingetragen. Morgen zählt es wieder.",{ok:false}); return }
    if(a.art==="einmal"&&aufDone(a.id)){ toast("Schon erledigt.",{ok:false}); return }
    const before=weite(); buzz("ok");
    act("„"+a.t+"“ erledigt.",()=>{ S.log.push({id:uid(),k:"aufg",ts:now(),aid:a.id,cat:a.cat}) });
    const gain=weite()-before; if(SH) drawSheet(); else render();
    if(gain===0&&a.art==="oft") setTimeout(()=>toast("Eingetragen. Für heute ist die Grenze für Handbreit aus Aufgaben erreicht.",{ok:false}),50);
    const el2=document.querySelector(`.aufg[data-v="${a.id}"]`); if(el2&&!RM()){ el2.classList.add("stamp"); setTimeout(()=>el2.classList.remove("stamp"),700) } },
  "aufg-pre"(el){ const id=el.dataset.v; act("Als „hatte ich schon“ markiert.",()=>{ S.pre[id]=now() }); drawSheet() },
  inflow(el){ S.inflow[el.dataset.v]=+el.dataset.w; S.hint.key=""; save(); render(); toast("Gespeichert. Du siehst es unter „Dein Weg“.") },
  hint(el){ const k=S.hint.key; if(el.dataset.v==="off") S.hint.off[k]=true; else S.hint.later=dkey(); save(); render() },
  zone(el){ const id=el.dataset.v; if(!KAT[katOfStelle(id)]) return; zHintOff(); Bild.mark(id); tapKind="sel"; if(SH) readFields(); openSheet("zone",id,el.dataset.w?{hl:el.dataset.w}:{});
    if(el.dataset.w) setTimeout(()=>{ const r=document.querySelector(`#sheet .row.chal.hl`); if(r) r.scrollIntoView({block:"center",behavior:RM()?"auto":"smooth"}) },300) },
  /* Schwung im Bild einsetzen: räumt in der Kategorie ab, zuerst an der angetippten Stelle */
  spend(el){ const id=el.dataset.v, k=katOfStelle(id); if(!KAT[k]) return; const rest=katRest(k), cost=Math.min(PREIS,rest);
    if(rest<=0||guthaben()<cost){ buzz("err"); shake(el); return }
    closeSheet(); zMarkNext=id; goTop=true; buzz("ok");
    act("Abgeräumt: "+KAT[k].n+", "+hb(cost)+".",()=>{ S.spend.push({k,z:id,n:cost,ts:now()}) }); render() },
  "heute-go"(){ const h=heute(); if(!h) return; openSheet("timer",String(h.c.min),{cid:h.c.id,end:now()+h.c.min*60000}); timerTick() },
  "fokus-off"(){ S.settings.nofocus=!S.settings.nofocus; save(); render(); toast(S.settings.nofocus?"Schwerpunkt ausgeblendet. Alle Sorten sehen gleich aus.":"Schwerpunkt wird wieder gezeigt.") },
  "check-skip"(){ S.skipCheck=true; save(); render() },
  "urg-later"(){ S.urgLater=dkey(); save(); render(); const b=document.querySelector(".next .btn"); if(b) b.focus({preventScroll:true}) },
  "heute-alt"(){ S.heute.n=(S.heute.n||0)+1; S.heute.kat=heuteKat(S.heute.n); S.heute.fertig=false; save(); render(); const b=document.querySelector(".heute .btn"); if(b) b.focus({preventScroll:true}) },
  "heute-fertig"(){ S.heute.fertig=true; save(); buzz("ok"); render(); toast("Gut. Alles darf bleiben, das war eine Entscheidung.") },
  /* Aufgabe aus einer Kategorie erledigt: Handbreit nach Aufwand, nicht nach Menge */
  chal(el){ const c=CHAL[el.dataset.v]; if(!c) return;
    if(S.log.some(e=>e.k==="chal"&&e.cid===c.id&&dkey(e.ts)===dkey())){ toast("Heute schon eingetragen. Morgen zählt es wieder.",{ok:false}); return }
    buzz("ok"); act(g=>g>0?"„"+c.t+"“ erledigt, +"+hb(g)+".":"Eingetragen. Für heute ist die Grenze für Handbreit aus Aufgaben erreicht.",()=>{ S.log.push({id:uid(),k:"chal",ts:now(),cid:c.id,cat:c.cat,kat:c.kat}) },{ok:true});
    if(SH&&SH.type==="timer") closeSheet(); if(SH){ drawSheet(); const b=document.querySelector("#sheet .abr"); if(b&&b.querySelector(".btn")) setTimeout(()=>b.scrollIntoView({block:"nearest",behavior:RM()?"auto":"smooth"}),120) } else render() },
  /* Tipp ins Bild neben eine Fläche: die nächste Stelle in etwa 30 px, sonst das allgemeine Blatt */
  imgtap(el,e){ const r=el.getBoundingClientRect(), id=e&&e.clientX!=null?Bild.zoneAt(e.clientX-r.left,e.clientY-r.top,30):null;
    if(id&&KAT[katOfStelle(id)]){ A.zone({dataset:{v:id}}); return } openSheet("bild") },
  "zone-go"(el){ const z=KAT[el.dataset.w], v=el.dataset.v; if(!z) return;
    openSheet(v,null,v==="los"?{name:z.name,cat:z.cat,z:z.id}:{name:z.name,cat:z.cat}) },
  "aufg-sheet"(){ openSheet("aufgaben") },
  undo(){ const f=undoFn; undoFn=null; $("#toast").classList.remove("show"); if(SH&&SH.type==="moment") closeSheet(); if(f) f() },
  ics(el){ downloadICS(el.dataset.v,+el.dataset.w) },
  export(){ const blob=new Blob([JSON.stringify(S)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="luftholen-sicherung-"+dkey()+".json"; document.body.appendChild(a); a.click(); a.remove(); S.exported=now(); save(); toast("Sicherung erstellt.") },
  copy(){ const t=JSON.stringify(S); (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>{ S.exported=now(); save(); toast("In die Zwischenablage kopiert.") }).catch(()=>{ toast("Kopieren ging nicht. Nutze „Sicherung speichern“.",{ok:false}) }) },
  import(){ const f=document.getElementById("f-file"), p=document.getElementById("f-paste").value.trim();
    const use=t=>{ try{ const o=JSON.parse(t); if(!o||!Array.isArray(o.log)||!o.settings) throw 0; SH.d={confirm:{o,date:fdateY(o.exported||o.created||now()),n:o.log.length}} }catch(e){ SH.d={err:"Das ist keine gültige Sicherung von Luftholen."} } drawSheet() };
    if(f&&f.files&&f.files[0]){ const r=new FileReader(); r.onload=()=>use(r.result); r.readAsText(f.files[0]) } else if(p) use(p); else { SH.d={err:"Wähle eine Datei oder füge den Text ein."}; drawSheet() } },
  filepick(){},
  "import-ok"(){ S=merge(fresh(),SH.d.confirm.o); S.gv=SH.d.confirm.o.gv||1; if(SH.d.confirm.o.gv3ts==null&&S.gv<3) delete S.gv3ts; migrate(); save(); applyTheme(); closeSheet(); toast("Sicherung geladen.") },
  "reset-1"(){ SH.d.sure=true; drawSheet() },
  "reset-ok"(){ try{ localStorage.removeItem(KEY) }catch(e){} S=fresh(); S.seen=true; save(); applyTheme(); closeSheet(); TAB="home"; render(); toast("Alles gelöscht. Dein Zimmer beginnt neu.",{ok:false}) }
};
let timerT=0;
function timerTick(){ clearInterval(timerT); timerT=setInterval(()=>{ if(!SH||SH.type!=="timer"||!SH.d.end){ clearInterval(timerT); return }
  const left=Math.max(0,SH.d.end-now()), el=$("#uhr"); if(el) el.textContent=String(Math.floor(left/60000)).padStart(2,"0")+":"+String(Math.floor(left%60000/1000)).padStart(2,"0");
  if(left<=0){ clearInterval(timerT); buzz("ok"); drawSheet() } },1000) }
function markRead(id){ if(!id||!IMP[id]) return; const r=S.readRun, t=now();
  if(!S.read[id]) S.read[id]=t;
  if(r.day===dkey()&&t-r.t<15*60*1000) r.n++; else { r.n=1; r.day=dkey() } r.t=t; save() }
function go(tab){ if(tab===TAB){ scrollTo({top:0,behavior:RM()?"auto":"smooth"}); return }
  if(TAB==="home"&&tab!=="home"){ try{ history.pushState({ltab:1},"") }catch(e){} }
  TAB=tab; render(); scrollTo(0,0); $("#main").focus({preventScroll:true}) }

/* Zentraler Klick-Handler */
document.addEventListener("click",e=>{
  if(e.target.classList&&e.target.closest&&e.target.closest("label.hap")&&e.target.tagName!=="INPUT") return;
  const tabEl=e.target.closest(".tab"); if(tabEl){ go(tabEl.dataset.tab); return }
  const el=e.target.closest("[data-a]"); if(!el||el.disabled) return;
  if(e.target.tagName==="INPUT"&&e.target.closest("label.hap")) e.target.blur();
  const fn=A[el.dataset.a]; if(!fn) return;
  if(el.tagName==="A") return;
  tapKind=null; const q=quietTap(el);
  feedbackFor(el,e);
  fn(el,e);
  const f=tapKind||(q?null:famOf(el)); if(f) vibrateNow(f);
  tapKind=null;
});
document.addEventListener("keydown",e=>{
  if(!SH) return;
  if(e.key==="Escape"){ closeSheet(); return }
  if(e.key==="Tab"){ const f=[...$("#sheet").querySelectorAll("button:not(:disabled),a[href],input,textarea,summary")].filter(x=>x.offsetParent!==null&&!x.closest("label.hap"));
    if(!f.length) return; const a=f[0], b=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){ e.preventDefault(); b.focus() } else if(!e.shiftKey&&document.activeElement===b){ e.preventDefault(); a.focus() } }
});
/* Blatt am Griff herunterziehen */
(function(){ let y0=null, dy=0; const g=$("#grip"), sh=$("#sheet");
  g.addEventListener("pointerdown",e=>{ y0=e.clientY; dy=0; sh.classList.add("drag"); g.setPointerCapture(e.pointerId) });
  g.addEventListener("pointermove",e=>{ if(y0==null) return; dy=Math.max(0,e.clientY-y0); sh.style.transform=`translate(-50%,${dy}px)` });
  const end=()=>{ if(y0==null) return; y0=null; sh.classList.remove("drag"); if(dy>90) closeSheet(); else sh.style.transform=""; };
  g.addEventListener("pointerup",end); g.addEventListener("pointercancel",end);
})();

/* ---------- Teilen, Kalender ---------- */
function shareIt(v){
  const base=location.href.split("#")[0];
  let url=base, title="Luftholen", text="Luftholen hilft beim Loslassen, Warten und bewussten Behalten.";
  if(v.startsWith("i-")){ const i=IMP[v.slice(2)]; url=base+"#i-"+i.id; title=i.t; text=i.t+": ein Befund aus der App Luftholen." }
  if(v.startsWith("u-")){ const u=UEB[v.slice(2)]; url=base+"#u-"+u.id; title=u.t; text="Machst du mit? Übung „"+u.t+"“, "+(u.d===1?"ein Tag":u.d+" Tage")+"." }
  if(navigator.share){ navigator.share({title,text,url}).catch(()=>{}) }
  else if(navigator.clipboard){ navigator.clipboard.writeText(url).then(()=>toast("Link kopiert.")).catch(()=>toast("Kopieren ging nicht.",{ok:false})) }
  else toast("Teilen geht in diesem Browser nicht. Kopiere die Adresse aus der Adresszeile.",{ok:false});
}
function downloadICS(title,ts){
  const d=new Date(ts), f=x=>x.getFullYear()+String(x.getMonth()+1).padStart(2,"0")+String(x.getDate()).padStart(2,"0");
  const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Luftholen//DE","BEGIN:VEVENT","UID:"+uid()+"@luftholen","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z",
    "DTSTART;VALUE=DATE:"+f(d),"DTEND;VALUE=DATE:"+f(new Date(ts+DAY)),"SUMMARY:"+title.replace(/[,;]/g," "),"DESCRIPTION:Erinnerung aus Luftholen","END:VEVENT","END:VCALENDAR"].join("\r\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar"})); a.download="luftholen.ics"; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- Darstellung ---------- */
const mq=matchMedia("(prefers-color-scheme: dark)");
function applyTheme(){ const t=S.settings.theme, r=document.documentElement;
  if(t==="light") r.dataset.theme="light"; else if(t==="dark") r.dataset.theme="dark"; else delete r.dataset.theme;
  const dark=t==="dark"||(t==="system"&&mq.matches); r.dataset.dark=dark?"1":"0";
  const m=document.querySelectorAll('meta[name="theme-color"]'); m.forEach(x=>x.setAttribute("content",dark?"#24201F":"#F6F4EF")) }
mq.addEventListener&&mq.addEventListener("change",()=>{ applyTheme(); if(TAB==="home") mountBild() });
let rsT=0; addEventListener("resize",()=>{ clearTimeout(rsT); rsT=setTimeout(()=>{ moveDot(); if(TAB==="home") mountBild() },200) });

/* ---------- Selbst-Aktualisierung ---------- */
const busy=()=>!!SH||["INPUT","TEXTAREA"].includes((document.activeElement||{}).tagName);
function checkUpdate(){
  if(!/github\.io$/.test(location.hostname)) return;
  fetch(location.pathname,{cache:"reload"}).then(r=>r.text()).then(t=>{
    const m=t.match(/const BUILD="([^"]+)"/); if(!m||m[1]===BUILD) return;
    const go=()=>{ if(busy()){ setTimeout(go,4000); return } location.reload() }; go();
  }).catch(()=>{});
}

/* ---------- Start ---------- */
function deepLink(){ const h=location.hash.slice(1); if(!h) return false;
  const [k,...r]=h.split("-"), id=r.join("-");
  history.replaceState(null,"",location.pathname+location.search);
  if(k==="i"&&IMP[id]){ markRead(id); openSheet("imp",id); return true }
  if(k==="u"&&UEB[id]){ openSheet("ueb",id,{shared:true}); return true }
  return false }
function init(){
  load(); applyTheme(); render();
  if(!deepLink()&&!S.seen){ S.seen=true; save(); openSheet("welcome") }
  if(IOS) armHaptics();
  if("serviceWorker" in navigator&&location.protocol==="https:"&&/github\.io$/.test(location.hostname)) navigator.serviceWorker.register("sw.js").catch(()=>{});
  setTimeout(checkUpdate,1500);
  document.addEventListener("change",e=>{ if(e.target.id==="f-file"){ const n=$("#f-fname"); if(n) n.textContent=e.target.files[0]?e.target.files[0].name:"" } });
  addEventListener("hashchange",()=>{ if(location.hash.length>1){ if(SH) closeSheet(true); deepLink() } });
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"){ checkUpdate(); if(!SH) render() } });
}
init();
