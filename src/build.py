#!/usr/bin/env python3
"""Setzt Lichtung zu einer einzigen HTML-Datei zusammen.
Ausgabe: ../repo/index.html (GitHub Pages, PWA) und ../dist/app.html (Artifact)."""
import base64, datetime, json, os, re, subprocess, sys, zoneinfo

os.chdir(os.path.dirname(os.path.abspath(__file__)))
R = lambda f: open(f, encoding="utf-8").read()
stamp = datetime.datetime.now(zoneinfo.ZoneInfo("Europe/Berlin")).strftime("%d.%m.%Y, %H:%M")

# Schriften lokal einbetten (keine Anfrage an Google)
def face(fam, file, style="normal", weight="400"):
    b = base64.b64encode(open(file, "rb").read()).decode()
    return (f"@font-face{{font-family:'{fam}';src:url(data:font/woff;base64,{b}) format('woff');"
            f"font-style:{style};font-weight:{weight};font-display:swap}}")
fonts = "\n".join([
    face("Lora", "Lora-Variable.woff", "normal", "400 700"),
    face("Lora", "Lora-Italic-Variable.woff", "italic", "400 700"),
    face("Inter", "Inter-Regular.woff", "normal", "400"),
    face("Inter", "Inter-SemiBold.woff", "normal", "600"),
])

# Inhalte: echte Dateien, fehlende Teile aus dem Platzhalter
content = [f for f in ("wissen_a.js", "wissen_b.js", "praxis.js") if os.path.exists(f)]
data = R("kern.js") + "\n" + "\n".join(R(f) for f in content)
stub = R("stub.js")
blocks = re.split(r"\n(?=var [A-Z_]+=)", stub)
for b in blocks:
    m = re.match(r"var ([A-Z_]+)=", b)
    if m and not re.search(r"\bconst " + m.group(1) + r"\s*=", data):
        data += "\n" + b
data += "\nconst IMPULSE=[...IMPULSE_A,...IMPULSE_B];const QUIZ=[...QUIZ_A,...QUIZ_B];\n"

main = R("haptik.js") + "\n" + R("bild.js") + "\n" + R("main.js")
main = main.replace("__BUILD__", stamp)

body = (R("shell.html").replace("/*FONTS*/", fonts).replace("/*CSS*/", R("style.css"))
        .replace("/*DATA*/", data).replace("/*MAIN*/", main))

# Datenprüfung mit node: bricht den Build ab, wenn Verweise nicht stimmen
chk = data + "\n" + R("../tests/datacheck.js")
p = subprocess.run(["node", "-e", chk], capture_output=True, text=True)
print(p.stdout.strip())
if p.returncode != 0:
    print(p.stderr.strip()); sys.exit("Datenprüfung fehlgeschlagen")

desc = "Weniger besitzen, besser behalten: Lichtung hilft Schritt für Schritt beim Loslassen, Warten und bewussten Behalten. Mit Wissen aus der Forschung, ohne Konto, alles bleibt auf deinem Gerät."
head = f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Lichtung</title>
<meta name="description" content="{desc}">
<meta name="author" content="Carlo Maximilian Engeländer">
<meta name="copyright" content="© Carlo Maximilian Engeländer. Alle Rechte vorbehalten.">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#EDEFE7">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#111A15">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Lichtung">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta property="og:title" content="Lichtung">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="icon-512.png">
<meta property="og:type" content="website">
</head>
<body>
"""
OUT = os.environ.get("OUT", "../repo"); os.makedirs(OUT, exist_ok=True); os.makedirs("../dist", exist_ok=True)
open(OUT + "/index.html", "w", encoding="utf-8").write(head + body + "\n</body>\n</html>\n")
# Artifact-Fassung: ohne Manifest und Icons (dort nicht vorhanden)
ahead = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n', "", head)
ahead = re.sub(r'<meta property="og:image"[^>]*>\n', "", ahead)
open("../dist/app.html", "w", encoding="utf-8").write(ahead + body + "\n</body>\n</html>\n")

manifest = {"name": "Lichtung", "short_name": "Lichtung", "lang": "de", "start_url": "./", "scope": "./",
            "display": "standalone", "background_color": "#EDEFE7", "theme_color": "#EDEFE7",
            "description": desc,
            "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                      {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                      {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
open(OUT + "/manifest.json", "w", encoding="utf-8").write(json.dumps(manifest, ensure_ascii=False, indent=1))
open(OUT + "/sw.js", "w", encoding="utf-8").write(R("sw.js").replace("__BUILD__", stamp))
size = os.path.getsize(OUT + "/index.html")
print(f"Gebaut: {stamp}, {size/1024:.0f} KB, Inhalte: {', '.join(content) or 'nur Platzhalter'}")
