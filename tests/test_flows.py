"""Abläufe von Freiraum im iPhone-Profil durchspielen: python3 test_flows.py"""
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
    tap(pg, '#sheet .chip[data-v="kl"]'); tap(pg, '#sheet .chip[data-v="kl"]')
    ok(pg.evaluate("SH.d.cat") == "kl", "zweites Antippen hebt den Bereich nicht auf")
    tap(pg, '.opt[data-v="3"]'); tap(pg, '.chip[data-v="spe"]')
    pg.evaluate("document.querySelector('#sheet-in').scrollTop=9999"); pg.evaluate("scrollTo(0,600)")
    tap(pg, '.btn[data-a="do-los"]', 1500)
    ok(W(pg) == 3, "Weite 3 nach Tüte")
    ok(pg.evaluate("scrollY") == 0, "nach dem Eintrag zurück beim Bild: " + str(pg.evaluate("scrollY")))
    ok(pg.locator("#toast.up").count() == 1, "Meldung steht oben")
    ok(pg.locator("#toast.show").count() == 1, "Meldung sichtbar")
    tap(pg, '#toast button[data-a="undo"]', 400)
    ok(W(pg) == 0, "Rückgängig setzt Weite zurück")
    # kleine Dinge gedeckelt
    for i in range(7):
        tap(pg, '.tile[data-v="los"]'); tap(pg, '#sheet .chip[data-v="wo"]'); tap(pg, '.opt[data-v="1"]'); tap(pg, '.chip[data-v="ver"]'); tap(pg, '.btn[data-a="do-los"]', 300)
    ok(W(pg) == 5, "kleine Dinge höchstens fünfmal am Tag, Weite=" + str(W(pg)))

    # 3. Behalten erscheint als Ding im Raum
    tap(pg, '.tile[data-v="keep"]'); pg.fill("#f-name", "Akkuschrauber"); tap(pg, '#sheet .chip[data-v="wo"]'); tap(pg, '.opt[data-v="kann"]'); tap(pg, '.btn[data-a="do-keep"]', 900)
    ok(pg.locator(".ding-hit").count() == 1, "Tippfläche für das behaltene Ding")
    pg.wait_for_timeout(2500)
    if pg.locator("#layer:not([hidden])").count(): tap(pg, '#sheet .btn[data-a="close"]', 500)
    tap(pg, ".ding-hit", 500)
    ok("Akkuschrauber" in pg.locator("#sheet-in").inner_text(), "Tippfläche öffnet das Ding")
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
    ok(W(pg) - w2 <= 16, "Tagesdeckel für Loslassen (16): +" + str(W(pg) - w2))
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

    # 12a. Kleine Aufgaben
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}})
    n = pg.locator(".aufg").count()
    ok(n == 3, "drei Aufgaben auf der Startseite: " + str(n))
    first = pg.evaluate("[...document.querySelectorAll('.aufg')].map(e=>e.dataset.v)")
    ok(not set(first) & {"a08","a09","a11","a12","a13","a14","a22","a23","a24","a28"}, "keine Konsum-Aufgaben auf der Startseite: " + str(first))
    once = pg.evaluate("AUFGABEN.find(a=>a.art==='einmal'&&document.querySelector('.aufg[data-v=\"'+a.id+'\"]')).id")
    w0 = W(pg); tap(pg, f'.aufg[data-v="{once}"]', 400)
    ok(W(pg) > w0, "einmalige Aufgabe bringt Weite")
    w1 = W(pg); pg.evaluate(f"A.aufg({{dataset:{{v:'{once}'}}}})"); ok(W(pg) == w1, "einmalige Aufgabe zählt nur einmal")
    pg.evaluate("for(let i=0;i<12;i++) S.log.push({id:'z'+i,k:'aufg',ts:now(),aid:AUFGABEN.filter(a=>a.art==='oft'&&!a.zu)[i].id,cat:'wo'});save()")
    ok(pg.evaluate("tally().parts.aufg") <= 6 + 3, "Tagesdeckel für Aufgaben")
    pg.evaluate("openSheet('aufgaben')"); pg.wait_for_timeout(300)
    pre = pg.evaluate("AUFGABEN.find(a=>a.art==='einmal'&&!aufDone(a.id)).id")
    w2 = W(pg); tap(pg, f'[data-a="aufg-pre"][data-v="{pre}"]', 300)
    ok(W(pg) == w2 and pg.evaluate(f"aufDone('{pre}')"), "„Hatte ich schon“ zählt keine Weite")
    ok(not errs, "Aufgaben ohne Fehler: " + "; ".join(errs[:2]))
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

    # 13c. Handbreit: Größen 1/3/6/10, Entsorgtes halb, Für wen? ergibt Tasche mit Namen
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}})
    txt = pg.locator("#main").inner_text()
    import re
    ok("Handbreit" in txt and not re.search(r"\bWeite\b", txt), "Startseite spricht von Handbreit, nicht von Weite")
    tap(pg, '.tile[data-v="los"]')
    sizes = pg.evaluate("[...document.querySelectorAll('[data-a=set-size]')].map(e=>+e.dataset.v)")
    ok(sizes == [1, 3, 6, 10], "Größen Ding/Tüte/Karton/Möbel = 1/3/6/10: " + str(sizes))
    ok(pg.locator('#sheet .wohin .chip').first.get_attribute("data-v") == "ver", "Wege zu Menschen zuerst")
    tap(pg, '.opt[data-v="6"]'); tap(pg, '.chip[data-v="ver"]'); pg.fill("#f-who", "Lena"); tap(pg, '#sheet .chip[data-v="kl"]')
    ok("6\u00a0Handbreit" in pg.locator('.btn[data-a="do-los"]').inner_text(), "Eintragen nennt die Handbreit: " + pg.locator('.btn[data-a="do-los"]').inner_text())
    tap(pg, '.btn[data-a="do-los"]', 900)
    ok(W(pg) == 6, "Karton zählt 6: " + str(W(pg)))
    ok(pg.evaluate("bagList()[0].n") == "Lena", "Tasche mit Namen Lena an der Tür")
    tap(pg, '.tile[data-v="los"]'); tap(pg, '.opt[data-v="10"]'); tap(pg, '.chip[data-v="mue"]'); tap(pg, '#sheet .chip[data-v="wo"]')
    ok(pg.locator("#f-who").count() == 0, "Für wen? nur bei Wegen zu Menschen")
    tap(pg, '.switch[data-a="set-ask"]')
    tap(pg, '.btn[data-a="do-los"]', 900)
    ok(W(pg) == 11, "Entsorgtes Möbel zählt halb (5): " + str(W(pg)))
    ok(S(pg)["log"][-1]["ask"] is None, "Nachfrage abgeschaltet speichert keine Nachfrage")
    pg.evaluate("openSheet('verlauf')"); pg.wait_for_timeout(200)
    ok("Handbreit" in pg.locator("#sheet-in").inner_text(), "Verlauf nennt Handbreit")
    pg.evaluate("closeSheet()")
    ok(pg.evaluate("STUFEN.map(s=>s.w).join()") == "0,3,8,16,28,45,70,105,150,210", "neue Schwellen")
    ok(pg.evaluate("STUFEN[9].n") == "Genug", "letzte Stufe heißt Genug")
    ok(not errs, "Handbreit ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 13d. Migration: bestehende Nutzer werden nie zurückgestuft, alte Größe 5 bleibt gültig
    old = {"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {f"stage-{n}": 1 for n in range(10)},
           "log": [{"id": f"o{i}", "k": "los", "ts": 1760000000000 + i * 864e5, "cat": "wo", "size": 5, "weg": "spe", "name": ""} for i in range(5)]}
    ctx, pg, errs = new(old)
    st = S(pg)
    ok(W(pg) == 25 and st["gv"] == 2, "alter Stand: 5 × Größe 5 = 25 Handbreit, gv 2: " + str([W(pg), st.get("gv")]))
    ok(st.get("stFloor") == 4 and pg.evaluate("stageOf(weite())") == 4, "Untergrenze aus alter Stufe 5 (Freie Ecke) bleibt: " + str([st.get("stFloor"), pg.evaluate("stageOf(weite())"), pg.evaluate("rawStage(weite())")]))
    ok("Noch 20\u00a0Handbreit" in pg.locator(".stufe-p").inner_text(), "Restmenge bis zur übernächsten Schwelle stimmt (45-25): " + pg.locator(".stufe-p").inner_text())
    ok(pg.evaluate("SH&&SH.type") != "moment", "kein Moment, keine Rückstufungs-Meldung nach der Migration")
    pg.evaluate("openSheet('verlauf')"); pg.wait_for_timeout(200)
    ok("Etwas Großes" in pg.locator("#sheet-in").inner_text() and not errs, "alte Größe 5 erscheint im Verlauf ohne Fehler")
    pg.evaluate("closeSheet()"); pg.reload(); pg.wait_for_timeout(500)
    ok(S(pg)["stFloor"] == 4 and pg.evaluate("stageOf(weite())") == 4, "Untergrenze bleibt nach erneutem Laden")
    pg.evaluate("for(let i=0;i<10;i++) S.log.push({id:'n'+i,k:'los',ts:now()-i*864e5,cat:'kl',size:10,weg:'ver'}); save()")
    ok(pg.evaluate("stageOf(weite())") == pg.evaluate("rawStage(weite())") and pg.evaluate("stageOf(weite())") >= 6, "neue Rechnung holt die Untergrenze ein")
    ctx.close()
    new2 = dict(old); new2["gv"] = 2
    ctx, pg, errs = new(new2)
    ok(not S(pg).get("stFloor") and pg.evaluate("stageOf(weite())") == 3, "Stand der neuen Fassung bekommt keine Untergrenze")
    ctx.close()

    # 13e. Bild: Tippflächen 44 px ohne Überlappung bei 320 px, Behalten leert nicht schneller als Loslassen
    st12 = {"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {f"stage-{n}": 1 for n in range(10)}, "first": 1,
            "keep": [{"id": f"k{j}", "ts": 1760000000000, "name": f"Ding {j}", "cat": ["kl","wo","pa","er","ko"][j % 5], "why": ["oft","kann","sinn","gut"][j % 4], "note": ""} for j in range(12)]}
    ctx, pg, errs = new(st12, w=320)
    R = pg.evaluate("[...document.querySelectorAll('.ding-hit')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})")
    ok(len(R) == 12 and all(r[2] >= 44 and r[3] >= 44 for r in R), "12 Tippflächen je mindestens 44 px")
    ov = [(i, j) for i in range(len(R)) for j in range(i + 1, len(R)) if R[i][0] < R[j][0] + R[j][2] - 0.5 and R[j][0] < R[i][0] + R[i][2] - 0.5 and R[i][1] < R[j][1] + R[j][3] - 0.5 and R[j][1] < R[i][1] + R[i][3] - 0.5]
    ok(not ov, "Tippflächen überlappen sich bei 320 px nicht: " + str(ov))
    cv = pg.evaluate("(()=>{const r=document.querySelector('#bild').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})()")
    ok(all(r[0] >= cv[0] - 1 and r[1] >= cv[1] - 1 and r[0] + r[2] <= cv[2] + 1 and r[1] + r[3] <= cv[3] + 1 for r in R), "Tippflächen liegen im Bild")
    k = pg.evaluate("(()=>{ const K=S.keep.map(k=>({id:k.id,cat:k.cat,why:k.why})), A=Bild.flaeche(0); return [0,4,8].map(c=>(Bild.flaeche(c)-Bild.flaeche(c,K))/A) })()")
    one = pg.evaluate("(Bild.flaeche(0)-Bild.flaeche(1))/Bild.flaeche(0)/3")
    ok(max(k) <= one, f"12 Behaltene räumen weniger als ein losgelassenes Ding: {[round(x*100,1) for x in k]} % <= {round(one*100,1)} %")
    g = pg.evaluate("(()=>{ const A=Bild.flaeche(0); return [0,1,2,3,4,5,6,7,8].map(c=>(Bild.flaeche(c)-Bild.flaeche(c+1))/A) })()")
    ok(all(0.08 <= x <= 0.14 for x in g), "jede Stufe nimmt 8–14 % der Kramfläche: " + str([round(x*100,1) for x in g]))
    ok(pg.evaluate("(()=>{ const c=document.createElement('canvas'), m={stage:3,keep:[],dark:false,date:new Date(2026,9,20,11)}; Bild.paint(c,m,300,3); const a=c.toDataURL(); Bild.paint(c,m,300,3); return a===c.toDataURL() })()"), "Bild ist deterministisch")
    ok(not errs, "Bild ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 13f. B1: Behaltenes zeigt das genannte Ding (Figurenwahl), B3: fester 10-Minuten-Einstieg
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}})
    ok(pg.locator(".next h3").inner_text().startswith("Mach die Bestandsaufnahme"), "nächster Schritt ist noch die Bestandsaufnahme")
    ok(pg.locator('.zehn[data-v="timer"]').count() == 1, "10 Minuten aufräumen steht fest auf der Startseite")
    tap(pg, '.zehn', 400)
    ok(pg.evaluate("SH&&SH.type") == "timer" and "10 Minuten aufräumen" in pg.locator("#sheet-in h2").inner_text(), "10-Minuten-Zeile öffnet den Timer")
    tap(pg, '[data-a="timer-go"]', 1300)
    ok(pg.evaluate("!!SH.d.end") and ":" in pg.locator("#uhr").inner_text(), "Timer läuft")
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(300)
    tap(pg, '.tile[data-v="keep"]')
    ok(pg.locator(".mot-b").count() == pg.evaluate("Bild.MOTIVE.length") >= 20, "alle Figuren als Kacheln angeboten")
    pg.locator("#f-name").fill("Omas Teekanne"); pg.wait_for_timeout(150)
    tap(pg, '#sheet .chip[data-v="kl"]'); tap(pg, '.opt[data-v="oft"]')
    ok(pg.locator(".mot-b.on").get_attribute("data-v") == "Teekanne", "Vorschlag aus dem Namen: Teekanne statt Pulli")
    tap(pg, '.btn[data-a="do-keep"]', 900)
    k = S(pg)["keep"][-1]
    ok(k.get("motif") == "Teekanne", "Figur am Eintrag gespeichert: " + str(k.get("motif")))
    ok(pg.evaluate("bildModel(weite(),keepers()).keep[0].motif") == "Teekanne", "Bildmodell bekommt die Figur")
    pg.wait_for_timeout(1800)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(300)
    pg.evaluate(f"openSheet('keepview','{k['id']}')"); pg.wait_for_timeout(300)
    pg.locator(".mot-d summary").tap(); pg.wait_for_timeout(200)
    tap(pg, '.mot-b[data-v="Fotoalbum"]', 300)
    ok(S(pg)["keep"][-1]["motif"] == "Fotoalbum", "Figur in der Einzelansicht änderbar")
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(300)
    tap(pg, '.tile[data-v="keep"]'); tap(pg, '#sheet .chip[data-v="pa"]'); tap(pg, '.opt[data-v="kann"]')
    ok(pg.locator(".mot-b.on").get_attribute("data-v") == "Fachbuch", "ohne Stichwort: Vorschlag nach Bereich und Grund")
    pg.evaluate("closeSheet()")
    ok(pg.evaluate("Bild.motifOf({cat:'kl',why:'oft'})") == "Pulli", "alte Einträge ohne Figur funktionieren weiter")
    ok(not errs, "Figurenwahl und Timer ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 13g. B2: Warten wird belohnt, unabhängig vom Ausgang
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}})
    for i, dec in enumerate(["kauf", "lass", "kauf"]):
        pg.evaluate(f"S.wishes.push({{id:'w{i}',name:'W{i}',cat:'ko',price:'',ts:now()-9*DAY,days:7,due:day0(now())+({0 if i<2 else 5})*DAY,st:'wait'}});save()")
    w0 = W(pg)
    pg.evaluate("openSheet('wishdec','w0')"); pg.wait_for_timeout(200)
    ok("2 Handbreit" in pg.locator('[data-v="kauf"]').inner_text(), "Bewusst kaufen nennt die 2 Handbreit fürs Warten")
    tap(pg, '.opt[data-v="kauf"]', 400)
    ok(W(pg) == w0 + 2, "bewusst kaufen nach voller Wartezeit: +2, ist +" + str(W(pg) - w0))
    pg.evaluate("openSheet('wishdec','w1')"); pg.wait_for_timeout(200); tap(pg, '.opt[data-v="lass"]', 400)
    ok(W(pg) == w0 + 6, "lassen nach voller Wartezeit: +4")
    ok("Lichtpunkt" not in pg.locator("#toast").inner_text() and "Paket" in pg.locator("#toast").inner_text(), "Meldung passt zum Bild: " + pg.locator("#toast").inner_text())
    pg.evaluate("openSheet('wishdec','w2')"); pg.wait_for_timeout(200); tap(pg, '.opt[data-v="kauf"]', 400)
    ok(W(pg) == w0 + 6, "vor Ablauf der Wartezeit entschieden: keine Handbreit")
    pg.evaluate("openSheet('handbreit')"); pg.wait_for_timeout(200)
    t = pg.locator("#sheet-in").inner_text()
    ok("ganz gleich, wie du dich danach entscheidest" in t, "Erklärblatt nennt die neue Regel")
    ok("wirklich brauchst" not in pg.content(), "keine Formulierung „wirklich brauchst“")
    pg.evaluate("closeSheet()")
    ok(not errs, "Wünsche ohne Fehler")
    ctx.close()

    # 13h. 320 px: nichts abgeschnitten, Tippflächen mindestens 44 px
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}}, w=320)
    tap(pg, '.tile[data-v="los"]')
    cut = pg.evaluate("[...document.querySelectorAll('.groesse .opt small, .groesse .opt b, .wohin .chip')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent)")
    ok(not cut, "Größen und Wege bei 320 px nicht abgeschnitten: " + str(cut))
    ok(pg.evaluate("(()=>{ const i=document.querySelector('#f-name'); const c=document.createElement('canvas').getContext('2d'); c.font=getComputedStyle(i).font; return c.measureText(i.placeholder).width <= i.clientWidth-32 })()"), "Platzhalter im Namensfeld ganz sichtbar")
    small = pg.evaluate("[...document.querySelectorAll('#sheet button, #sheet input, #sheet summary')].filter(e=>e.offsetParent&&!e.closest('label.hap')).map(e=>[e.textContent.trim().slice(0,20)||e.className,Math.round(e.getBoundingClientRect().height),Math.round(e.getBoundingClientRect().width)]).filter(x=>x[1]<44||x[2]<44)")
    ok(not small, "Tippflächen im Loslassen-Blatt ≥ 44 px: " + str(small))
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(300)
    tap(pg, '.tab[data-tab="wissen"]')
    small = pg.evaluate("[...document.querySelectorAll('#main button')].filter(e=>e.offsetParent&&!e.classList.contains('inl')).map(e=>[e.textContent.trim().slice(0,20),Math.round(e.getBoundingClientRect().height)]).filter(x=>x[1]<44)")
    ok(not small, "Tippflächen im Wissen ≥ 44 px: " + str(small))
    tap(pg, '.chipx[data-v="myth"]')
    ok(pg.locator('#main .card').count() == 0, "beim Filter Mythen kein Impuls des Tages")
    tap(pg, '.chipx[data-v="beleg"]')
    ok(pg.evaluate("[...document.querySelectorAll('#main .row[data-v=imp]')].every(b=>{const i=IMP[b.dataset.w]; return i.ev>=2&&!i.myth})") and pg.locator('#main .row[data-v="imp"]').count() > 0, "Filter Gut belegt und solide")
    tap(pg, '.tab[data-tab="home"]')
    lk = pg.evaluate("(()=>{ const a=[...document.querySelectorAll('.lnk')].find(e=>e.textContent.startsWith('Alle')); return a?a.getBoundingClientRect().height:0 })()")
    ok(0 < lk < 50, "„Alle N“ ohne Umbruch: " + str(lk))
    ok(all("+" in t for t in pg.evaluate("[...document.querySelectorAll('.aufg-m')].map(e=>e.textContent)")), "Aufgaben zeigen ihren Wert")
    ok(not errs, "320 px ohne Fehler")
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
