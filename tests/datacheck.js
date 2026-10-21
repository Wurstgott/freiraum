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
/* Zonen im Bild: Verweise und Pflichtfelder */
(function(){ if(typeof ZONEN==="undefined") return; const err=[]; const I=new Set(IMPULSE.map(i=>i.id)), U=new Set(UEBUNGEN.map(u=>u.id)), A=new Set(AUFGABEN.map(a=>a.id)), C=new Set(AREAS.map(a=>a.id));
  ZONEN.forEach(z=>{ ["id","n","t","x","wenn","name","cat"].forEach(k=>{ if(!z[k]) err.push(z.id+": "+k+" fehlt") });
    if(!C.has(z.cat)) err.push(z.id+": Bereich"); if(!(z.min>=2&&z.min<=10)) err.push(z.id+": Minuten "+z.min);
    if(z.imp&&!I.has(z.imp)) err.push(z.id+": Impuls "+z.imp); if(z.ueb&&!U.has(z.ueb)) err.push(z.id+": Übung "+z.ueb); if(z.aufg&&!A.has(z.aufg)) err.push(z.id+": Aufgabe "+z.aufg);
    if(/\b(kaufen|ausgeben|Guthaben|musst)\b/i.test(z.t+z.x+z.wenn)) err.push(z.id+": Wortwahl") });
  if(ZONEN.length<15||ZONEN.length>20) err.push("ZONEN: "+ZONEN.length);
  if(err.length){ console.error("Fehler Zonen:\n  "+err.join("\n  ")); process.exit(1) } else console.log("Zonen: "+ZONEN.length) })();
