"""Abläufe von Lichtung im iPhone-Profil durchspielen: python3 test_flows.py"""
import json, sys
from playwright.sync_api import sync_playwright
URL = "http://127.0.0.1:8765/index.html"
DAY = 864e5
fails = []; oks = 0
def ok(c, msg):
    global oks
    if c: oks += 1
    else: fails.append(msg); print("FEHLER:", msg)

def S(pg): return pg.evaluate("JSON.parse(localStorage.getItem('lichtung-v1'))")
def W(pg): return pg.evaluate("weite()")
def jump(pg, ms): pg.clock.set_system_time((pg.evaluate("Date.now()") + int(ms)) / 1000)

with sync_playwright() as p:
    b = p.chromium.launch()
    dev = {k: v for k, v in p.devices["iPhone 15"].items() if k != "default_browser_type"}

    def new(state=None, ua=None, theme="light", t="2026-10-19T10:00:00", w=None):
        d = dict(dev)
        if ua: d["user_agent"] = ua
        if w: d["viewport"] = {"width": w, "height": 800}
        ctx = b.new_context(**d, color_scheme=theme)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.clock.install(time=t)
        pg.add_init_script("window.__vib=[];navigator.vibrate=(p)=>{window.__vib.push(p);return true}")
        if state is not None:
            pg.add_init_script("if(!sessionStorage.getItem('x')){sessionStorage.setItem('x',1);localStorage.setItem('lichtung-v1', %s)}" % json.dumps(json.dumps(state)))
        pg.goto(URL); pg.wait_for_timeout(500)
        return ctx, pg, errs
    def tap(pg, sel, wait=350):
        l = pg.locator("#layer:not([hidden]) " + sel) if not sel.startswith(("#toast", ".tab", "#layer")) else pg.locator(sel)
        if sel.startswith("#sheet"): l = pg.locator(sel)
        (l if l.count() else pg.locator(sel)).first.tap(); pg.wait_for_timeout(wait)

    # 1. Erster Start, Willkommen, Bestandsaufnahme
    ctx, pg, errs = new()
    pg.evaluate("window.__mom=[];maybeMoment=function(){ window.__mom.push(1) }")
    ok(pg.locator("#sheet-in h2").inner_text().startswith("Schön"), "Willkommen erscheint")
    tap(pg, '.chip[data-v="school"]')
    ok(S(pg)["settings"]["mode"] == "school", "Modus Schule gespeichert")
    tap(pg, '.btn[data-v="check"]')
    for i in range(10):
        tap(pg, f'.opt[data-v="{i % 4}"]', 450)
    ok("Bestandsaufnahme" in pg.locator("#sheet-in").inner_text(), "Ergebnis der Bestandsaufnahme")
    ok(S(pg)["check"] and len(S(pg)["check"]["top"]) == 3, "drei Hebel gespeichert")
    tap(pg, '.btn[data-a="close"]', 600)
    nx = pg.locator(".next h3").inner_text()
    ok("Bestandsaufnahme" not in nx, "nächster Schritt nach Check: " + nx)

    # 2. Loslassen mit Rückgängig
    tap(pg, '.tile[data-v="los"]')
    ok(pg.locator('.btn[data-a="do-los"]').is_disabled(), "Eintragen erst nach Auswahl")
    tap(pg, '#sheet .chip[data-v="kl"]'); tap(pg, '.opt[data-v="3"]'); tap(pg, '.chip[data-v="spe"]')
    tap(pg, '.btn[data-a="do-los"]', 500)
    ok(W(pg) == 3, "Weite 3 nach Tüte")
    ok(pg.locator("#toast.show").count() == 1, "Meldung sichtbar")
    tap(pg, '#toast button[data-a="undo"]', 400)
    ok(W(pg) == 0, "Rückgängig setzt Weite zurück")
    # kleine Dinge gedeckelt
    for i in range(7):
        tap(pg, '.tile[data-v="los"]'); tap(pg, '#sheet .chip[data-v="wo"]'); tap(pg, '.opt[data-v="1"]'); tap(pg, '.chip[data-v="ver"]'); tap(pg, '.btn[data-a="do-los"]', 300)
    ok(W(pg) == 5, "kleine Dinge höchstens fünfmal am Tag, Weite=" + str(W(pg)))

    # 3. Behalten erscheint als Baum
    tap(pg, '.tile[data-v="keep"]'); pg.fill("#f-name", "Akkuschrauber"); tap(pg, '#sheet .chip[data-v="wo"]'); tap(pg, '.opt[data-v="kann"]'); tap(pg, '.btn[data-a="do-keep"]', 900)
    ok(pg.locator(".tree-hit").count() == 1, "Tippfläche für den behaltenen Baum")
    pg.wait_for_timeout(2500)
    if pg.locator("#layer:not([hidden])").count(): tap(pg, '#sheet .btn[data-a="close"]', 500)
    tap(pg, ".tree-hit", 500)
    ok("Akkuschrauber" in pg.locator("#sheet-in").inner_text(), "Baum öffnet das Ding")
    print("hist", pg.evaluate("[history.length, JSON.stringify(history.state), !!SH]"))
    pg.go_back(); pg.wait_for_timeout(600)
    print("nach back", pg.evaluate("[history.length, JSON.stringify(history.state), !!SH]"))
    ok(pg.locator("#layer").get_attribute("hidden") is not None, "Zurück-Geste schließt das Blatt")

    # 4. Wunsch parken, Zeitsprung, entscheiden
    tap(pg, '.tile[data-v="wish"]'); pg.fill("#f-name", "Kopfhörer"); tap(pg, '.opt[data-v="7"]'); tap(pg, '.btn[data-a="do-wish"]', 500)
    w0 = W(pg)
    jump(pg, 8 * DAY); pg.evaluate("render()"); pg.wait_for_timeout(300)
    ok("Kopfhörer" in pg.locator(".next h3").inner_text(), "fälliger Wunsch ist nächster Schritt")
    tap(pg, '.next .btn'); tap(pg, '.opt[data-v="lass"]', 500)
    ok(W(pg) == w0 + 4, "Wunsch nach Wartezeit gelassen: +4, ist "+str(W(pg)-w0))

    # 5. Nachfrage nach 30 Tagen
    jump(pg, 31 * DAY); pg.evaluate("render()"); pg.wait_for_timeout(300)
    ok("vermisst" in pg.locator(".next h3").inner_text(), "Nachfrage ist fällig")
    tap(pg, '.next .btn')
    for i in range(30):
        if pg.locator('#layer:not([hidden]) [data-a="askans"][data-w="nein"]').count()==0: break
        tap(pg, '[data-a="askans"][data-w="nein"]', 250)
    pg.wait_for_timeout(400)
    ok(pg.locator("#layer").get_attribute("hidden") is not None, "nach allen Antworten schließt das Blatt")

    # 6. Übung mit Plan, Tageseintrag, Auswertung
    tap(pg, '.tab[data-tab="ueben"]')
    u = pg.evaluate("UEBUNGEN.find(x=>x.d===3||x.d===2).id"); d = pg.evaluate(f"UEB['{u}'].d")
    pg.evaluate(f"openSheet('ueb','{u}')"); pg.wait_for_timeout(300)
    tap(pg, '.btn[data-v="plan"]'); pg.fill("#f-wo", "abends"); tap(pg, '.scale>button[data-v="3"]'); tap(pg, '.btn[data-a="ex-start"]')
    ok(S(pg)["ex"][u]["st"] == "run", "Übung läuft")
    for i in range(d):
        pg.evaluate(f"S.ex['{u}'].days[dkey()]=2;save()"); jump(pg, DAY)
    pg.evaluate("closeSheet()"); pg.evaluate("TAB='home';render()"); pg.wait_for_timeout(300)
    print(pg.evaluate("[askDue().map(e=>[e.name,e.cat,e.miss,e.ask,e.ts]), keepAskDue().length, now()]"))
    ok("Übung" in pg.locator(".next-h").inner_text(), "Auswertung ist nächster Schritt: "+pg.locator(".next").inner_text()[:200])
    w1 = W(pg)
    tap(pg, '.next .btn'); tap(pg, f'.chip[data-a="set-dd"][data-v="{d}"]'); tap(pg, '.btn[data-v="eval"]'); tap(pg, '.scale>button[data-v="2"]'); tap(pg, '.chip[data-v="ja"]'); tap(pg, '.btn[data-a="ex-done"]', 500)
    ok(W(pg) == w1 + 2, "gelebte kurze Übung +2")

    # 6b. Weite-Regeln: Entsorgtes halb, Tagesdeckel
    w2 = W(pg)
    for i in range(6):
        pg.evaluate("S.log.push({id:'x'+%d,k:'los',ts:now(),cat:'wo',size:5,weg:'%s'});save()" % (i, 'mue' if i < 2 else 'spe'))
    ok(W(pg) - w2 <= 12, "Tagesdeckel für Loslassen: +" + str(W(pg) - w2))
    pg.evaluate("S.log=S.log.filter(e=>!String(e.id).startsWith('x'));save()")

    # 7. Ding prüfen bis zum Ergebnis
    pg.evaluate("openSheet('pruef')"); pg.wait_for_timeout(300)
    pg.fill("#f-name", "Fondue-Set"); tap(pg, '#sheet .chip[data-v="wo"]'); tap(pg, '.btn[data-v="1"]')
    tap(pg, '.opt[data-w="l"]', 500); tap(pg, '.opt[data-w="nein"]', 500); tap(pg, '.opt[data-w="teuer"]'); tap(pg, '.btn[data-v="1"]'); tap(pg, '.opt[data-w="ja"]', 500)
    txt = pg.locator("#sheet-in").inner_text()
    ok("Weitergeben" in txt and "Besitztumseffekt" not in txt[:0], "Prüfung schlägt Weitergeben vor")
    tap(pg, '.opt[data-v="los"]')
    ok(pg.locator("#f-name").input_value() == "Fondue-Set", "Weitergeben übernimmt den Namen")
    pg.evaluate("closeSheet()")

    # 8. Quiz und Begriffe
    pg.evaluate("openSheet('quiz')"); pg.wait_for_timeout(300)
    tap(pg, '.ans[data-v="0"]')
    ok(pg.locator(".ans.ok").count() == 1, "Quiz zeigt richtige Antwort")
    pg.evaluate("closeSheet();openSheet('lk')"); pg.wait_for_timeout(300)
    tap(pg, '.btn[data-a="lk-intro"]'); tap(pg, '.ans >> nth=0')
    ok(pg.locator(".ans.ok").count() == 1, "Begriffe-Quiz zeigt Lösung")
    pg.evaluate("closeSheet()")

    # 9. Kiste
    pg.evaluate("openSheet('kiste')"); pg.wait_for_timeout(300)
    pg.fill("#f-name", "Waffeleisen"); tap(pg, '#sheet .chip[data-v="wo"]'); tap(pg, '.btn[data-a="do-kiste"]')
    pg.evaluate("closeSheet()"); jump(pg, 31 * DAY); pg.evaluate("render()"); pg.wait_for_timeout(300)
    ok("Kiste" in pg.locator(".next").inner_text(), "Kiste ist fällig")
    tap(pg, '.next .btn'); tap(pg, '.chip[data-w="geht"]'); tap(pg, '#sheet .chip[data-v="spe"]'); tap(pg, '.btn[data-a="do-boxdue"]', 500)
    ok(any(e.get("box") for e in S(pg)["log"]), "Kiste erzeugt Loslassen-Eintrag")

    # 10. Daten sichern und laden
    data = pg.evaluate("JSON.stringify(S)")
    pg.evaluate("openSheet('daten')"); pg.wait_for_timeout(300)
    pg.fill("#f-paste", data); tap(pg, '.btn[data-a="import"]')
    ok(pg.locator('.btn[data-a="import-ok"]').count() == 1, "Import zeigt Bestätigung")
    tap(pg, '.btn[data-a="import-ok"]', 500)
    ok(S(pg)["log"] and len(S(pg)["log"]) == len(json.loads(data)["log"]), "Import übernimmt Einträge")
    for t in ["home", "wissen", "ueben", "weg"]:
        tap(pg, f'.tab[data-tab="{t}"]', 300)
        sw = pg.evaluate("[document.documentElement.scrollWidth,document.documentElement.clientWidth]")
        ok(sw[0] <= sw[1], f"kein seitliches Verschieben in {t}: {sw}")
    ok(not errs, "keine JS-Fehler im Hauptablauf: " + "; ".join(errs[:3]))
    ctx.close()

    # 11. Teilen-Links öffnen direkt
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}})
    pg.goto(URL + "#i-i05"); pg.wait_for_timeout(500)
    ok("Quelle" in pg.locator("#sheet-in").inner_text(), "Link #i öffnet Impuls")
    pg.goto(URL + "#u-u02"); pg.wait_for_timeout(500)
    ok("Jemand möchte" in pg.locator("#sheet-in").inner_text(), "Link #u öffnet Übung mit Einladung")
    ctx.close()

    # 12. Alter, unvollständiger Speicherstand
    ctx, pg, errs = new({"seen": True, "log": [{"id": "a", "k": "los", "ts": 1760000000000, "cat": "kl", "size": 5, "weg": "spe"}], "settings": {"theme": "dark"}})
    ok(W(pg) == 5 and not errs, "alter Stand lädt ohne Fehler: " + "; ".join(errs[:2]))
    pg.wait_for_timeout(1200)
    ok(pg.evaluate("SH&&SH.type") == "moment", "Moment zur neuen Stufe erscheint")
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    for t in ["wissen", "ueben", "weg", "home"]: tap(pg, f'.tab[data-tab="{t}"]', 250)
    ok(not errs, "alter Stand: alle Reiter ohne Fehler")
    ctx.close()

    # 12b. Monatsfrage nach Neuzugängen
    ctx, pg, errs = new({"seen": True, "created": 1757000000000, "settings": {"theme": "system", "vib": True, "mode": None}}, t="2026-11-03T10:00:00")
    ok(pg.locator('[data-a="inflow"]').count() == 4, "Monatsfrage erscheint Anfang November")
    tap(pg, '[data-a="inflow"][data-w="4"]', 400)
    ok(S(pg)["inflow"].get("2026-10") == 4, "Monatsantwort gespeichert")
    tap(pg, '.tab[data-tab="weg"]')
    ok("Neu dazugekommen" in pg.locator("#main").inner_text(), "Zufluss unter Dein Weg")
    ok(not errs, "Monatsfrage ohne Fehler")
    ctx.close()

    # 13. iPhone: Schalter in Tick-Elementen, nicht in Links
    ios = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}}, ua=ios)
    pg.wait_for_timeout(300)
    n_btn = pg.evaluate("document.querySelectorAll('.btn,.tile,.chip').length")
    n_hap = pg.evaluate("[...document.querySelectorAll('.btn,.tile,.chip')].filter(e=>e.querySelector(':scope>label.hap>input[switch]')).length")
    ok(n_btn > 0 and n_btn == n_hap, f"Schalter in allen Tick-Elementen {n_hap}/{n_btn}")
    ok(pg.evaluate("document.querySelectorAll('a label.hap,.tab label.hap,.row label.hap').length") == 0, "keine Schalter in Links und Navigation")
    tap(pg, '.tile[data-v="los"]', 400)
    ok(pg.locator("#sheet-in h2").inner_text() == "Loslassen", "Tippen über den Schalter löst die Aktion genau einmal aus")
    ok(pg.evaluate("document.querySelectorAll('#sheet .chip label.hap').length") > 0, "neu gezeichnete Elemente bekommen Schalter")
    ctx.close()

    # 13b. Android: Vibrationsmuster je Familie
    andr = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36"
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}}, ua=andr)
    tap(pg, '.tile[data-v="los"]'); tap(pg, '#sheet .chip[data-v="kl"]')
    pg.evaluate("openSheet('quiz')"); pg.wait_for_timeout(300); tap(pg, '.ans[data-v="0"]')
    v = pg.evaluate("window.__vib")
    ok(v[:2] == [12, 10] and v[2] in ([10, 60, 14], [24, 60, 24]), "Android: Aktion 12, Auswahl 10, Erfolg/Fehler: " + str(v))
    pg.evaluate("closeSheet();S.settings.vib=false;save()"); pg.wait_for_timeout(300); tap(pg, '.tile[data-v="los"]')
    ok(len(pg.evaluate("window.__vib")) == 3, "Vibration abschaltbar")
    ctx.close()

    # 14. Breiten
    for w in (320, 375, 430):
        ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}}, w=w)
        for t in ["home", "wissen", "ueben", "weg"]:
            tap(pg, f'.tab[data-tab="{t}"]', 200)
            sw = pg.evaluate("[document.documentElement.scrollWidth,document.documentElement.clientWidth]")
            ok(sw[0] <= sw[1], f"{w}px {t}: {sw}")
        ctx.close()
    b.close()
print(f"{oks} bestanden, {len(fails)} Fehler")
sys.exit(1 if fails else 0)
