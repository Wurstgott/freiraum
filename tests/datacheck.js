/* Datenprüfung: wird von build.py an die Daten angehängt und mit node ausgeführt */
(function(){
  const err=[], warn=[];
  const ids=new Set(), areas=new Set(AREAS.map(a=>a.id));
  const add=(arr,name)=>arr.forEach(o=>{ if(!o.id) err.push(name+": Eintrag ohne id"); else if(ids.has(o.id)) err.push("doppelte id "+o.id); else ids.add(o.id) });
  add(IMPULSE,"IMPULSE"); add(QUIZ,"QUIZ"); add(UEBUNGEN,"UEBUNGEN"); add(BEGRIFFE,"BEGRIFFE"); add(CHECK,"CHECK");
  const has=(id,pre)=>id&&id.startsWith(pre)&&ids.has(id);
  IMPULSE.forEach(i=>{
    if(!areas.has(i.cat)) err.push(i.id+": Bereich "+i.cat);
    if(!(i.ev>=0&&i.ev<=3)) err.push(i.id+": Belegstufe "+i.ev);
    if(!["Experiment","Beobachtung","Übersicht","Idee","Empfehlung"].includes(i.typ)) err.push(i.id+": Typ "+i.typ);
    ["t","x","c","src","tip"].forEach(k=>{ if(!i[k]) err.push(i.id+": Feld "+k+" fehlt") });
    if(i.u && !/^https:\/\//.test(i.u)) err.push(i.id+": Link "+i.u);
    if(/"/.test(i.x+i.c+i.tip+(i.s||""))) warn.push(i.id+": gerade Anführungszeichen im Text");
    const w=i.x.split(/\s+/).length; if(w<35||w>95) warn.push(i.id+": x hat "+w+" Wörter");
  });
  QUIZ.forEach(q=>{ if(!(q.o&&q.o.length>=2&&q.r>=0&&q.r<q.o.length)) err.push(q.id+": Antworten"); if(q.imp&&!has(q.imp,"i")) err.push(q.id+": Verweis "+q.imp) });
  UEBUNGEN.forEach(u=>{ if(!areas.has(u.cat)) err.push(u.id+": Bereich"); if(!(u.d>=1&&u.d<=30)) err.push(u.id+": Dauer "+u.d);
    if(!u.steps||!u.steps.length) err.push(u.id+": Schritte"); if(u.imp&&!has(u.imp,"i")) warn.push(u.id+": Verweis "+u.imp+" fehlt") });
  BEGRIFFE.forEach(b=>{ if(!b.bsp) err.push(b.id+": Beispiel fehlt"); if(b.imp&&!has(b.imp,"i")) warn.push(b.id+": Verweis "+b.imp+" fehlt") });
  if(MONATE.length!==12) err.push("MONATE: "+MONATE.length+" statt 12");
  MONATE.forEach((m,i)=>{ if(m.u&&!has(m.u,"u")) warn.push("Monat "+(i+1)+": Übung "+m.u+" fehlt") });
  CHECK.forEach(c=>{ if(!areas.has(c.cat)||!c.o||c.o.length!==4) err.push(c.id+": Bestandsaufnahme") });
  AUFGABEN.forEach(a=>{ if(!areas.has(a.cat)||!["oft","einmal"].includes(a.art)||!(a.w>=1&&a.w<=5)||!a.t||!a.x) err.push(a.id+": Aufgabe"); if(a.imp&&!has(a.imp,"i")) err.push(a.id+": Verweis "+a.imp); if(ids.has(a.id)) err.push("doppelte id "+a.id) });
  GRUENDE.forEach(g=>{ if(g.imp&&!has(g.imp,"i")) warn.push("Grund "+g.id+": Verweis "+g.imp+" fehlt") });
  console.log("Daten: "+IMPULSE.length+" Impulse, "+QUIZ.length+" Quiz, "+UEBUNGEN.length+" Übungen, "+BEGRIFFE.length+" Begriffe");
  if(warn.length) console.log("Hinweise:\n  "+warn.join("\n  "));
  if(err.length){ console.error("Fehler:\n  "+err.join("\n  ")); process.exit(1) }
})();
/* Kategorien im Bild: Verweise, Pflichtfelder, Aufgaben */
(function(){ if(typeof KATEGORIEN==="undefined") return; const err=[]; const I=new Set(IMPULSE.map(i=>i.id)), C=new Set(AREAS.map(a=>a.id)), ids=new Set();
  KATEGORIEN.forEach(k=>{ ["id","n","kurz","cat","name"].forEach(f=>{ if(!k[f]) err.push(k.id+": "+f+" fehlt") });
    if(!C.has(k.cat)) err.push(k.id+": Bereich"); if(k.imp&&!I.has(k.imp)) err.push(k.id+": Impuls "+k.imp);
    if(!Array.isArray(k.fakt)) err.push(k.id+": fakt"); (k.fakt||[]).forEach((f,i)=>{ if(!f.t||!f.q||!(f.ev>=0&&f.ev<=3)) err.push(k.id+": Befund "+i); if(f.u&&!/^https:\/\//.test(f.u)) err.push(k.id+": Link "+f.u) });
    if(!k.ch||k.ch.length<2) err.push(k.id+": Aufgaben");
    (k.ch||[]).forEach(c=>{ if(ids.has(c.id)) err.push("doppelte Aufgabe "+c.id); ids.add(c.id);
      if(!c.t||!c.x||!(c.min>=2&&c.min<=20)) err.push(c.id+": Felder"); const w={5:2,10:3,15:4,20:5}[c.min]; if(w!==c.w) err.push(c.id+": Schwung passt nicht zur Dauer");
      if(/\b(kaufen|Guthaben|musst|wegwerfen)\b/i.test(c.t+c.x)) err.push(c.id+": Wortwahl") }) });
  if(err.length){ console.error("Fehler Kategorien:\n  "+err.join("\n  ")); process.exit(1) } else console.log("Kategorien: "+KATEGORIEN.length+", Aufgaben im Bild: "+ids.size) })();
/* Ein Schritt je Wissenskarte */
(function(){ if(typeof TUN==="undefined") return; const err=[]; const CH=new Set(KATEGORIEN.flatMap(k=>k.ch.map(c=>c.id))), U=new Set(UEBUNGEN.map(u=>u.id)), A=new Set(AUFGABEN.map(a=>a.id));
  IMPULSE.forEach(i=>{ const t=TUN[i.id]; if(!t){ err.push(i.id+": kein Schritt"); return }
    if(!t.tun||!t.b) err.push(i.id+": Felder"); const ok=t.a==="chal"?CH.has(t.v):t.a==="ueb"?U.has(t.v):t.a==="aufg"?A.has(t.v):t.a==="open"&&["los","keep","wish","teil","pruef","kiste","timer"].includes(t.v); if(!ok) err.push(i.id+": Ziel "+t.a+" "+t.v) });
  if(err.length){ console.error("Fehler Schritte:\n  "+err.join("\n  ")); process.exit(1) } else console.log("Schritte: "+Object.keys(TUN).length) })();
