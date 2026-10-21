"""Abläufe von Freiraum im iPhone-Profil durchspielen: python3 test_flows.py"""
import json, sys, re
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
    ok(pg.locator("#toast.up").count() == 0, "Meldung steht auf der Startseite unten, nicht über dem Bild")
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
    n_btn = pg.evaluate("[...document.querySelectorAll('.btn,.tile,.chip')].filter(e=>!quietTap(e)).length")
    n_hap = pg.evaluate("[...document.querySelectorAll('.btn,.tile,.chip')].filter(e=>!quietTap(e)&&e.querySelector(':scope>label.hap>input[switch]')).length")
    ok(pg.evaluate("document.querySelector('.tile[data-v=\"los\"] label.hap')") is None, "Öffnen des Loslassen-Formulars tickt nicht")
    ok(n_btn > 0 and n_btn == n_hap, f"Schalter in allen Tick-Elementen {n_hap}/{n_btn}")
    ok(pg.evaluate("[...document.querySelectorAll('a label.hap,.tab label.hap,.row label.hap')].filter(l=>!l.closest('.zliste')).length") == 0, "keine Schalter in Links und Navigation")
    tap(pg, '.tile[data-v="los"]', 400)
    ok(pg.locator("#sheet-in h2").inner_text() == "Loslassen", "Tippen über den Schalter löst die Aktion genau einmal aus")
    ok(pg.evaluate("document.querySelectorAll('#sheet .chip label.hap').length") == 0 and pg.evaluate("document.querySelectorAll('#sheet [data-a=\"do-los\"] label.hap').length") == 1, "im Formular tickt nur „Eintragen“")
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(300); pg.evaluate("openSheet('mehr')"); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.querySelectorAll('#sheet .chip label.hap').length") > 0, "neu gezeichnete Elemente bekommen Schalter")
    ctx.close()

    # 13b. Android: Vibrationsmuster je Familie
    andr = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36"
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}}, ua=andr)
    tap(pg, '.tile[data-v="los"]'); tap(pg, '#sheet .chip[data-v="kl"]'); tap(pg, '#sheet .opt[data-v="3"]'); tap(pg, '#sheet .chip[data-v="spe"]')
    pg.evaluate("document.querySelector('#sheet-in').scrollTop=9999"); tap(pg, '.btn[data-a="do-los"]', 600)
    ok(pg.evaluate("window.__vib") == [12], "ein Loslassen-Eintrag: genau eine Vibration: " + str(pg.evaluate("window.__vib")))
    pg.evaluate("window.__vib=[];openSheet('mehr')"); pg.wait_for_timeout(300); tap(pg, '#sheet .chip[data-v="light"]')
    pg.evaluate("openSheet('quiz')"); pg.wait_for_timeout(300); tap(pg, '.ans[data-v="0"]')
    v = pg.evaluate("window.__vib")
    ok(v[:1] == [10] and v[1] in ([10, 60, 14], [24, 60, 24]), "Android: Auswahl 10, Erfolg/Fehler: " + str(v))
    pg.evaluate("closeSheet();S.settings.vib=false;save()"); pg.wait_for_timeout(300); tap(pg, '.btn[data-a="nxalt"]')
    ok(len(pg.evaluate("window.__vib")) == 2, "Vibration abschaltbar")
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

    # 13i. Fassung C: Stellen im Bild
    andr2 = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36"
    OVL = """(()=>{const Z=[...document.querySelectorAll('.zone-hit')],K=[...document.querySelectorAll('.ding-hit')];const c=e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2,r.width/2]};
      let n=0; Z.forEach(a=>{K.concat(Z.filter(b=>b!==a)).forEach(b=>{const [x1,y1,r1]=c(a),[x2,y2,r2]=c(b); if(Math.hypot(x1-x2,y1-y2)<r1+r2) n++})}); return n})()"""
    ONSTUFF = """(()=>{const cv=document.querySelector('#bild'), r0=cv.getBoundingClientRect(), u=r0.width/Bild.VW, m=bildModel(weite(),keepers()), c=Bild.clearing(m), T=Bild.times(m.zpref);
      return [...document.querySelectorAll('.zone-hit')].every(e=>{const r=e.getBoundingClientRect(), x=(r.left+r.width/2-r0.left)/u, y=(r.top+r.height/2-r0.top)/u;
        return Bild._build().some(p=>p.zone===e.dataset.v&&c<T[p.i]&&x>=p.x-3&&x<=p.x+p.w+3&&(['wand','chair','lamp'].includes(p.z)?(y>=p.y-3&&y<=p.y+p.h+3):(y>=p.y-p.h-3&&y<=p.y+3)))})})()"""
    st5 = json.load(open("/tmp/claude-0/s5.json"))
    ctx, pg, errs = new(st5, ua=andr2)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    nz = pg.locator(".zone-hit").count()
    ok(8 <= nz <= 20, "Stellen im Bild antippbar bei Stufe 3: " + str(nz))
    R = pg.evaluate("[...document.querySelectorAll('.zone-hit')].map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]})")
    ok(all(r[0] >= 44 and r[1] >= 44 for r in R), "Tippflächen der Stellen mindestens 44 px")
    ok(pg.evaluate(ONSTUFF), "jede Tippfläche liegt auf sichtbarem Kram ihrer Stelle")
    ok(pg.evaluate(OVL) == 0, "keine Überlappung der Tippflächen")
    ok(pg.locator(".zliste").count() == 1 and not re.search(r"\d", pg.locator(".zliste summary").inner_text()), "Liste „Was liegt hier?“ ohne Zähler: " + pg.locator(".zliste summary").inner_text())
    ok(pg.evaluate("[...document.querySelectorAll('.zliste .row')].map(e=>e.dataset.v).sort().join()") == pg.evaluate("[...document.querySelectorAll('.zone-hit')].map(e=>e.dataset.v).sort().join()"), "Liste und Bild nennen dieselben Stellen")
    ok(pg.evaluate("[...document.querySelectorAll('.zone-hit')].every(e=>e.tabIndex===-1)"), "Tastatur: Flächen im Bild nicht in der Tab-Reihenfolge, die Liste führt dorthin")
    # gleiche Rückmeldung aus der Liste
    pg.evaluate("window.__vib=[];document.querySelector('.zliste').open=true"); pg.wait_for_timeout(200)
    pg.locator(".zliste .row").first.tap(); pg.wait_for_timeout(500)
    ok(pg.evaluate("window.__vib") == [10] and pg.evaluate("SH&&SH.type") == "zone", "Tipp in der Liste tickt wie ein Tipp im Bild: " + str(pg.evaluate("window.__vib")))
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    # Tipp knapp neben eine Fläche: nächste Stelle, weit weg: allgemeines Blatt
    pg.evaluate("scrollTo(0,0)"); pg.wait_for_timeout(300)
    pt = pg.evaluate("""(()=>{ const cv=document.querySelector('#bild').getBoundingClientRect(), Z=Bild.placed(), H=[...document.querySelectorAll('.zone-hit,.ding-hit')].map(e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2-cv.left,r.top+r.height/2-cv.top]});
      for(const z of Z) for(const [x,y,w,h] of z.rects){ for(const [px,py] of [[x+w/2,y+h/2],[x+2,y+2],[x+w-2,y+h-2]]){ if(H.every(([a,b])=>Math.hypot(a-px,b-py)>26)&&px>4&&py>4&&px<cv.width-4&&py<cv.height-4) return [z.id,Bild.zoneAt(px,py,30),px+cv.left,py+cv.top] } } return null })()""")
    if pt:
        pg.touchscreen.tap(pt[2], pt[3]); pg.wait_for_timeout(500)
        ok(pg.evaluate("SH&&SH.type") == "zone" and pg.evaluate("SH.arg") == pt[1], "Tipp neben die Fläche öffnet die nächste Stelle: " + str(pt[:2]) + " " + str(pg.evaluate("SH&&[SH.type,SH.arg]")))
        pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    else: ok(False, "kein Punkt für den Fehltipp-Test gefunden")
    ok(not pg.evaluate("'order' in S") and pg.locator(".wahl").count() == 0 and pg.locator('[data-a="zone-next"]').count() == 0, "kein „Platz verteilen“ mehr")
    w0 = W(pg); pg.evaluate("window.__vib=[]")
    zid = pg.locator(".zone-hit").first.get_attribute("data-v")
    tap(pg, f'.zone-hit[data-v="{zid}"]', 600)
    ok(pg.evaluate("SH&&SH.type") == "zone" and pg.evaluate("SH.arg") == zid, "Tippen auf eine Stelle öffnet ihr Blatt")
    ok("Min." in pg.locator("#sheet-in").inner_text() and "Wenn du magst, als Plan:" in pg.locator("details.mehr").text_content(), "Blatt: Frage, Schritt mit Minuten, Wenn-dann als Angebot hinter „Mehr dazu“")
    ok(pg.evaluate("(()=>{const c=document.querySelector('#sheet canvas.zcrop');if(!c||c.width<50)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i+3])n++;return n>c.width*c.height*0.9})()"), "Blatt zeigt den markierten Ausschnitt aus dem Bild")
    ok(pg.evaluate("window.__vib") == [10], "Android vibriert einmal wie bei einer Auswahl: " + str(pg.evaluate("window.__vib")))
    ok(W(pg) == w0, "Tippen bringt keine Handbreit")
    ok(pg.locator("#sheet-in").evaluate("e=>e.scrollHeight") <= 760 and pg.locator("details.mehr").count() == 1, "Blatt einer Stelle etwa eine Bildschirmhöhe, Rest hinter „Mehr dazu“: " + str(pg.locator("#sheet-in").evaluate("e=>e.scrollHeight")))
    ok(pg.locator("#sheet-in").inner_text().count("nicht dein echtes Zimmer") == 0 and "Wecker" not in pg.locator("#sheet-in").inner_text() and "Zeitgeber" in pg.locator("#sheet-in").inner_text(), "Blatt: Zeitgeber, kein Wecker, kein wiederholter Hinweis")
    pg.evaluate("window.__vib=[]")
    tap(pg, '[data-a="zone-go"][data-v="los"]', 400)
    ok(pg.evaluate("[SH.type,SH.d.cat,SH.d.size===undefined,SH.d.name,SH.d.z].join()") == "los," + pg.evaluate(f"ZONE['{zid}'].cat") + ",true," + pg.evaluate(f"ZONE['{zid}'].name") + "," + zid, "Weitergeben: Bereich und Name vorbelegt, keine Menge: " + pg.evaluate("JSON.stringify(SH.d)"))
    ok(pg.locator("#sheet .opt.on").count() == 0, "keine Größe vorausgewählt")
    ok(pg.evaluate("window.__vib") == [], "Öffnen des Formulars vibriert nicht")
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    ok(not errs, "Stellen ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()
    # Eintrag und Bild: Kram der Stelle geht innerhalb der Stufe zuerst, die Stufen bleiben gleich
    ctx, pg, errs = new({"seen": True, "gv": 2, "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {"zonen-tipp": 1}, "log": []})
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    r = pg.evaluate("""(()=>{ const P=Bild._build(), out=[];
      for(const [z,c] of [['boden-kleidung',1.05],['tisch-papier',3.2],['regal',4.1],['spielzeug',5.0]]){
        const T0=Bild.times([]), T=Bild.times([{z,c}]), k=Math.floor(c)+1;
        const same=[...Array(10).keys()].every(s=>JSON.stringify(Bild.gone(s,[])) ===JSON.stringify(Bild.gone(s,[{z,c}])));
        const back=P.some(p=>T0[p.i]<=c&&T[p.i]>c);
        const G=P.filter(p=>p.g===k&&T[p.i]>c&&!p.stackOn), zn=G.filter(p=>p.zone===z), ot=G.filter(p=>p.zone!==z);
        const first=!zn.length||!ot.length||Math.max(...zn.map(p=>T[p.i]))<=Math.min(...ot.map(p=>T[p.i]));
        out.push([z,same,!back,first,zn.length]) } return out })()""")
    ok(all(x[1] for x in r), "Am Ende jeder Stufe ist dasselbe fort wie ohne Eintrag: " + str(r))
    ok(all(x[2] for x in r), "nichts kommt zurück: " + str(r))
    ok(all(x[3] for x in r), "innerhalb der Stufe geht der Kram der Stelle zuerst: " + str(r))
    ok(any(x[4] > 0 for x in r), "die Prüfung trifft Stellen mit Kram in der laufenden Stufe")
    # echter Ablauf: aus einer Stelle weitergeben
    pg.evaluate("S.log=[{id:'p1',k:'los',ts:Date.now()-3*864e5,cat:'kl',size:3,weg:'ver'}];save();render()"); pg.wait_for_timeout(600)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    zid = pg.evaluate("Bild.placed().find(z=>z.jetzt>0).id")
    pg.evaluate(f"A.zone({{dataset:{{v:'{zid}'}}}})"); pg.wait_for_timeout(400)
    ok("zuerst an dieser Stelle Platz frei" in pg.locator("#sheet-in").inner_text(), "Blatt sagt ehrlich, dass hier zuerst Platz entsteht")
    tap(pg, '[data-a="zone-go"][data-v="los"]', 400)
    tap(pg, '#sheet .opt[data-v="1"]'); tap(pg, '#sheet .chip[data-v="ver"]')
    pg.evaluate("document.querySelector('#sheet-in').scrollTop=9999"); tap(pg, '.btn[data-a="do-los"]', 600)
    e = S(pg)["log"][-1]
    ok(e.get("z") == zid and isinstance(e.get("zc"), (int, float)) and e.get("size") == 1, "Eintrag merkt sich die Stelle: " + str(e))
    gz = pg.evaluate(f"(()=>{{const m=bildModel(weite(),keepers()), c=Bild.clearing(m), T=Bild.times(m.zpref), T0=Bild.times([]); return Bild._build().filter(p=>p.zone==='{zid}'&&T[p.i]<=c&&T0[p.i]>c).length}})()")
    ok(gz > 0, "im Bild ist an dieser Stelle jetzt zuerst etwas fort: " + str(gz))
    ok("zuerst an dieser Stelle" in pg.locator("#toast .tx").inner_text(), "Meldung nennt die Stelle, weil dort wirklich etwas fort ist")
    # Stelle, die in der laufenden Stufe nichts beiträgt: kein Versprechen, keine falsche Meldung
    pg.evaluate("closeSheet&&SH&&closeSheet()"); pg.wait_for_timeout(300)
    z0 = pg.evaluate("(Bild.placed().find(z=>z.jetzt===0)||{}).id")
    if z0:
        pg.evaluate(f"A.zone({{dataset:{{v:'{z0}'}}}})"); pg.wait_for_timeout(400)
        tx = pg.locator("#sheet-in").inner_text()
        ok("Gibst du von hier" not in tx and "erst später dran" in tx, "Blatt einer Stelle ohne Wirkung sagt das vorher klar")
        tap(pg, '[data-a="zone-go"][data-v="los"]', 400); tap(pg, '#sheet .opt[data-v="1"]'); tap(pg, '#sheet .chip[data-v="ver"]')
        pg.evaluate("document.querySelector('#sheet-in').scrollTop=9999"); tap(pg, '.btn[data-a="do-los"]', 600)
        ok("zuerst" not in pg.locator("#toast .tx").inner_text() and not S(pg)["log"][-1].get("z"), "ohne Wirkung: Meldung ohne „zuerst an dieser Stelle“: " + pg.locator("#toast .tx").inner_text())
    else: ok(False, "keine Stelle ohne Wirkung gefunden")
    pg.reload(); pg.wait_for_timeout(700)
    ok(not errs, "Eintrag aus einer Stelle ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()
    # Tagesdeckel: ehrliche Meldung
    ctx, pg, errs = new({"seen": True, "gv": 2, "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {"zonen-tipp": 1, "stage-1": 1, "stage-2": 1, "stage-3": 1, "stage-4": 1},
                         "log": [{"id": "c%d" % i, "k": "los", "ts": 1760864400000 + i, "cat": "wo", "size": 10, "weg": "ver"} for i in range(3)]})
    pg.evaluate("S.log.forEach(e=>e.ts=now());save();render()"); pg.wait_for_timeout(300)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    pg.evaluate("openSheet('los',null,{cat:'wo',size:6,weg:'ver'})"); pg.wait_for_timeout(300)
    w1 = W(pg); pg.evaluate("A['do-los']()"); pg.wait_for_timeout(300)
    msg = pg.locator("#toast .tx").inner_text()
    ok(W(pg) == w1 and "keine Handbreit" in msg and "Platz frei" not in msg, "Tagesdeckel: Meldung sagt, dass heute nichts dazukommt: " + msg)
    ctx.close()
    # Zuordnung der Stellen: jedes Ding dort, wo es steht; Bücher immer bei Bücherstellen mit Bereich „Papier & Digitales“
    ctx, pg, errs = new({"seen": True, "gv": 2, "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {"zonen-tipp": 1}, "log": []})
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    za = pg.evaluate("""(()=>{ const P=Bild._build(), out={}; P.forEach(p=>{ (out[p.zone]=out[p.zone]||[]).push([p.k,p.x+p.w/2,p.z]) }); return out })()""")
    ok(set(za) == set(pg.evaluate("ZONEN.map(z=>z.id)")) and 15 <= len(za) <= 20, "jede Stelle hat Dinge, jedes Ding eine Stelle: " + str(len(za)))
    books = [(z, k) for z, L in za.items() for k, x, zz in L if k in ("buch", "buchq", "stapelbuch", "buecherstapel", "ordner")]
    ok(all(pg.evaluate(f"ZONE['{z}'].cat") == "pa" for z, k in books), "Bücher liegen in Stellen mit dem Bereich „Papier & Digitales“: " + str(sorted(set(z for z, k in books))))
    ok(all(z == "boden-buecher" for z, L in za.items() for k, x, zz in L if k == "stapelbuch"), "Bücherstapel am Boden (auch links neben dem Sessel) gehören zu „Bücherstapel am Boden“")
    side = [(z, k, round(x)) for z, L in za.items() for k, x, zz in L if ("rechts" in pg.evaluate(f"ZONE['{z}'].n+ZONE['{z}'].t") and x < 180) or ("links" in pg.evaluate(f"ZONE['{z}'].n+ZONE['{z}'].t") and x > 180)]
    ok(not side, "keine Stelle nennt eine Seite, auf der ihre Dinge nicht liegen: " + str(side))
    ok(all(zz == "regalq" for k, x, zz in za["regal-quer"]) and all(zz in ("deskB", "deskF") for k, x, zz in za["tisch-papier"]+za["tisch-tassen"]+za["tisch-kabel"]), "Regal quer und Tisch-Stellen enthalten nur Dinge von dort")
    ctx.close()
    # Hinweis beim ersten Besuch: ohne Zeitabhängigkeit sichtbar, auch mit festgestellter Uhr
    ctx, pg, errs = new({"seen": True, "gv": 2, "settings": {"theme": "system", "vib": True, "mode": None}, "log": []})
    pg.clock.pause_at("2026-10-19T10:00:05")
    ok(pg.locator(".zone-hit.zeig").count() >= 8 and pg.locator(".zhint").inner_text() == "Tipp auf eine Stelle im Bild", "Hinweis beim ersten Besuch sichtbar (Kreise und Etikett)")
    tap(pg, ".zone-hit.zeig", 500); pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    ok(pg.locator(".zone-hit.zeig").count() == 0 and pg.locator(".zhint").count() == 0, "Hinweis geht nach dem ersten Antippen weg")
    ctx.close()
    # Text der Stelle passt zum Bild: bei s75 liegt im Regal nichts mehr quer, also gibt es die Stelle nicht
    ctx, pg, errs = new(json.load(open("/tmp/claude-0/s75.json")))
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    ok("nichts mehr quer" in pg.locator(".stufe-p").inner_text() and pg.locator('[data-v="regal-quer"]').count() == 0, "s75: keine Stelle „Bücher quer im Regal“, wenn der Stufentext sagt, dass nichts mehr quer liegt")
    pg.evaluate("openSheet('stufen');closeSheet()"); pg.wait_for_timeout(300)
    pg.touchscreen.tap(*pg.evaluate("(()=>{const r=document.querySelector('#bild').getBoundingClientRect();return [r.left+r.width*0.62,r.top+6]})()")); pg.wait_for_timeout(500)
    ok(pg.evaluate("SH&&SH.type") in ("bild", "zone"), "Tipp ins Bild öffnet eine Stelle oder das allgemeine Blatt")
    ctx.close()
    # Freie Stellen sind nicht antippbar; s75 mit Behaltenem: keine Überlappung
    for sf, w in [("/tmp/claude-0/s75.json", 393), ("/tmp/claude-0/s75.json", 320), ("/tmp/claude-0/k12b.json", 393), ("/tmp/claude-0/k12b.json", 320), ("/tmp/claude-0/k12.json", 320)]:
        ctx, pg, errs = new(json.load(open(sf)), w=w)
        if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
        nk = pg.locator(".ding-hit").count()
        ok(pg.evaluate(OVL) == 0, f"{sf.split('/')[-1]} {w}px: keine Überlappung mit {nk} Behaltenen ({pg.locator('.zone-hit').count()} Stellen)")
        ok(pg.evaluate(ONSTUFF), f"{sf.split('/')[-1]} {w}px: Stellen liegen auf sichtbarem Kram")
        if "s75" in sf:
            ok(pg.locator('.zone-hit[data-v="stuhl"]').count() == 0 and pg.locator('.zone-hit[data-v="boden-vorn"]').count() == 0, "freie Stellen (Stuhl, Boden vorn) sind nicht antippbar")
        ok(not errs, "ohne Fehler")
        ctx.close()
    # Alter Stand mit S.order (aus Variante B) lädt, das Feld wird ignoriert
    o = json.load(open("/tmp/claude-0/s5.json")); o["order"] = [{"s": 2, "z": "regal", "c": 2.3}]
    ctx, pg, errs = new(o)
    ok(pg.evaluate("stageOf(weite())") == 2 and pg.evaluate("STUFEN[2].n") in pg.locator(".stufe").inner_text() and not errs, "Stand mit altem S.order lädt ohne Fehler, Stufennamen fest")
    ctx.close()
    # Stufen-Moment: früher, mit Rückgängig im Blatt
    up = {"seen": True, "gv": 2, "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {"zonen-tipp": 1}, "log": []}
    ctx, pg, errs = new(up)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    tap(pg, '.tile[data-v="los"]'); tap(pg, '#sheet .chip[data-v="kl"]'); tap(pg, '#sheet .opt[data-v="3"]'); tap(pg, '#sheet .chip[data-v="spe"]')
    pg.evaluate("document.querySelector('#sheet-in').scrollTop=9999"); tap(pg, '.btn[data-a="do-los"]', 100)
    t0 = pg.evaluate("Date.now()"); seen = None
    for i in range(40):
        pg.wait_for_timeout(100)
        if pg.evaluate("SH&&SH.type") == "moment": seen = pg.evaluate("Date.now()") - t0; break
    ok(seen is not None and 1500 <= seen <= 4000, "Stufen-Moment nach der Überblendung, vor Ablauf des Rückgängig: %s ms" % seen)
    ok(pg.locator('#sheet [data-a="undo"]').count() == 1, "Rückgängig steht im Moment")
    tap(pg, '#sheet [data-a="undo"]', 500)
    ok(W(pg) == 0 and pg.locator("#layer").get_attribute("hidden") is not None, "Rückgängig aus dem Moment nimmt den Eintrag zurück")
    ok(not errs, "Moment ohne Fehler")
    ctx.close()
    # Dunkelmodus am Nachmittag: der Text spricht nicht von Sonne
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "dark", "vib": True, "mode": None}}, t="2026-10-20T16:00:00")
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    pg.evaluate("openSheet('bild')"); pg.wait_for_timeout(300)
    tx = pg.locator("#sheet-in").inner_text()
    ok("Sonne" not in tx and "Abend" in tx and tx.count("nicht dein echtes Zimmer") == 1, "Dunkelmodus: Text passt zum Abendbild, Hinweis einmal")
    ctx.close()
    # iOS: Stellen haben den Schalter für den Tick
    ctx, pg, errs = new(st5, ua=ios)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    pg.wait_for_timeout(300)
    ok(pg.evaluate("[...document.querySelectorAll('.zone-hit')].every(e=>e.querySelector(':scope>label.hap>input[switch]'))"), "iOS: Schalter in allen Tippflächen der Stellen")
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
