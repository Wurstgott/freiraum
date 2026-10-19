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
for name,T in (("hell",light),("dunkel",dark)):
    for fg in ["ink","muted","faint","lit-ink","c-kl","c-wo","c-pa","c-er","c-ko","err","ok"]:
        for bg in ["g0","g2","s1","s2"]:
            r=cr(T[fg],T[bg]); 
            if r<4.5: bad+=1; print(f"{name}: {fg} auf {bg}: {r:.2f}")
    print(name,"Knopf",round(cr(T["on-ink"],T["btn"]),2))
print("unter 4.5:",bad)
