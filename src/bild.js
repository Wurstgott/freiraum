/* ===== Das Hauptbild: die Lichtung als Radierung =====
   Regeln des Systems:
   1. Alles ist aus Strichen gezeichnet. Ton entsteht durch Strichdichte, nicht durch Flächen.
   2. Gold ist nur Licht. Es erscheint ausschließlich dort, wo Platz entstanden ist.
   3. Farbe tragen nur die bewusst behaltenen Dinge (ihre Kronen) und die Wildblumen.
   4. Eine einzige Dauerbewegung: Lichtstaub im Strahl (nachts Glühwürmchen). */
const Bild=(function(){
  function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296 } }
  function hash(s){ let h=2166136261; for(const c of String(s)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619) } return h>>>0 }
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* Bäume einmal deterministisch erzeugen (in Einheiten von 0..1) */
  let TREES=null;
  function trees(){
    if(TREES) return TREES;
    const R=mulberry(20261019), T=[];
    // Reihen von hinten nach vorn; vorn wenige große, hinten viele kleine Stämme
    const rows=[[0.395,26],[0.43,22],[0.47,19],[0.51,17],[0.55,15],[0.60,13],[0.65,12],[0.70,11],[0.76,10],[0.82,9],[0.89,6],[0.96,5],[1.04,4]];
    rows.forEach(([y,n],ri)=>{
      for(let i=0;i<n;i++){
        const x=(i+0.15+R()*0.7)/n*1.12-0.06;
        const yy=y+(R()-0.5)*0.03;
        const d=(yy-0.38)/0.66;              // Tiefe 0 hinten … 1 vorn
        const s=0.30+d*1.0;
        T.push({x,y:yy,d,s,j:0.82+R()*0.36,seed:Math.floor(R()*1e9),
          crown:0.85+R()*0.45, lean:(R()-0.5)*0.025, kind:R()<0.22?"tanne":"laub"});
      }
    });
    T.sort((a,b)=>a.y-b.y);
    TREES=T; return T;
  }

  const C={x:0.5,y:0.665};      // Mitte der Lichtung
  const RX=0.64, RY=0.31;        // größte Ausdehnung

  function season(dt){ const m=dt.getMonth(); return m<=1||m===11?"winter":m<=4?"fruehling":m<=7?"sommer":"herbst" }
  function snowDay(dt){ const m=dt.getMonth(); if(!(m<=1||(m===11&&dt.getDate()>=15))) return false;
    return hash("schnee"+dt.getFullYear()+"-"+m+"-"+dt.getDate())%3===0 }
  function dayPhase(dt){ const h=dt.getHours()+dt.getMinutes()/60;
    if(h<5||h>=22) return {k:"nacht",sun:0.5};
    const sun=Math.min(0.88,Math.max(0.12,0.12+(h-6)/14*0.76));
    return {k:(h<8||h>=19)?"daemmerung":"tag",sun} }

  /* ---------- Zeichenhilfen ---------- */
  function hatch(g,path,ang,gap,lw,col,alpha,bb,clip2){
    g.save(); g.beginPath(); path(); g.clip(); if(clip2){ g.beginPath(); clip2(); g.clip() } else if(bb){ g.beginPath(); g.rect(bb[0],bb[1],bb[2]-bb[0],bb[3]-bb[1]); g.clip() }
    g.strokeStyle=col; g.globalAlpha=alpha; g.lineWidth=lw; g.beginPath();
    const [x0,y0,x1,y1]=bb, cx=(x0+x1)/2, cy=(y0+y1)/2, L=Math.hypot(x1-x0,y1-y0)/2+2;
    const ca=Math.cos(ang), sa=Math.sin(ang);
    for(let t=-L;t<=L;t+=gap){ const px=cx-sa*t, py=cy+ca*t; g.moveTo(px-ca*L,py-sa*L); g.lineTo(px+ca*L,py+sa*L) }
    g.stroke(); g.restore();
  }
  function foliage(g,cx,cy,w,h,R,n){
    n=n||16; const pts=[];
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; const k=0.80+R()*0.32; pts.push([cx+Math.cos(a)*w*0.5*k, cy+Math.sin(a)*h*0.5*k*(a>0&&a<Math.PI?0.82:1)]) }
    return ()=>{ for(let i=0;i<=n;i++){ const p=pts[i%n], q=pts[(i+1)%n]; if(i===0){ g.moveTo(p[0],p[1]); continue }
      const mx=(pts[(i-1)%n][0]+p[0])/2, my=(pts[(i-1)%n][1]+p[1])/2, ox=mx-cx, oy=my-cy, L=Math.hypot(ox,oy)||1, b=Math.min(w,h)*0.09;
      g.quadraticCurveTo(mx+ox/L*b,my+oy/L*b,p[0],p[1]) } g.closePath() };
  }
  function blob(g,cx,cy,w,h,R,n){
    // Krone als Wolke aus Kreisen, deterministisch
    const pts=[]; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+R()*0.6; pts.push([cx+Math.cos(a)*w*0.36*(0.7+R()*0.4), cy+Math.sin(a)*h*0.34*(0.7+R()*0.4), Math.min(w,h)*(0.30+R()*0.16)]) }
    pts.push([cx,cy,Math.min(w,h)*0.42]);
    return ()=>{ pts.forEach(([x,y,r])=>{ g.moveTo(x+r,y); g.arc(x,y,r,0,Math.PI*2) }) };
  }

  /* ---------- Szene ---------- */
  function draw(g,W,H,m,opt){
    opt=opt||{};
    const u=W/354, P=m.pal, dt=m.date||new Date();
    const se=season(dt), ph=dayPhase(dt), snow=snowDay(dt);
    const r=m.r, rx=r*RX*W, ry=r*RY*H, cx=C.x*W, cy=C.y*H;
    const ink=P.ink, paper=P.paper, lit=P.lit;
    const st=m.stage;
    g.clearRect(0,0,W,H);
    g.fillStyle=paper; g.fillRect(0,0,W,H);

    // Himmel (sichtbar nur durch Lücken): leichte waagerechte Linien
    g.save(); g.strokeStyle=P.sky; g.lineWidth=0.6*u;
    for(let y=3*u;y<0.40*H;y+=3*u){ g.globalAlpha=(ph.k==="nacht"?0.55:0.20)*(1-y/(0.40*H))**0.7; g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke() } g.restore();
    if(ph.k==="nacht"){ const R=mulberry(hash("sterne"+dkeyB(dt))); g.fillStyle=P.star;
      for(let i=0;i<60;i++){ g.globalAlpha=0.4+R()*0.6; g.beginPath(); g.arc(R()*W,R()*0.36*H,(0.5+R()*0.9)*u,0,7); g.fill() } g.globalAlpha=1;
      g.strokeStyle=P.star; g.lineWidth=1*u; g.beginPath(); g.arc(W*0.62,H*0.12,7*u,0,7); g.stroke();
      hatch(g,()=>g.arc(W*0.62,H*0.12,7*u,0,7),0.3,1.6*u,0.6*u,P.star,0.6,[W*0.62-8*u,H*0.12-8*u,W*0.62+8*u,H*0.12+8*u]);
    }
    if(st>=8){ // Wolken: Bündel waagerechter Striche, wie in einer Radierung
      const R=mulberry(11); g.save(); g.strokeStyle=ink; g.lineWidth=0.7*u; g.lineCap="round";
      [[0.30,0.075,1],[0.66,0.14,0.8],[0.50,0.035,0.55]].forEach(([x,y,s])=>{
        const X=x*W, Y=y*H, w=60*u*s;
        for(let i=0;i<6;i++){ const yy=Y+i*2.4*u, f=Math.sin((i+0.6)/6.6*Math.PI), l=w*f*(0.75+R()*0.3), off=(R()-0.5)*8*u;
          g.globalAlpha=0.55-i*0.05; g.beginPath(); g.moveTo(X-l/2+off,yy); g.lineTo(X+l/2+off,yy); g.stroke() } });
      g.restore();
    }
    if(st>=9){ // Hügel am Horizont
      g.save(); g.strokeStyle=ink; g.lineWidth=0.9*u; g.globalAlpha=0.55; const y0=0.40*H;
      const hill=()=>{ g.moveTo(-5,y0); g.bezierCurveTo(W*0.2,y0-26*u,W*0.36,y0-10*u,W*0.5,y0-22*u); g.bezierCurveTo(W*0.64,y0-34*u,W*0.8,y0-6*u,W+5,y0-14*u); g.lineTo(W+5,y0+4*u); g.lineTo(-5,y0+4*u); g.closePath() };
      g.beginPath(); hill(); g.stroke(); hatch(g,()=>{hill()},-0.35,2.8*u,0.5*u,ink,0.35,[0,y0-40*u,W,y0+6*u]); g.restore();
    }

    // Boden: waagerechte Schraffur, nach vorn weiter
    const y0=0.385*H;
    g.save(); g.strokeStyle=ink; g.lineWidth=0.6*u;
    { const R=mulberry(91); let gap=1.5*u; for(let y=y0;y<H;y+=gap){ const k=(y-y0)/(H-y0); g.globalAlpha=0.16+0.22*k; g.beginPath();
      let x=-R()*20*u; while(x<W){ const l=(6+R()*26)*u*(0.5+k); g.moveTo(x,y); g.lineTo(x+l,y); x+=l+(2+R()*10)*u*(0.5+k) } g.stroke(); gap*=1.04 } }
    g.restore();

    // Licht auf dem Boden der Lichtung
    const lightCol=ph.k==="nacht"?P.moon:lit;
    const lx=cx+(ph.sun-0.5)*rx*0.25;
    function floorPath(){ g.ellipse(cx,cy,Math.max(rx,0.05*W)*0.96,Math.max(ry,0.03*H)*0.92,0,0,Math.PI*2) }
    g.save(); g.fillStyle=paper; g.beginPath(); floorPath(); g.fill(); g.restore();
    { const RX2=Math.max(rx,0.10*W), RY2=Math.max(ry,0.045*H);
      g.save(); g.globalCompositeOperation=P.dark?"lighter":"multiply"; g.translate(lx,cy); g.scale(1,RY2/RX2);
      const gr=g.createRadialGradient(0,0,0,0,0,RX2*1.05); const a=(P.dark?0.30:0.46)*(ph.k==="nacht"?0.6:1);
      gr.addColorStop(0,rgba(lightCol,a)); gr.addColorStop(0.55,rgba(lightCol,a*0.6)); gr.addColorStop(1,rgba(lightCol,0));
      g.fillStyle=gr; g.beginPath(); g.arc(0,0,RX2*1.05,0,7); g.fill(); g.restore() }
    // ganz feine Bodenlinien in der Lichtung
    hatch(g,()=>floorPath(),0,3.4*u,0.5*u,ink,0.20,[cx-rx,cy-ry,cx+rx,cy+ry]);
    if(snow){ g.save(); g.fillStyle=P.snow; g.globalAlpha=0.9; g.beginPath(); floorPath(); g.fill(); g.restore();
      const R=mulberry(hash("spur"+dkeyB(dt))); g.fillStyle=ink; g.globalAlpha=0.5; let x=cx-rx*0.7, y=cy+ry*0.3;
      for(let i=0;i<14;i++){ g.beginPath(); g.ellipse(x+(i%2?3*u:0),y,1.1*u,1.6*u,0.4,0,7); g.fill(); x+=rx*0.09; y-=ry*0.035+R()*ry*0.02 } g.globalAlpha=1 }
    if(st>=3&&!snow){ const R=mulberry(33); g.fillStyle=P.moss;
      for(let i=0;i<Math.round(260*r);i++){ const a=R()*7, q=Math.sqrt(R())*0.92; const x=cx+Math.cos(a)*rx*q, y=cy+Math.sin(a)*ry*q;
        g.globalAlpha=0.35+R()*0.4; g.beginPath(); g.arc(x,y,(0.6+R()*0.8)*u,0,7); g.fill() } g.globalAlpha=1 }
    if(st>=6){ // Tümpel
      const px=cx+rx*0.30, py=cy+ry*0.30, pw=Math.min(30*u,rx*0.28), phh=pw*0.32;
      g.save(); g.fillStyle=paper; g.beginPath(); g.ellipse(px,py,pw,phh,0,0,7); g.fill();
      g.strokeStyle=ink; g.lineWidth=0.9*u; g.globalAlpha=0.8; g.stroke(); g.restore();
      hatch(g,()=>g.ellipse(px,py,pw,phh,0,0,7),0,1.9*u,0.6*u,P.sky,0.9,[px-pw,py-phh,px+pw,py+phh]);
      g.save(); g.globalAlpha=0.6; g.strokeStyle=lit; g.lineWidth=1.2*u; g.beginPath(); g.moveTo(px-pw*0.4,py-phh*0.1); g.lineTo(px+pw*0.1,py-phh*0.1); g.stroke(); g.restore();
    }
    if(st>=7&&!snow){ // Wildblumen in den Farben der Bereiche
      const R=mulberry(77), cols=P.area;
      for(let i=0;i<Math.round(70*r);i++){ const a=R()*7, q=0.25+Math.sqrt(R())*0.65, x=cx+Math.cos(a)*rx*q, y=cy+Math.sin(a)*ry*q;
        if(st>=6&&Math.hypot((x-(cx+rx*0.30))/(rx*0.32),(y-(cy+ry*0.30))/(ry*0.22))<1.1) continue;
        g.strokeStyle=ink; g.globalAlpha=0.6; g.lineWidth=0.5*u; g.beginPath(); g.moveTo(x,y); g.lineTo(x,y-4*u); g.stroke();
        g.globalAlpha=0.95; g.fillStyle=se==="winter"?ink:cols[i%cols.length]; g.beginPath(); g.arc(x,y-4.6*u,se==="winter"?0.9*u:1.5*u,0,7); g.fill() } g.globalAlpha=1 }
    if(st>=5){ // Baumstumpf
      const sx=cx-rx*0.32, sy=cy+ry*0.12, sw=Math.max(7*u,9*u*(0.6+r*0.5)), sh=sw*0.38;
      g.save(); g.fillStyle=paper; g.beginPath(); g.rect(sx-sw,sy,sw*2,sw*0.9); g.ellipse(sx,sy+sw*0.9,sw,sh,0,0,Math.PI); g.fill(); g.restore();
      hatch(g,()=>{g.rect(sx-sw,sy,sw*2,sw*0.9)},Math.PI/2,1.5*u,0.6*u,ink,0.7,[sx-sw,sy,sx+sw,sy+sw]);
      g.save(); g.fillStyle=paper; g.strokeStyle=ink; g.lineWidth=0.8*u; g.beginPath(); g.ellipse(sx,sy,sw,sh,0,0,7); g.fill(); g.stroke();
      g.globalAlpha=0.55; for(let k=1;k<4;k++){ g.beginPath(); g.ellipse(sx,sy,sw*k/4,sh*k/4,0,0,7); g.stroke() } g.restore();
    }
    if(st>=4){ // Farne am Rand
      [[-0.92,0.30,1],[0.90,0.20,-1],[-0.70,0.70,1],[0.62,0.78,-1]].forEach(([ax,ay,dir],k)=>{
        const fx=cx+ax*rx, fy=cy+ay*ry, L=(12+6*(k%2))*u*(0.6+r*0.6);
        g.save(); g.strokeStyle=P.moss; g.lineWidth=0.8*u; g.globalAlpha=0.9;
        for(let f=0;f<3;f++){ const a=-Math.PI/2+dir*(0.25+f*0.38); g.beginPath();
          const ex=fx+Math.cos(a)*L, ey=fy+Math.sin(a)*L; g.moveTo(fx,fy); g.quadraticCurveTo(fx+Math.cos(a)*L*0.5-dir*3*u,fy+Math.sin(a)*L*0.6,ex,ey); g.stroke();
          for(let t=0.2;t<1;t+=0.12){ const px=fx+(ex-fx)*t, py=fy+(ey-fy)*t, l=(1-t)*4*u; g.beginPath(); g.moveTo(px,py); g.lineTo(px-l*0.7,py-l); g.moveTo(px,py); g.lineTo(px+l*0.7,py-l*0.6); g.stroke() } }
        g.restore(); });
    }

    // Pfad nach außen: jedes Teilen legt ein Stück
    const pathPts=[]; if(m.paths>0){ const n=Math.min(8,m.paths);
      const p0=[cx+rx*0.35,cy+ry*0.55], p1=[cx+rx*0.9+20*u,cy+ry*1.1+18*u], p2=[W*1.04,H*1.01];
      for(let i=0;i<=40*n/8;i++){ const t=i/40; const a=(1-t)*(1-t), b=2*(1-t)*t, c=t*t; pathPts.push([a*p0[0]+b*p1[0]+c*p2[0],a*p0[1]+b*p1[1]+c*p2[1],t]) } }

    // Bäume, Licht und Überhälter in der richtigen Reihenfolge
    const T=trees(), keepers=placeKeepers(m,W,H,u,rx,ry,cx,cy);
    const hits=[];
    const shaftOn=st>=2, sunX=ph.sun*W;
    let shaftDrawn=false;
    function shaft(){
      shaftDrawn=true; if(!shaftOn) return;
      g.save(); g.globalCompositeOperation=P.dark?"lighter":"multiply"; g.fillStyle=lightCol;
      const a=(P.dark?0.10:0.17)*(ph.k==="nacht"?0.5:ph.k==="daemmerung"?0.85:1)*Math.min(1,0.5+r);
      g.globalAlpha=a; g.beginPath();
      g.moveTo(sunX-rx*0.10-6*u,0); g.lineTo(sunX+rx*0.18+10*u,0); g.lineTo(lx+rx*0.62,cy+ry*0.2); g.lineTo(lx-rx*0.62,cy+ry*0.2); g.closePath(); g.fill();
      g.globalAlpha=a*0.9; g.beginPath(); g.moveTo(sunX-2*u,0); g.lineTo(sunX+rx*0.08+4*u,0); g.lineTo(lx+rx*0.28,cy+ry*0.1); g.lineTo(lx-rx*0.28,cy+ry*0.1); g.closePath(); g.fill(); g.restore();
    }
    let ki=0;
    for(const t of T){
      // Lichtung ab der Mitte: Licht vor allem, was dahinter steht
      if(!shaftDrawn&&t.y*H>cy) shaft();
      while(ki<keepers.length&&keepers[ki].y<=t.y*H){ drawKeeper(g,keepers[ki],u,P); hits.push(keepers[ki]); ki++ }
      const x=t.x*W, y=t.y*H;
      const e=Math.pow((x-cx)/Math.max(rx,1),2)+Math.pow((y-cy)/Math.max(ry*(y>cy?1.7:1.35),1),2);
      const backWall=y<0.47*H&&!(st>=9&&Math.abs(x-cx)<0.15*W);
      if(e<t.j*t.j&&!backWall) continue;
      if(keepers.some(k=>Math.abs(k.x-x)<k.w*0.9&&Math.abs(k.y-y)<9*u)) continue;
      if(keepers.some(k=>y>k.y-4*u&&y<k.y+0.32*H&&Math.abs(k.x-x)<k.w*1.1+5*u)) continue;
      if(st>=1&&y>cy&&Math.abs(x-cx)<0.07*W) continue;
      if(pathPts.some(p=>Math.abs(p[0]-x)<(6+t.s*7)*u&&Math.abs(p[1]-y)<(5+t.s*5)*u)) continue;
      drawTree(g,t,x,y,W,H,u,P,se,ph);
    }
    if(!shaftDrawn) shaft();
    while(ki<keepers.length){ drawKeeper(g,keepers[ki],u,P); hits.push(keepers[ki]); ki++ }

    // Pfad selbst
    if(pathPts.length>1){ g.save(); g.strokeStyle=ink; g.lineWidth=0.7*u;
      for(const side of [-1,1]){ g.globalAlpha=0.45; g.setLineDash([3*u,2.5*u]); g.beginPath(); pathPts.forEach(([x,y,t],i)=>{ const w=(1.8+t*6)*u*side; i?g.lineTo(x,y+w):g.moveTo(x,y+w) }); g.stroke() }
      g.setLineDash([]); g.fillStyle=paper; pathPts.forEach(([x,y,t],i)=>{ if(i%3) return; const w=(1.2+t*3.2)*u; g.globalAlpha=0.9; g.beginPath(); g.ellipse(x,y,w*1.3,w*0.6,0,0,7); g.fill(); g.globalAlpha=0.7; g.stroke() }); g.restore() }

    // Keimlinge am Rand: wartende Wünsche
    for(let i=0;i<Math.min(9,m.seeds);i++){ const a=Math.PI*(0.62+i*0.075), sx=cx+Math.cos(a)*rx*1.02, sy=cy+Math.sin(a)*ry*1.02+4*u;
      g.save(); g.strokeStyle=ink; g.lineWidth=0.9*u; g.globalAlpha=0.85; g.beginPath(); g.moveTo(sx,sy); g.lineTo(sx,sy-7*u);
      g.moveTo(sx,sy-5*u); g.quadraticCurveTo(sx-4*u,sy-8*u,sx-5*u,sy-5*u); g.moveTo(sx,sy-6*u); g.quadraticCurveTo(sx+4*u,sy-10*u,sx+5*u,sy-7*u); g.stroke();
      g.globalAlpha=0.6; g.beginPath(); g.ellipse(sx,sy,3*u,1*u,0,0,7); g.stroke(); g.restore() }

    // Rahmenlinie unten, damit das Bild „steht“
    g.save(); g.strokeStyle=ink; g.globalAlpha=0.5; g.lineWidth=1*u; g.beginPath(); g.moveTo(0,H-0.5); g.lineTo(W,H-0.5); g.stroke(); g.restore();
    return {hits, shaft:{sunX,lx,cy,rx,ry,on:shaftOn,col:lightCol}, cx, cy, rx, ry, ph};
  }

  function drawTree(g,t,x,y,W,H,u,P,se,ph){
    const R=mulberry(t.seed), ink=P.ink, paper=P.paper;
    const th=(0.12+1.0*Math.pow(t.d,1.5))*H, tw=(0.7+t.d*5.2)*u, top=y-th;
    const lean=t.lean*W;
    const alpha=0.42+t.d*0.5;
    const winter=se==="winter";
    // Stamm: Papier füllen (verdeckt Dahinterliegendes), dann Striche
    const trunk=()=>{ g.moveTo(x-tw,y); g.lineTo(x-tw*0.45+lean,top+th*0.25); g.lineTo(x+tw*0.45+lean,top+th*0.25); g.lineTo(x+tw,y); g.closePath() };
    g.save(); g.fillStyle=paper; g.beginPath(); trunk(); g.fill(); g.restore();
    g.save(); g.strokeStyle=ink; g.globalAlpha=alpha; g.lineWidth=Math.max(0.5,0.45+t.d*0.55)*u;
    g.beginPath(); g.moveTo(x-tw,y); g.lineTo(x-tw*0.45+lean,top+th*0.25); g.moveTo(x+tw,y); g.lineTo(x+tw*0.45+lean,top+th*0.25); g.stroke(); g.restore();
    const shadeRight=ph.sun<0.5;
    hatch(g,()=>{ if(shadeRight){ g.moveTo(x,y); g.lineTo(x+lean,top+th*0.25); g.lineTo(x+tw*0.45+lean,top+th*0.25); g.lineTo(x+tw,y) } else { g.moveTo(x-tw,y); g.lineTo(x-tw*0.45+lean,top+th*0.25); g.lineTo(x+lean,top+th*0.25); g.lineTo(x,y) } g.closePath() },
      Math.PI/2+0.05,(1.3+ (1-t.d)*0.8)*u,0.5*u,ink,alpha*0.9,[x-tw,top,x+tw,y]);
    // Krone
    const cw=(0.06+0.24*t.d)*W*t.crown, ch=(0.075+0.26*t.d)*H*t.crown, ccx=x+lean*1.1, ccy=top+ch*0.15;
    if(t.kind==="tanne"){
      const tri=()=>{ g.moveTo(ccx,ccy-ch*0.75); g.lineTo(ccx+cw*0.42,ccy+ch*0.55); g.lineTo(ccx-cw*0.42,ccy+ch*0.55); g.closePath() };
      g.save(); g.fillStyle=paper; g.beginPath(); tri(); g.fill(); g.restore();
      const gap=(winter?2.6:1.7+(1-t.d)*1.0)*u;
      hatch(g,tri,-0.55,gap,(0.45+t.d*0.4)*u,ink,alpha,[ccx-cw,ccy-ch,ccx+cw,ccy+ch]);
      hatch(g,()=>{ g.moveTo(ccx,ccy-ch*0.75); g.lineTo(ccx+(shadeRight?1:-1)*cw*0.42,ccy+ch*0.55); g.lineTo(ccx,ccy+ch*0.55); g.closePath() },0.6,gap*1.1,(0.4+t.d*0.35)*u,ink,alpha*0.8,[ccx-cw,ccy-ch,ccx+cw,ccy+ch]);
      g.save(); g.strokeStyle=ink; g.globalAlpha=alpha*0.6; g.lineWidth=0.5*u; g.beginPath(); tri(); g.stroke(); g.restore();
      if(winter&&P.snowCaps){ g.save(); g.strokeStyle=P.snow; g.lineWidth=1.4*u; g.globalAlpha=0.9; g.beginPath(); g.moveTo(ccx-cw*0.25,ccy-ch*0.1); g.lineTo(ccx,ccy-ch*0.6); g.lineTo(ccx+cw*0.25,ccy-ch*0.1); g.stroke(); g.restore() }
      return;
    }
    if(winter){ // kahle Zweige
      g.save(); g.strokeStyle=ink; g.globalAlpha=alpha*0.85; g.lineWidth=(0.4+t.d*0.4)*u; g.beginPath();
      const br=(sx,sy,a,l,dep)=>{ const ex=sx+Math.cos(a)*l, ey=sy+Math.sin(a)*l; g.moveTo(sx,sy); g.lineTo(ex,ey); if(dep>0){ br(ex,ey,a-0.45-R()*0.2,l*0.68,dep-1); br(ex,ey,a+0.45+R()*0.2,l*0.68,dep-1) } };
      br(x+lean,top+th*0.25,-Math.PI/2,ch*0.42,4); g.stroke(); g.restore();
      return;
    }
    // Laubkrone aus zwei bis drei Lappen, hinten nach vorn
    const lobes=[[0,0,1]];
    if(R()<0.75) lobes.unshift([-(0.28+R()*0.12),0.18+R()*0.1,0.62+R()*0.15]);
    if(R()<0.6) lobes.unshift([0.30+R()*0.1,0.12+R()*0.12,0.58+R()*0.15]);
    const a0=-0.85+(R()-0.5)*0.3, gap=(1.9+(1-t.d)*1.6)*u, lw=(0.42+t.d*0.38)*u, al=0.30+t.d*0.52;
    lobes.forEach(([ox,oy,k])=>{
      const w=cw*k, h=ch*k, lx=ccx+ox*cw, ly=ccy+oy*ch, f=foliage(g,lx,ly,w,h,R,14);
      g.save(); g.fillStyle=paper; g.beginPath(); f(); g.fill(); g.restore();
      hatch(g,f,a0,gap,lw,ink,al,[lx-w,ly-h,lx+w,ly+h]);
      const sd=shadeRight?1:-1, bbx=[lx-w,ly-h,lx+w,ly+h];
      hatch(g,f,a0+1.35,gap*1.15,lw*0.9,ink,al*0.8,bbx,()=>g.ellipse(lx+sd*w*0.62,ly+h*0.22,w*0.62,h*0.62,0,0,7));
      hatch(g,f,a0+0.7,gap*0.9,lw*0.8,ink,al*0.7,bbx,()=>g.ellipse(lx+sd*w*0.25,ly+h*0.78,w*0.7,h*0.5,0,0,7));
      g.save(); g.strokeStyle=ink; g.globalAlpha=al*0.75; g.lineWidth=lw; g.beginPath(); f(); g.stroke(); g.restore();
    });
    if(se==="herbst"&&R()<0.45){ g.save(); g.strokeStyle=P.leaf; g.lineWidth=(0.8+t.d*0.6)*u; g.lineCap="round";
      for(let i=0;i<7;i++){ g.globalAlpha=0.7+R()*0.3; const a=R()*7, q=Math.sqrt(R())*0.42, px=ccx+Math.cos(a)*cw*q, py=ccy+Math.sin(a)*ch*q*0.8; g.beginPath(); g.moveTo(px,py); g.lineTo(px+1.6*u,py+1.1*u); g.stroke() } g.restore() }
    if(se==="fruehling"&&R()<0.25){ g.save(); g.fillStyle=P.blossom; for(let i=0;i<9;i++){ g.globalAlpha=0.9; const a=R()*7, q=Math.sqrt(R())*0.42; g.beginPath(); g.arc(ccx+Math.cos(a)*cw*q,ccy+Math.sin(a)*ch*q*0.8,(0.6+t.d*0.6)*u,0,7); g.fill() } g.restore() }
  }

  /* Bewusst behaltene Dinge: einzelne Bäume in der Lichtung, Krone in der Farbe des Bereichs */
  function placeKeepers(m,W,H,u,rx,ry,cx,cy){
    const K=m.keep||[], out=[];
    const n=K.length; if(!n) return out;
    const rrx=Math.max(rx,(0.20+0.03*n)*RX*W), rry=Math.max(ry,(0.20+0.03*n)*RY*H);
    K.forEach((k,i)=>{
      const a=i*2.39996+0.6, q=0.30+0.52*Math.sqrt((i+0.5)/MAXKEEP);
      const x=cx+Math.cos(a)*rrx*q*0.95, y=cy+Math.sin(a)*rry*q*0.85;
      const d=Math.max(0,(y/H-0.38)/0.66), s=0.42+d*0.75;
      out.push({id:k.id,cat:k.cat,why:k.why,x,y,s,w:(0.035+0.07*d)*W,h:(0.13+0.30*d)*H,fresh:k.fresh});
    });
    return out.sort((a,b)=>a.y-b.y);
  }
  function drawKeeper(g,k,u,P){
    const col=P.areaMap[k.cat]||P.ink, ink=P.ink, paper=P.paper;
    const x=k.x, y=k.y, th=k.h, tw=(1.2+k.s*3.2)*u, top=y-th;
    // Schatten am Boden
    g.save(); g.globalAlpha=0.25; g.fillStyle=ink; g.beginPath(); g.ellipse(x,y+1*u,k.w*0.7,2.5*u*k.s,0,0,7); g.fill(); g.restore();
    const trunk=()=>{ g.moveTo(x-tw,y); g.lineTo(x-tw*0.5,top+th*0.3); g.lineTo(x+tw*0.5,top+th*0.3); g.lineTo(x+tw,y); g.closePath() };
    g.save(); g.fillStyle=paper; g.beginPath(); trunk(); g.fill(); g.strokeStyle=ink; g.lineWidth=0.8*u; g.stroke(); g.restore();
    if(k.why==="gut"){ // Birke: helle Rinde mit Querstrichen
      g.save(); g.strokeStyle=ink; g.lineWidth=0.8*u; for(let yy=y-4*u;yy>top+th*0.32;yy-=5*u){ g.beginPath(); g.moveTo(x-tw*0.6,yy); g.lineTo(x+tw*0.2,yy-1*u); g.stroke() } g.restore();
    } else hatch(g,trunk,Math.PI/2,1.4*u,0.5*u,ink,0.6,[x-tw,top,x+tw,y]);
    const cw=k.w*(k.why==="sinn"?2.6:k.why==="kann"?1.3:k.why==="gut"?1.7:2.0), ch=th*(k.why==="kann"?0.62:0.46), ccy=top+ch*0.25;
    const R=mulberry(hash(k.id));
    const shape=k.why==="kann"?()=>{ g.moveTo(x,ccy-ch*0.65); g.lineTo(x+cw*0.5,ccy+ch*0.5); g.lineTo(x-cw*0.5,ccy+ch*0.5); g.closePath() }
      : foliage(g,x,ccy,cw,ch,R,k.why==="sinn"?18:14);
    g.save(); g.fillStyle=paper; g.beginPath(); shape(); g.fill(); g.restore();
    hatch(g,shape,-0.8,1.7*u,0.8*u,col,0.95,[x-cw,ccy-ch,x+cw,ccy+ch]);
    hatch(g,shape,0.55,2.1*u,0.55*u,col,0.7,[x-cw,ccy-ch,x+cw,ccy+ch],()=>g.ellipse(x+cw*0.3,ccy+ch*0.3,cw*0.55,ch*0.5,0,0,7));
    g.save(); g.strokeStyle=col; g.lineWidth=0.8*u; g.globalAlpha=0.9; g.beginPath(); shape(); g.stroke(); g.restore();
    k.hx=x; k.hy=ccy; k.hr=Math.max(cw*0.5,ch*0.45,20*u);
  }
  function rgba(hex,a){ const h=hex.replace('#',''); const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})` }
  function dkeyB(d){ return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate() }

  /* ---------- Bühne mit Zwischenspeicher und der einen Dauerbewegung ---------- */
  let cv=null, ctx=null, base=null, prev=null, info=null, model=null, raf=0, io=null, visible=true, fadeT0=0, ringT0=0, ringAt=null, last=0, motes=[], reh=null;
  function pal(){
    const dark=document.documentElement.dataset.dark==="1";
    const ar=["kl","wo","pa","er","ko"].map(id=>css("--c-"+id));
    return {dark,ink:css("--img-ink"),paper:css("--img-paper"),lit:css("--lit"),sky:css("--img-sky"),moon:css("--img-moon"),star:css("--img-star"),
      moss:css("--c-ko"),leaf:css("--c-wo"),blossom:css("--img-blossom"),snow:css("--img-snow"),snowCaps:true,area:ar,
      areaMap:Object.fromEntries(["kl","wo","pa","er","ko"].map((id,i)=>[id,ar[i]]))};
  }
  function makeLayer(W,H,dpr,m){
    const c=document.createElement("canvas"); c.width=Math.round(W*dpr); c.height=Math.round(H*dpr);
    const g=c.getContext("2d"); g.setTransform(dpr,0,0,dpr,0,0); const inf=draw(g,W,H,m); return {c,inf};
  }
  function size(){ const W=cv.clientWidth||354, H=Math.round(W*0.82); return {W,H,dpr:Math.min(3,window.devicePixelRatio||1)} }
  const cache=new Map();
  function keyOf(m,W,dpr){ const d=m.date||new Date(); return JSON.stringify([W,dpr,m.pal.dark,m.pal.ink,m.r.toFixed(4),m.stage,m.keep,m.paths,m.seeds,season(d),dayPhase(d).k,Math.round(dayPhase(d).sun*20),d.getMonth(),d.getDate()]) }
  function layerFor(W,H,dpr,m){ const k=keyOf(m,W,dpr); let L=cache.get(k); if(!L){ L=makeLayer(W,H,dpr,m); cache.set(k,L); if(cache.size>4) cache.delete(cache.keys().next().value) } return L }
  function mount(canvas,m,fromModel){
    cv=canvas; ctx=cv.getContext("2d"); model=m; m.pal=pal();
    const {W,H,dpr}=size(); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.height=H+"px";
    const L=layerFor(W,H,dpr,m); base=L.c; info=L.inf;
    prev=null; fadeT0=0; ringAt=null;
    if(fromModel&&!RM()){ fromModel.pal=m.pal; prev=layerFor(W,H,dpr,fromModel).c; fadeT0=performance.now()+250 }
    if(m.ringKeep&&!RM()){ const hk=info.hits.find(x=>x.id===m.ringKeep); if(hk) ringAt={x:hk.hx,y:hk.hy,r:hk.hr} }
    else if(m.ringStage&&!RM()) ringAt={x:info.cx,y:info.cy,r:Math.max(info.rx,info.ry)*0.8};
    if(ringAt) ringT0=performance.now()+(prev?1800:300);
    initMotes(W,H);
    initReh(m);
    if(io) io.disconnect();
    io=new IntersectionObserver(es=>{ visible=es[0].isIntersecting; if(visible) loop() },{threshold:0}); io.observe(cv);
    cancelAnimationFrame(raf); last=0; frame(performance.now());
    if(!RM()) loop();
    return info;
  }
  function initMotes(W,H){
    const n=Math.min(40,5+(model.motes||0)), R=mulberry(5);
    motes=Array.from({length:n},(_,i)=>({a:R(),b:R(),sp:0.4+R()*0.8,ph:R()*7,sz:0.7+R()*1.1}));
  }
  function initReh(m){
    reh=null; if(RM()||!m.reh) return;
    reh={t0:performance.now()+1500,dur:20000};
  }
  function loop(){ cancelAnimationFrame(raf); if(!visible||!cv||!cv.isConnected) return; raf=requestAnimationFrame(t=>{ if(t-last>=32){ last=t; frame(t) } loop() }) }
  function frame(t){
    if(!cv||!cv.isConnected){ cancelAnimationFrame(raf); return }
    const {W,H,dpr}=size(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);
    ctx.drawImage(base,0,0);
    if(prev){ const k=fadeT0?Math.min(1,Math.max(0,(t-fadeT0)/1200)):0; if(k<1){ ctx.globalAlpha=1-k; ctx.drawImage(prev,0,0); ctx.globalAlpha=1 } else prev=null }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const u=W/354, sh=info.shaft, night=info.ph.k==="nacht";
    // Lichtstaub
    const st=model.stage;
    for(const m of motes){
      const tt=RM()?0:t/1000;
      let x,y;
      if(night){ // Glühwürmchen über der Lichtung
        x=info.cx+(m.a-0.5)*info.rx*1.6+Math.sin(tt*m.sp*0.6+m.ph)*8*u; y=info.cy-(m.b*0.8)*info.ry*1.4+Math.cos(tt*m.sp*0.5+m.ph)*5*u;
      } else {
        const yy=((m.b+tt*0.012*m.sp)%1); const top=st>=2?0.05*H:info.cy-30*u;
        y=top+(info.cy+info.ry*0.1-top)*yy; const k=(y-0)/(info.cy);
        const half=st>=2?(sh.rx*0.10+(sh.rx*0.55)*k):Math.max(8*u,info.rx*0.4);
        const mid=st>=2?sh.sunX+(sh.lx-sh.sunX)*k:info.cx;
        x=mid+(m.a-0.5)*2*half*0.8+Math.sin(tt*m.sp+m.ph)*3*u;
      }
      const fl=0.55+0.45*Math.sin((RM()?0:t/700)*m.sp+m.ph);
      ctx.globalAlpha=(night?0.9:0.75)*fl; ctx.fillStyle=night?model.pal.lit:model.pal.lit;
      ctx.beginPath(); ctx.arc(x,y,m.sz*u*(night?1.2:1),0,7); ctx.fill();
    }
    ctx.globalAlpha=1;
    if(reh) drawReh(t,u);
    if(ringAt){ const k=(t-ringT0)/1600; if(k>0&&k<1){ ctx.save(); ctx.strokeStyle=model.pal.ink; ctx.globalAlpha=Math.sin(k*Math.PI)*0.8; ctx.setLineDash([3*u,3*u]); ctx.lineWidth=1*u;
        ctx.beginPath(); ctx.arc(ringAt.x,ringAt.y,ringAt.r*(0.9+k*0.25),0,7); ctx.stroke(); ctx.restore() } else if(k>=1) ringAt=null }
  }
  function drawReh(t,u){
    const k=(t-reh.t0)/reh.dur; if(k<0||k>1){ if(k>1) reh=null; return }
    const a=k<0.1?k/0.1:k>0.85?(1-k)/0.15:1;
    const x=info.cx-info.rx*0.86, y=info.cy-info.ry*0.35, s=0.9*u;
    ctx.save(); ctx.globalAlpha=a*0.9; ctx.strokeStyle=model.pal.ink; ctx.fillStyle=model.pal.ink; ctx.lineWidth=0.9*u;
    ctx.beginPath(); ctx.ellipse(x,y,9*s,4.5*s,-0.05,0,7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+6*s,y-2*s); ctx.lineTo(x+10*s,y-11*s); ctx.lineTo(x+13*s,y-10*s); ctx.lineTo(x+9*s,y-1*s); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+13*s,y-11*s,3.6*s,2.2*s,0.3,0,7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+11.5*s,y-13*s); ctx.lineTo(x+10*s,y-17*s); ctx.moveTo(x+13*s,y-13*s); ctx.lineTo(x+13.5*s,y-17*s); ctx.stroke();
    [[-6,0],[-4,0.5],[5,0],[7,0.5]].forEach(([dx])=>{ ctx.beginPath(); ctx.moveTo(x+dx*s,y+2*s); ctx.lineTo(x+dx*s,y+11*s); ctx.stroke() });
    ctx.restore();
  }
  function stop(){ cancelAnimationFrame(raf); if(io) io.disconnect(); cv=null }
  return {mount,stop,draw,season,dayPhase};
})();
