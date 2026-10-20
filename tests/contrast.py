"""Kontraste der Farbtokens in style.css prüfen (Hell und Dunkel)."""
import re
css=open('/home/claude/lichtung/src/style.css').read()
def tok(block):
    return dict(re.findall(r'--([\w-]+):(#[0-9A-Fa-f]{6})',block))
light=tok(css.split('@media')[0]); dark=tok(css[css.index(':root[data-theme="dark"]'):])
def lum(h):
    c=[int(h[i:i+2],16)/255 for i in (1,3,5)]; c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b): la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
bad=0
def need(name,T,fg,bg,lim):
    global bad
    r=cr(T[fg],T[bg])
    if r<lim: bad+=1; print(f"{name}: {fg} auf {bg}: {r:.2f} < {lim}")
for name,T in (("hell",light),("dunkel",dark)):
    # Text
    for fg in ["ink","muted","faint","sun-ink","err","ok","brand-ink"]:
        for bg in ["bg","surface","surface2","sel"]:
            need(name,T,fg,bg,4.5)
    for fg in ["ink","sun-ink"]: need(name,T,fg,"sun-soft",4.5)
    need(name,T,"done-ink","done",4.5); need(name,T,"ink","done",4.5); need(name,T,"muted","done",4.5)
    need(name,T,"on-primary","primary",4.5); need(name,T,"on-toast","toast",4.5); need(name,T,"ink","surface2",4.5); need(name,T,"muted","surface2",4.5)
    # Grafik (Punkte, Kanten der Auswahl): mindestens 3:1
    for fg in ["c-kl","c-wo","c-pa","c-er","c-ko","primary"]:
        for bg in ["bg","surface"]:
            need(name,T,fg,bg,3.0)
    print(name,"Hauptknopf",round(cr(T["on-primary"],T["primary"]),2),"Lichtfläche",round(cr(T["sun-ink"],T["sun-soft"]),2),"Erledigt",round(cr(T["done-ink"],T["done"]),2))
print("Verstöße:",bad)
