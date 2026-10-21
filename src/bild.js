/* ===== Das Hauptbild: das volle Zimmer =====
   Szene, Dichte, Stufen-Gruppen und Entsättigung nach Büro H; Bildmaschine, Abend,
   Ehrenplätze, Taschen und Dampf nach Büro G. Vanilla JS, Canvas 2D, deterministisch.

   Ein bewohntes Zimmer von vorn: links ein hohes Regal, in der Mitte ein Schreibtisch
   vor dem Fenster, davor ein Stuhl, rechts die Tür. Regeln:
   R1  Fest (geht nie): Regal mit einem vollen Boden, Tisch, Stuhl mit Strickjacke, Sessel mit Decke,
       Tür, Fenster mit Haus gegenüber, Lampe, Laptop, Teetasse, Pflanze, Bild, Pinnwand, Lichterkette, Teppich,
       ein paar Bücher und im Regal auf Augenhöhe das Logo-Motiv: ein Buch steht, eines lehnt.
   R2  Kram (rund 150 Dinge) einmal mit festem Seed erzeugt. Jedes Ding gehört zu genau einer
       Gruppe g = 1..9 und ist sichtbar, solange c < (g-1)+u (c = Fortschritt 0..9 stufenlos,
       u = feste Zufallszahl). Ab Stufe g ist Gruppe g fort. Im Stapel geht das Obere zuerst.
       Jede Gruppe nimmt 8–14 % der Kramfläche (gemessen, siehe Bild.flaeche).
   R3  Der Rest wird mit dem Fortschritt ruhiger (Sättigung sinkt), die Wand heller.
       Bereichsfarben der Behaltenen werden nie entsättigt.
   R4  Behaltenes (bis 12) hat feste Ehrenplätze mit Untersetzer (= Grund) und Tuschekontur.
       Ein Platz räumt höchstens vier kleine Dinge (zusammen ≤ 170 Flächeneinheiten), die ihn direkt überdecken: Behalten leert das
       Zimmer nicht schneller als Loslassen. Tippflächen 44 px, auch bei 320 px ohne Überlappung.
   R5  Wartende Wünsche: gestrichelte Pakete vor der Tür. Weitergegebenes: Taschen mit
       Namensanhänger an der Tür (bis 6, danach drei Punkte).
   R6  Hell = Tag (nach Uhrzeit, ab 20 Uhr Abend), Dunkel = Abend: Lampe, Mond, Fenster gegenüber.
   R7  Genau eine Dauerbewegung: der Dampf über der Teetasse. Nur er wird neu gezeichnet. */
const Bild=(function(){
  "use strict";
  const VW=360, VH=300, F=214;
  function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296 } }
  const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const mix=(a,b,t)=>{ const A=hx(a),B=hx(b); return "#"+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,"0")).join("") };
  const rgba=(h,a)=>{ const [r,g,b]=hx(h); return `rgba(${r},${g},${b},${a})` };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  /* ---------- feste Geometrie ---------- */
  const REG={x0:8,x1:120,top:26,boards:[72,114,156,198],foot:228};
  const DESK={x0:128,x1:304,back:161,front:168,edge:175,foot:234};
  const WIN={x:148,y:20,w:96,h:92};
  const SILL={x0:140,x1:252,y:112};
  const DOOR={x:312,y:34,w:44};
  const CHAIR={cx:214,l:193,r:235,top:166,foot:254};
  const LAMP={x:290};
  const PIC={x:262,y:30,w:36,h:42};
  const MUG={x:181,y:DESK.front+1};
  const STEAM={x:166,y:118,w:32,h:42};          // Bereich, den der Dampf neu malt (Einheiten)

  /* ---------- Farben ---------- */
  const AREA={kl:"#C2507A",wo:"#A8682A",pa:"#2F7FB8",er:"#7C5BC2",ko:"#3F8A57"};
  const AREA_D={kl:"#EE8BAE",wo:"#E0A262",pa:"#79B6E6",er:"#B39AF0",ko:"#7CC38F"};
  const BRAND="#B4472E";
  const JL=["#D9573B","#E8963A","#2F8C88","#E2BD45","#D77F8F","#56688F","#9A9468","#BDA27F","#8C5A44","#99A2AC","#F3EFE6","#33404F","#C9B79A","#E9D9C2"];
  const TH={
    hell:{wall0:"#DAD2C6",wall1:"#F5F1E9",floor0:"#B99B78",floor1:"#E2CDB0",plank:"#A88A66",wood:"#C99D6E",woodD:"#A57A4F",woodL:"#DDB88C",
      sky0:"#9CC4E0",sky1:"#E2EEF3",house:"#E6C9A6",houseD:"#D3AE88",houseWin:"#8EA4B3",branch:"#6B5444",sun:"#FFE6A6",
      ink:"#2B2522",paper:"#FBF8F2",paperL:"#D9D0C2",calm:"#CFC6B8",shadow:"rgba(60,40,20,.13)",door:"#E9DFD0",doorL:"#F2EBDF",hall:"#FFF1CF",
      rug:"#C07A5E",rugL:"#D9A68C",leaf:"#5E8F52",leafD:"#476F3F",pot:"#C4683E",lamp:"#2F3A40",laptop:"#B7BEC6",laptopD:"#A0A8B1",
      bulbs:["#F3C14E","#E58FA3","#F6EFE2","#8FC1B5"],cork:"#D2B48C",junk:JL,area:AREA,tag:"#FFFFFF"},
    dunkel:{wall0:"#433A36",wall1:"#5C5049",floor0:"#4C3C31",floor1:"#6E5848",plank:"#3A2D24",wood:"#8C6B4E",woodD:"#6B5039",woodL:"#A8855F",
      sky0:"#252B4A",sky1:"#5F5679",house:"#3E3844",houseD:"#332E3A",houseWin:"#F2C36B",branch:"#2A2530",sun:"#FFCB7A",
      ink:"#191412",paper:"#E6DDCF",paperL:"#B2A796",calm:"#776C64",shadow:"rgba(0,0,0,.28)",door:"#5A504A",doorL:"#655A53",hall:"#F6CF85",
      rug:"#874E3E",rugL:"#A06A55",leaf:"#4F7F4C",leafD:"#3C643B",pot:"#A55A39",lamp:"#22292D",laptop:"#7C8591",laptopD:"#646C77",
      bulbs:["#FFD878","#F6A6B8","#FFF4DC","#A8DCCF"],cork:"#8C7258",junk:JL.map(c=>mix(c,"#2A2321",0.34)),area:AREA_D,tag:"#F3EEE4"}
  };
  // Hellmodus am Abend: helles Zimmer, aber Dämmerung draußen und Lampe an
  TH.abend=Object.assign({},TH.hell,{wall0:"#CFC4B5",wall1:"#E8DFD2",sky0:"#3E4A7C",sky1:"#C99A9A",house:"#5A5160",houseD:"#4A4250",houseWin:"#F2C36B",branch:"#3A3340",sun:"#FFD58C",hall:"#FFE2A6"});

  function season(dt){ const m=dt.getMonth(); return m<=1||m===11?"winter":m<=4?"fruehling":m<=7?"sommer":"herbst" }
  function dayPhase(dt){ const h=dt.getHours(); return {k:(h>=20||h<6)?"nacht":"tag"} }
  function env(m){
    const dark=!!m.dark, dt=m.date||new Date(), night=!dark&&dayPhase(dt).k==="nacht";
    return {dark,night,eve:dark||night,T:dark?TH.dunkel:night?TH.abend:TH.hell,se:season(dt)};
  }

  /* ---------- Kategorien: Das Bild steht für Sorten von Dingen, nicht für ein bestimmtes Zimmer ----------
     Jedes Kramding gehört nach seiner Art zu genau einer Kategorie (Texte in zonen.js). Eine Stelle ist eine Kategorie
     an einem Ort im Bild (z. B. Bücher im Regal). Die Tippfläche liegt immer auf einem sichtbaren Ding. */
  const KIDS=["kleidung","buecher","papier","erinnerung","kueche","technik","deko","verpackung","hobby","moebel"];
  function katOf(p){ const k=p.k;
    if(["jeans","pullb","shirtb","tuchb","socke","rucksack","schuhe","kleidhaufen","pulli","waeschekorb"].includes(k)) return "kleidung";
    if(["buch","buchq","buchq3","stapelbuch","buecherstapel"].includes(k)) return "buecher";
    if(["ordner","poster","zettel","kalender","papierstapel","brief","blatt","stifte"].includes(k)) return "papier";
    if(k==="foto"||k==="pluesch"||p.z==="regaltop") return "erinnerung";
    if(["tasse","teller","flasche","flaschen","chips","becher"].includes(k)||(k==="dose"&&(p.z==="deskB"||p.z==="deskF"))) return "kueche";
    if(["kabel","lader","kabelknaeuel","controller"].includes(k)) return "technik";
    if(["versand","versandtuete","tuete"].includes(k)||(k==="karton"&&(p.z==="floor"||p.z==="under"))) return "verpackung";
    if(k==="lego"||k==="ball") return "hobby";
    if(k==="kommode"||k==="klappstuhl"||(k==="kiste"&&p.x>=318&&p.z==="floor")) return "moebel";
    return "deko";
  }
  function ortOf(p){ const z=p.z;
    if(z==="regal"||z==="regalq") return "regal"; if(z==="regaltop") return "oben"; if(z==="wand") return (p.x+p.w/2>240&&p.y>70)?"pinn":"wand";
    if(z==="sill") return "fenster"; if(z==="deskB"||z==="deskF") return "tisch"; if(z==="chair"||z==="lamp") return "stuhl"; if(z==="under") return "unter";
    return p.y>=280?"vorn":"boden" }

  /* ---------- Abräumen: was im Bild fort ist ----------
     m.spend ist die Liste der Einsätze in Schwung: {k: Kategorie oder "_alt", z: Stelle (optional), n}.
     Eine Einheit räumt 1/EINH der ganzen Kramfläche. Ein Einsatz räumt in seiner Kategorie, zuerst an der angetippten Stelle,
     sonst in der festen Reihenfolge des Bildes (Gruppen, oben auf dem Stapel zuerst). "_alt" räumt in der festen Reihenfolge
     über alle Kategorien (Fortschritt aus früheren Fassungen und „Irgendwo abräumen“). Ein Ding geht, sobald das Guthaben
     seiner Kategorie mindestens die Hälfte seiner Fläche deckt. */
  const EINH=210; let FOCUS=[];
  /* Wie viel Fläche bei R eingesetzten Handbreit insgesamt fort ist: Anteil (R/210)^0,6. Am Anfang räumt eine Handbreit
     mehr als später (3 Handbreit: etwa 8 %, Hälfte bei etwa 66 Handbreit), ohne eine Sorte auf einen Schlag zu leeren. */
  function areaAt(R){ if(R<=0) return 0; const A=build().reduce((s,p)=>s+p.a,0); return A*Math.min(1,Math.pow(R/EINH,0.6)) }
  function rawStageW(W){ let s=0; if(typeof STUFEN!=="undefined") STUFEN.forEach((x,i)=>{ if(W>=x.w) s=i }); return s }
  const TCACHE=new Map();
  function goneSet(spend,B){
    const L=(spend||[]).filter(x=>x&&x.n>0&&(x.k==="_alt"||KIDS.includes(x.k)));
    const key=JSON.stringify([L.map(x=>[x.k,x.z||"",x.n,x.alt?1:0]),B?[...B]:[]]); if(TCACHE.has(key)) return TCACHE.get(key);
    const P=build(), out=new Set(), carry={};
    const byT=P.slice().sort((a,b)=>a.t-b.t); let cum=0;
    L.forEach(x=>{ const kk=x.k, a0=areaAt(cum); cum+=x.n; const add=areaAt(cum)-a0;
      // Fortschritt aus früheren Fassungen: genau wie früher, alles mit t unter der alten Grenze
      if(x.alt){ const st=rawStageW(cum), c=clearing({w:cum,stage:st}); byT.forEach(p=>{ if(p.t<c&&!(B&&B.has(p.i))) out.add(p.i) }); return }
      carry[kk]=(carry[kk]||0)+add;
      const R=byT.filter(p=>!out.has(p.i)&&!(B&&B.has(p.i))&&(kk==="_alt"||p.kat===kk));
      // An der angetippten Stelle räumt ein Einsatz zusammenhängend: Reihe für Reihe, von links nach rechts. So sieht man eine echte Lücke.
      const band=p=>p.row!=null?p.row:Math.round(p.y/24);
      const first=x.z?R.filter(p=>p.stelle===x.z).sort((a,b)=>band(a)-band(b)||a.x-b.x):[], rest=R.filter(p=>!first.includes(p));
      // Was auf anderem liegt, geht vor seiner Unterlage: das sichert die Reihenfolge nach t schon
      const take=p=>{ P.filter(d=>d.on===p.i&&!out.has(d.i)).forEach(take); out.add(p.i); carry[kk]-=p.a };
      for(const p of [...first,...rest]){ if(out.has(p.i)) continue; if(carry[kk]<p.a/2) break; take(p) } });
    TCACHE.set(key,out); if(TCACHE.size>24) TCACHE.delete(TCACHE.keys().next().value);
    return out }
  /* Wie viel Schwung eine Kategorie noch braucht, bis dort alles fort ist */
  function restOf(spend,kat,B){ const P=build(), G=goneSet(spend,B), cum=(spend||[]).reduce((s,x)=>s+(x.n||0),0);
    const a=P.filter(p=>p.kat===kat&&!G.has(p.i)&&!(B&&B.has(p.i))).reduce((s,p)=>s+p.a,0); if(a<=0) return 0;
    // so viele Handbreit, bis die Kurve diese Fläche hergibt (höchstens bis zum Ende)
    const base=areaAt(cum); let n=1; while(n<EINH&&areaAt(cum+n)-base<a-1) n++; return n }
  /* Kompatibel: T[i] = -1 fort, 99 sichtbar */
  function times(spend,B){ const G=goneSet(spend,B); return build().map(p=>G.has(p.i)?-1:99) }

  /* Stellen im aktuellen Zustand: sichtbare Dinge je Kategorie und Ort, Umriss, Kandidaten für die Tippfläche. */
  const ZCACHE=new Map();
  const isTop=p=>p.z==="wand"||p.z==="chair"||p.z==="lamp";
  const rectOf=p=>isTop(p)?[p.x,p.y,p.w,p.h]:[p.x,p.y-p.h,p.w,p.h];
  function zonesOf(m){
    const K=(m.keep||[]).slice(0,MAXK), key=JSON.stringify([K.map(k=>[k.id,k.cat,k.why,k.motif]),m.spend||[]]);
    if(ZCACHE.has(key)) return ZCACHE.get(key);
    const P=build(), B=blockedSet(K), G=goneSet(m.spend,B), out=[];
    // Der Sessel vorn links (fest) verdeckt, was am Boden hinter ihm liegt
    const behind=p=>p.z==="floor"&&p.y<=270, inS=(x,y)=>x>5&&x<62&&y>228&&y<298;
    const groups={}; P.forEach(p=>{ if(G.has(p.i)||B.has(p.i)||(behind(p)&&inS(p.x,p.y-p.h)&&inS(p.x+p.w,p.y))) return; (groups[p.stelle]=groups[p.stelle]||[]).push(p) });
    Object.entries(groups).forEach(([z,L])=>{
      let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      L.forEach(p=>{ const [x,y,w,h]=rectOf(p); x0=Math.min(x0,x); x1=Math.max(x1,x+w); y0=Math.min(y0,y); y1=Math.max(y1,y+h) });
      const cand=L.slice().sort((a,b)=>b.a-a.a).flatMap(p=>{ const [x,y,w,h]=rectOf(p), Q=[];
        [0.5,0.25,0.75].forEach(fy=>[0.5,0.25,0.75].forEach(fx=>Q.push([x+w*fx,y+h*fy]))); return Q.filter(([qx,qy])=>!(behind(p)&&inS(qx,qy))) });
      out.push({id:z,kat:L[0].kat,n:L.length,a:L.reduce((s,p)=>s+p.a,0),box:[x0-2,y0-2,x1-x0+4,y1-y0+4],cand,rects:L.map(rectOf)}) });
    out.sort((a,b)=>b.a-a.a);
    ZCACHE.set(key,out); if(ZCACHE.size>12) ZCACHE.delete(ZCACHE.keys().next().value);
    return out;
  }
  /* Tippflächen setzen: Kreise mit 44 px, Mittelpunkte mindestens 46 px auseinander, nie über einem behaltenen Ding,
     ganz im Bild. Zuerst bekommt jede Kategorie eine Fläche (an ihrer größten Stelle), dann weitere Stellen, höchstens 14. */
  function placeZones(Z,hits,u,W,H){
    const S=46, keep=hits.map(h=>[h.hx,h.hy]);
    const okPt=([cx,cy])=>{ const x=cx*u, y=cy*u; return x>=22&&x<=W-22&&y>=22&&y<=H-22&&!keep.some(([a,b])=>Math.hypot(a-x,b-y)<S) };
    const V=Z.map(z=>({z,c:z.cand.filter(okPt).map(([x,y])=>[x*u,y*u])}));
    const seen=new Set(), firsts=[], others=[];
    const FO=FOCUS||[], fr=k=>FO.includes(k)?0:1;
    V.slice().sort((a,b)=>fr(a.z.kat)-fr(b.z.kat)).forEach(v=>{ if(!seen.has(v.z.kat)){ seen.add(v.z.kat); firsts.push(v) } else others.push(v) });
    let best=null;
    [[firsts.slice().sort((a,b)=>a.c.length-b.c.length),others],[firsts,others]].forEach(([A,Bo])=>{ const taken=[], got={};
      [...A,...Bo].forEach(({z,c})=>{ if(Object.keys(got).length>=14) return; const p=c.find(([x,y])=>!taken.some(([a,b])=>Math.hypot(a-x,b-y)<S)); if(p){ taken.push(p); got[z.id]=p } });
      const kats=new Set(Object.keys(got).map(id=>Z.find(z=>z.id===id).kat)).size;
      if(!best||kats>best.k||(kats===best.k&&Object.keys(got).length>Object.keys(best.g).length)) best={g:got,k:kats} });
    return Z.map(z=>({id:z.id,kat:z.kat,hx:best.g[z.id]?best.g[z.id][0]:null,hy:best.g[z.id]?best.g[z.id][1]:null,dot:!!best.g[z.id],hr:22,n:z.n,box:z.box.map(v=>v*u),rects:z.rects.map(r=>r.map(v=>v*u))}))
      .sort((a,b)=>(b.dot-a.dot)||(Math.round((a.hy||0)/40)-Math.round((b.hy||0)/40))||((a.hx||0)-(b.hx||0)));
  }
  /* Tipp ins Bild: nächstgelegene Stelle, deren Kram höchstens r px entfernt ist */
  function zoneAt(x,y,r){ if(!info) return null; let best=null, bd=1e9;
    (info.zones||[]).forEach(z=>{ z.rects.forEach(([rx,ry,rw,rh])=>{ const dx=Math.max(rx-x,0,x-rx-rw), dy=Math.max(ry-y,0,y-ry-rh), d=Math.hypot(dx,dy); if(d<bd){ bd=d; best=z.id } });
      if(z.dot){ const dc=Math.max(0,Math.hypot(z.hx-x,z.hy-y)-22); if(dc<bd){ bd=dc; best=z.id } } });
    return bd<=(r==null?30:r)?best:null }

  /* ---------- Gruppen (= Stufe, ab der sie ganz fort sind) ----------
     1 Erste Lücke      Versandkarton und Tüten vorn am Boden
     2 Boden in Sicht   vordere Bodenreihe, Kleinzeug obenauf, Stapel auf dem Tisch
     3 Stuhl frei       Kleiderberg auf dem Stuhl, Socke auf der Lampe, Fensterbank
     4 Tischecke frei   linke Tischhälfte, Querliegendes
     5 Regal mit Lücken Querliegendes im Regal, die Hälfte der Bücher, Bodenmitte
     6 Wand ohne Zettel Zettel, Poster, Kalender, Fotos, Spielzeug
     7 Tisch frei       restlicher Tisch
     8 Boden frei       hinterer Boden, unter dem Tisch, Wäschekorb
     9 Genug            letzte Bücher, Kisten oben auf dem Regal */
  let JUNK=null;
  function build(){
    if(JUNK) return JUNK;
    const R=mulberry(20261020), P=[];
    const pick=a=>a[Math.floor(R()*a.length)];
    const add=o=>{ o.u=o.u==null?0.02+R()*0.96:o.u; P.push(o); return o };
    const BOOKC=[0,1,2,3,4,5,6,7,8,11,12,13];
    let sid=0;
    /* a) Regal: jedes Fach voll. Fach 2 links: Logo-Bücher (fest). */
    REG.boards.forEach((by,ri)=>{
      let x=ri===1?46:13; const xe=115;
      while(x<xe-3){
        const r=R();
        if(r<0.12&&xe-x>18){ const w=9+R()*3, h=34+R()*4; add({k:"ordner",z:"regal",x,y:by,w,h:Math.min(h,40),c:pick([2,5,0,11,3]),g:pick([5,7,8,9]),row:ri}); x+=w+0.6 }
        else if(r<0.2&&xe-x>22){ const w=16+R()*8, h=14+R()*10; add({k:R()<0.5?"dose":"kiste",z:"regal",x,y:by,w,h,c:pick([3,4,6,2,7]),g:pick([5,8,9,6]),row:ri}); x+=w+1 }
        else if(r<0.26&&xe-x>16){ const w=12+R()*4; add({k:pick(["figur","kugel","vase"]),z:"regal",x,y:by,w,h:14+R()*8,c:pick([0,1,4,6,8]),g:pick([5,6,9]),row:ri}); x+=w+1.5 }
        else { const w=3.4+R()*4.2, h=24+R()*14; add({k:"buch",z:"regal",x,y:by,w,h:Math.min(h,40),c:pick(BOOKC),g:pick([5,5,7,7,8,9,9]),row:ri,lean:R()<0.12?(R()-0.5)*0.25:0}); x+=w+0.4 }
      }
      const n=1+Math.floor(R()*2);
      for(let i=0;i<n;i++){ const s=sid++; let y=by-26-R()*6; const cx=ri===1?62+R()*40:22+R()*76; const m=2+Math.floor(R()*3);
        for(let j=0;j<m;j++){ const w=22+R()*10, h=3.2+R()*2.5; add({k:"buchq",z:"regalq",x:cx-w/2+(R()-0.5)*4,y,w,h,c:pick(BOOKC),g:pick([2,4,5,5]),stack:s,lvl:j,row:ri}); y-=h }
      }
    });
    [[24,"karton",30,20,7],[84,"pluesch",18,20,4],[106,"kiste",20,14,2]].forEach(([cx,k,w,h,c])=>add({k,z:"regaltop",x:cx-w/2,y:REG.top,w,h,c,g:k==="pluesch"?6:9}));
    add({k:"karton",z:"regaltop",x:12,y:REG.top-20,w:24,h:13,c:12,g:4});
    /* b) Wand: Zettel, Poster, Kalender, Fotos */
    [["poster",121,24,19,28,0,6],["zettel",128,60,12,14,10,6],["zettel",132,80,11,12,3,4],["kalender",122,96,18,22,10,6],
     ["zettel",258,86,11,12,3,6],["foto",272,84,10,12,10,4],["zettel",286,86,10,12,4,2],["zettel",298,98,10,12,4,6],["foto",266,118,10,12,10,6],["foto",278,116,10,12,10,6],
     ["zettel",250,124,9,9,6,6],["poster",300,20,10,14,8,6]].forEach(([k,x,y,w,h,c,g])=>add({k,z:"wand",x,y,w,h,c,g,rot:(R()-0.5)*0.16}));
    /* c) Fensterbank */
    let sx=SILL.x0+4;
    [["flasche",7,22,2,3],["dose",10,12,6,3],["topf",14,14,7,8],["flasche",6,18,11,3],["becher",9,10,0,3],["figur",10,13,4,3],["dose",9,9,3,8],["flasche",6,20,2,8],["buchq3",18,9,1,3]].forEach(([k,w,h,c,g])=>{
      add({k,z:"sill",x:sx,y:SILL.y,w,h,c,g}); sx+=w+3+R()*2 });
    /* d) Tisch: hintere und vordere Reihe */
    [[134,"papierstapel",26,16,10,4],[160,"buecherstapel",24,18,0,4],[192,"tasse",9,9,4,2],[200,"dose",8,13,3,4],[208,"papierstapel",18,10,10,7],
     [262,"buecherstapel",22,14,5,7],[278,"flasche",6,18,2,7],[170,"stifte",9,14,0,7],[146,"schachtel",22,10,0,4],[198,"chips",12,15,1,4],[256,"tasse",9,9,5,7]].forEach(([x,k,w,h,c,g])=>add({k,z:"deskB",x,y:DESK.back+1,w,h,c,g}));
    [[132,"brief",16,10,10,4],[148,"tasse",9,9,0,2],[158,"teller",20,4,10,4],[196,"kabel",30,8,11,4],
     [212,"lego",10,6,0,2],[226,"blatt",20,6,10,7],[246,"tasse",9,9,2,7],[256,"lader",8,6,10,7],[264,"kabel",28,7,11,7],[276,"brief",16,10,13,7],[292,"dose",8,11,6,7],[238,"brief",14,9,10,7],[140,"blatt",18,5,10,4],[284,"tasse",9,9,1,7]].forEach(([x,k,w,h,c,g])=>add({k,z:"deskF",x,y:DESK.front+1,w,h,c,g}));
    add({k:"tasse",z:"deskB",x:166,y:DESK.back+1-18,w:9,h:9,c:7,g:2,stackOn:1});
    add({k:"brief",z:"deskB",x:136,y:DESK.back+1-16,w:16,h:10,c:13,g:2,stackOn:1});
    add({k:"buchq",z:"deskB",x:262,y:DESK.back+1-14,w:22,h:4,c:3,g:7,stackOn:1});
    add({k:"teller",z:"deskB",x:134,y:DESK.back+1-16-6,w:18,h:4,c:10,g:2,stackOn:1});
    add({k:"papierstapel",z:"deskB",x:208,y:DESK.back+1-10,w:16,h:7,c:2,g:4,stackOn:1});
    /* e) Stuhl: liegender Kleiderberg, quillt seitlich über (keine Silhouette) */
    add({k:"jeans",z:"chair",x:CHAIR.l-9,y:194,w:56,h:11,c:5,g:3,u:0.92});
    add({k:"pullb",z:"chair",x:CHAIR.l-3,y:183,w:52,h:12,c:0,g:3,u:0.7});
    add({k:"shirtb",z:"chair",x:CHAIR.l-7,y:173,w:46,h:11,c:2,g:3,u:0.48});
    add({k:"tuchb",z:"chair",x:CHAIR.l-4,y:162,w:52,h:8,c:4,g:3,u:0.26});
    add({k:"socke",z:"chair",x:CHAIR.cx+6,y:167,w:10,h:6,c:3,g:2,u:0.8});
    add({k:"socke",z:"lamp",x:LAMP.x-21,y:DESK.back-42,w:5,h:13,c:0,g:3,u:0.55});
    /* f) Unter dem Tisch */
    [[150,"karton",30,22,7,8],[182,"kabelknaeuel",22,8,11,7],[270,"tuete",22,26,1,8],[292,"karton",18,14,12,7]].forEach(([x,k,w,h,c,g])=>add({k,z:"under",x,y:226,w,h,c,g}));
    /* g) Boden: drei Tiefenreihen */
    [[62,240,"stapelbuch",26,18,0,8],[18,268,"rucksack",24,26,5,8],[130,238,"schuhe",22,8,11,6],[248,240,"waeschekorb",38,26,9,8],[290,238,"flaschen",18,22,2,6],
     [60,262,"tuete",22,26,4,5],[96,264,"karton",30,22,7,5],[86,258,"kleidhaufen",34,12,6,5],[150,258,"lego",14,7,3,2],[168,260,"ball",14,14,0,6],[254,262,"schuhe",22,8,8,5],[280,260,"stapelbuch",22,14,5,5],
     [0,288,"versandtuete",40,20,10,1],[48,290,"versand",44,30,7,1],[104,286,"tuete",26,30,1,1],[146,290,"kabel",40,8,11,2],[196,292,"versandtuete",36,18,13,1],[238,290,"stapelbuch",28,16,8,2],[272,292,"karton",30,22,12,1],
     [70,276,"kleidhaufen",30,11,0,2],[124,272,"schuhe",22,8,5,2],[216,276,"pulli",30,12,3,2],[178,284,"lego",12,6,6,2],[28,284,"ball",13,13,3,2],[230,250,"tuete",20,24,8,4]].forEach(([x,y,k,w,h,c,g])=>add({k,z:"floor",x,y,w,h,c,g}));
    add({k:"pulli",z:"floor",x:50,y:290-30,w:30,h:14,c:4,g:1,flat:1,stackOn:1});
    add({k:"blatt",z:"floor",x:276,y:292-22,w:22,h:5,c:10,g:1,stackOn:1});
    add({k:"lego",z:"floor",x:110,y:286-30,w:10,h:6,c:6,g:1,stackOn:1});
    /* h) Möbel, die vor allem aufbewahren (Sorte „Möbel und Stauraum“): eine Kommode vor der Tür, ein Klappstuhl unter dem Tisch.
       Am Ende angehängt, mit festem u, damit die übrigen Dinge unverändert bleiben. */
    add({k:"kommode",z:"floor",x:314,y:238,w:38,h:30,c:0,g:9,u:0.6});
    add({k:"kiste",z:"floor",x:320,y:238-30,w:20,h:9,c:6,g:9,u:0.2,stackOn:1});
    add({k:"klappstuhl",z:"under",x:119,y:232,w:17,h:52,c:3,g:8,u:0.5});
    // Stapel: oben geht zuerst
    const st={}; P.forEach(p=>{ if(p.stack!=null)(st[p.stack]=st[p.stack]||[]).push(p) });
    Object.values(st).forEach(L=>{ const us=L.map(p=>p.u).sort((a,b)=>a-b); L.sort((a,b)=>b.lvl-a.lvl).forEach((p,i)=>p.u=us[i]) });
    P.forEach(p=>{ if(p.stackOn) p.u=Math.min(p.u,0.3) });
    P.forEach((p,i)=>{ p.i=i; p.t=(p.g-1)+p.u*0.999; p.a=Math.max(8,p.w*p.h); p.kat=katOf(p); p.stelle=p.kat+"@"+ortOf(p) });
    // Worauf ein Ding liegt (Stapel, obenauf): Wer die Unterlage abräumt, räumt das Obere mit
    P.forEach(p=>{ if(!(p.stackOn||(p.stack!=null&&p.lvl>0))) return; let best=null, bd=99;
      P.forEach(q=>{ if(q===p||q.z!==p.z) return; if(p.stack!=null&&!(q.stack===p.stack&&q.lvl===p.lvl-1)) return;
        const d=Math.abs(p.y-(q.y-q.h)), ov=Math.min(p.x+p.w,q.x+q.w)-Math.max(p.x,q.x); if(ov>2&&d<bd){ bd=d; best=q } });
      if(best&&bd<=6) p.on=best.i });
    JUNK=P; return P;
  }

  /* ---------- Hilfen ---------- */
  function rr(g,x,y,w,h,r){ g.beginPath(); g.roundRect(x,y,w,h,r) }
  function ell(g,x,y,rx,ry){ g.beginPath(); g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2) }
  function line(g,x0,y0,x1,y1){ g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke() }
  function shadowE(g,cx,y,w,T){ g.fillStyle=T.shadow; ell(g,cx,y,w/2,Math.max(1.4,w*0.07)); g.fill() }

  /* ---------- Kram zeichnen ---------- */
  function drawJunk(g,p,T,calm,dark){
    const base=T.junk[p.c%T.junk.length], c=mix(base,T.calm,calm), d=mix(c,"#000000",0.18), l=mix(c,"#ffffff",0.28);
    const pap=mix(T.paper,T.calm,calm*0.5), ink=mix(T.ink,T.calm,0.4), J=i=>mix(T.junk[i%T.junk.length],T.calm,calm);
    const kraft=mix(dark?"#8E7356":"#C9A06E",T.calm,calm*0.5);
    const {x,y,w,h}=p;
    g.save();
    switch(p.k){
      case "buch": { g.translate(x+w/2,y); if(p.lean) g.rotate(p.lean); g.fillStyle=c; g.fillRect(-w/2,-h,w,h); g.fillStyle=l; g.fillRect(-w/2,-h+4,w,1.4); g.fillRect(-w/2,-6,w,1.2); break }
      case "buchq": g.fillStyle=c; rr(g,x,y-h,w,h,0.8); g.fill(); g.fillStyle=pap; g.fillRect(x+1.2,y-h+0.8,w-2.4,h-1.6); g.fillStyle=c; g.fillRect(x,y-h,2.2,h); break;
      case "buchq3": for(let i=0;i<3;i++){ g.fillStyle=J(p.c+i*4); rr(g,x+(i%2)*2,y-(i+1)*3,w-2,3,0.6); g.fill() } break;
      case "ordner": g.fillStyle=c; rr(g,x,y-h,w,h,1); g.fill(); g.fillStyle=pap; rr(g,x+1.5,y-h+5,w-3,9,1); g.fill(); g.fillStyle=d; ell(g,x+w/2,y-10,2,2); g.fill(); break;
      case "dose": g.fillStyle=c; rr(g,x,y-h,w,h,1.5); g.fill(); g.fillStyle=d; g.fillRect(x,y-h,w,2); g.fillStyle=l; g.fillRect(x+1,y-h*0.62,w-2,h*0.3); break;
      case "kommode": { const wd=mix(dark?"#7A5A3E":"#B98A5A",T.calm,calm*0.6), wl=mix(wd,"#ffffff",0.18), wk=mix(wd,"#000000",0.3);
        g.fillStyle=wk; g.fillRect(x+3,y-3,3,3); g.fillRect(x+w-6,y-3,3,3);
        g.fillStyle=wd; rr(g,x,y-h,w,h-3,1.5); g.fill(); g.fillStyle=wl; g.fillRect(x-1,y-h,w+2,2.5);
        for(let i=0;i<3;i++){ const yy=y-h+4+i*8; g.fillStyle=wl; rr(g,x+2.5,yy,w-5,6.5,1); g.fill(); g.fillStyle=wk; ell(g,x+w/2,yy+3.2,1.6,1.1); g.fill() }
        break }
      case "klappstuhl": { const fr=mix(dark?"#9AA3A8":"#7E8A90",T.calm,calm*0.6), st=mix(dark?"#8A6A4A":"#C08D5A",T.calm,calm*0.6);
        g.save(); g.translate(x+w,y); g.rotate(-0.16); g.strokeStyle=fr; g.lineWidth=1.6; g.lineCap="round";
        g.beginPath(); g.moveTo(-w,0); g.lineTo(-2,-h); g.moveTo(-2,0); g.lineTo(-w+2,-h*0.55); g.stroke();
        g.fillStyle=st; for(let i=0;i<4;i++){ rr(g,-w+1,-h*0.42-i*4.4,w-2,3,0.8); g.fill() } g.restore(); break }
      case "kiste": g.fillStyle=c; rr(g,x,y-h,w,h,2); g.fill(); g.fillStyle=d; rr(g,x+w/2-4,y-h+3,8,3,1.5); g.fill(); break;
      case "karton": g.fillStyle=kraft; rr(g,x,y-h,w,h,1); g.fill(); g.fillStyle="rgba(0,0,0,.10)"; g.fillRect(x,y-h,w,Math.max(2,h*0.14)); g.fillStyle="rgba(255,255,255,.30)"; g.fillRect(x+w/2-2.5,y-h,5,h*0.6);
        if(w>24){ g.fillStyle=pap; g.fillRect(x+w*0.62,y-h*0.55,w*0.22,h*0.22) } break;
      case "versand": {
        g.fillStyle=mix(kraft,"#000000",0.1); g.beginPath(); g.moveTo(x+2,y-h); g.lineTo(x-4,y-h-7); g.lineTo(x+w*0.45,y-h-5); g.lineTo(x+w*0.48,y-h); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(x+w-2,y-h); g.lineTo(x+w+5,y-h-8); g.lineTo(x+w*0.55,y-h-4); g.lineTo(x+w*0.52,y-h); g.closePath(); g.fill();
        g.fillStyle=kraft; rr(g,x,y-h,w,h,1); g.fill(); g.fillStyle="rgba(0,0,0,.10)"; g.fillRect(x,y-h,w,3);
        g.fillStyle=pap; g.fillRect(x+w*0.12,y-h*0.6,w*0.34,h*0.32); g.fillStyle=ink; g.fillRect(x+w*0.15,y-h*0.52,w*0.2,1); g.fillRect(x+w*0.15,y-h*0.44,w*0.26,1); g.fillRect(x+w*0.15,y-h*0.37,w*0.14,1);
        g.fillStyle=mix(dark?"#A8946E":"#E7D2A8",T.calm,calm); g.fillRect(x+w*0.6,y-h,w*0.12,h); break }
      case "versandtuete": g.fillStyle=mix(c,"#ffffff",0.15); g.beginPath(); g.moveTo(x+2,y); g.lineTo(x,y-h+3); g.quadraticCurveTo(x+w*0.5,y-h-2,x+w,y-h+2); g.lineTo(x+w-2,y); g.closePath(); g.fill();
        g.fillStyle=pap; g.fillRect(x+w*0.18,y-h*0.7,w*0.32,h*0.38); g.fillStyle=ink; g.fillRect(x+w*0.22,y-h*0.6,w*0.2,0.9); g.fillRect(x+w*0.22,y-h*0.5,w*0.24,0.9);
        g.fillStyle="rgba(0,0,0,.08)"; g.fillRect(x+1,y-h+3,w-2,2.4); break;
      case "tuete": g.strokeStyle=d; g.lineWidth=1.6; g.beginPath(); g.arc(x+w/2,y-h+3,w*0.22,Math.PI,0); g.stroke();
        g.fillStyle=c; g.beginPath(); g.moveTo(x+1,y-h+3); g.lineTo(x+w-1,y-h+3); g.lineTo(x+w,y); g.lineTo(x,y); g.closePath(); g.fill(); g.fillStyle=l; g.fillRect(x+1,y-h+3,w-2,3);
        g.fillStyle=pap; g.fillRect(x+w*0.25,y-h*0.55,w*0.5,h*0.2); break;
      case "pluesch": { const cx=x+w/2; g.fillStyle=c; ell(g,cx,y-h*0.32,w*0.5,h*0.33); g.fill(); ell(g,cx,y-h*0.76,w*0.36,h*0.26); g.fill(); ell(g,cx-w*0.3,y-h*0.98,3,3); g.fill(); ell(g,cx+w*0.3,y-h*0.98,3,3); g.fill();
        g.fillStyle=l; ell(g,cx,y-h*0.68,w*0.16,h*0.1); g.fill(); g.fillStyle=ink; ell(g,cx-3,y-h*0.8,0.9,0.9); g.fill(); ell(g,cx+3,y-h*0.8,0.9,0.9); g.fill(); break }
      case "figur": g.fillStyle=c; rr(g,x+w*0.25,y-h*0.62,w*0.5,h*0.62,1.5); g.fill(); ell(g,x+w/2,y-h*0.78,w*0.24,w*0.24); g.fill(); g.fillStyle=l; g.fillRect(x+w*0.25,y-h*0.35,w*0.5,1.4); break;
      case "kugel": g.fillStyle=c; ell(g,x+w/2,y-w/2,w/2,w/2); g.fill(); g.fillStyle=l; ell(g,x+w*0.38,y-w*0.66,w*0.14,w*0.12); g.fill(); break;
      case "vase": g.fillStyle=c; g.beginPath(); g.moveTo(x+w*0.38,y-h); g.lineTo(x+w*0.62,y-h); g.quadraticCurveTo(x+w,y-h*0.4,x+w*0.75,y); g.lineTo(x+w*0.25,y); g.quadraticCurveTo(x,y-h*0.4,x+w*0.38,y-h); g.fill(); break;
      case "korb": g.fillStyle=dark?"#7A6248":mix("#B58E5E",T.calm,calm*0.6); rr(g,x,y-h,w,h,[1,1,4,4]); g.fill();
        g.strokeStyle="rgba(0,0,0,.14)"; g.lineWidth=1; for(let i=1;i<3;i++){ g.beginPath(); g.moveTo(x+1,y-h+i*h/3); g.lineTo(x+w-1,y-h+i*h/3); g.stroke() }
        g.fillStyle=J(3); ell(g,x+w*0.35,y-h,w*0.2,3); g.fill(); g.fillStyle=J(2); ell(g,x+w*0.65,y-h-1,w*0.16,3.5); g.fill(); break;
      case "poster": { g.translate(x+w/2,y+h/2); g.rotate(p.rot||0); g.fillStyle=pap; g.fillRect(-w/2,-h/2,w,h); g.fillStyle=c; g.fillRect(-w/2+2,-h/2+2,w-4,h*0.58);
        g.fillStyle=l; ell(g,w*0.12,-h*0.2,w*0.16,w*0.16); g.fill(); g.fillStyle=ink; g.fillRect(-w/2+3,h*0.22,w*0.5,1.2); g.fillRect(-w/2+3,h*0.32,w*0.32,1);
        g.fillStyle=mix(T.ink,"#888888",0.4); ell(g,0,-h/2+1,1.2,1.2); g.fill(); break }
      case "zettel": { g.translate(x+w/2,y+h/2); g.rotate(p.rot||0); g.fillStyle=p.c===10?pap:l; g.fillRect(-w/2,-h/2,w,h);
        g.fillStyle=rgba(T.ink,0.35); for(let i=0;i<3;i++) g.fillRect(-w/2+2,-h/2+4+i*3,w*(0.4+((i*37)%5)/10),0.8);
        g.fillStyle=d; ell(g,0,-h/2+1.4,1.1,1.1); g.fill(); break }
      case "kalender": g.fillStyle=pap; g.fillRect(x,y,w,h); g.fillStyle=J(0); g.fillRect(x,y,w,5);
        g.fillStyle=rgba(T.ink,0.28); for(let r=0;r<4;r++) for(let q=0;q<5;q++) g.fillRect(x+2+q*3.2,y+7.5+r*3.4,2,2); break;
      case "foto": { g.translate(x+w/2,y+h/2); g.rotate(p.rot||0); g.fillStyle=pap; g.fillRect(-w/2,-h/2,w,h); g.fillStyle=J(p.c+((x|0)%5)); g.fillRect(-w/2+1.2,-h/2+1.2,w-2.4,h*0.66); break }
      case "flasche": g.fillStyle=mix(c,"#ffffff",0.25); g.globalAlpha=0.9; rr(g,x,y-h*0.7,w,h*0.7,[2,2,1,1]); g.fill(); rr(g,x+w*0.3,y-h,w*0.4,h*0.32,0.6); g.fill(); g.globalAlpha=1;
        g.fillStyle=pap; g.fillRect(x,y-h*0.45,w,h*0.18); break;
      case "flaschen": for(let i=0;i<3;i++){ const bx=x+i*6; g.fillStyle=mix(J([2,6,9][i]),"#ffffff",0.2); rr(g,bx,y-h*0.7,5.4,h*0.7,[2,2,1,1]); g.fill(); rr(g,bx+1.6,y-h,2.2,h*0.32,0.5); g.fill() }
        g.fillStyle=J(9); g.save(); g.translate(x+20,y); g.rotate(-1.45); rr(g,0,-5,h*0.7,5.4,2); g.fill(); g.restore(); break;
      case "topf": g.fillStyle=mix(T.leaf,T.calm,0.3+calm*0.3); for(let i=0;i<4;i++){ g.save(); g.translate(x+w/2,y-h*0.55); g.rotate(-0.9+i*0.6); ell(g,0,-5,1.8,5.5); g.fill(); g.restore() }
        g.fillStyle=c; g.beginPath(); g.moveTo(x+1,y-h*0.55); g.lineTo(x+w-1,y-h*0.55); g.lineTo(x+w-3,y); g.lineTo(x+3,y); g.fill(); break;
      case "becher": case "tasse": g.fillStyle=c; rr(g,x,y-h,w*0.78,h,[1,1,2.5,2.5]); g.fill(); g.strokeStyle=c; g.lineWidth=1.6; g.beginPath(); g.arc(x+w*0.8,y-h*0.55,h*0.24,-1.4,1.4); g.stroke();
        g.fillStyle=d; g.fillRect(x,y-h,w*0.78,1.4); break;
      case "teller": g.fillStyle=pap; ell(g,x+w/2,y-h/2,w/2,h/2); g.fill(); g.fillStyle=rgba(T.ink,0.08); ell(g,x+w/2,y-h/2,w*0.32,h*0.28); g.fill();
        g.fillStyle=J(1); ell(g,x+w*0.62,y-h*0.7,2.4,1.4); g.fill(); break;
      case "papierstapel": { const n=Math.round(h/2.4); for(let i=0;i<n;i++){ const o=((i*7)%5-2)*1.2; g.fillStyle=i%3===2?mix(J(p.c+i),T.paper,0.55):pap; g.fillRect(x+o,y-(i+1)*2.4,w,2.1) }
        g.fillStyle="rgba(0,0,0,.07)"; for(let i=0;i<n;i++) g.fillRect(x+((i*7)%5-2)*1.2,y-(i+1)*2.4+2.1,w,0.3); break }
      case "buecherstapel": case "stapelbuch": { const n=Math.max(2,Math.round(h/4.6)), bh=h/n; for(let i=0;i<n;i++){ const cc=J(p.c+i*5), o=((i*5)%4-1.5)*1.6, ww=w-(i%2)*3;
          g.fillStyle=cc; rr(g,x+o,y-(i+1)*bh,ww,bh-0.5,0.8); g.fill(); g.fillStyle=pap; g.fillRect(x+o+ww-3,y-(i+1)*bh+0.8,2.2,bh-2) } break }
      case "brief": g.fillStyle=p.c===13?mix(dark?"#B9A991":"#E9D9C2",T.calm,calm):pap; g.save(); g.translate(x+w/2,y-h/2); g.rotate(-0.06); g.fillRect(-w/2,-h/2,w,h);
        g.strokeStyle=rgba(T.ink,0.18); g.lineWidth=0.7; g.beginPath(); g.moveTo(-w/2,-h/2); g.lineTo(0,1); g.lineTo(w/2,-h/2); g.stroke();
        g.fillStyle=J(0); g.fillRect(w/2-4,-h/2+1.2,2.8,3); g.restore(); break;
      case "blatt": g.fillStyle=pap; g.beginPath(); g.moveTo(x,y); g.lineTo(x+3,y-h); g.lineTo(x+w,y-h+1); g.lineTo(x+w-2,y); g.fill();
        g.fillStyle=mix(T.paper,"#000000",0.06); g.beginPath(); g.moveTo(x+w*0.3,y); g.lineTo(x+w*0.36,y-h+1.5); g.lineTo(x+w+3,y-h+2.5); g.lineTo(x+w+1,y); g.fill(); break;
      case "kabel": g.strokeStyle=dark?"#1F2229":mix(T.junk[11],T.calm,calm*0.6); g.lineWidth=1.3; g.lineCap="round";
        g.beginPath(); g.moveTo(x,y-1); g.bezierCurveTo(x+w*0.25,y-h*1.2,x+w*0.45,y+1,x+w*0.55,y-h*0.5); g.bezierCurveTo(x+w*0.65,y-h,x+w*0.85,y-h*0.2,x+w,y-1.5); g.stroke();
        g.fillStyle=pap; rr(g,x+w-3,y-5,6,5,1); g.fill(); break;
      case "kabelknaeuel": g.strokeStyle=dark?"#1F2229":mix(T.junk[11],T.calm,calm*0.6); g.lineWidth=1.2;
        for(let i=0;i<4;i++){ g.beginPath(); g.ellipse(x+w/2+(i-1.5)*2,y-h/2,w*0.32,h*0.42,i*0.4,0,7); g.stroke() } break;
      case "lader": g.fillStyle=pap; rr(g,x,y-h,w,h,1.4); g.fill(); g.fillStyle=rgba(T.ink,0.25); g.fillRect(x+w*0.3,y-h-2,1,2); g.fillRect(x+w*0.6,y-h-2,1,2); break;
      case "lego": g.fillStyle=c; g.fillRect(x,y-h,w,h); for(let i=0;i<Math.floor(w/4);i++) g.fillRect(x+1+i*4,y-h-1.6,2.6,1.6); g.fillStyle=l; g.fillRect(x,y-h,w,1); break;
      case "ball": g.fillStyle=c; ell(g,x+w/2,y-w/2,w/2,w/2); g.fill(); g.strokeStyle=pap; g.lineWidth=1.3; g.beginPath(); g.arc(x+w/2,y-w/2,w*0.32,-0.7,1.8); g.stroke(); break;
      case "schuhe": for(let i=0;i<2;i++){ const sx=x+i*11, cc=i?mix(c,"#000000",0.1):c; g.fillStyle=cc; g.beginPath(); g.moveTo(sx,y); g.lineTo(sx,y-h*0.9); g.quadraticCurveTo(sx+4,y-h*1.1,sx+6,y-h*0.55); g.quadraticCurveTo(sx+11,y-h*0.5,sx+12,y-1); g.closePath(); g.fill();
        g.fillStyle=pap; g.fillRect(sx,y-1.6,12,1.6) } break;
      case "rucksack": g.fillStyle=c; rr(g,x+2,y-h,w-4,h,[7,7,3,3]); g.fill(); g.fillStyle=d; rr(g,x+5,y-h*0.5,w-10,h*0.42,2); g.fill(); g.strokeStyle=d; g.lineWidth=1.6; g.beginPath(); g.arc(x+w/2,y-h,4,Math.PI,0); g.stroke(); break;
      case "waeschekorb":
        [[0.2,4,6],[0.45,5,8],[0.72,3,7]].forEach(([fx,ci,r])=>{ g.fillStyle=J(ci); ell(g,x+w*fx,y-h+1,r*1.3,r); g.fill() });
        g.fillStyle=mix(J(9),T.calm,calm*0.6); rr(g,x,y-h,w,h,[2,2,4,4]); g.fill(); g.fillStyle="rgba(255,255,255,.22)"; for(let i=0;i<4;i++){ for(let j=0;j<2;j++){ rr(g,x+4+i*8.4,y-h+6+j*8,5,4,1.5); g.fill() } }
        g.fillStyle=J(11); g.save(); g.translate(x+w-4,y-h+2); g.rotate(0.4); rr(g,0,0,6,18,2); g.fill(); g.restore(); break;
      case "kleidhaufen": g.fillStyle=c; ell(g,x+w*0.35,y-h*0.45,w*0.36,h*0.5); g.fill(); g.fillStyle=J(11); ell(g,x+w*0.66,y-h*0.4,w*0.3,h*0.45); g.fill();
        g.fillStyle=J(3); ell(g,x+w*0.5,y-h*0.8,w*0.18,h*0.3); g.fill(); break;
      case "pulli": g.fillStyle=c; rr(g,x,y-h,w,h,3); g.fill(); g.fillStyle=d; g.fillRect(x,y-3,w,2); break;
      /* Kleiderberg: flache Lagen übereinander, leicht versetzt, Enden hängen schräg über die Kanten */
      case "jeans": case "pullb": case "shirtb": case "tuchb": {
        const wob=(x0,x1,yy,amp,seed)=>{ for(let i=1;i<=8;i++){ const q=i/8; g.lineTo(x0+(x1-x0)*q, yy+Math.sin(q*7+seed)*amp-(i===8?0:0)) } };
        if(p.k==="jeans"){ g.fillStyle=d; g.beginPath(); g.moveTo(x+3,y+5); g.lineTo(x+12,y+6); g.lineTo(x+4,y+21); g.lineTo(x-4,y+18); g.closePath(); g.fill();
          g.fillStyle=l; g.fillRect(x+1,y+15,6,1.1) }
        if(p.k==="pullb"){ g.fillStyle=c; g.beginPath(); g.moveTo(x+w-8,y+3); g.quadraticCurveTo(x+w+6,y+4,x+w+8,y+20); g.lineTo(x+w+2,y+21); g.quadraticCurveTo(x+w,y+11,x+w-9,y+10); g.closePath(); g.fill();
          g.fillStyle=d; g.fillRect(x+w+1.6,y+18,6.6,2.6) }
        if(p.k==="tuchb"){ g.fillStyle=c; g.beginPath(); g.moveTo(x+2,y+2); g.lineTo(x+9,y+3); g.lineTo(x+3,y+22); g.lineTo(x-3,y+20); g.closePath(); g.fill();
          g.fillStyle=l; for(let i=0;i<3;i++) g.fillRect(x+1-i*1.6,y+8+i*4.5,6,1.4); g.fillStyle=d; for(let i=0;i<4;i++) g.fillRect(x-3+i*1.6,y+20.5,1,2.6) }
        g.fillStyle=c; g.beginPath(); g.moveTo(x,y+h); g.lineTo(x+1.5,y+2); wob(x+1.5,x+w-2,y+1,p.k==="shirtb"?1.4:0.7,p.c); g.quadraticCurveTo(x+w+1,y+h*0.5,x+w,y+h); g.closePath(); g.fill();
        g.fillStyle=d; g.globalAlpha=0.55; g.fillRect(x+2,y+h-2,w-3,2); g.globalAlpha=1;
        if(p.k==="jeans"){ g.fillStyle=l; g.fillRect(x+w*0.55,y+3,1.1,h-5); g.fillRect(x+w-10,y+4,6,1.1) }
        if(p.k==="pullb"){ g.strokeStyle=d; g.lineWidth=0.7; for(let i=0;i<7;i++) line(g,x+6+i*6,y+h-4,x+6+i*6,y+h-1) }
        if(p.k==="shirtb"){ g.strokeStyle=l; g.lineWidth=1; g.beginPath(); g.moveTo(x+8,y+5); g.quadraticCurveTo(x+14,y+8,x+20,y+4.5); g.stroke() }
        if(p.k==="tuchb"){ g.fillStyle=l; for(let i=0;i<6;i++) g.fillRect(x+10+i*7,y+1.6,2.4,h-2.6) }
        break }
      case "socke": if(p.z==="lamp"){ g.fillStyle=c; rr(g,x,y,4.5,h,2); g.fill(); rr(g,x,y+h-4.5,8,4.5,2.2); g.fill(); g.fillStyle=l; g.fillRect(x,y+1.4,4.5,1.6); break }
        g.fillStyle=c; rr(g,x,y,w*0.7,h*0.6,2); g.fill(); rr(g,x+w*0.5,y,w*0.5,h,2); g.fill(); break;
      case "stifte": g.fillStyle=c; rr(g,x,y-h*0.6,w,h*0.6,1.2); g.fill(); [[1.5,"#2F3A40"],[4,"#D9573B"],[6.5,"#E2BD45"]].forEach(([dx,cc])=>{ g.fillStyle=mix(cc,T.calm,calm); g.fillRect(x+dx,y-h,1.4,h*0.45) }); break;
      case "schachtel": g.fillStyle=dark?"#9C8E7C":mix("#E7DDCB",T.calm,calm*0.5); rr(g,x,y-h,w,h,1); g.fill(); g.fillStyle=c; g.fillRect(x,y-h,w,2.5); g.fillStyle=rgba(T.ink,0.3); g.fillRect(x+4,y-h*0.5,w*0.4,1); break;
      case "chips": g.fillStyle=c; g.beginPath(); g.moveTo(x+1,y-h); g.lineTo(x+w-1,y-h+1); g.lineTo(x+w,y); g.lineTo(x,y); g.closePath(); g.fill(); g.fillStyle=l; ell(g,x+w/2,y-h*0.5,w*0.26,h*0.2); g.fill(); g.fillStyle=d; g.fillRect(x+1,y-h,w-2,1.6); break;
    }
    g.restore();
  }

  /* ---------- Behaltenes: Farbe = Bereich, Untersetzer = Grund, Ding = Bereich × Grund ---------- */
  const DING={kl:{oft:"Pulli",kann:"Wanderstiefel",sinn:"Mütze",gut:"Schal"},
              wo:{oft:"Espressokanne",kann:"Werkzeug",sinn:"Teekanne",gut:"Windlicht"},
              pa:{oft:"Kopfhörer",kann:"Fachbuch",sinn:"Tagebuch",gut:"Radio"},
              er:{oft:"Kamera",kann:"Ukulele",sinn:"Fotoalbum",gut:"Bilderrahmen"},
              ko:{oft:"Trinkflasche",kann:"Nähkasten",sinn:"Geschenk",gut:"Brettspiel"}};
  /* Alle Figuren für Behaltenes, mit Stichworten für den Vorschlag aus dem Namen */
  const MOTIVE=[["Tasse","tasse becher"],["Espressokanne","espresso kaffee mokka"],["Teekanne","kanne tee"],["Fachbuch","buch roman lexikon"],["Fotoalbum","album"],["Bilderrahmen","foto bild rahmen"],
    ["Ukulele","gitarre ukulele geige instrument"],["Werkzeug","werkzeug bohr hammer schrauber zange säge"],["Pulli","pulli pullover strick sweat jacke"],["Kopfhörer","kopfhörer kopfhoerer"],["Pflanze","pflanze blume kaktus"],
    ["Wanderstiefel","schuh stiefel sneaker"],["Mütze","mütze muetze hut kappe"],["Schal","schal tuch"],["Tagebuch","tagebuch notiz heft"],["Radio","radio lautsprecher box"],["Kamera","kamera fotoapparat"],
    ["Windlicht","kerze windlicht laterne"],["Trinkflasche","flasche"],["Nähkasten","näh naeh"],["Geschenk","geschenk"],["Brettspiel","spiel puzzle schach"]];
  const MOTIF=new Set(MOTIVE.map(x=>x[0]));
  function motifOf(k){ return k.motif&&MOTIF.has(k.motif)?k.motif:((DING[k.cat]||DING.ko)[k.why]||"Fachbuch") }
  function guessMotif(name,cat,why){ const n=String(name||"").toLowerCase();
    let best=null, bl=0; MOTIVE.forEach(([m,kw])=>kw.split(" ").forEach(w=>{ if(w&&n.includes(w)&&w.length>bl){ best=m; bl=w.length } }));
    return best||((DING[cat]||DING.ko)[why]||"Fachbuch") }
  function motifIcon(canvas,motif,cat,dark,px){ const d=Math.min(3,window.devicePixelRatio||1); px=px||44;
    canvas.width=px*d; canvas.height=px*d; canvas.style.width=px+"px"; canvas.style.height=px+"px";
    const g=canvas.getContext("2d"), T=dark?TH.dunkel:TH.hell; g.setTransform(d*px/40,0,0,d*px/40,0,0); g.clearRect(0,0,40,40);
    drawKeep(g,{cat:cat||"wo",why:"oft",motif,bare:true},{x:20,y:33,s:1},T,dark) }
  function drawKeep(g,k,sl,T,dark){
    const col=T.area[k.cat]||T.area.ko, cd=mix(col,"#000000",.28), cl=mix(col,"#ffffff",.42), ink=T.ink;
    const wood=dark?"#B08A62":"#DDB88C", woodD=dark?"#7E5E40":"#A57A4F";
    g.save(); g.translate(sl.x,sl.y); g.scale(sl.s,sl.s);
    g.lineJoin="round"; g.lineCap="round"; g.strokeStyle=rgba(mix(ink,col,0.3),0.72); g.lineWidth=0.7;
    const fs=f=>{ g.fillStyle=f; g.fill(); g.stroke() };
    if(!k.bare){
      g.fillStyle=T.shadow; ell(g,0,0.6,15,2); g.fill();
      const cs=g.strokeStyle; g.strokeStyle=rgba(T.ink,0.25);
      if(k.why==="oft"){ ell(g,0,-1.4,13,2.3); fs(mix(cl,T.paper,.45)) }
      else if(k.why==="kann"){ rr(g,-13,-4,26,4,.6); fs(mix(wood,T.paper,.2)); g.fillStyle=rgba(woodD,.6); g.fillRect(-12.5,-1.3,25,.8) }
      else if(k.why==="sinn"){ g.beginPath(); for(let i=0;i<=12;i++){ const a=Math.PI+i/12*Math.PI, px=Math.cos(a)*14, py=-1.4+Math.sin(a)*2.6; g.arc(px,py,1.3,a-1.2,a+1.2) } g.closePath(); fs(T.paper) }
      else { rr(g,-14,-4.4,28,4.4,[2.2,2.2,1.3,1.3]); fs(mix(col,T.paper,.72)); g.fillStyle=rgba(cd,.6); ell(g,0,-2.2,.9,.9); g.fill() }
      g.strokeStyle=cs;
      g.translate(0,k.why==="kann"||k.why==="gut"?-4.2:-2.8);
    }
    const o=motifOf(k);
    switch(o){
      case "Pulli": rr(g,-11,-9,22,9,2); fs(col); rr(g,-11,-15,22,6,2); fs(cl); g.beginPath(); g.moveTo(-4,-15); g.lineTo(0,-11); g.lineTo(4,-15); g.stroke(); g.fillStyle=cd; g.fillRect(-10,-3,20,1); break;
      case "Wanderstiefel": g.beginPath(); g.moveTo(-10,0); g.lineTo(-9,-20); g.lineTo(0,-20); g.lineTo(1,-9); g.quadraticCurveTo(10,-8,11,-3); g.lineTo(11,0); g.closePath(); fs(col); g.fillStyle=ink; g.fillRect(-10,-2,21,2); g.fillStyle=cl; for(let i=0;i<3;i++) g.fillRect(-6.6,-17+i*3.5,5,1.1); break;
      case "Mütze": g.beginPath(); g.arc(0,-5,10,Math.PI,0); g.closePath(); fs(col); rr(g,-11,-6,22,6,1.5); fs(cd); g.beginPath(); g.arc(0,-17,3.4,0,7); fs(cl); break;
      case "Schal": for(let q=0;q<3;q++){ rr(g,-12+(q%2)*1.5,-6-q*5.6,22,5.6,2.5); fs(q%2?cl:col) } g.strokeStyle=cd; for(let i=0;i<4;i++) line(g,9+i*1.6,-1,9.5+i*1.6,2.4); break;
      case "Espressokanne": g.beginPath(); g.moveTo(-7,0); g.lineTo(-5,-9); g.lineTo(5,-9); g.lineTo(7,0); g.closePath(); fs(col); g.beginPath(); g.moveTo(-5,-9); g.lineTo(-6,-20); g.lineTo(6,-20); g.lineTo(5,-9); g.closePath(); fs(cl); g.beginPath(); g.moveTo(6,-18); g.lineTo(10,-19); g.lineTo(6,-15); fs(cl); rr(g,-11,-17,4,9,1.5); fs(ink); g.beginPath(); g.arc(0,-21.5,1.6,0,7); fs(ink); break;
      case "Werkzeug": g.save(); g.rotate(-0.25); rr(g,-1.4,-25,2.8,20,1); fs(wood); rr(g,-6,-28,12,5,1); fs("#7D8590"); g.restore(); g.save(); g.rotate(0.3); rr(g,-1,-24,2,10,.5); fs("#A9B0B8"); rr(g,-2.4,-16,4.8,8,1.4); fs(cl); g.restore(); rr(g,-8,-11,16,11,1.5); fs(col); break;
      case "Teekanne": g.beginPath(); g.ellipse(0,-8,10,8,0,0,7); fs(col); g.beginPath(); g.moveTo(9,-9); g.quadraticCurveTo(15,-12,16,-17); g.lineTo(13,-15); g.quadraticCurveTo(12,-11,8,-5); fs(col); g.beginPath(); g.arc(-10,-9,4.5,1.6,4.7); g.lineWidth=2; g.strokeStyle=col; g.stroke(); g.lineWidth=.9; g.strokeStyle=ink; g.beginPath(); g.ellipse(0,-16,5,1.8,0,0,7); fs(cl); g.beginPath(); g.arc(0,-18.5,1.6,0,7); fs(cd); g.fillStyle=cl; [[-4,-7],[0,-5],[4,-8]].forEach(([a,b])=>{ g.beginPath(); g.arc(a,b,1.2,0,7); g.fill() }); break;
      case "Windlicht": rr(g,-8,-19,16,19,3); fs(rgba(mix(col,"#ffffff",.7),.85)); rr(g,-4.5,-12,9,11,1); fs(col); g.fillStyle=dark?"#FFD878":"#F7C548"; ell(g,0,-15,1.8,2.8); g.fill(); g.strokeStyle=ink; line(g,0,-12,0,-13.2); g.fillStyle=cl; g.fillRect(-6.5,-17,1.4,12); break;
      case "Kopfhörer": g.beginPath(); g.arc(0,-8,10,Math.PI*1.02,Math.PI*1.98); g.lineWidth=4.4; g.strokeStyle=ink; g.stroke(); g.lineWidth=2.6; g.strokeStyle=col; g.stroke(); g.lineWidth=.9; g.strokeStyle=ink; rr(g,-13,-10,6,10,2.4); fs(col); rr(g,7,-10,6,10,2.4); fs(col); break;
      case "Fachbuch": rr(g,-8,-24,16,24,1); fs(col); g.fillStyle=cl; g.fillRect(-5,-19,10,4); g.fillStyle=T.paper; g.fillRect(6,-23,1.6,22); g.fillStyle=BRAND; g.fillRect(2,-2,2,5); break;
      case "Tagebuch": rr(g,-11,-6,22,6,1); fs(col); rr(g,-10,-11,20,5,1); fs(cl); g.strokeStyle=ink; line(g,5,-11,5,0); g.fillStyle="#E0A92E"; g.fillRect(-2,0,1.6,3); break;
      case "Radio": rr(g,-12,-15,24,15,3); fs(col); g.beginPath(); g.arc(-4,-7.5,5,0,7); fs(cd); rr(g,4,-11,6,3,1); fs(cl); g.beginPath(); g.arc(7,-4.5,1.8,0,7); fs(cl); line(g,8,-15,14,-24); break;
      case "Kamera": rr(g,-12,-14,24,14,2.5); fs(col); rr(g,-8,-17,7,3,1); fs(cd); g.beginPath(); g.arc(1,-7,5.4,0,7); fs("#2F3238"); g.beginPath(); g.arc(1,-7,2.6,0,7); g.fillStyle="#7E93A8"; g.fill(); g.fillStyle=cl; g.fillRect(-11,-12,4,2); break;
      case "Ukulele": g.save(); g.rotate(0.18); rr(g,-1.6,-30,3.2,16,1); fs(woodD); rr(g,-2.4,-33,4.8,4,1); fs(cd); g.beginPath(); g.ellipse(0,-6,7.5,6.5,0,0,7); fs(col); g.beginPath(); g.ellipse(0,-14,5.6,4.8,0,0,7); fs(col); g.beginPath(); g.arc(0,-11,2,0,7); g.fillStyle=ink; g.fill(); g.restore(); break;
      case "Fotoalbum": g.save(); g.rotate(-0.08); rr(g,-10,-25,20,25,1.5); fs(col); rr(g,-5,-19,10,8,.5); fs(T.paper); g.fillStyle=cd; g.fillRect(-10,-25,3,25); g.restore(); break;
      case "Bilderrahmen": rr(g,-9,-22,18,22,1); fs(col); g.fillStyle=dark?"#DCD3C3":"#F3ECDF"; g.fillRect(-6,-19,12,16); g.fillStyle=cd; g.beginPath(); g.arc(0,-13,2.6,0,7); g.fill(); g.beginPath(); g.arc(0,-3,5,Math.PI,0); g.fill(); break;
      case "Trinkflasche": rr(g,-5,-20,10,20,3); fs(col); rr(g,-3,-25,6,5,1); fs(cd); g.beginPath(); g.arc(4.6,-24,2.6,-1.4,1.4); g.stroke(); g.fillStyle=cl; g.fillRect(-4,-13,8,4); break;
      case "Nähkasten": rr(g,-12,-11,24,11,1.5); fs(col); rr(g,-13,-14,26,3.4,1); fs(cd); rr(g,-5,-19,5,5,.5); fs("#D2563F"); g.fillStyle=cl; g.fillRect(-5.5,-17.5,6,1.4); line(g,6,-14,9,-20); break;
      case "Geschenk": rr(g,-10,-15,20,15,1); fs(col); g.fillStyle=cl; g.fillRect(-1.6,-15,3.2,15); g.beginPath(); g.ellipse(-3.5,-17,3.5,2,0.4,0,7); fs(cl); g.beginPath(); g.ellipse(3.5,-17,3.5,2,-0.4,0,7); fs(cl); break;
      case "Tasse": rr(g,-8,-15,13,15,[1,1,4,4]); fs(col); g.beginPath(); g.arc(6,-8,4,-1.3,1.3); g.lineWidth=2.2; g.strokeStyle=col; g.stroke(); g.lineWidth=.9; g.strokeStyle=ink; g.fillStyle=cl; g.fillRect(-6.5,-11,10,2); break;
      case "Pflanze": [[-0.9,10],[-0.35,13],[0.2,14],[0.75,11]].forEach(([a,l],i)=>{ g.save(); g.translate(0,-10); g.rotate(a); g.beginPath(); g.ellipse(0,-l/2,3,l/2,0,0,7); g.fillStyle=i%2?T.leaf:T.leafD; g.fill(); g.restore() }); g.beginPath(); g.moveTo(-7,-10); g.lineTo(7,-10); g.lineTo(5.5,0); g.lineTo(-5.5,0); g.closePath(); fs(col); break;
      case "Brettspiel": rr(g,-13,-7,26,7,1); fs(col); rr(g,-12,-13,24,6,1); fs(cl); g.fillStyle=cd; [-6,0,6].forEach(a=>{ g.beginPath(); g.arc(a,-10,1.5,0,7); g.fill() }); break;
    }
    g.restore();
  }

  /* Ehrenplätze in fester Reihenfolge. Mittelpunkte liegen in x oder y mindestens 56 Einheiten
     auseinander: Bei 320 px (Bildbreite 288 px, 0,8 px je Einheit) sind das 44,8 px. */
  const SLOTS=[
    {x:150,y:DESK.front+1,z:"deskF",s:1},
    {x:92, y:156,z:"regal",row:2,s:.9},
    {x:158,y:SILL.y,z:"sill",s:.92},
    {x:210,y:DESK.front+1,z:"deskF",s:1},
    {x:30, y:72, z:"regal",row:0,s:.9},
    {x:33,y:270,z:"sessel",s:.95},
    {x:272,y:DESK.front+1,z:"deskF",s:1},
    {x:92, y:72, z:"regal",row:0,s:.9},
    {x:214,y:SILL.y,z:"sill",s:.92},
    {x:30, y:156,z:"regal",row:2,s:.9},
    {x:300,y:285,z:"floor",s:1},
    {x:120,y:285,z:"floor",s:1}
  ];
  const MAXK=12, CLEARMAX=4, CLEARAREA=170;
  const hitY=s=>s.y-13*s.s;
  /* Welche Kram-Dinge ein belegter Platz verdeckt: nur direkt darüber liegende, höchstens vier */
  function blockedSet(K){
    const out=new Set(), P=build();
    SLOTS.slice(0,K.length).forEach(s=>{
      const C=P.filter(p=>{
        if(s.z==="regal"){ if(!((p.z==="regal"||p.z==="regalq")&&p.row===s.row)) return false }
        else if(s.z==="floor"||s.z==="sessel"){ if(p.z!=="floor"||Math.abs(p.y-s.y)>14) return false }
        else if(p.z!==s.z) return false;
        return p.x<s.x+13&&p.x+p.w>s.x-13 })
        .map(p=>[Math.min(p.x+p.w,s.x+13)-Math.max(p.x,s.x-13),p]).sort((a,b)=>b[0]-a[0]||a[1].i-b[1].i);
      let used=0, n=0;
      for(const [,p] of C){ if(n>=CLEARMAX) break; if(used+p.a>CLEARAREA) continue; used+=p.a; n++; out.add(p.i) }
    });
    return out;
  }

  /* ---------- Fortschritt c (0..9, stufenlos) ---------- */
  function clearing(m){
    if(typeof m.c==="number") return clamp(m.c,0,9);
    const st=clamp(m.stage|0,0,9);
    if(typeof m.w==="number"&&typeof STUFEN!=="undefined"&&STUFEN[st+1]){
      const a=STUFEN[st].w, b=STUFEN[st+1].w; return st+clamp((m.w-a)/(b-a),0,0.999) }
    return st;
  }

  /* ---------- Szene (Standbild ohne Dampf und ohne Behaltenes) ---------- */
  function scene(g,m){
    const E=env(m), {dark,eve,se,T}=E, c=clearing(m), k=c/9;
    const P=build(), calm=0.55*Math.pow(k,1.2);
    const K=(m.keep||[]).slice(0,MAXK), B=blockedSet(K), TT=times(m.spend,B);
    const vis=p=>c<TT[p.i]&&!B.has(p.i);
    const J=z=>P.filter(p=>p.z===z&&vis(p));
    // Schwerpunkt aus der Bestandsaufnahme: Diese Sorten behalten ihre Farbe, der übrige Kram wird etwas ruhiger
    const FO=m.focus&&m.focus.length?m.focus:null;
    const dj=p=>drawJunk(g,p,T,FO&&!FO.includes(p.kat)?Math.min(0.92,calm+0.4):calm,dark);

    // Wand: wird mit dem Fortschritt heller
    const wall=mix(T.wall0,T.wall1,Math.pow(k,0.7));
    g.fillStyle=wall; g.fillRect(0,0,VW,F);
    if(eve){ const lg=g.createRadialGradient(LAMP.x-30,150,6,LAMP.x-30,150,170); lg.addColorStop(0,rgba(T.sun,dark?0.26:0.22)); lg.addColorStop(1,rgba(T.sun,0)); g.fillStyle=lg; g.fillRect(0,0,VW,F) }
    g.fillStyle=mix(wall,"#000000",0.08); g.fillRect(0,F-5,VW,5);
    // Boden
    const fl=g.createLinearGradient(0,F,0,VH); fl.addColorStop(0,mix(T.floor0,T.floor1,0.2+k*0.5)); fl.addColorStop(1,mix(T.floor0,T.floor1,0.45+k*0.55));
    g.fillStyle=fl; g.fillRect(0,F,VW,VH-F);
    g.strokeStyle=T.plank; g.globalAlpha=0.5; g.lineWidth=0.8;
    for(let i=1;i<12;i++){ const y=F+i*3.6+i*i*0.5; if(y>VH) break; line(g,0,y,VW,y) }
    g.globalAlpha=1;
    // Teppich
    g.fillStyle=T.rug; g.beginPath(); g.moveTo(92,254); g.lineTo(276,254); g.lineTo(292,288); g.lineTo(74,288); g.closePath(); g.fill();
    g.strokeStyle=T.rugL; g.lineWidth=1.4; g.beginPath(); g.moveTo(89,260); g.lineTo(279,260); g.moveTo(80,282); g.lineTo(287,282); g.stroke();
    g.fillStyle=mix(T.floor0,"#000000",0.25); g.fillRect(0,VH-5,VW,5); g.fillStyle=mix(T.floor1,"#ffffff",0.2); g.fillRect(0,VH-5,VW,0.8);
    // Licht auf dem Boden: tags Sonnenfleck, abends Lampenschein
    if(!eve){
      const a=0.16+0.42*k; g.save(); g.beginPath(); g.moveTo(150,F+2); g.lineTo(246,F+2); g.lineTo(318,VH); g.lineTo(196,VH); g.closePath(); g.clip();
      const pg=g.createLinearGradient(0,F,0,VH); pg.addColorStop(0,rgba(T.sun,a)); pg.addColorStop(1,rgba(T.sun,a*0.7)); g.fillStyle=pg; g.fillRect(0,F,VW,VH-F);
      g.strokeStyle=rgba("#B8955A",0.10+0.08*k); g.lineWidth=3; line(g,198,F,258,VH); line(g,140,F+(VH-F)*0.42,330,F+(VH-F)*0.42);
      g.restore();
    } else {
      const pg=g.createRadialGradient(250,F+34,4,250,F+34,140); pg.addColorStop(0,rgba(T.sun,(dark?0.22:0.18)+0.12*k)); pg.addColorStop(1,rgba(T.sun,0));
      g.save(); g.translate(250,F+34); g.scale(1,0.35); g.translate(-250,-F-34); g.fillStyle=pg; g.beginPath(); g.arc(250,F+34,140,0,7); g.fill(); g.restore();
    }
    // Fenster mit Haus gegenüber und Ast
    drawWindow(g,T,E);
    // Lichterkette über dem Fenster (fest; abends an, ohne Schein)
    g.strokeStyle=dark?"#6A6058":"#9C8F80"; g.lineWidth=.6; g.beginPath(); g.moveTo(138,8); g.quadraticCurveTo(196,22,254,8); g.stroke();
    for(let i=0;i<12;i++){ const tt=(i+0.5)/12, bx=138+tt*116, by=8+2*tt*(1-tt)*14+2.2; g.fillStyle=eve?T.bulbs[i%4]:mix(T.bulbs[i%4],wall,.4); ell(g,bx,by,1.5,2); g.fill() }
    // Fensterbank, Pflanze (richtet sich mit dem Fortschritt auf)
    g.fillStyle=T.woodL; g.fillRect(SILL.x0,SILL.y,SILL.x1-SILL.x0,5); g.fillStyle=T.woodD; g.fillRect(SILL.x0+2,SILL.y+5,SILL.x1-SILL.x0-4,2);
    J("sill").forEach(dj);
    drawPlant(g,240,SILL.y,T,k);
    // Bild an der Wand
    g.fillStyle=T.woodD; g.fillRect(PIC.x,PIC.y,PIC.w,PIC.h); g.fillStyle=T.paper; g.fillRect(PIC.x+3,PIC.y+3,PIC.w-6,PIC.h-6);
    g.fillStyle=mix(T.rug,T.paper,0.25); ell(g,PIC.x+PIC.w*0.42,PIC.y+PIC.h*0.45,8,8); g.fill(); g.fillStyle=mix(AREA.pa,T.paper,0.45); g.fillRect(PIC.x+6,PIC.y+PIC.h*0.62,PIC.w-12,PIC.h*0.2);
    // Pinnwand mit zwei Zetteln, die bleiben
    g.fillStyle=T.woodD; g.fillRect(253,80,46,30); g.fillStyle=T.cork; g.fillRect(255,82,42,26);
    g.fillStyle=T.paper; g.save(); g.translate(262,90); g.rotate(-0.06); g.fillRect(-4,-5,10,12); g.restore(); g.fillStyle=mix(T.area.ko,"#ffffff",dark?0.2:0.55); g.fillRect(286,93,8,8);
    g.fillStyle=rgba(T.ink,0.3); g.fillRect(260,88,6,0.8); g.fillRect(260,91,5,0.8);
    J("wand").forEach(dj);
    // Tür mit Flurlicht, Hakenleiste und Taschen
    drawDoor(g,T,m,E);
    // Regal
    g.fillStyle=mix(wall,"#000000",dark?0.16:0.07); g.fillRect(REG.x0+5,REG.top,REG.x1-REG.x0-10,REG.foot-REG.top);
    if(!eve&&k>0.5){ g.fillStyle=rgba(T.sun,(k-0.5)*0.5); g.beginPath(); g.moveTo(14,REG.boards[0]+6); g.lineTo(52,REG.boards[0]+6); g.lineTo(62,REG.boards[1]); g.lineTo(24,REG.boards[1]); g.closePath(); g.fill() }
    g.fillStyle=T.woodD; g.fillRect(REG.x0,REG.top,5,REG.foot-REG.top); g.fillRect(REG.x1-5,REG.top,5,REG.foot-REG.top);
    g.fillStyle=T.wood; g.fillRect(REG.x0-2,REG.top-4,REG.x1-REG.x0+4,5); REG.boards.forEach(by=>g.fillRect(REG.x0,by,REG.x1-REG.x0,4.5));
    g.fillStyle=T.woodD; g.fillRect(REG.x0,REG.boards[3]+4.5,REG.x1-REG.x0,REG.foot-REG.boards[3]-4.5);
    g.fillStyle=T.wood; g.fillRect(REG.x0+3,REG.boards[3]+8,REG.x1-REG.x0-6,REG.foot-REG.boards[3]-12);
    shadowE(g,(REG.x0+REG.x1)/2,REG.foot+1,REG.x1-REG.x0+10,T);
    drawJunk(g,{k:"korb",x:44,y:REG.top,w:26,h:16,c:12},T,0.35,dark);
    J("regaltop").sort((a,b)=>b.y-a.y).forEach(dj);
    // Fach 2, auf Augenhöhe: ein Buch steht, eines lehnt (das Logo)
    drawLogoBooks(g,T,dark);
    drawShelfRow(g,T,dark);
    [[57,26,"#5E6E66"],[62.4,30,"#A0583E"]].forEach(([x,h,cc])=>{ g.fillStyle=mix(cc,T.calm,dark?0.35:0.25); g.fillRect(x,156-h,5,h); g.fillStyle="rgba(255,255,255,.22)"; g.fillRect(x,156-h+4,5,1.2) });
    g.save(); g.translate(62,72); g.rotate(-0.12); g.fillStyle=T.paper; g.fillRect(-6,-15,12,15); g.fillStyle=mix(T.rug,T.paper,0.2); g.fillRect(-4.5,-13.5,9,8); g.fillStyle=rgba(T.ink,0.25); g.fillRect(-4.5,-4,7,0.8); g.restore();
    J("regal").forEach(dj);
    J("regalq").sort((a,b)=>a.lvl-b.lvl).forEach(dj);
    // Schreibtisch
    J("under").forEach(p=>{ shadowE(g,p.x+p.w/2,p.y+1,p.w,T); dj(p) });
    g.fillStyle=T.woodD; g.fillRect(DESK.x0+6,DESK.edge,5,DESK.foot-DESK.edge); g.fillRect(DESK.x1-11,DESK.edge,5,DESK.foot-DESK.edge);
    shadowE(g,DESK.x0+8.5,DESK.foot+1,14,T); shadowE(g,DESK.x1-8.5,DESK.foot+1,14,T);
    const top=()=>{ g.beginPath(); g.moveTo(DESK.x0+4,DESK.back-1); g.lineTo(DESK.x1-4,DESK.back-1); g.lineTo(DESK.x1,DESK.front+1); g.lineTo(DESK.x0,DESK.front+1); g.closePath() };
    g.fillStyle=mix(T.wood,"#ffffff",dark?0.06:0.16); top(); g.fill();
    if(!eve){ g.fillStyle=rgba(T.sun,0.18+0.3*k); g.beginPath(); g.moveTo(160,DESK.back-1); g.lineTo(240,DESK.back-1); g.lineTo(246,DESK.front+1); g.lineTo(168,DESK.front+1); g.closePath(); g.fill() }
    else { const lg=g.createRadialGradient(262,DESK.front-2,2,262,DESK.front-2,80); lg.addColorStop(0,rgba(T.sun,0.6)); lg.addColorStop(1,rgba(T.sun,0)); g.fillStyle=lg; g.save(); top(); g.clip(); g.fillRect(170,DESK.back-2,134,12); g.restore() }
    g.fillStyle=T.wood; g.fillRect(DESK.x0,DESK.front+1,DESK.x1-DESK.x0,DESK.edge-DESK.front-1);
    // Laptop (Rückseite des Deckels)
    g.fillStyle=T.laptop; rr(g,214,DESK.back+1-26,42,26,[2,2,0,0]); g.fill(); g.fillStyle=T.laptopD; g.fillRect(212,DESK.back-1,46,2.6);
    g.fillStyle=mix(T.laptop,"#ffffff",0.25); ell(g,235,DESK.back-12,2.6,2.6); g.fill();
    J("deskB").forEach(dj);
    drawLamp(g,T,eve);
    J("lamp").forEach(dj);
    J("deskF").forEach(dj);
    drawMug(g,T);
    // Boden-Kram, Korb mit Decke und Stuhl, nach Tiefe
    const items=J("floor").map(p=>({y:p.y,f:()=>{ if(!p.stackOn) shadowE(g,p.x+p.w/2,p.y+1,p.w,T); dj(p) }}));
    items.push({y:270,f:()=>drawSessel(g,T,dark)});
    items.push({y:CHAIR.foot,f:()=>drawChair(g,T,J("chair"),dj,dark)});
    items.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
    // Wartende Wünsche: gestrichelte Pakete vor der Tür, füllen sich mit der Wartezeit
    const WS=(m.wishes||[]); const WP=[[322,240],[345,240],[322,266],[345,266],[333,292]];
    WS.slice(0,5).forEach((w,i)=>{ const col=T.area[w.cat]||T.area.ko, [bx,by]=WP[i], s=18, h=15;
      g.fillStyle=dark?"rgba(255,255,255,.08)":"rgba(255,255,255,.6)"; rr(g,bx-s/2,by-h,s,h,2); g.fill();
      const fh=h*clamp(w.p,0.08,1); g.fillStyle=rgba(col,dark?0.45:0.32); rr(g,bx-s/2,by-fh,s,fh,[0,0,2,2]); g.fill();
      g.setLineDash([2.6,2]); g.strokeStyle=col; g.lineWidth=1.4; rr(g,bx-s/2,by-h,s,h,2); g.stroke(); line(g,bx,by-h,bx,by-h+5); g.setLineDash([]) });
    if(WS.length>5) dots(g,346,294,T,dark);
  }
  function dots(g,x,y,T,dark){ g.fillStyle=dark?"rgba(240,230,215,.7)":rgba(T.ink,0.45); [0,4,8].forEach(d=>{ ell(g,x+d-4,y,1.1,1.1); g.fill() }) }

  function drawWindow(g,T,E){
    const {x,y,w,h}=WIN, eve=E.eve;
    g.fillStyle=T.woodL; rr(g,x-6,y-6,w+12,h+12,2); g.fill();
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    const sk=g.createLinearGradient(0,y,0,y+h); sk.addColorStop(0,T.sky0); sk.addColorStop(1,T.sky1); g.fillStyle=sk; g.fillRect(x,y,w,h);
    // Haus gegenüber
    g.fillStyle=T.house; g.fillRect(x+40,y+28,62,70); g.fillStyle=T.houseD; g.fillRect(x+40,y+28,62,4);
    for(let r=0;r<3;r++) for(let q=0;q<3;q++){ const lit=eve&&((r*3+q)%4!==1); g.fillStyle=lit?T.houseWin:(eve?mix(T.house,"#000000",.25):T.houseWin); g.fillRect(x+47+q*17,y+38+r*19,8,11) }
    if(eve){ g.fillStyle="#F6EED8"; ell(g,x+20,y+16,5.5,5.5); g.fill(); g.fillStyle=T.sky0; ell(g,x+23,y+14,5,5); g.fill();
      const R=mulberry(9); g.fillStyle="rgba(255,248,230,.7)"; for(let i=0;i<6;i++){ ell(g,x+6+R()*30,y+28+R()*20,0.6,0.6); g.fill() } }
    else { const sg=g.createRadialGradient(x+16,y+12,1,x+16,y+12,48); sg.addColorStop(0,"rgba(255,255,255,.75)"); sg.addColorStop(1,"rgba(255,255,255,0)"); g.fillStyle=sg; g.fillRect(x,y,w,h) }
    // Ast von links, Laub nach Jahreszeit (still)
    g.strokeStyle=T.branch; g.lineCap="round"; g.lineWidth=2.2; g.beginPath(); g.moveTo(x-2,y+60); g.quadraticCurveTo(x+20,y+52,x+38,y+58); g.stroke();
    g.lineWidth=1.2; line(g,x+18,y+54,x+26,y+44); line(g,x+30,y+56,x+40,y+66);
    const lc={fruehling:"#E9A9B8",sommer:"#5E9A54",herbst:"#D9823A",winter:null}[E.se];
    if(lc){ g.fillStyle=eve?mix(lc,"#262233",.5):lc; [[8,56],[16,52],[24,45],[28,42],[34,58],[39,64],[42,60],[12,60],[22,54]].forEach(([dx,dy],i)=>{ g.beginPath(); g.ellipse(x+dx,y+dy,2.8,1.6,i,0,7); g.fill() }) }
    else { g.fillStyle="#FFFFFF"; g.fillRect(x,y+h-3,w,3); g.fillRect(x+2,y+57,34,1.4); const R=mulberry(31); for(let i=0;i<10;i++){ ell(g,x+4+R()*(w-8),y+4+R()*(h-12),.9,.9); g.fill() } }
    g.restore();
    g.fillStyle=T.woodL; g.fillRect(x+w/2-1.6,y,3.2,h); g.fillRect(x,y+h*0.45-1.6,w,3.2);
  }
  function drawPlant(g,x,y,T,k){ // hängt am Anfang etwas, richtet sich mit dem Fortschritt auf (nie welk)
    const leaves=[[-1,-.9],[1,-.6],[-1,-.3],[1,0.1],[-0.3,-1.4],[0.4,-1.25],[0,-1.6]];
    leaves.forEach(([sd,a],i)=>{ const droop=(1-k)*0.75, ang=-Math.PI/2+sd*(0.5+droop)+a*0.2*(sd||1), len=12+(i%3)*2.6;
      g.save(); g.translate(x,y-12); g.rotate(ang); g.fillStyle=i%2?T.leaf:T.leafD; g.beginPath(); g.moveTo(0,0); g.quadraticCurveTo(len*0.5,-4.2,len,0); g.quadraticCurveTo(len*0.5,4.2,0,0); g.fill(); g.restore() });
    g.fillStyle=T.pot; g.beginPath(); g.moveTo(x-8,y-13); g.lineTo(x+8,y-13); g.lineTo(x+6,y); g.lineTo(x-6,y); g.closePath(); g.fill();
    g.fillStyle=mix(T.pot,"#000000",.15); g.fillRect(x-8.5,y-14,17,3);
  }
  function drawLogoBooks(g,T,dark){ // Fach 2 links: cremefarbenes Buch steht, gelbes lehnt (Fuge dazwischen)
    const by=REG.boards[1], cream=dark?"#E9DFCF":"#FFF4E6", yel=dark?"#E7B94E":"#F2BE3D";
    g.save(); g.strokeStyle=mix(T.ink,"#000000",0); g.lineWidth=0.7;
    g.fillStyle=cream; rr(g,15,by-36,8,36,1); g.fill(); g.stroke();
    g.fillStyle=mix(cream,"#000000",0.08); g.fillRect(15,by-30,8,1.2); g.fillRect(15,by-7,8,1.2);
    g.translate(27,by); g.rotate(-0.44); g.fillStyle=yel; rr(g,0,-34,7.5,34,1); g.fill(); g.stroke(); g.fillStyle=mix(yel,"#000000",0.12); g.fillRect(0,-28,7.5,1.2);
    g.restore();
    [[74,30,"#5E7C6B"],[79.4,34,"#C9A24A"],[85,27,"#8C5A44"],[100,28,"#6E7F8C"],[106,32,"#8C6B4A"]].forEach(([x,h,cc])=>{ g.fillStyle=mix(cc,T.calm,dark?0.35:0.25); g.fillRect(x,by-h,5,h); g.fillStyle="rgba(255,255,255,.22)"; g.fillRect(x,by-h+4,5,1.2) });
    drawJunk(g,{k:"korb",x:84,y:REG.boards[3],w:26,h:14,c:12},T,0.4,dark);
    g.fillStyle=mix("#9A9468",T.calm,0.3); g.beginPath(); g.moveTo(72,REG.boards[2]-15); g.quadraticCurveTo(78,REG.boards[2]-6,75.5,REG.boards[2]); g.lineTo(68.5,REG.boards[2]); g.quadraticCurveTo(66,REG.boards[2]-6,72,REG.boards[2]-15); g.fill();
  }
  function drawLamp(g,T,eve){
    const col=T.lamp;
    g.fillStyle=col; rr(g,LAMP.x-8,DESK.back-2,16,3.5,1.5); g.fill();
    g.strokeStyle=col; g.lineWidth=2; g.lineCap="round"; g.beginPath(); g.moveTo(LAMP.x,DESK.back-2); g.lineTo(LAMP.x+4,DESK.back-30); g.lineTo(LAMP.x-14,DESK.back-46); g.stroke();
    g.save(); g.translate(LAMP.x-16,DESK.back-46); g.rotate(0.55);
    if(eve){ const lg=g.createLinearGradient(0,0,0,46); lg.addColorStop(0,rgba(T.sun,0.36)); lg.addColorStop(1,rgba(T.sun,0)); g.fillStyle=lg; g.beginPath(); g.moveTo(-6,4); g.lineTo(6,4); g.lineTo(24,48); g.lineTo(-24,48); g.closePath(); g.fill() }
    g.fillStyle=col; g.beginPath(); g.moveTo(-4,-4); g.lineTo(4,-4); g.lineTo(8,5); g.lineTo(-8,5); g.closePath(); g.fill();
    g.fillStyle=eve?"#FFF1C8":mix(col,"#ffffff",.3); ell(g,0,5,5.5,1.4); g.fill();
    g.restore();
  }
  function drawMug(g,T){ // Teetasse (fest): über ihr steigt der Dampf
    const x=MUG.x, y=MUG.y;
    g.fillStyle=T.shadow; ell(g,x,y+0.6,8,1.6); g.fill();
    g.fillStyle=T.paper; rr(g,x-6,y-12,12,12,[1,1,3,3]); g.fill(); g.strokeStyle=T.paper; g.lineWidth=1.8; g.beginPath(); g.arc(x+6.6,y-6.5,3,-1.3,1.3); g.stroke();
    g.fillStyle=BRAND; g.fillRect(x-6,y-8,12,2.2); g.fillStyle=mix(T.paper,"#7A4A20",.5); g.fillRect(x-5,y-12,10,1.4);
    g.strokeStyle=T.paperL; g.lineWidth=.6; line(g,x+3,y-12,x+5,y-16); g.fillStyle="#E0A92E"; g.fillRect(x+4,y-18,3,3);
  }
  function drawShelfRow(g,T,dark){ // Fach 4: ein voller, ordentlicher Boden (fest)
    const by=REG.boards[3], R=mulberry(404), C=["#5E7C6B","#A0583E","#C9A24A","#55606E","#8C6B4A","#7F6A93","#4F7F8C","#B07A5A","#6E7F5A","#9A5A6A"];
    let x=14; for(let i=0;i<11;i++){ const w=4.2+R()*2.4, h=25+R()*9, c=mix(C[i%C.length],T.calm,dark?0.35:0.25); g.fillStyle=c; g.fillRect(x,by-h,w,h); g.fillStyle="rgba(255,255,255,.22)"; g.fillRect(x,by-h+4,w,1.1); g.fillRect(x,by-6,w,1); x+=w+0.5 }
    drawJunk(g,{k:"stapelbuch",x:x+3,y:by,w:20,h:12,c:7},T,0.4,dark);
  }
  function drawSessel(g,T,dark){ // Sessel mit Decke (fest), vorn links
    const c=dark?"#6A7560":"#8E9C7A", d=mix(c,"#000000",.18), l=mix(c,"#ffffff",.18);
    shadowE(g,33,297,62,T);
    g.fillStyle=T.woodD; g.fillRect(9,288,3,9); g.fillRect(54,288,3,9);
    g.fillStyle=d; rr(g,9,234,48,40,[14,14,3,3]); g.fill();
    g.fillStyle=c; rr(g,12,238,42,34,[12,12,3,3]); g.fill();
    g.fillStyle=l; rr(g,10,266,46,20,4); g.fill();
    g.fillStyle=c; rr(g,2,252,12,38,[6,6,3,3]); g.fill(); rr(g,52,252,12,38,[6,6,3,3]); g.fill();
    g.fillStyle=d; g.fillRect(4,286,8,2.4); g.fillRect(54,286,8,2.4);
    // Decke über der Lehne
    const dc=mix(T.rug,"#ffffff",dark?0.05:0.2); g.fillStyle=dc; g.beginPath(); g.moveTo(40,236); g.quadraticCurveTo(52,232,60,248); g.lineTo(62,276); g.lineTo(54,278); g.lineTo(50,250); g.quadraticCurveTo(46,242,38,242); g.closePath(); g.fill();
    g.fillStyle=mix(dc,"#ffffff",.3); for(let i=0;i<3;i++) g.fillRect(52.5+i*0.4,256+i*7,8,1.4);
  }
  function drawDecke(g,x,y,T,dark){
    g.fillStyle=dark?"#8A6A55":mix("#D9A97E",T.calm,0.25); ell(g,x+16,y-18,14,6); g.fill();
    g.fillStyle=mix(T.rug,"#ffffff",0.2); g.beginPath(); g.moveTo(x+18,y-20); g.quadraticCurveTo(x+30,y-26,x+30,y-8); g.lineTo(x+26,y-6); g.closePath(); g.fill();
    g.fillStyle=dark?"#6E5A44":"#B89366"; rr(g,x,y-18,32,18,[2,2,5,5]); g.fill();
    g.strokeStyle="rgba(0,0,0,.12)"; g.lineWidth=1; for(let i=1;i<3;i++) line(g,x+1,y-18+i*6,x+31,y-18+i*6);
  }
  function drawChair(g,T,clothes,dj,dark){
    const c=T.woodD, cl=T.wood;
    g.fillStyle=mix(c,"#000000",0.12); g.fillRect(CHAIR.l+5,206,3.5,40); g.fillRect(CHAIR.r-8.5,206,3.5,40);
    g.fillStyle=cl; g.fillRect(CHAIR.l,204,CHAIR.r-CHAIR.l+4,5);
    shadowE(g,CHAIR.cx+2,CHAIR.foot+1,CHAIR.r-CHAIR.l+16,T);
    g.fillStyle=c; g.fillRect(CHAIR.l,CHAIR.top,4.5,CHAIR.foot-CHAIR.top); g.fillRect(CHAIR.r,CHAIR.top,4.5,CHAIR.foot-CHAIR.top);
    g.fillStyle=cl; rr(g,CHAIR.l-1,CHAIR.top,CHAIR.r-CHAIR.l+6.5,9,2); g.fill(); g.fillRect(CHAIR.l,CHAIR.top+22,CHAIR.r-CHAIR.l+4,4);
    g.fillStyle=c; g.fillRect(CHAIR.cx-1,CHAIR.top+9,4,13);
    // Strickjacke über der Lehne (bleibt)
    const jc=dark?"#6E7C76":"#7F8F86";
    g.fillStyle=jc; g.beginPath(); g.moveTo(CHAIR.l+4,CHAIR.top+1); g.quadraticCurveTo(CHAIR.l+14,CHAIR.top-4,CHAIR.l+24,CHAIR.top+1); g.lineTo(CHAIR.l+22,CHAIR.top+28); g.quadraticCurveTo(CHAIR.l+15,CHAIR.top+31,CHAIR.l+6,CHAIR.top+28); g.closePath(); g.fill();
    g.fillStyle=mix(jc,"#000000",0.15); g.fillRect(CHAIR.l+6,CHAIR.top+25,16,3); g.fillStyle=mix(jc,"#ffffff",0.25); for(let i=0;i<3;i++){ ell(g,CHAIR.l+14,CHAIR.top+8+i*6,0.9,0.9); g.fill() }
    const order=["jeans","pullb","shirtb","tuchb","socke"];
    clothes.slice().sort((a,b)=>order.indexOf(a.k)-order.indexOf(b.k)).forEach(dj);
  }
  function drawDoor(g,T,m,E){
    const {x,y,w}=DOOR, dark=E.dark;
    g.fillStyle=T.woodL; g.fillRect(x-4,y-4,w+8,F-y+4);
    g.fillStyle=T.hall; g.fillRect(x,y,w,F-y);                      // Flurlicht im Spalt
    g.fillStyle=T.door; g.fillRect(x,y,w-6,F-y); g.fillStyle=T.doorL; rr(g,x+5,y+8,w-16,62,1.5); g.fill(); rr(g,x+5,y+78,w-16,90,1.5); g.fill();
    g.fillStyle=T.woodD; rr(g,x+3,y+92,8,3,1.5); g.fill(); ell(g,x+5,y+98,1.4,1.4); g.fill();
    // Hakenleiste an der Tür
    g.fillStyle=T.wood; rr(g,x+3,y+30,w-12,4.5,1.5); g.fill(); const pegs=[x+9,x+20,x+31]; g.fillStyle=T.woodD; pegs.forEach(px=>{ ell(g,px,y+32,1.8,1.8); g.fill() });
    // Weitergegebenes: Taschen mit Namensanhänger
    const bags=(m.bags||Array.from({length:m.paths||0},()=>({n:""})));
    const n=Math.min(6,bags.length);
    for(let i=n-1;i>=0;i--){ const px=pegs[i%3]+(i>=3?3:0), py=y+32+(i>=3?4:0); bag(g,px,py,i,bags[i].n,T,dark) }
    if(bags.length>6) dots(g,x+20,y+64,T,dark);
  }
  function bag(g,x,y,i,name,T,dark){
    const cs=[T.area.ko,mix(T.paper,"#D9C9AE",.55),mix(T.junk[0],"#ffffff",.12),mix(T.area.ko,"#ffffff",.35),T.junk[10],mix("#C9A16B",T.calm,dark?.4:0)], c=cs[i%6];
    g.strokeStyle=mix(c,"#000000",.25); g.lineWidth=1.3; g.beginPath(); g.moveTo(x-3.5,y+8); g.lineTo(x,y); g.lineTo(x+3.5,y+8); g.stroke();
    g.fillStyle=c; rr(g,x-6,y+7,12,15,[1,1,2.5,2.5]); g.fill();
    g.fillStyle=mix(c,"#000000",.12); g.fillRect(x-6,y+7,12,2);
    // Anhänger: Initiale, sonst Personen-Zeichen
    if(!name){ g.strokeStyle=rgba(T.ink,.4); g.lineWidth=.5; line(g,x+3.5,y+10,x+5.5,y+13); g.fillStyle=T.tag; g.save(); g.translate(x+6,y+13); g.rotate(.25); rr(g,-1.8,0,4,5.4,[.6,.6,1,1]); g.fill(); g.restore(); return }
    g.strokeStyle=T.ink; g.lineWidth=.6; line(g,x+4,y+10,x+7,y+14);
    g.fillStyle=T.tag; ell(g,x+7.8,y+17.4,4.3,4.3); g.fill(); g.strokeStyle=T.area.ko; g.lineWidth=.7; g.stroke();
    const ini=String(name||"").trim().charAt(0).toUpperCase();
    if(ini){ g.fillStyle=dark?"#2F5C3E":"#2E6B42"; g.font="700 6px Inter, system-ui, sans-serif"; g.textAlign="center"; g.textBaseline="middle"; g.fillText(ini,x+7.8,y+17.7) }
  }

  /* ---------- Behaltenes (oberste Ebene, eigene zwischengespeicherte Lage) ---------- */
  function drawTop(g,m){
    const {T,dark}=env(m), K=(m.keep||[]).slice(0,MAXK), hits=[];
    // Tiefe beachten: Regal und Fensterbank zuerst, dann Tisch, dann Boden
    const ord=K.map((k,i)=>[k,SLOTS[i]]).sort((a,b)=>a[1].y-b[1].y);
    ord.forEach(([k,s])=>drawKeep(g,k,s,T,dark));
    K.forEach((k,i)=>hits.push({id:k.id,x:SLOTS[i].x,y:hitY(SLOTS[i]),cat:k.cat,why:k.why,ding:motifOf(k)}));
    return hits;
  }

  /* ---------- Die eine Dauerbewegung: Dampf über der Teetasse (7-s-Takt) ---------- */
  function steam(g,time,dark){
    const col=dark?"rgba(240,232,220,":"rgba(255,255,255,";
    g.lineCap="round"; g.lineWidth=1.4;
    for(let i=0;i<2;i++){
      const ph=(time/7+i*0.5)%1, x0=MUG.x-2+i*4, y0=MUG.y-14;
      g.strokeStyle=col+(0.8*Math.sin(ph*Math.PI)).toFixed(3)+")";
      g.beginPath(); for(let s=0;s<=12;s++){ const q=s/12, y=y0-q*22-ph*6, x=x0+Math.sin(q*5+time*0.9+i*2)*2.4*q; s?g.lineTo(x,y):g.moveTo(x,y) } g.stroke();
    }
    if(!dark){ // feiner Schatten, damit der Dampf auf heller Wand lesbar bleibt
      g.lineWidth=0.5; for(let i=0;i<2;i++){ const ph=(time/7+i*0.5)%1, x0=MUG.x-1.2+i*4, y0=MUG.y-14;
        g.strokeStyle="rgba(120,100,80,"+(0.18*Math.sin(ph*Math.PI)).toFixed(3)+")";
        g.beginPath(); for(let s=0;s<=12;s++){ const q=s/12, y=y0-q*22-ph*6, x=x0+Math.sin(q*5+time*0.9+i*2)*2.4*q; s?g.lineTo(x,y):g.moveTo(x,y) } g.stroke() } }
  }

  /* ---------- Reine Zeichenfunktion (Tests, Übersichten, Messung) ---------- */
  function draw(ctx,W,H,model){
    const m=model||{}, u=W/VW;
    ctx.save(); ctx.scale(u,u); scene(ctx,m); steam(ctx,m.time==null?2:m.time,!!m.dark); const hits=drawTop(ctx,m); ctx.restore();
    return hits.map(h=>Object.assign({},h,{hx:h.x*u,hy:h.y*u,hr:22}));
  }

  /* ---------- Bühne mit Zwischenspeicher ---------- */
  let cv=null, ctx=null, cur=null, prev=null, info=null, model=null, raf=0, io=null, visible=true, fadeT0=0, ringT0=0, ringAt=null, last=0, t0=0, full=true;
  const RMq=()=>typeof RM==="function"?RM():matchMedia("(prefers-reduced-motion: reduce)").matches;
  function layer(W,H,dpr,m){
    const u=W/VW, mk=()=>{ const c=document.createElement("canvas"); c.width=Math.round(W*dpr); c.height=Math.round(H*dpr); const g=c.getContext("2d"); g.setTransform(dpr*u,0,0,dpr*u,0,0); return [c,g] };
    const [b,gb]=mk(); scene(gb,m);
    const [t,gt]=mk(); const hits=drawTop(gt,m);
    return {base:b,top:t,hits};
  }
  function size(){ const W=cv.clientWidth||360; return {W,H:Math.round(W*VH/VW),dpr:Math.min(3,window.devicePixelRatio||1)} }
  const cache=new Map();
  function keyOf(m,W,dpr){ const e=env(m); return JSON.stringify([(m.focus||[]).join(),W,dpr,e.dark,e.night,e.se,clearing(m).toFixed(4),m.keep,(m.bags||[]).map(b=>b.n),m.paths,(m.wishes||[]).map(w=>[w.cat,Math.round(w.p*10)]),m.spend||[]]) }
  function layerFor(W,H,dpr,m){ const k=keyOf(m,W,dpr); let L=cache.get(k); if(!L){ L=layer(W,H,dpr,m); cache.set(k,L); if(cache.size>4) cache.delete(cache.keys().next().value) } return L }
  function mount(canvas,m,fromModel){
    cv=canvas; ctx=cv.getContext("2d"); model=m; m.dark=document.documentElement.dataset.dark==="1";
    const {W,H,dpr}=size(); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.height=H+"px";
    const t1=performance.now(); cur=layerFor(W,H,dpr,m); Bild.lastBuild=performance.now()-t1; const u=W/VW;
    info={hits:cur.hits.map(h=>({id:h.id,hx:h.x*u,hy:h.y*u,hr:22,cat:h.cat,why:h.why,ding:h.ding})),cx:180*u,cy:190*u,rx:120*u,ry:80*u,ph:dayPhase(m.date||new Date()),W,H};
    FOCUS=m.focus||[]; info.zones=placeZones(zonesOf(m),info.hits,u,W,H);
    prev=null; fadeT0=0; ringAt=null; full=true;
    if(fromModel&&!RMq()){ fromModel.dark=m.dark; fromModel.date=m.date; prev=layerFor(W,H,dpr,fromModel); fadeT0=performance.now()+(m.delay||250) }
    if(m.ringKeep&&!RMq()){ const hk=info.hits.find(x=>x.id===m.ringKeep); if(hk) ringAt={x:hk.hx,y:hk.hy,r:hk.hr} }
    else if(m.ringStage&&!RMq()) ringAt={x:info.cx,y:info.cy,r:Math.max(info.rx,info.ry)*0.8};
    if(ringAt) ringT0=performance.now()+(prev?(m.delay||250)+1550:300);
    if(io) io.disconnect();
    io=new IntersectionObserver(es=>{ visible=es[0].isIntersecting; if(visible) loop() },{threshold:0}); io.observe(cv);
    cancelAnimationFrame(raf); last=0; if(!t0) t0=performance.now(); frame(performance.now());
    if(!RMq()) loop();
    return info;
  }
  function loop(){ cancelAnimationFrame(raf); if(!visible||!cv||!cv.isConnected||RMq()) return; raf=requestAnimationFrame(t=>{ if(t-last>=32){ last=t; frame(t) } loop() }) }
  function frame(t){
    if(!cv||!cv.isConnected){ cancelAnimationFrame(raf); return }
    const {W,dpr}=size(), u=W/VW, still=RMq(), tm=still?2:(t-t0)/1000+2;
    const t1=performance.now();
    if(prev||ringAt||full){
      let k=1; if(prev){ k=fadeT0?Math.min(1,Math.max(0,(t-fadeT0)/(model.fadeDur||1200))):0; if(k>=1){ prev=null; k=1 } }
      ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=1; ctx.clearRect(0,0,cv.width,cv.height);
      ctx.drawImage(cur.base,0,0);
      if(prev){ ctx.globalAlpha=1-k; ctx.drawImage(prev.base,0,0); ctx.globalAlpha=1 }
      ctx.setTransform(dpr*u,0,0,dpr*u,0,0); steam(ctx,tm,model.dark);
      ctx.setTransform(1,0,0,1,0,0);
      if(prev){ ctx.globalAlpha=k; ctx.drawImage(cur.top,0,0); ctx.globalAlpha=1-k; ctx.drawImage(prev.top,0,0); ctx.globalAlpha=1 }
      else ctx.drawImage(cur.top,0,0);
      full=!!prev;
      if(ringAt){ const dur=ringAt.dur||1600, q=still&&(ringAt.box||ringAt.dots)?0.5:(t-ringT0)/dur; if(q>0&&q<1){ ctx.setTransform(dpr,0,0,dpr,0,0); ctx.save(); ctx.strokeStyle=model.dark?"#E8826A":"#B4472E"; ctx.globalAlpha=Math.sin(q*Math.PI)*0.85; ctx.setLineDash([4,3.5]); ctx.lineWidth=1.6;
          if(ringAt.boxes&&ringAt.soft){ ctx.setLineDash([]); ctx.strokeStyle=model.dark?"#F2C463":"#E9B53F"; ctx.lineWidth=3; ctx.shadowColor=ctx.strokeStyle; ctx.shadowBlur=8; ctx.globalAlpha=Math.sin(q*Math.PI)*0.7; ringAt.boxes.forEach(([bx,by,bw,bh])=>{ ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,6); ctx.stroke() }) }
          else if(ringAt.boxes){ const e=still?0:(1-q)*3; ringAt.boxes.forEach(([bx,by,bw,bh])=>{ ctx.beginPath(); ctx.roundRect(bx-e,by-e,bw+2*e,bh+2*e,5); ctx.stroke() }) }
          else if(ringAt.box){ const [bx,by,bw,bh]=ringAt.box, e=still?0:(1-q)*3; ctx.beginPath(); ctx.roundRect(bx-e,by-e,bw+2*e,bh+2*e,6); ctx.stroke() }
          else if(ringAt.dots){ ctx.setLineDash([3,3]); ringAt.dots.forEach(([x,y])=>{ ctx.beginPath(); ctx.arc(x,y,13+(still?0:q*3),0,7); ctx.stroke() }) }
          else { ctx.beginPath(); ctx.arc(ringAt.x,ringAt.y,ringAt.r*(0.9+q*0.25),0,7); ctx.stroke() } ctx.restore() } else if(q>=1){ ringAt=null; full=true } }
    } else {
      // Nur der Dampf: Ausschnitt aus dem Standbild zurücksetzen, Dampf und Behaltenes darüber
      const s=dpr*u, sx=Math.floor(STEAM.x*s), sy=Math.floor(STEAM.y*s), sw=Math.ceil(STEAM.w*s), sh=Math.ceil(STEAM.h*s);
      ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=1; ctx.clearRect(sx,sy,sw,sh);
      ctx.drawImage(cur.base,sx,sy,sw,sh,sx,sy,sw,sh);
      ctx.save(); ctx.beginPath(); ctx.rect(sx,sy,sw,sh); ctx.clip(); ctx.setTransform(s,0,0,s,0,0); steam(ctx,tm,model.dark); ctx.restore();
      ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(cur.top,sx,sy,sw,sh,sx,sy,sw,sh);
    }
    Bild.lastFrame=performance.now()-t1;
  }
  function stop(){ cancelAnimationFrame(raf); if(io) io.disconnect(); cv=null }
  /* Markierung einer Zone nach dem Antippen; einmaliger Hinweis auf alle Tippflächen. Bei reduzierter Bewegung steht sie still und geht nach kurzer Zeit weg. */
  let markT=0;
  function ring(r,delay){ if(!cv||!info) return; ringAt=r; ringT0=performance.now()+(delay||0); full=true; clearTimeout(markT);
    if(RMq()){ frame(performance.now()); markT=setTimeout(()=>{ ringAt=null; full=true; if(cv) frame(performance.now()) },(r.dur||1600)-200) } else loop() }
  function mark(id){ const z=info&&(info.zones||[]).find(x=>x.id===id); if(z) ring({boxes:z.rects.slice(0,16).map(([x,y,w,h])=>[x-2,y-2,w+4,h+4])}) }
  /* Nach einem Eintrag aus einer Stelle: ihren Umriss (aus dem Zustand davor) während der Überblendung zeigen */
  function markFrom(m,id,delay){ if(!cv||!info) return; const z=zonesOf(m).find(x=>x.id===id); if(!z) return; const u=info.W/VW;
    ring({box:z.box.map(v=>v*u),dur:2000},delay||0) }
  /* Nach dem Abräumen: genau die Dinge umranden, die gerade gehen (aus dem Zustand davor) */
  function markGone(fromM,toM,delay){ if(!cv||!info) return; const u=info.W/VW, Kf=(fromM.keep||[]).slice(0,MAXK), Bf=blockedSet(Kf);
    const g0=goneSet(fromM.spend,Bf), g1=goneSet(toM.spend,blockedSet((toM.keep||[]).slice(0,MAXK))), P=build();
    const L=P.filter(p=>g1.has(p.i)&&!g0.has(p.i)&&!Bf.has(p.i)); if(!L.length) return;
    ring({boxes:L.slice(0,12).map(p=>rectOf(p).map((v,i)=>i<2?(v-2)*u:(v+4)*u)),dur:2000},delay||0) }
  /* Nach der Bestandsaufnahme: die Dinge der Schwerpunkt-Sorten kurz umranden */
  function markFocus(m,delay){ if(!cv||!info||!m.focus) return; const u=info.W/VW, K=(m.keep||[]).slice(0,MAXK), B=blockedSet(K), G=goneSet(m.spend,B);
    const L=build().filter(p=>m.focus.includes(p.kat)&&!G.has(p.i)&&!B.has(p.i)).sort((a,b)=>b.a-a.a).slice(0,14); if(!L.length) return;
    ring({boxes:L.map(p=>rectOf(p).map((v,i)=>i<2?(v-2)*u:(v+4)*u)),dur:2600,soft:1},delay||0) }
  /* Ausschnitt um eine Zone für das Blatt: aus dem Standbild, mit gestricheltem Rahmen */
  function crop(el,id){ if(!cur||!info||!el) return false; const z=(info.zones||[]).find(x=>x.id===id); if(!z) return false;
    const {W,H,dpr}=size(), ew=el.clientWidth||320, eh=el.clientHeight||120, A=ew/eh, [bx,by,bw,bh]=z.box;
    let cw=Math.max(bw+40,(bh+40)*A,150); cw=Math.min(cw,W,H*A); const ch=cw/A;
    const x=Math.min(W-cw,Math.max(0,bx+bw/2-cw/2)), y=Math.min(H-ch,Math.max(0,by+bh/2-ch/2)), d2=Math.min(3,window.devicePixelRatio||1);
    el.width=Math.round(ew*d2); el.height=Math.round(eh*d2); const g=el.getContext("2d"), s=ew/cw;
    [cur.base,cur.top].forEach(L=>g.drawImage(L,x*dpr,y*dpr,cw*dpr,ch*dpr,0,0,el.width,el.height));
    g.setTransform(d2*s,0,0,d2*s,-x*d2*s,-y*d2*s);
    // außerhalb der Stelle leicht abdunkeln bzw. aufhellen, damit sie heraussticht
    g.fillStyle=model&&model.dark?"rgba(20,16,14,.42)":"rgba(246,244,239,.5)"; g.beginPath(); g.rect(x,y,cw,ch); g.roundRect(bx,by,bw,bh,6/s); g.fill("evenodd");
    g.strokeStyle=model&&model.dark?"#E8826A":"#B4472E"; g.lineWidth=1.8/s; g.setLineDash([5/s,4/s]);
    g.beginPath(); g.roundRect(bx,by,bw,bh,6/s); g.stroke(); return true }
  /* Standbild für Tests und Übersichten */
  function paint(canvas,m,W,time){ W=W||360; const H=Math.round(W*VH/VW), dpr=Math.min(3,window.devicePixelRatio||1);
    if(m.dark==null) m.dark=document.documentElement.dataset.dark==="1";
    canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr); canvas.style.width=W+"px"; canvas.style.height=H+"px";
    const g=canvas.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0); return draw(g,W,H,Object.assign({},m,{time:time==null?2:time})) }
  /* Kramfläche (Summe der Grundflächen) bei Fortschritt c, für die Messung der Reduktionskurve */
  function flaeche(spend,keep){ const B=blockedSet((keep||[]).slice(0,MAXK)), G=goneSet(spend,B); return build().filter(p=>!G.has(p.i)&&!B.has(p.i)).reduce((s,p)=>s+p.a,0) }
  function gone(spend,keep){ const B=blockedSet((keep||[]).slice(0,MAXK)); return [...goneSet(spend,B)] }
  function restKat(spend,kat,keep){ return restOf(spend,kat,blockedSet((keep||[]).slice(0,MAXK))) }
  return {placed:()=>info&&info.zones||[],zonesOf,restKat,KIDS,EINH,gone,mark,markFrom,markGone,markFocus,zoneAt,crop,times,mount,stop,paint,draw,season,dayPhase,clearing,flaeche,SLOTS,DING,MOTIVE,motifOf,guessMotif,motifIcon,VW,VH,hitY,lastBuild:0,lastFrame:0,_build:build};
})();
