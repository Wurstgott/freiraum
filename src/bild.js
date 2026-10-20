/* ===== Das Hauptbild: der Raum =====
   Ein Zimmer von vorn: Wand, Fenster mit Leinenvorhang, Dielen, eine niedrige Bank,
   ein Wandbord, eine Hakenleiste, eine Tür. Regeln:
   1. Der Raum selbst ist fest. Er wird nie umgebaut, nur geleert.
   2. Unordnung ist neutral (Karton, Leinen, Grau-Blau). Sie geht in fester Reihenfolge,
      zuerst was vor dem Fenster steht, in jedem Stapel von oben nach unten.
      Stufe 0 ist voll, Stufe 9 ist leer.
   3. Farbe tragen nur Dinge mit Bedeutung: Behaltenes (Bereichsfarbe, Form = Grund),
      wartende Wünsche (gestrichelte Platzhalter vor der Tür, füllen sich mit der Wartezeit),
      Geteiltes (Beutel an der Hakenleiste).
   4. Licht wächst mit dem Fortschritt: Wand heller, Lichtfleck auf dem Boden kräftiger.
   5. Genau eine Dauerbewegung: der Vorhang atmet. */
const Bild=(function(){
  function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296 } }
  const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const mix=(a,b,t)=>{ const A=hx(a),B=hx(b); return "#"+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,"0")).join("") };
  const rgba=(h,a)=>{ const [r,g,b]=hx(h); return `rgba(${r},${g},${b},${a})` };

  const VW=354, VH=300, F=212;                   // F = Oberkante Boden
  const WIN={x:76,y:34,w:110,h:116};
  const BENCH={x0:56,x1:268,y:184};
  const SHELF={x0:206,x1:294,y:134};
  const RAIL={x0:202,x1:296,y:62};
  const DOOR={x:302,y:58,w:46};
  const REG={x0:4,x1:50,y0:30,boards:[30,75,120,165,210]};   // Regal an der linken Wand
  const MAT={x0:298,x1:352,y0:F+3,y1:F+16};                     // Fußmatte vor der Tür
  /* Freiraum je Stufe: die ersten Stufen nehmen mehr weg */
  const CST=[0,.15,.29,.41,.51,.60,.69,.79,.89,1];
  const LX=WIN.x+WIN.w+30, LY=40;                // Papierlampe
  const AREA={kl:"#D45F7E",wo:"#B8761F",pa:"#3D86C6",er:"#8A68CF",ko:"#4A9A6A"};
  const AREA_D={kl:"#F08EA6",wo:"#E7A85A",pa:"#7DB6EC",er:"#B79AF0",ko:"#7CC79A"};
  const TH={
    hell:{wall0:"#E9EAE4",wall1:"#F8F9F6",floor0:"#D9C6A6",floor1:"#EBDCC2",plank:"#C9B391",wood:"#E2CBA4",woodD:"#C7AA7E",frame:"#CDBFA8",
      sky0:"#BFDCF0",sky1:"#E8F3F8",sun:"#FFD866",curtain:"#FFFFFF",rod:"#A89D8A",
      junk:["#D3B78E","#C8AB80","#B8C2CA","#A9B5BF","#D9D2C5","#C9C0B0","#BBA99C","#A8B6AC","#C6B894","#9FA8B6"],shadow:"rgba(80,64,40,.10)",area:AREA},
    dunkel:{wall0:"#2C3642",wall1:"#3C4857",floor0:"#4A3C2F",floor1:"#5E4C3A",plank:"#3C3026",wood:"#7A6249",woodD:"#5E4A36",frame:"#5C5048",
      sky0:"#34426A",sky1:"#7E6F98",sun:"#FFCF7A",curtain:"#DCD5C6",rod:"#8C7A5E",
      junk:["#6E5F4C","#665742","#56607A","#4E5870","#6C6A72","#625C5A","#6A5A5E","#53635E","#6B6550","#525D78"],shadow:"rgba(0,0,0,.25)",area:AREA_D}
  };

  function season(dt){ const m=dt.getMonth(); return m<=1||m===11?"winter":m<=4?"fruehling":m<=7?"sommer":"herbst" }
  function dayPhase(dt){ const h=dt.getHours(); return {k:(h>=21||h<6)?"nacht":"tag"} }

  /* ---------- Unordnung: einmal deterministisch erzeugen ---------- */
  let JUNK=null;
  function junk(){
    if(JUNK) return JUNK;
    const R=mulberry(4711), P=[]; let sid=0;
    const pick=a=>a[Math.floor(R()*a.length)];
    const free=(x,y,w,h,rects)=>rects.every(r=>x+w<r[0]||x>r[0]+r[2]||y+h<r[1]||y>r[1]+r[3]);
    // a) Wand: Bilder und Zettel (meiden Fenster, Tür, Leiste, Bord, Lampe)
    const block=[[WIN.x-16,WIN.y-14,WIN.w+32,WIN.h+28],[DOOR.x-6,DOOR.y-6,DOOR.w+12,F],[RAIL.x0-4,RAIL.y-6,RAIL.x1-RAIL.x0+8,40],[SHELF.x0-4,SHELF.y-30,SHELF.x1-SHELF.x0+8,40],[BENCH.x0,BENCH.y-40,BENCH.x1-BENCH.x0,60],[LX-16,0,32,LY+14],[0,REG.y0-8,REG.x1+8,F]];
    let tries=0;
    while(P.filter(p=>p.layer==="wall").length<11&&tries<600){ tries++;
      const w=12+R()*22, h=12+R()*24, x=2+R()*(VW-w-4), y=6+R()*(F-60-h);
      if(!free(x,y,w,h,block)) continue; block.push([x-3,y-3,w+6,h+6]);
      P.push({layer:"wall",kind:R()<0.35?"zettel":"rahmen",x,y,w,h,c:pick([0,2,3,4,5,6,7,8,9]),u:R()*0.9});
    }
    // b) Wandbord voller Bücher und Dosen
    for(let x=SHELF.x0+3;x<SHELF.x1-5;){ const w=4+R()*5, h=12+R()*12;
      P.push({layer:"shelf",kind:R()<0.2?"dose":"buch",x,y:SHELF.y,w,h,c:pick([0,2,4,5,6,7,8,9]),u:R()}); x+=w+0.6 }
    // b2) Regal: jedes Brett voll
    REG.boards.slice(1).forEach(by=>{ for(let x=REG.x0+5;x<REG.x1-9;){ const w=4+R()*5, h=12+R()*14;
      P.push({layer:"regal",kind:R()<0.15?"dose":"buch",x,y:by,w,h:Math.min(h,40),c:pick([0,2,4,5,6,7,8,9]),u:R()}); x+=w+0.6 } });
    // c) Auf der Bank: Stapel
    [[86,3],[138,2],[194,3],[246,2]].forEach(([x,n])=>{ const s=sid++; let y=BENCH.y;
      for(let i=0;i<n;i++){ const w=(R()<0.5?26:20)+R()*8, h=10+R()*10, kind=R()<0.45?"karton":R()<0.5?"buecher":"kiste";
        P.push({layer:"bench",kind,x:x-w/2+(R()-0.5)*4,y:y-h,w,h,c:kind==="karton"?pick([0,1]):kind==="kiste"?pick([2,3]):pick([4,5,6,7,8]),stack:s,lvl:i,u:R()}); y-=h }
    });
    // d) Boden: Stapel in vier Tiefenreihen
    const rows=[[F+16,9,0.82],[F+36,8,0.92],[F+58,7,1.02],[F+80,5,1.12]];
    rows.forEach(([by,n,sc],ri)=>{
      for(let i=0;i<n;i++){
        const cx=(i+0.5)/n*(VW+20)-10+(R()-0.5)*18; if(cx>MAT.x0-12||cx<REG.x1-8&&ri===0) continue;
        const s=sid++, m=1+Math.floor(R()*(ri<2?3.2:2.2)); let y=by+(R()-0.5)*6;
        const base=y;
        for(let k=0;k<m;k++){
          const r0=R(); const kind=r0<0.38?"karton":r0<0.58?"kiste":r0<0.78?"tuete":r0<0.9?"buecher":"korb";
          const w=(kind==="tuete"?22:kind==="korb"?30:kind==="buecher"?24:28+R()*12)*sc, h=(kind==="tuete"?24:kind==="korb"?18:kind==="buecher"?14:18+R()*10)*sc;
          P.push({layer:"floor",kind,x:cx-w/2+(R()-0.5)*5,y:y-h,w,h,c:kind==="karton"?pick([0,1]):kind==="kiste"?pick([2,3]):pick([4,5,6,7,8,9]),stack:s,lvl:k,base,u:R()});
          y-=h; if(kind==="tuete"||kind==="korb") break;
        }
      }
    });
    // Grundreihenfolge: Rang -> gleichmäßige Schwelle t (sichtbar solange Freiraum c < t)
    [...P].sort((a,b)=>a.u-b.u).forEach((p,i,A)=>p.t=(i+1)/(A.length+1));
    // Stufenregeln: was der Stufenname verspricht, ist spätestens dann frei
    const patch=(mx,y)=>{ const k=(y-F)/(VH-F); return mx>WIN.x+4+k*52-6&&mx<WIN.x+WIN.w+14+k*90+6 };
    const st={}; P.forEach(p=>{ if(p.stack!=null)(st[p.stack]=st[p.stack]||[]).push(p) });
    // Zwei große Stapel vorn in der Mitte gehen beim ersten Schritt, damit man es sofort sieht
    const area=L=>L.reduce((a,p)=>a+p.w*p.h,0);
    const big=Object.entries(st).filter(([k,L])=>{ const b=L.find(q=>q.lvl===0); return b.layer==="floor"&&b.base>F+30&&!patch(b.x+b.w/2,b.base)&&b.x+b.w/2>REG.x1+50 })
      .sort((a,b)=>area(b[1])-area(a[1])).slice(0,3).map(e=>+e[0]);
    const capOf=p=>{ const mx=p.x+p.w/2; let c=1;
      if(big.includes(p.stack)) c=Math.min(c,CST[1]);                                       // Erster Karton
      if(p.layer==="floor"&&patch(mx,p.base)&&p.base<F+40) c=Math.min(c,CST[2]);            // Ein Stück Boden
      if(p.layer==="bench"&&mx<WIN.x+WIN.w+12) c=Math.min(c,CST[3]);                        // Fenster frei
      if(mx<REG.x1+40&&p.layer!=="regal") c=Math.min(c,CST[4]);                            // Freie Ecke
      if(p.layer==="floor"&&patch(mx,p.base)) c=Math.min(c,CST[6]);                         // Sonnenfleck
      if(p.layer==="bench"||p.layer==="shelf") c=Math.min(c,CST[7]);                        // Klare Flächen
      if(p.layer==="wall"||p.layer==="regal"||p.layer==="floor") c=Math.min(c,CST[8]);                                            // Weiter Raum
      return c };
    P.forEach(p=>{ const b=p.stack!=null?st[p.stack].find(q=>q.lvl===0):p; const cap=capOf(b);
      if(cap<1) p.t=Math.min(p.t,cap*(0.45+0.55*p.t)) });
    // Stapel: oben geht vor unten
    Object.values(st).forEach(L=>{ const us=L.map(p=>p.t).sort((a,b)=>b-a); L.sort((a,b)=>a.lvl-b.lvl).forEach((p,i)=>p.t=us[i]) });
    JUNK=P; return P;
  }

  /* ---------- Zeichenhilfen ---------- */
  function rr(g,x,y,w,h,r){ g.beginPath(); g.roundRect(x,y,w,h,r) }
  function drawJunk(g,p,T){
    const c=T.junk[p.c], d=mix(c,"#000000",0.12), l=mix(c,"#ffffff",0.18);
    const {x,y,w,h}=p;
    switch(p.kind){
      case "rahmen": g.fillStyle=T.frame; rr(g,x,y,w,h,1.5); g.fill(); g.fillStyle=l; rr(g,x+2.5,y+2.5,w-5,h-5,1); g.fill(); break;
      case "zettel": g.fillStyle=l; g.save(); g.translate(x+w/2,y+h/2); g.rotate((p.u-0.45)*0.3); rr(g,-w/2*0.7,-h/2*0.7,w*0.7,h*0.7,1); g.fill(); g.fillStyle=d; g.beginPath(); g.arc(0,-h/2*0.7+2,1.4,0,7); g.fill(); g.restore(); break;
      case "buch": g.fillStyle=c; g.fillRect(x,y-h,w,h); g.fillStyle=l; g.fillRect(x,y-h+3,w,1.5); break;
      case "dose": g.fillStyle=c; rr(g,x,y-h*0.6,w+3,h*0.6,2); g.fill(); g.fillStyle=d; g.fillRect(x,y-h*0.6,w+3,2); break;
      case "karton": g.fillStyle=c; rr(g,x,y,w,h,1.5); g.fill(); g.fillStyle=d; g.fillRect(x,y,w,Math.max(2,h*0.12)); g.fillStyle=l; g.fillRect(x+w/2-2.5,y,5,h*0.55); break;
      case "kiste": g.fillStyle=c; rr(g,x,y,w,h,2.5); g.fill(); g.fillStyle=d; for(let i=1;i<4;i++){ rr(g,x+i*w/4-2.5,y+h*0.25,5,h*0.5,2); g.fill() } break;
      case "buecher": { const n=Math.max(2,Math.round(h/4.5)), bh=h/n; for(let i=0;i<n;i++){ g.fillStyle=T.junk[(p.c+i*3)%T.junk.length]; const o=((i*7)%5-2)*1.4; rr(g,x+o+2,y+i*bh,w-4,bh-0.6,1); g.fill() } break }
      case "tuete":
        g.fillStyle=T.junk[(p.c+4)%T.junk.length]; rr(g,x+w*0.2,y,w*0.45,h*0.4,3); g.fill();
        g.fillStyle=c; rr(g,x+w*0.06,y+h*0.18,w*0.88,h*0.82,[1,1,2,2]); g.fill();
        g.fillStyle=l; g.fillRect(x+w*0.06,y+h*0.18,w*0.88,h*0.16); break;
      case "korb": g.fillStyle=c; rr(g,x,y,w,h,[2,2,6,6]); g.fill(); g.strokeStyle=d; g.lineWidth=1; for(let i=1;i<3;i++){ g.beginPath(); g.moveTo(x+2,y+i*h/3); g.lineTo(x+w-2,y+i*h/3); g.stroke() }
        g.fillStyle=l; g.beginPath(); g.ellipse(x+w*0.35,y,w*0.22,3,0,Math.PI,0); g.fill(); break;
    }
  }
  function shadow(g,cx,y,w,T){ g.fillStyle=T.shadow; g.beginPath(); g.ellipse(cx,y,w/2,Math.max(1.6,w*0.07),0,0,7); g.fill() }

  /* Behaltenes: Form = Grund, Farbe = Bereich */
  function drawKeep(g,x,by,why,col,T,s){
    g.save(); g.translate(x,by); g.scale(s,s);
    const lt=mix(col,"#ffffff",0.35);
    const gr=g.createRadialGradient(0,-10,2,0,-10,24); gr.addColorStop(0,rgba(T.sun,0.55)); gr.addColorStop(1,rgba(T.sun,0)); g.fillStyle=gr; g.beginPath(); g.arc(0,-10,24,0,7); g.fill();
    g.fillStyle=T.shadow; g.beginPath(); g.ellipse(0,0.5,11,2,0,0,7); g.fill();
    g.fillStyle=col; g.strokeStyle=col;
    if(why==="oft"){ // Becher
      rr(g,-7,-17,14,17,[1,1,4,4]); g.fill(); g.lineWidth=2.4; g.beginPath(); g.arc(7.5,-9.5,4.2,-1.3,1.3); g.stroke();
      g.fillStyle=lt; g.fillRect(-7,-17,14,2.5);
    } else if(why==="kann"){ // Buch, leicht angelehnt
      g.rotate(0.1); rr(g,-6,-27,12,27,1.5); g.fill(); g.fillStyle=lt; g.fillRect(-6,-22,12,2.2); g.fillRect(-6,-7,12,2.2);
      g.fillStyle=col; g.fillRect(2,-2,2.4,6);
    } else if(why==="sinn"){ // Vase
      g.beginPath(); g.moveTo(-3,-30); g.lineTo(3,-30); g.lineTo(3,-23); g.bezierCurveTo(11,-19,11,-2,6,0); g.lineTo(-6,0); g.bezierCurveTo(-11,-2,-11,-19,-3,-23); g.closePath(); g.fill();
      g.fillStyle=lt; g.beginPath(); g.ellipse(-3.5,-13,1.8,5,0,0,7); g.fill();
    } else { // gut: Schale mit Kugel
      g.fillStyle=lt; g.beginPath(); g.arc(0,-9,5.5,0,7); g.fill(); g.fillStyle=col;
      g.beginPath(); g.moveTo(-14,-8); g.lineTo(14,-8); g.bezierCurveTo(13,-1,6,-1,4,0); g.lineTo(-4,0); g.bezierCurveTo(-6,-1,-13,-1,-14,-8); g.closePath(); g.fill();
    }
    g.restore();
  }

  /* Plätze für Behaltenes: Bank (bis 5), Wandbord (2), Boden im Licht (5).
     Abstand mindestens 45 Einheiten, damit Tippflächen sich nie überdecken. */
  const GAP=45;
  function slots(n){
    const out=[], nb=Math.min(5,n), ns=Math.max(0,Math.min(2,n-5)), nr=Math.max(0,Math.min(5,n-7));
    for(let i=0;i<nb;i++) out.push({x:162-(nb-1)*GAP/2+i*GAP,y:BENCH.y,s:1.15,hy:15});
    for(let i=0;i<ns;i++) out.push({x:ns===1?251:228+i*46,y:SHELF.y,s:0.95,hy:13});
    const rx=(REG.x0+REG.x1)/2, ord=[120,165,75,210,30];
    for(let i=0;i<nr;i++) out.push({x:rx,y:ord[i],s:0.85,hy:12});
    return out;
  }

  /* Freiraum c (0 = Stufe 0, voll; 1 = Stufe 9, leer): linear über die Stufen */
  function clearing(m){
    if(typeof m.w==="number"&&typeof STUFEN!=="undefined"){
      const st=m.stage, a=STUFEN[st], b=STUFEN[st+1];
      if(!b) return 1;
      const f=Math.max(0,Math.min(1,(m.w-a.w)/(b.w-a.w)));
      return CST[st]+f*(CST[st+1]-CST[st]);
    }
    return Math.max(0,Math.min(1,(m.r-0.14)/0.78));
  }

  /* ---------- Die feste, zwischengespeicherte Ebene ---------- */
  function env(m){
    const dark=!!m.dark, dt=m.date||new Date(), night=!dark&&dayPhase(dt).k==="nacht";
    let T=TH[dark?"dunkel":"hell"];
    if(night) T=Object.assign({},T,{sky0:"#34406B",sky1:"#6C78A3"});
    return {dark,night,eve:dark||night,T,se:season(dt)};
  }
  function drawBase(g,m){
    const {dark,eve,T,se}=env(m), c=clearing(m);
    const P=junk(), vis=p=>c<p.t;
    // Wand
    const wall=mix(T.wall0,T.wall1,Math.pow(c,0.8));
    g.fillStyle=wall; g.fillRect(0,0,VW,F);
    // Fenster
    const sk=g.createLinearGradient(0,WIN.y,0,WIN.y+WIN.h); sk.addColorStop(0,T.sky0); sk.addColorStop(1,T.sky1);
    g.fillStyle=T.wood; rr(g,WIN.x-6,WIN.y-6,WIN.w+12,WIN.h+12,3); g.fill();
    g.fillStyle=sk; g.fillRect(WIN.x,WIN.y,WIN.w,WIN.h);
    if(eve){ g.fillStyle="#F6EED8"; g.beginPath(); g.arc(WIN.x+WIN.w-26,WIN.y+24,7,0,7); g.fill(); g.fillStyle=T.sky0; g.beginPath(); g.arc(WIN.x+WIN.w-22,WIN.y+21,6.5,0,7); g.fill();
      const R=mulberry(9); g.fillStyle="rgba(255,248,230,.7)"; for(let i=0;i<7;i++){ g.beginPath(); g.arc(WIN.x+6+R()*(WIN.w-40),WIN.y+4+R()*40,0.7+R()*0.6,0,7); g.fill() } }
    else { const sg=g.createRadialGradient(WIN.x+20,WIN.y+16,2,WIN.x+20,WIN.y+16,60); sg.addColorStop(0,"rgba(255,255,255,.9)"); sg.addColorStop(1,"rgba(255,255,255,0)"); g.fillStyle=sg; g.fillRect(WIN.x,WIN.y,WIN.w,WIN.h) }
    if(se==="winter"){ // Schnee am unteren Fensterrand und ein paar Flocken
      const R=mulberry(31); g.fillStyle=dark?"rgba(236,240,248,.85)":"#FFFFFF";
      for(let i=0;i<14;i++){ g.beginPath(); g.arc(WIN.x+4+R()*(WIN.w-8),WIN.y+8+R()*(WIN.h-24),0.8+R()*0.8,0,7); g.fill() }
      [[WIN.x,WIN.w/2-2],[WIN.x+WIN.w/2+2,WIN.w/2-2]].forEach(([x0,w])=>{ g.beginPath(); g.moveTo(x0,WIN.y+WIN.h);
        for(let k=0;k<=8;k++){ const xx=x0+k/8*w; g.lineTo(xx,WIN.y+WIN.h-4-Math.sin(k/8*Math.PI)*2.5-(k%2)*0.8) } g.lineTo(x0+w,WIN.y+WIN.h); g.closePath(); g.fill() });
    }
    g.fillStyle=T.wood; g.fillRect(WIN.x+WIN.w/2-2,WIN.y,4,WIN.h); g.fillRect(WIN.x,WIN.y+WIN.h*0.42-2,WIN.w,4);
    g.fillStyle=T.woodD; g.fillRect(WIN.x-10,WIN.y+WIN.h+5,WIN.w+20,5);
    // Lampe (Papierkugel): tags weiß, abends leuchtend
    g.strokeStyle=dark?"#141A2A":"#9C917F"; g.lineWidth=1; g.beginPath(); g.moveTo(LX,0); g.lineTo(LX,LY-12); g.stroke();
    if(eve){ const lg=g.createRadialGradient(LX,LY,4,LX,LY,70+90*c); lg.addColorStop(0,rgba(T.sun,(dark?0.45:0.35)+0.25*c)); lg.addColorStop(1,rgba(T.sun,0)); g.fillStyle=lg; g.fillRect(0,0,VW,VH) }
    g.fillStyle=eve?"#FFE9B8":"#FFFFFF"; g.beginPath(); g.ellipse(LX,LY,12,11,0,0,7); g.fill();
    g.strokeStyle=eve?"rgba(190,140,60,.5)":"rgba(150,135,110,.16)"; g.lineWidth=0.8; for(let i=-2;i<=2;i++){ g.beginPath(); g.ellipse(LX,LY+i*3.6,Math.sqrt(144-(i*3.6)**2*1.1),1.2,0,0,7); g.stroke() }
    // Tür
    g.fillStyle=T.wood; g.fillRect(DOOR.x,DOOR.y,DOOR.w,F-DOOR.y); g.fillStyle=mix(T.wood,"#ffffff",dark?0.06:0.25); rr(g,DOOR.x+6,DOOR.y+8,DOOR.w-12,F-DOOR.y-18,2); g.fill();
    g.fillStyle=T.woodD; g.beginPath(); g.arc(DOOR.x+8,DOOR.y+86,2.6,0,7); g.fill();
    // Hakenleiste
    g.fillStyle=T.wood; rr(g,RAIL.x0,RAIL.y-4,RAIL.x1-RAIL.x0,7,1.5); g.fill();
    const pegs=[]; for(let i=0;i<6;i++) pegs.push(RAIL.x0+10+i*15.6);
    g.fillStyle=T.woodD; pegs.forEach(px=>{ g.beginPath(); g.arc(px,RAIL.y,2.4,0,7); g.fill() });
    // Wandbord
    g.fillStyle=T.wood; g.fillRect(SHELF.x0,SHELF.y,SHELF.x1-SHELF.x0,4.5); g.fillStyle=T.woodD; g.fillRect(SHELF.x0+8,SHELF.y+4.5,3,7); g.fillRect(SHELF.x1-11,SHELF.y+4.5,3,7);
    // Regal an der linken Wand: fünf feste Plätze
    g.fillStyle=mix(wall,"#000000",dark?0.10:0.035); g.fillRect(REG.x0+3,REG.y0,REG.x1-REG.x0-6,F-REG.y0);
    g.fillStyle=T.woodD; g.fillRect(REG.x0,REG.y0,4,F-REG.y0+4); g.fillRect(REG.x1-4,REG.y0,4,F-REG.y0+4);
    g.fillStyle=T.wood; REG.boards.forEach(by=>{ g.fillRect(REG.x0,by,REG.x1-REG.x0,4) });
    P.filter(p=>(p.layer==="wall"||p.layer==="shelf"||p.layer==="regal")&&vis(p)).forEach(p=>drawJunk(g,p,T));
    // Geteiltes: Beutel an der Leiste
    const nS=Math.min(6,m.paths||0);
    for(let i=0;i<nS;i++){ const px=pegs[i], col=i%2?T.area.ko:mix(T.area.ko,"#ffffff",dark?0.25:0.35);
      g.strokeStyle=col; g.lineWidth=1.6; g.beginPath(); g.moveTo(px-3,RAIL.y+10); g.lineTo(px,RAIL.y+1); g.lineTo(px+3,RAIL.y+10); g.stroke();
      g.fillStyle=col; rr(g,px-5.5,RAIL.y+9,11,15,[1,1,2.5,2.5]); g.fill();
      g.fillStyle=dark?"rgba(0,0,0,.18)":"rgba(255,255,255,.45)"; g.fillRect(px-5.5,RAIL.y+14,11,2) }
    // Fußleiste und Boden
    g.fillStyle=mix(wall,"#000000",0.06); g.fillRect(0,F-5,VW,5);
    const fl=g.createLinearGradient(0,F,0,VH); fl.addColorStop(0,mix(T.floor0,T.floor1,c*0.6)); fl.addColorStop(1,mix(T.floor0,T.floor1,0.3+c*0.7)); g.fillStyle=fl; g.fillRect(0,F,VW,VH-F);
    g.strokeStyle=T.plank; g.lineWidth=0.8; g.globalAlpha=0.55;
    for(let k=1;k<12;k++){ const y=F+k*4+k*k*0.55; if(y>VH) break; g.beginPath(); g.moveTo(0,y); g.lineTo(VW,y); g.stroke() }
    g.globalAlpha=1;
    // Lichtfleck vom Fenster (tags) bzw. Lichtkreis der Lampe (abends)
    const R5=mulberry(5), nM=Math.min(12,m.motes||0), motes=[];
    if(!eve){
      const a=0.08+0.44*c; g.save();
      g.beginPath(); g.moveTo(WIN.x+4,F+1); g.lineTo(WIN.x+WIN.w+14,F+1); g.lineTo(WIN.x+WIN.w+104,VH); g.lineTo(WIN.x+56,VH); g.closePath(); g.clip();
      const pg=g.createLinearGradient(0,F,0,VH); pg.addColorStop(0,rgba(T.sun,a)); pg.addColorStop(1,rgba(T.sun,a*0.55)); g.fillStyle=pg; g.fillRect(0,F,VW,VH-F);
      g.strokeStyle=rgba("#C9A660",0.10+0.12*c); g.lineWidth=4; g.beginPath(); g.moveTo(WIN.x+WIN.w/2+9,F); g.lineTo(WIN.x+WIN.w/2+80,VH); g.stroke();
      g.lineWidth=5; g.beginPath(); g.moveTo(0,F+(VH-F)*0.36); g.lineTo(VW,F+(VH-F)*0.36); g.stroke();
      g.restore();
      for(let i=0;i<nM;i++){ const k=0.1+R5()*0.85, y=F+k*(VH-F), x0=WIN.x+4+k*52, x1=WIN.x+WIN.w+14+k*90; motes.push([x0+8+R5()*(x1-x0-16),y-R5()*60-6]) }
    } else {
      const rx=60+70*c, ry=22+20*c, pg=g.createRadialGradient(LX,F+40,4,LX,F+40,rx); pg.addColorStop(0,rgba(T.sun,(dark?0.28:0.22)+0.3*c)); pg.addColorStop(1,rgba(T.sun,0));
      g.save(); g.translate(LX,F+40); g.scale(1,ry/rx); g.translate(-LX,-F-40); g.fillStyle=pg; g.beginPath(); g.arc(LX,F+40,rx,0,7); g.fill(); g.restore();
      for(let i=0;i<nM;i++){ const a=R5()*7, q=0.2+R5()*0.75; motes.push([LX+Math.cos(a)*q*(rx-8),F+40+Math.sin(a)*q*(ry-4)-4]) }
    }
    // Fußmatte vor der Tür
    g.fillStyle=dark?"#4F5A63":"#C9C2B2"; g.beginPath(); g.moveTo(MAT.x0+4,MAT.y0); g.lineTo(MAT.x1-4,MAT.y0); g.lineTo(MAT.x1,MAT.y1); g.lineTo(MAT.x0,MAT.y1); g.closePath(); g.fill();
    g.fillStyle=T.shadow; g.fillRect(REG.x0,F,REG.x1-REG.x0,3);
    // Bank
    g.fillStyle=T.shadow; g.beginPath(); g.ellipse((BENCH.x0+BENCH.x1)/2,F+8.5,(BENCH.x1-BENCH.x0)/2,3.2,0,0,7); g.fill();
    g.fillStyle=T.woodD; g.fillRect(BENCH.x0+12,BENCH.y+5,5,F+8-BENCH.y-5); g.fillRect(BENCH.x1-17,BENCH.y+5,5,F+8-BENCH.y-5);
    g.fillStyle=T.wood; rr(g,BENCH.x0,BENCH.y,BENCH.x1-BENCH.x0,7,1.5); g.fill();
    P.filter(p=>p.layer==="bench"&&vis(p)).forEach(p=>drawJunk(g,p,T));
    // Boden-Unordnung, hinten nach vorn
    P.filter(p=>p.layer==="floor"&&vis(p)).sort((a,b)=>a.base-b.base||a.lvl-b.lvl)
      .forEach(p=>{ if(p.lvl===0) shadow(g,p.x+p.w/2,p.base+1,p.w+4,T); drawJunk(g,p,T) });
    // Wartende Wünsche: gestrichelte Platzhalter vor der Tür, füllen sich mit der Wartezeit
    const WS=(m.wishes||Array.from({length:m.seeds||0},()=>({cat:"ko",p:0.3}))).slice(0,5);
    WS.forEach((w,i)=>{ const col=T.area[w.cat]||T.area.ko, [bx,by]=[[314,F+15],[336,F+15],[314,F+38],[336,F+38],[325,F+61]][i], s=17;
      g.fillStyle=dark?rgba(T.wall0,0.7):"rgba(255,255,255,.75)"; rr(g,bx-s/2,by-s,s,s,3); g.fill();
      g.fillStyle=rgba(col,0.32); const fh=s*Math.max(0.1,Math.min(1,w.p)); rr(g,bx-s/2,by-fh,s,fh,[0,0,3,3]); g.fill();
      g.setLineDash([3,2.2]); g.strokeStyle=col; g.lineWidth=1.6; rr(g,bx-s/2,by-s,s,s,3); g.stroke(); g.setLineDash([]) });
    // Verblasste Wünsche: kleine Lichtpunkte im Licht
    motes.forEach(([x,y],i)=>{ const gr=g.createRadialGradient(x,y,0,x,y,4.5); gr.addColorStop(0,eve?"rgba(255,236,190,.95)":"rgba(255,255,255,.95)"); gr.addColorStop(0.45,rgba(T.sun,0.7)); gr.addColorStop(1,rgba(T.sun,0));
      g.fillStyle=gr; g.beginPath(); g.arc(x,y,4.5,0,7); g.fill() });
  }
  function drawTop(g,m){
    const {T}=env(m), K=(m.keep||[]).slice(0,MAXK), S=slots(K.length), hits=[];
    K.forEach((k,i)=>{ const s=S[i]; drawKeep(g,s.x,s.y,k.why,T.area[k.cat]||T.area.ko,T,s.s); hits.push({id:k.id,x:s.x,y:s.y-s.hy}) });
    return hits;
  }
  /* Der Vorhang: die eine Dauerbewegung (9 s Atemzug) */
  function curtain(g,time,eveDark){
    const br=Math.sin(time*2*Math.PI/9);
    g.strokeStyle=eveDark?TH.dunkel.rod:TH.hell.rod; g.lineWidth=1.4; g.beginPath(); g.moveTo(WIN.x-16,WIN.y-11); g.lineTo(WIN.x+WIN.w+16,WIN.y-11); g.stroke();
    g.fillStyle=rgba(eveDark?TH.dunkel.curtain:TH.hell.curtain,eveDark?0.42:0.8);
    g.beginPath(); g.moveTo(WIN.x-14,WIN.y-11); g.lineTo(WIN.x+20,WIN.y-11);
    for(let y=WIN.y-11;y<=WIN.y+WIN.h+18;y+=4){ const k=(y-WIN.y+11)/(WIN.h+29); g.lineTo(WIN.x+20+k*k*(6+5*br)+Math.sin(y*0.11+time*0.7)*1.2*k,y) }
    g.lineTo(WIN.x-14+br*2,WIN.y+WIN.h+18); g.closePath(); g.fill();
    g.strokeStyle=eveDark?"rgba(0,0,0,.25)":"rgba(191,180,162,.25)"; g.lineWidth=1;
    for(let i=0;i<4;i++){ const x=WIN.x-8+i*8; g.beginPath(); g.moveTo(x,WIN.y-9); g.quadraticCurveTo(x+2+br*1.5,WIN.y+60,x+3+br*3,WIN.y+WIN.h+16); g.stroke() }
  }
  const MAXK=12;

  /* ---------- Bühne mit Zwischenspeicher ---------- */
  let cv=null, ctx=null, cur=null, prev=null, info=null, model=null, raf=0, io=null, visible=true, fadeT0=0, ringT0=0, ringAt=null, last=0, t0=0;
  const RMq=()=>typeof RM==="function"?RM():matchMedia("(prefers-reduced-motion: reduce)").matches;
  function layer(W,H,dpr,m){
    const u=W/VW, mk=()=>{ const c=document.createElement("canvas"); c.width=Math.round(W*dpr); c.height=Math.round(H*dpr); const g=c.getContext("2d"); g.setTransform(dpr*u,0,0,dpr*u,0,0); return [c,g] };
    const [b,gb]=mk(); drawBase(gb,m);
    const [t,gt]=mk(); const hits=drawTop(gt,m);
    return {base:b,top:t,hits};
  }
  function size(){ const W=cv.clientWidth||354; return {W,H:Math.round(W*VH/VW),dpr:Math.min(3,window.devicePixelRatio||1)} }
  const cache=new Map();
  function keyOf(m,W,dpr){ const e=env(m); return JSON.stringify([W,dpr,e.dark,e.night,e.se,clearing(m).toFixed(4),m.keep,m.paths,(m.wishes||[]).map(w=>[w.cat,Math.round(w.p*10)]),m.seeds,Math.min(12,m.motes||0)]) }
  function layerFor(W,H,dpr,m){ const k=keyOf(m,W,dpr); let L=cache.get(k); if(!L){ L=layer(W,H,dpr,m); cache.set(k,L); if(cache.size>4) cache.delete(cache.keys().next().value) } return L }
  function mount(canvas,m,fromModel){
    cv=canvas; ctx=cv.getContext("2d"); model=m; m.dark=document.documentElement.dataset.dark==="1";
    const {W,H,dpr}=size(); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.height=H+"px";
    cur=layerFor(W,H,dpr,m); const u=W/VW;
    const hr=Math.min(22,GAP*u/2-0.5);
    info={hits:cur.hits.map(h=>({id:h.id,hx:h.x*u,hy:h.y*u,hr})),cx:132*u,cy:196*u,rx:96*u,ry:70*u,ph:dayPhase(m.date||new Date()),W,H};
    prev=null; fadeT0=0; ringAt=null;
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
  function loop(){ cancelAnimationFrame(raf); if(!visible||!cv||!cv.isConnected) return; raf=requestAnimationFrame(t=>{ if(t-last>=32){ last=t; frame(t) } loop() }) }
  function frame(t){
    if(!cv||!cv.isConnected){ cancelAnimationFrame(raf); return }
    const {W,dpr}=size(), u=W/VW, still=RMq();
    let k=1; if(prev){ k=fadeT0?Math.min(1,Math.max(0,(t-fadeT0)/1200)):0; if(k>=1){ prev=null; k=1 } }
    ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=1; ctx.clearRect(0,0,cv.width,cv.height);
    ctx.drawImage(cur.base,0,0);
    if(prev){ ctx.globalAlpha=1-k; ctx.drawImage(prev.base,0,0); ctx.globalAlpha=1 }
    ctx.setTransform(dpr*u,0,0,dpr*u,0,0);
    curtain(ctx,still?2:(t-t0)/1000+2,model.dark);
    ctx.setTransform(1,0,0,1,0,0);
    if(prev){ ctx.globalAlpha=k; ctx.drawImage(cur.top,0,0); ctx.globalAlpha=1-k; ctx.drawImage(prev.top,0,0); ctx.globalAlpha=1 }
    else ctx.drawImage(cur.top,0,0);
    if(ringAt){ const q=(t-ringT0)/1600; if(q>0&&q<1){ ctx.setTransform(dpr,0,0,dpr,0,0); ctx.save(); ctx.strokeStyle=model.dark?"#7FCFCB":"#11666F"; ctx.globalAlpha=Math.sin(q*Math.PI)*0.85; ctx.setLineDash([4,3.5]); ctx.lineWidth=1.6;
        ctx.beginPath(); ctx.arc(ringAt.x,ringAt.y,ringAt.r*(0.9+q*0.25),0,7); ctx.stroke(); ctx.restore() } else if(q>=1) ringAt=null }
  }
  function stop(){ cancelAnimationFrame(raf); if(io) io.disconnect(); cv=null }
  /* Standbild für Tests und Übersichten */
  function paint(canvas,m,W,time){ W=W||354; const H=Math.round(W*VH/VW), dpr=Math.min(3,window.devicePixelRatio||1);
    if(m.dark==null) m.dark=document.documentElement.dataset.dark==="1";
    canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr); canvas.style.width=W+"px"; canvas.style.height=H+"px";
    const L=layer(W,H,dpr,m), g=canvas.getContext("2d"), u=W/VW; g.drawImage(L.base,0,0); g.setTransform(dpr*u,0,0,dpr*u,0,0); curtain(g,time==null?2:time,m.dark); g.setTransform(1,0,0,1,0,0); g.drawImage(L.top,0,0);
    return L.hits.map(h=>({id:h.id,hx:h.x*u,hy:h.y*u,hr:Math.min(22,GAP*u/2-0.5)})) }
  return {mount,stop,paint,season,dayPhase,clearing};
})();
