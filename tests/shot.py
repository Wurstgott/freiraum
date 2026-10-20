"""Schnelle Screenshots: python3 shot.py <name> [dark|light] [state.json] [aktionen...]
Aktionen: tab:wissen  click:<css>  wait:<ms>  full  time:2026-10-19T10:00"""
import json, sys, os
from playwright.sync_api import sync_playwright
URL = os.environ.get("URL", "http://127.0.0.1:8765/index.html")
OUT = os.environ.get("SHOTS","/home/claude/lichtung/shots")
name = sys.argv[1]; theme = sys.argv[2] if len(sys.argv) > 2 else "light"
state = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "-" else None
acts = sys.argv[4:]
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    dev = p.devices["iPhone 15"]
    ctx = b.new_context(**{k: v for k, v in dev.items() if k != "default_browser_type"}, color_scheme="dark" if theme == "dark" else "light", reduced_motion="no-preference")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    t = [a for a in acts if a.startswith("time:")]
    if t: pg.clock.install(time=t[0][5:])
    st = json.load(open(state)) if state else {"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}}
    pg.add_init_script("localStorage.setItem('lichtung-v1', %s)" % json.dumps(json.dumps(st)))
    pg.goto(URL); pg.wait_for_timeout(900)
    full = False; n = 0
    for a in acts:
        if a.startswith("tab:"): pg.click(f'.tab[data-tab="{a[4:]}"]'); pg.wait_for_timeout(400)
        elif a.startswith("click:"): pg.click(a[6:]); pg.wait_for_timeout(450)
        elif a.startswith("wait:"): pg.wait_for_timeout(int(a[5:]))
        elif a == "full": full = True
        elif a.startswith("shot"):
            n += 1; pg.screenshot(path=f"{OUT}/{name}-{n}.png", full_page=full)
        elif a.startswith("fill:"):
            sel, val = a[5:].split("=", 1); pg.fill(sel, val)
        elif a.startswith("scroll:"): pg.evaluate(f"document.querySelector('#sheet-in')?document.querySelector('#sheet-in').scrollTop={a[7:]}:scrollTo(0,{a[7:]})"); pg.wait_for_timeout(200)
    if full: pg.add_style_tag(content=".tabs{position:absolute!important;bottom:0!important;top:auto!important} #app{position:relative;min-height:100vh}")
    pg.screenshot(path=f"{OUT}/{name}.png", full_page=full)
    sw = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    print("scroll", sw, "errors:", errs or "keine")
    b.close()
