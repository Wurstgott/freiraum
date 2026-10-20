"""App-Icons und Logo-Proben aus dem Logo „Ein Buch steht, eines lehnt“ (Büro H, mit Auflagen).
python3 icons.py            -> repo/icon-512.png, icon-512-maskable.png, icon-192.png, apple-touch-icon.png
python3 icons.py proben DIR -> zusätzlich Logo-Proben (PNG) und die SVG-Fassungen nach DIR

Auflagen: keine Kerbe (das lehnende Buch schneidet nichts an), klein lesbar als Bücher
(drei Bücher mit Rückenbändern statt zweier Balken, die wie „IL“ wirkten), eine Ziegelfarbe #B4472E."""
import sys, os
from playwright.sync_api import sync_playwright
BRAND, CREAM, LIGHT = "#B4472E", "#FFF4E6", "#F7C548"

def logo(size="gross", bg=BRAND, a=CREAM, b=LIGHT, rx=116, scale=None):
    """Zwei Bücher stehen, ein drittes lehnt am zweiten: ein Regalboden, auf dem wieder Platz ist.
    Rückenbänder in der Grundfarbe machen die Formen auch klein als Bücher lesbar (nicht als Buchstaben).
    size „klein“ (20–32 px) hat dieselbe Form, nur ohne die feinen Bänder des lehnenden Buchs."""
    r = f'<rect width="512" height="512" rx="{rx}" fill="{bg}"/>' if bg else ""
    band = bg or "none"
    s = scale or 1.0
    lean_band = "" if size == "klein" else f'<rect x="0" y="120" width="76" height="14" fill="{band}"/>'
    g = (f'<g transform="translate(256 256) scale({s}) translate(-256 -274)">'
         f'<rect x="92" y="120" width="82" height="260" rx="12" fill="{a}"/><rect x="92" y="246" width="82" height="16" fill="{band}"/>'
         f'<rect x="188" y="170" width="74" height="210" rx="12" fill="{a}"/><rect x="188" y="320" width="74" height="14" fill="{band}"/>'
         f'<g transform="translate(362 380) rotate(-27) translate(0 -190)"><rect x="0" y="0" width="76" height="190" rx="12" fill="{b}"/>{lean_band}</g>'
         f'<rect x="70" y="372" width="372" height="56" rx="14" fill="{a}"/></g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{r}{g}</svg>'

def render(pg, svg, px, path, bgpage="transparent"):
    pg.set_viewport_size({"width": px, "height": px})
    pg.set_content(f'<html><body style="margin:0;background:{bgpage}">{svg.replace("<svg ", f"<svg width=\"{px}\" height=\"{px}\" ", 1)}</body></html>')
    pg.screenshot(path=path, clip={"x": 0, "y": 0, "width": px, "height": px}, omit_background=bgpage == "transparent")

with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page()
    R = "/home/claude/lichtung/repo/"
    render(pg, logo("gross"), 512, R + "icon-512.png")
    render(pg, logo("gross", rx=0, scale=0.82), 512, R + "icon-512-maskable.png")
    render(pg, logo("gross"), 192, R + "icon-192.png")
    render(pg, logo("gross", rx=0), 180, R + "apple-touch-icon.png")
    if len(sys.argv) > 2 and sys.argv[1] == "proben":
        D = sys.argv[2]; os.makedirs(D, exist_ok=True)
        open(D + "/logo.svg", "w").write(logo("gross"))
        open(D + "/logo-klein.svg", "w").write(logo("klein"))
        open(D + "/logo-sw.svg", "w").write(logo("gross", bg="#111111", a="#FFFFFF", b="#FFFFFF"))
        for px in (512, 192, 60, 40):
            render(pg, logo("gross"), px, f"{D}/logo-{px}.png")
        render(pg, logo("gross", rx=0), 180, f"{D}/logo-180.png")
        for px in (32, 29, 20):
            render(pg, logo("klein"), px, f"{D}/logo-{px}.png")
    br.close()
print("Icons geschrieben")
