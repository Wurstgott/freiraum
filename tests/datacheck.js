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
    if(!["Experiment","Beobachtung","Übersicht","Idee"].includes(i.typ)) err.push(i.id+": Typ "+i.typ);
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
  GRUENDE.forEach(g=>{ if(g.imp&&!has(g.imp,"i")) warn.push("Grund "+g.id+": Verweis "+g.imp+" fehlt") });
  console.log("Daten: "+IMPULSE.length+" Impulse, "+QUIZ.length+" Quiz, "+UEBUNGEN.length+" Übungen, "+BEGRIFFE.length+" Begriffe");
  if(warn.length) console.log("Hinweise:\n  "+warn.join("\n  "));
  if(err.length){ console.error("Fehler:\n  "+err.join("\n  ")); process.exit(1) }
})();
