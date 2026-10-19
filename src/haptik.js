/* ===== Klickdesign und Vibration ===== */
const IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const RM=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
/* Familien: Aktion, Auswahl, Schalter, Logo. Navigation tickt nicht. */
const FAM_ACT=".btn,.tile,.card[data-a],.act";
const FAM_SEL=".chip,.opt,.scale>button,.ans";
const FAM_TOG=".switch";
const FAM_LOGO="#logo";
const HAPSEL=[FAM_ACT,FAM_SEL,FAM_TOG,FAM_LOGO].join(",");
const TAPSEL=HAPSEL+",.tab,.row,.lnk,summary,.chipx,.tree-hit";
const VIB={sel:10,act:12,tog:10,logo:12,ok:[10,60,14],err:[24,60,24]};
let tapKind=null;
function vibOn(){ return !S||!S.settings||S.settings.vib!==false }
function famOf(el){
  if(!el) return null;
  if(el.matches(FAM_LOGO)) return "logo";
  if(el.matches(FAM_TOG)) return "tog";
  if(el.matches(FAM_SEL)) return "sel";
  if(el.matches(FAM_ACT)) return "act";
  return null;
}
/* Handler setzen buzz("ok"|"err"), dann gibt es genau diese eine Rückmeldung statt der Familie */
function buzz(k){ tapKind=k }
function vibrateNow(k){ if(!vibOn()||IOS||!navigator.vibrate) return; try{ navigator.vibrate(VIB[k]||12) }catch(e){} }

/* iPhone: ein Finger legt einen unsichtbaren Schalter um, das gibt den System-Tick.
   Ein label liegt über der Fläche und lässt Scrollen frei. */
function armHaptics(){
  if(!IOS||!vibOn()) return;
  document.querySelectorAll(HAPSEL).forEach(el=>{
    if(el.tagName==="A"||el.tagName==="LABEL"||el.querySelector(":scope>label.hap")) return;
    if(getComputedStyle(el).position==="static") el.style.position="relative";
    const l=document.createElement("label"); l.className="hap"; l.setAttribute("aria-hidden","true");
    l.addEventListener("click",e=>{ if(e.target===l) e.stopPropagation() });
    const i=document.createElement("input"); i.type="checkbox"; i.setAttribute("switch",""); i.tabIndex=-1;
    l.appendChild(i); el.appendChild(l);
  });
}
function disarmHaptics(){ document.querySelectorAll("label.hap").forEach(l=>l.remove()) }
let hq=false;
if(IOS) new MutationObserver(()=>{ if(!hq){ hq=true; requestAnimationFrame(()=>{ hq=false; armHaptics() }) } })
  .observe(document.documentElement,{childList:true,subtree:true});

/* Wischen bricht das Tippen ab; Loslassen nach dem Scrollen löst nichts aus */
let tg=null, cancelUntil=0;
addEventListener("touchstart",e=>{ cancelUntil=0; const t=e.touches[0], el=e.target.closest&&e.target.closest(TAPSEL);
  tg=el?{el,x:t.clientX,y:t.clientY,moved:false}:null; if(el) el.classList.remove("nopress") },{passive:true,capture:true});
addEventListener("touchmove",e=>{ if(!tg||tg.moved) return; const t=e.touches[0];
  if(Math.hypot(t.clientX-tg.x,t.clientY-tg.y)>10){ tg.moved=true; tg.el.classList.add("nopress") } },{passive:true,capture:true});
addEventListener("touchend",e=>{ if(!tg) return; const t=e.changedTouches[0], r=tg.el.getBoundingClientRect();
  const out=t.clientX<r.left-4||t.clientX>r.right+4||t.clientY<r.top-4||t.clientY>r.bottom+4;
  if(tg.moved||out) cancelUntil=performance.now()+600;
  const el=tg.el; tg=null; setTimeout(()=>el.classList.remove("nopress"),300) },{passive:true,capture:true});
addEventListener("click",e=>{ if(performance.now()<cancelUntil){ cancelUntil=0; e.preventDefault(); e.stopImmediatePropagation() } },true);

/* Sichtbare Antworten: Welle für Aktionen, einlaufende Füllung für Auswahl */
let lastSel=null;
function ripple(el,x,y){
  if(RM()) return;
  const r=el.getBoundingClientRect(), s=document.createElement("span");
  const d=Math.max(r.width,r.height)*2.2;
  s.className="rip"; s.style.cssText=`width:${d}px;height:${d}px;left:${x-r.left-d/2}px;top:${y-r.top-d/2}px`;
  el.appendChild(s); setTimeout(()=>s.remove(),650);
}
function feedbackFor(el,e){
  const f=famOf(el); if(!f) return;
  const x=e.clientX||0, y=e.clientY||0, r=el.getBoundingClientRect();
  if(f==="act"&&!(x===0&&y===0)) ripple(el,x,y);
  if(f==="sel"){ lastSel={sig:sigOf(el),fx:((x-r.left)/r.width*100)||50,fy:((y-r.top)/r.height*100)||50,t:performance.now()} }
  if(f==="logo"&&!RM()){ el.classList.remove("spin"); void el.offsetWidth; el.classList.add("spin") }
}
function sigOf(el){ return (el.dataset.a||"")+"|"+(el.dataset.v||"")+"|"+(el.dataset.w||"") }
/* Nach dem Neuzeichnen: die gerade gewählte Option läuft vom Fingerpunkt aus voll */
function settleSel(root){
  if(!lastSel||performance.now()-lastSel.t>900||RM()) return;
  const sig=lastSel.sig;
  (root||document).querySelectorAll(FAM_SEL).forEach(el=>{
    if(sigOf(el)===sig&&(el.classList.contains("on")||el.getAttribute("aria-pressed")==="true")){
      el.style.setProperty("--fx",lastSel.fx+"%"); el.style.setProperty("--fy",lastSel.fy+"%");
      el.classList.remove("fill-in"); void el.offsetWidth; el.classList.add("fill-in");
    }
  });
  lastSel=null;
}
/* Fehler: kleine Seitwärtsbewegung */
function shake(el){ if(!el||RM()) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake") }
