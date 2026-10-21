"""App-Icons und Logo-Proben aus dem Logo „Bogen“ (Runde 8, Büro K, Blindtest-Sieger).
python3 icons.py            -> repo/icon-512.png, icon-512-maskable.png, icon-192.png, apple-touch-icon.png
python3 icons.py proben DIR -> zusätzlich Logo-Proben (PNG) und die SVG-Fassungen nach DIR

Auflagen: keine Kerbe (das lehnende Buch schneidet nichts an), klein lesbar als Bücher
(drei Bücher mit Rückenbändern statt zweier Balken, die wie „IL“ wirkten), eine Ziegelfarbe #B4472E."""
import sys, os
from playwright.sync_api import sync_playwright
BRAND, CREAM, LIGHT = "#B4472E", "#FFF4E6", "#F7C548"

def logo(size="gross", bg=BRAND, a=CREAM, b=LIGHT, rx=114, scale=None):
    """Runde 8, Büro K, Entwurf A „Bogen“ (Blindtest-Sieger): ein offenes Bogenfenster, in dem auf dem Fensterbrett die Sonne aufgeht.
    rx=0 für Apple-Touch und maskierbar; scale verkleinert das Zeichen in der sicheren Zone."""
    s = scale or 1.0
    if bg == BRAND:
        defs = '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C0533A"/><stop offset="1" stop-color="#A84029"/></linearGradient></defs>'
        r = f'<rect width="512" height="512" rx="{rx}" fill="url(#bg)"/>'
    else:
        defs = ""; r = f'<rect width="512" height="512" rx="{rx}" fill="{bg}"/>' if bg else ""
    g = (f'<g transform="translate(256 256) scale({s}) translate(-256 -256)">'
         f'<path d="M164 392 V244 A92 92 0 0 1 348 244 V392" fill="none" stroke="{a}" stroke-width="40" stroke-linejoin="round"/>'
         f'<clipPath id="w"><rect x="184" y="150" width="144" height="232"/></clipPath><circle cx="256" cy="374" r="72" fill="{b}" clip-path="url(#w)"/>'
         f'<rect x="112" y="374" width="288" height="40" rx="20" fill="{a}"/></g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{defs}{r}{g}</svg>'

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
