"""Abläufe von Luftholen im iPhone-Profil durchspielen: python3 test_flows.py"""
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

    def new(state=None, ua=None, theme="light", t="2026-10-19T10:00:00", w=None, keepmom=False):
        d = dict(dev)
        if ua: d["user_agent"] = ua
        if w: d["viewport"] = {"width": w, "height": 800}
        ctx = b.new_context(**d, color_scheme=theme)
        pg = ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.clock.install(time=t)
        pg.add_init_script("window.__vib=[];navigator.vibrate=(p)=>{window.__vib.push(p);return true}")
        if state is not None and not keepmom:
            state = json.loads(json.dumps(state)); state.setdefault("mom", {}); state["mom"]["neu-d"] = 1
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
    for i in range(pg.evaluate("CHECK.length")):
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
    ok(W(pg) == 2, "Tüte zu Menschen: 2 Handbreit, Größe zählt nicht")
    ok(pg.evaluate("scrollY") == 0, "nach dem Eintrag zurück beim Bild: " + str(pg.evaluate("scrollY")))
    ok(pg.locator("#toast.up").count() == 0, "Meldung steht auf der Startseite unten, nicht über dem Bild")
    ok(pg.locator("#toast.show").count() == 1, "Meldung sichtbar")
    tap(pg, '#toast button[data-a="undo"]', 400)
    ok(W(pg) == 0, "Rückgängig setzt Weite zurück")
    # kleine Dinge gedeckelt
    for i in range(7):
        tap(pg, '.tile[data-v="los"]'); tap(pg, '#sheet .chip[data-v="wo"]'); tap(pg, '.opt[data-v="1"]'); tap(pg, '.chip[data-v="ver"]'); tap(pg, '.btn[data-a="do-los"]', 300)
    ok(W(pg) == 14, "jede Entscheidung 2 Handbreit, 7 × 2 = 14: " + str(W(pg)))

    # 3. Behalten erscheint als Ding im Raum
    wk = W(pg)
    tap(pg, '.tile[data-v="keep"]'); pg.fill("#f-name", "Akkuschrauber"); tap(pg, '#sheet .chip[data-v="wo"]'); tap(pg, '.opt[data-v="kann"]'); tap(pg, '.btn[data-a="do-keep"]', 900)
    ok(W(pg) == wk + 2 and "+2\u00a0Handbreit" in pg.locator("#toast .tx").text_content(), "Behalten bringt 2 Handbreit wie Loslassen, Meldung nennt +2: " + str([W(pg) - wk, pg.locator("#toast .tx").text_content()]))
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
    ok(W(pg) == w0 + 2, "Wunsch nach Wartezeit gelassen: +2 fürs Warten, ist "+str(W(pg)-w0))

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
    pg.evaluate("closeSheet();S.settings.vib=false;save()"); pg.wait_for_timeout(300); tap(pg, '.next .btn')
    ok(len(pg.evaluate("window.__vib")) == 2 and pg.evaluate("SH&&SH.type") == "check", "Vibration abschaltbar: " + str(pg.evaluate("window.__vib")))
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
    ok("2\u00a0Handbreit" in pg.locator('.btn[data-a="do-los"]').inner_text(), "Eintragen nennt die Handbreit: " + pg.locator('.btn[data-a="do-los"]').inner_text())
    tap(pg, '.btn[data-a="do-los"]', 900)
    ok(W(pg) == 2, "Karton zählt wie jede Entscheidung 2: " + str(W(pg)))
    ok(pg.evaluate("bagList()[0].n") == "Lena", "Tasche mit Namen Lena an der Tür")
    tap(pg, '.tile[data-v="los"]'); tap(pg, '.opt[data-v="10"]'); tap(pg, '.chip[data-v="mue"]'); tap(pg, '#sheet .chip[data-v="wo"]')
    ok(pg.locator("#f-who").count() == 0, "Für wen? nur bei Wegen zu Menschen")
    tap(pg, '.switch[data-a="set-ask"]')
    tap(pg, '.btn[data-a="do-los"]', 900)
    ok(W(pg) == 3, "Entsorgtes zählt 1: " + str(W(pg)))
    ok(S(pg)["log"][-1]["ask"] is None, "Nachfrage abgeschaltet speichert keine Nachfrage")
    pg.evaluate("openSheet('verlauf')"); pg.wait_for_timeout(200)
    ok("Handbreit" in pg.locator("#sheet-in").inner_text(), "Verlauf nennt Handbreit")
    pg.evaluate("closeSheet()")
    ok(pg.evaluate("STUFEN.map(s=>s.w).join()") == "0,3,8,16,28,45,70,105,150,210", "neue Schwellen")
    ok(pg.evaluate("STUFEN[9].n") == "Genug", "letzte Stufe heißt Genug")
    ok(not errs, "Handbreit ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 13d. Migration: bestehende Nutzer werden nie zurückgestuft, alte Größe 5 bleibt gültig; gv 3: Bisheriges gilt als eingesetzt
    old = {"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {f"stage-{n}": 1 for n in range(10)},
           "log": [{"id": f"o{i}", "k": "los", "ts": 1760000000000 + i * 864e5, "cat": "wo", "size": 5, "weg": "spe", "name": ""} for i in range(5)]}
    ctx, pg, errs = new(old)
    st = S(pg)
    ok(W(pg) == 25 and st["gv"] == 3, "alter Stand: 5 × Größe 5 = 25 Handbreit, gv 3: " + str([W(pg), st.get("gv")]))
    ok(st.get("stFloor") == 4 and pg.evaluate("stageOf(raum())") == 4, "Untergrenze aus alter Stufe 5 (Freie Ecke) bleibt: " + str([st.get("stFloor"), pg.evaluate("stageOf(raum())"), pg.evaluate("rawStage(raum())")]))
    ok(pg.evaluate("[raum(),eingesetzt(),guthaben()]") == [28, 25, 0] and [x.get("frei") for x in st["spend"]] == [None, 1], "Migration: 25 gelten als eingesetzt, Rest bis zur Untergrenze (3) frei dazu, Guthaben 0: " + str(st["spend"]))
    mg = pg.evaluate("""(()=>{ const W=weite(), c=Bild.clearing({w:W,stage:stageOf(W)}), old=Bild._build().filter(p=>p.t<=c).map(p=>p.i).sort((a,b)=>a-b),
        nu=Bild.gone(S.spend,[]).slice().sort((a,b)=>a-b); return [old.length,nu.length,JSON.stringify(old)===JSON.stringify(nu)] })()""")
    ok(mg[2], "Migration gv 1 → 3 mit Untergrenze: Bild.gone wie vorher (Fassung C: %d Dinge fort, Fassung D: %d)" % (mg[0], mg[1]))
    ok("Noch 17 Handbreit" in pg.locator(".stufe-p").inner_text(), "Restmenge bis zur übernächsten Schwelle stimmt (45-28): " + pg.locator(".stufe-p").inner_text())
    ok(pg.evaluate("SH&&SH.type") != "moment", "kein Moment, keine Rückstufungs-Meldung nach der Migration")
    pg.evaluate("openSheet('verlauf')"); pg.wait_for_timeout(200)
    ok("Etwas Großes" in pg.locator("#sheet-in").inner_text() and not errs, "alte Größe 5 erscheint im Verlauf ohne Fehler")
    pg.evaluate("closeSheet()"); pg.reload(); pg.wait_for_timeout(500)
    ok(S(pg)["stFloor"] == 4 and pg.evaluate("stageOf(raum())") == 4 and len(S(pg)["spend"]) == 2, "Untergrenze bleibt nach erneutem Laden, Migration läuft nur einmal")
    pg.evaluate("for(let i=0;i<30;i++) S.log.push({id:'n'+i,k:'los',ts:now()+i*864e5,cat:'kl',size:10,weg:'ver'}); save(); render()"); pg.wait_for_timeout(300)
    ok(pg.evaluate("[guthaben(),raum(),stageOf(raum())]") == [60, 28, 4], "neue Einträge räumen das Bild nicht von selbst ab, sie werden Guthaben: " + str(pg.evaluate("[guthaben(),raum(),stageOf(raum())]")))
    pg.evaluate("for(let i=0;i<80&&guthaben()>=PREIS;i++){ const k=katOffen()[0]; if(!k) break; A.spend({dataset:{v:k.id+'@x'}}) }"); pg.wait_for_timeout(300)
    ok(pg.evaluate("stageOf(raum())") == pg.evaluate("rawStage(raum())") and pg.evaluate("stageOf(raum())") >= 6, "eingesetzte Handbreit holen die Untergrenze ein: " + str(pg.evaluate("[raum(),stageOf(raum())]")))
    ok(not errs, "Migration gv 1 ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()
    new2 = dict(old); new2["gv"] = 2
    ctx, pg, errs = new(new2)
    ok(not S(pg).get("stFloor") and pg.evaluate("stageOf(raum())") == 3 and pg.evaluate("guthaben()") == 0 and S(pg)["gv"] == 3, "gv 2 → 3: keine Untergrenze, Stufe 3 bleibt, Guthaben 0")
    # Das Bild bleibt wie in Fassung C: dort war fort, was in der festen Reihenfolge (p.t) bis zum Fortschritt c=Bild.clearing lag
    mg = pg.evaluate("""(()=>{ const W=weite(), c=Bild.clearing({w:W,stage:stageOf(W)}), old=Bild._build().filter(p=>p.t<=c).map(p=>p.i).sort((a,b)=>a-b),
        nu=Bild.gone(S.spend,[]).slice().sort((a,b)=>a-b); return [old.length,nu.length,JSON.stringify(old)===JSON.stringify(nu)] })()""")
    ok(mg[2], "Migration gv 2 → 3: Bild.gone wie vorher (Fassung C: %d Dinge fort, Fassung D: %d)" % (mg[0], mg[1]))
    ok(not errs, "Migration gv 2 ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 13e. Bild: Tippflächen 44 px ohne Überlappung bei 320 px, Behalten leert nicht schneller als Loslassen, Abräumen gleichmäßig
    st12 = {"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {f"stage-{n}": 1 for n in range(10)}, "first": 1,
            "keep": [{"id": f"k{j}", "ts": 1760000000000, "name": f"Ding {j}", "cat": ["kl","wo","pa","er","ko"][j % 5], "why": ["oft","kann","sinn","gut"][j % 4], "note": ""} for j in range(12)]}
    ctx, pg, errs = new(st12, w=320)
    R = pg.evaluate("[...document.querySelectorAll('.ding-hit')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})")
    ok(len(R) == 12 and all(r[2] >= 44 and r[3] >= 44 for r in R), "12 Tippflächen je mindestens 44 px")
    ov = [(i, j) for i in range(len(R)) for j in range(i + 1, len(R)) if R[i][0] < R[j][0] + R[j][2] - 0.5 and R[j][0] < R[i][0] + R[i][2] - 0.5 and R[i][1] < R[j][1] + R[j][3] - 0.5 and R[j][1] < R[i][1] + R[i][3] - 0.5]
    ok(not ov, "Tippflächen überlappen sich bei 320 px nicht: " + str(ov))
    cv = pg.evaluate("(()=>{const r=document.querySelector('#bild').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})()")
    ok(all(r[0] >= cv[0] - 1 and r[1] >= cv[1] - 1 and r[0] + r[2] <= cv[2] + 1 and r[1] + r[3] <= cv[3] + 1 for r in R), "Tippflächen liegen im Bild")
    k = pg.evaluate("(()=>{ const K=S.keep.map(k=>({id:k.id,cat:k.cat,why:k.why})), A=Bild.flaeche([]); return [0,28,150].map(n=>{ const sp=n?[{k:'_alt',n}]:[]; return (Bild.flaeche(sp)-Bild.flaeche(sp,K))/A }) })()")
    one = 1 / pg.evaluate("Bild.EINH")
    ok(max(k) / 12 <= one, f"ein Behaltenes deckt im Schnitt weniger Kram zu als die eine Handbreit, die es bringt: {[round(x*100,1) for x in k]} % / 12 <= {round(one*100,2)} %")
    g = pg.evaluate("(()=>{ const A=Bild.flaeche([]); return [3,16,45,70,105,150,210].map(n=>[Math.pow(n/Bild.EINH,0.6), 1-Bild.flaeche([{k:'_alt',n}])/A]) })()")
    ok(all(abs(a - b) <= 0.02 for a, b in g), "eingesetzte Handbreit räumen nach der Kurve (R/210)^0,6 ab: " + str([(round(a*100,1), round(b*100,1)) for a, b in g]))
    ok(pg.evaluate("(()=>{ const A=Bild.flaeche([]); const f=n=>1-Bild.flaeche([{k:'_alt',n}])/A; return [0,3,8,16,28,45,70,105,150,210].every((n,i,a)=>i===0||f(n)>f(a[i-1])) })()"), "jede Stufe räumt sichtbar mehr ab als die vorige")
    ok(pg.evaluate("(()=>{ const c=document.createElement('canvas'), m={stage:3,keep:[],dark:false,date:new Date(2026,9,20,11),spend:[{k:'_alt',n:20},{k:'buecher',z:'buecher@regal',n:5}]}; Bild.paint(c,m,300,3); const a=c.toDataURL(); Bild.paint(c,m,300,3); return a===c.toDataURL() })()"), "Bild ist deterministisch")
    ok(not errs, "Bild ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 13f. B1: Behaltenes zeigt das genannte Ding (Figurenwahl); Zeitgeber ohne Aufgabe über das Blatt einer Sorte
    ctx, pg, errs = new({"seen": True, "settings": {"theme": "system", "vib": True, "mode": None}})
    ok(pg.locator(".next h3").inner_text().startswith("Mach die Bestandsaufnahme") and "Zuerst das" in pg.locator(".next-h").inner_text(), "ohne Bestandsaufnahme steht sie als „Zuerst das“ vorn")
    ok(pg.locator('.zehn').count() == 0 and pg.locator('[data-a="nxalt"]').count() == 0, "kein fester 10-Minuten-Eintrag und kein „Anderer Vorschlag“ mehr")
    tap(pg, '.zone-hit', 500)
    pg.evaluate("document.querySelector('#sheet details.mehr').open=true"); pg.wait_for_timeout(150)
    tap(pg, '#sheet [data-a="open"][data-v="timer"]', 400)
    ok(pg.evaluate("SH&&SH.type") == "timer" and "10 Minuten aufräumen" in pg.locator("#sheet-in h2").inner_text(), "„10 Minuten mit Zeitgeber“ im Blatt einer Sorte öffnet den freien Zeitgeber")
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
    ok(pg.evaluate("bildModel(raum(),keepers()).keep[0].motif") == "Teekanne", "Bildmodell bekommt die Figur")
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
    ok(W(pg) == w0 + 4, "lassen nach voller Wartezeit: +2 wie kaufen")
    ok("Lichtpunkt" not in pg.locator("#toast").inner_text() and "Paket" in pg.locator("#toast").inner_text(), "Meldung passt zum Bild: " + pg.locator("#toast").inner_text())
    pg.evaluate("openSheet('wishdec','w2')"); pg.wait_for_timeout(200); tap(pg, '.opt[data-v="kauf"]', 400)
    ok(W(pg) == w0 + 4, "vor Ablauf der Wartezeit entschieden: keine Handbreit")
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

    # 13i. Fassung D: Sorten (Kategorien) und Stellen im Bild
    andr2 = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36"
    OVL = """(()=>{const Z=[...document.querySelectorAll('.zone-hit')],K=[...document.querySelectorAll('.ding-hit')];const c=e=>{const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2,r.width/2]};
      let n=0; Z.forEach(a=>{K.concat(Z.filter(b=>b!==a)).forEach(b=>{const [x1,y1,r1]=c(a),[x2,y2,r2]=c(b); if(Math.hypot(x1-x2,y1-y2)<r1+r2) n++})}); return n})()"""
    ONSTUFF = """(()=>{const cv=document.querySelector('#bild'), r0=cv.getBoundingClientRect(), u=r0.width/Bild.VW, m=bildModel(raum(),keepers()), G=new Set(Bild.gone(m.spend,m.keep));
      return [...document.querySelectorAll('.zone-hit')].every(e=>{const r=e.getBoundingClientRect(), x=(r.left+r.width/2-r0.left)/u, y=(r.top+r.height/2-r0.top)/u;
        return Bild._build().some(p=>p.stelle===e.dataset.v&&!G.has(p.i)&&x>=p.x-3&&x<=p.x+p.w+3&&(['wand','chair','lamp'].includes(p.z)?(y>=p.y-3&&y<=p.y+p.h+3):(y>=p.y-p.h-3&&y<=p.y+3)))})})()"""
    KATS_HIT = "[...new Set([...document.querySelectorAll('.zone-hit')].map(e=>katOfStelle(e.dataset.v)))].sort().join()"
    st5 = json.load(open("/tmp/claude-0/s5.json"))
    ctx, pg, errs = new(st5, ua=andr2)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    nz = pg.locator(".zone-hit").count()
    ok(9 <= nz <= 14, "Stellen im Bild antippbar, höchstens 14: " + str(nz))
    ok(pg.evaluate(KATS_HIT) == pg.evaluate("KATEGORIEN.map(k=>k.id).sort().join()"), "jede der 9 Sorten hat eine Tippfläche: " + pg.evaluate(KATS_HIT))
    ok(pg.evaluate("[...document.querySelectorAll('.zone-hit')].every(e=>/^[a-z]+@[a-z]+$/.test(e.dataset.v)&&KAT[katOfStelle(e.dataset.v)])"), "Stellen-ids haben die Form „sorte@ort“")
    R = pg.evaluate("[...document.querySelectorAll('.zone-hit')].map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]})")
    ok(all(r[0] >= 44 and r[1] >= 44 for r in R), "Tippflächen der Stellen mindestens 44 px")
    ok(pg.evaluate(ONSTUFF), "jede Tippfläche liegt auf sichtbarem Kram ihrer Stelle")
    ok(pg.evaluate(OVL) == 0, "keine Überlappung der Tippflächen")
    ok(pg.locator(".zliste").count() == 1 and not re.search(r"\d", pg.locator(".zliste summary").inner_text()), "Liste „Was liegt hier?“ ohne Zähler: " + pg.locator(".zliste summary").inner_text())
    rows = pg.evaluate("[...document.querySelectorAll('.zliste .row')].map(e=>[katOfStelle(e.dataset.v),e.querySelector('b').textContent])")
    ok(sorted(r[0] for r in rows) == sorted(pg.evaluate(KATS_HIT).split(",")) and all(pg.evaluate(f"KAT['{a}'].n") == b for a, b in rows), "Liste nennt die Sorten im Bild, jede einmal: " + str(rows))
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
    if pt and pt[1]:
        pg.touchscreen.tap(pt[2], pt[3]); pg.wait_for_timeout(500)
        ok(pg.evaluate("SH&&SH.type") == "zone" and pg.evaluate("SH.arg") == pt[1], "Tipp neben die Fläche öffnet die nächste Stelle: " + str(pt[:2]) + " " + str(pg.evaluate("SH&&[SH.type,SH.arg]")))
        pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    else: ok(False, "kein Punkt für den Fehltipp-Test gefunden: " + str(pt))
    ok(not pg.evaluate("'order' in S") and pg.locator(".wahl").count() == 0 and pg.locator('[data-a="zone-next"]').count() == 0, "kein „Platz verteilen“ mehr")
    w0 = W(pg); pg.evaluate("window.__vib=[]")
    zid = pg.locator(".zone-hit").first.get_attribute("data-v"); kid = zid.split("@")[0]
    tap(pg, f'.zone-hit[data-v="{zid}"]', 600)
    ok(pg.evaluate("SH&&SH.type") == "zone" and pg.evaluate("SH.arg") == zid, "Tippen auf eine Stelle öffnet ihr Blatt")
    ok(pg.locator("#sheet-in h2").inner_text() == pg.evaluate(f"KAT['{kid}'].n"), "Blatt nennt die Sorte: " + pg.locator("#sheet-in h2").inner_text())
    ok(pg.locator('#sheet .row.chal [data-a="chal"]').count() == 3 and all("Min." in t and "Handbreit" in t for t in pg.locator("#sheet .row.chal").all_inner_texts()), "drei Aufgaben mit Minuten und Handbreit, je mit „Erledigt“")
    ok(pg.locator("#sheet .box.abr").count() == 1 and pg.locator('#sheet [data-a="spend"]').count() == 0 and "keine Handbreit" in pg.locator("#sheet .box.abr").inner_text(), "ohne Guthaben: Abräumen-Kasten ohne Knopf, sagt warum: " + pg.locator("#sheet .box.abr").inner_text())
    ok(pg.locator('#sheet [data-a="zone-go"]').count() == 3 and "Was die Forschung sagt" in pg.locator("#sheet-in").inner_text(), "drei Wege und Befunde")
    ok(pg.evaluate("(()=>{const b=document.querySelector('#sheet .box.abr'), t=document.querySelector('#sheet .row.chal'); return !!(b&&t&&(t.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING))})()"), "Aufgaben stehen vor dem Abräumen-Kasten")
    ok(pg.evaluate("(()=>{const c=document.querySelector('#sheet canvas.zcrop');if(!c||c.width<50)return false;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i+3])n++;return n>c.width*c.height*0.9})()"), "Blatt zeigt den markierten Ausschnitt aus dem Bild")
    ok(pg.evaluate("window.__vib") == [10], "Android vibriert einmal wie bei einer Auswahl: " + str(pg.evaluate("window.__vib")))
    ok(W(pg) == w0, "Tippen bringt keine Handbreit")
    ok(pg.locator("details.mehr").count() == 1 and "Zeitgeber" in pg.locator("details.mehr").text_content(), "Zeitgeber und Quellen hinter „Mehr dazu“")
    ok(pg.locator("#sheet-in").text_content().count("nicht dein echtes Zimmer") <= 1 and "Wecker" not in pg.locator("#sheet-in").text_content(), "Blatt: kein Wecker, Hinweis höchstens einmal")
    pg.evaluate("window.__vib=[]")
    tap(pg, '[data-a="zone-go"][data-v="los"]', 400)
    ok(pg.evaluate("[SH.type,SH.d.cat,SH.d.size===undefined,SH.d.name,SH.d.z].join()") == "los," + pg.evaluate(f"KAT['{kid}'].cat") + ",true," + pg.evaluate(f"KAT['{kid}'].name") + "," + kid, "Weitergeben: Bereich, Name und Sorte vorbelegt, keine Menge: " + pg.evaluate("JSON.stringify(SH.d)"))
    ok(pg.locator("#sheet .opt.on").count() == 0, "keine Größe vorausgewählt")
    ok(pg.evaluate("window.__vib") == [], "Öffnen des Formulars vibriert nicht")
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    ok(not errs, "Stellen ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 13j. Abräumen: Guthaben sinkt um den Preis, raum steigt, im Bild geht zuerst Kram an der angetippten Stelle, rückgängig machbar
    yday = 1760778000000  # 18.10.2026
    sp = {"seen": True, "gv": 3, "spend": [], "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {"zonen-tipp": 1, **{f"stage-{n}": 1 for n in range(10)}},
          "log": [{"id": f"y{i}", "k": "los", "ts": 1760778000000 + i, "cat": "wo", "size": 6, "weg": "ver"} for i in range(6)]}
    ctx, pg, errs = new(sp, ua=andr2)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    PREIS = pg.evaluate("PREIS")
    ok(pg.evaluate("[weite(),guthaben(),raum()]") == [12, 12, 0], "12 Handbreit bekommen, nichts eingesetzt: " + str(pg.evaluate("[weite(),guthaben(),raum()]")))
    ok("12" in pg.locator(".stufe .weite").inner_text() and "Du hast 12 Handbreit" in pg.locator(".stufe-p").inner_text(), "Startseite zeigt das Guthaben und lädt zum Abräumen ein")
    zid = pg.evaluate("(Bild.placed().filter(z=>z.dot&&katRest(z.kat)>=PREIS).sort((a,b)=>b.a-a.a)[0]||{}).id"); kid = zid.split("@")[0]
    tap(pg, f'.zone-hit[data-v="{zid}"]', 500)
    ok(pg.locator('#sheet [data-a="spend"]').count() == 1 and f"{PREIS} Handbreit" in pg.locator('#sheet [data-a="spend"]').inner_text(), "Blatt bietet Abräumen zum Preis: " + pg.locator('#sheet .box.abr').inner_text())
    before = pg.evaluate("(()=>{const m=bildModel(raum(),keepers());return {g:guthaben(),r:raum(),gone:Bild.gone(m.spend,m.keep),rest:katRest('%s')}})()" % kid)
    pg.evaluate("window.__vib=[]")
    tap(pg, '#sheet [data-a="spend"]', 400)
    after = pg.evaluate("(()=>{const m=bildModel(raum(),keepers());return {g:guthaben(),r:raum(),gone:Bild.gone(m.spend,m.keep),rest:katRest('%s')}})()" % kid)
    ok(after["g"] == before["g"] - PREIS and after["r"] == before["r"] + PREIS, "Abräumen: Guthaben −%d, raum +%d: %s" % (PREIS, PREIS, [before["g"], after["g"], before["r"], after["r"]]))
    ok(S(pg)["spend"][-1] == {**S(pg)["spend"][-1], "k": kid, "z": zid, "n": PREIS}, "Einsatz gespeichert: " + str(S(pg)["spend"][-1]))
    ok(set(before["gone"]) < set(after["gone"]) and after["rest"] < before["rest"], "Bild.gone wächst, in der Sorte bleibt weniger: %d → %d" % (len(before["gone"]), len(after["gone"])))
    first = pg.evaluate("""(([b,a,z])=>{ const P=Bild._build(), N=new Set(a.filter(i=>!b.includes(i))), at=P.filter(p=>p.stelle===z&&!a.includes(p.i)&&!b.includes(p.i));
      const okN=[...N].every(i=>P[i].stelle===z||(P[i].on!=null&&N.has(P[i].on))); return [okN||at.length===0, [...N].filter(i=>P[i].stelle===z).length] })""", [before["gone"], after["gone"], zid])
    ok(first[0] and first[1] > 0, "zuerst geht Kram an der angetippten Stelle (oder was darauf liegt): " + str(first))
    ok("Abgeräumt" in pg.locator("#toast .tx").inner_text() and pg.evaluate("window.__vib") == [[10, 60, 14]], "Meldung „Abgeräumt“, Erfolgsvibration: " + str(pg.evaluate("window.__vib")))
    tap(pg, '#toast button[data-a="undo"]', 500)
    undone = pg.evaluate("(()=>{const m=bildModel(raum(),keepers());return {g:guthaben(),r:raum(),gone:Bild.gone(m.spend,m.keep)}})()")
    ok(undone["g"] == before["g"] and undone["r"] == before["r"] and sorted(undone["gone"]) == sorted(before["gone"]), "Rückgängig nimmt das Abräumen ganz zurück")
    # Weitergeben aus dem Blatt: Handbreit kommen dazu, das Bild räumt nicht von selbst ab
    pg.evaluate(f"A.zone({{dataset:{{v:'{zid}'}}}})"); pg.wait_for_timeout(400)
    tap(pg, '[data-a="zone-go"][data-v="los"]', 400); tap(pg, '#sheet .opt[data-v="1"]'); tap(pg, '#sheet .chip[data-v="ver"]')
    g0 = pg.evaluate("[raum(),Bild.gone(S.spend,keepers()).length]")
    pg.evaluate("document.querySelector('#sheet-in').scrollTop=9999"); tap(pg, '.btn[data-a="do-los"]', 600)
    e = S(pg)["log"][-1]
    ok(e.get("z") == kid and e.get("size") == 1, "Eintrag merkt sich die Sorte: " + str(e))
    ok(re.search(r"\+?(\d)\u00a0Handbreit", pg.locator("#toast .tx").inner_text()) and pg.evaluate("guthaben()") - before["g"] == int(re.search(r"(\d)\u00a0Handbreit", pg.locator("#toast .tx").inner_text()).group(1)), "Meldung nennt genau die Handbreit, die dazukommen: " + pg.locator("#toast .tx").inner_text())
    ok(pg.evaluate("[raum(),Bild.gone(S.spend,keepers()).length]") == g0, "Eintragen allein räumt im Bild nichts ab")
    # ohne genug Handbreit geht es nicht
    pg.evaluate("for(let i=0;i<20&&guthaben()>0;i++){ const k=katOffen().find(k=>katRest(k.id)<=guthaben()&&katRest(k.id)>0)||katOffen().find(k=>katRest(k.id)>=PREIS); if(!k) break; A.spend({dataset:{v:k.id+'@x'}}); if(guthaben()<PREIS) break }"); pg.wait_for_timeout(300)
    g1 = pg.evaluate("guthaben()")
    kbig = pg.evaluate("katOffen().find(k=>katRest(k.id)>guthaben()&&katRest(k.id)>=PREIS).id")
    zb = pg.evaluate(f"(Bild.placed().find(z=>z.kat==='{kbig}')||{{}}).id")
    ok(g1 < PREIS, "Guthaben jetzt unter dem Preis: " + str(g1))
    pg.evaluate(f"A.zone({{dataset:{{v:'{zb}'}}}})"); pg.wait_for_timeout(400)
    ok(pg.locator('#sheet [data-a="spend"]').count() == 0 and any(w in pg.locator("#sheet .box.abr").inner_text() for w in ("fehlen noch","fehlt noch","keine Handbreit")), "Blatt: kein Abräumen-Knopf, „Dir fehlen noch …“: " + pg.locator("#sheet .box.abr").inner_text())
    ns = len(S(pg)["spend"])
    pg.evaluate(f"(()=>{{const b=document.createElement('button'); b.dataset.v='{zb}'; document.body.appendChild(b); A.spend(b); b.remove()}})()"); pg.wait_for_timeout(300)
    ok(len(S(pg)["spend"]) == ns and pg.evaluate("guthaben()") == g1, "Abräumen ohne genug Handbreit ändert nichts")
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(300)
    ok(not errs, "Abräumen ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()
    # Tagesdeckel: ehrliche Meldung
    ctx, pg, errs = new({"seen": True, "gv": 2, "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {"zonen-tipp": 1, "stage-1": 1, "stage-2": 1, "stage-3": 1, "stage-4": 1},
                         "log": [{"id": "c%d" % i, "k": "los", "ts": 1760864400000 + i, "cat": "wo", "size": 10, "weg": "ver"} for i in range(8)]})
    pg.evaluate("S.log.forEach(e=>e.ts=now());save();render()"); pg.wait_for_timeout(300)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    pg.evaluate("openSheet('los',null,{cat:'wo',size:6,weg:'ver'})"); pg.wait_for_timeout(300)
    w1 = W(pg); pg.evaluate("A['do-los']()"); pg.wait_for_timeout(300)
    msg = pg.locator("#toast .tx").inner_text()
    ok(W(pg) == w1 and "keine Handbreit" in msg and "Platz frei" not in msg, "Tagesdeckel: Meldung sagt, dass heute nichts dazukommt: " + msg)
    ctx.close()
    # Zuordnung: jedes Ding gehört zu genau einer Sorte und einer Stelle „sorte@ort“ dort, wo es steht
    ctx, pg, errs = new({"seen": True, "gv": 3, "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {"zonen-tipp": 1}, "log": []})
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    za = pg.evaluate("Bild._build().map(p=>[p.k,p.kat,p.stelle,p.z])")
    ok(set(x[1] for x in za) == set(pg.evaluate("KATEGORIEN.map(k=>k.id)")) == set(pg.evaluate("Bild.KIDS")), "jedes Ding hat eine Sorte, jede der 9 Sorten kommt vor")
    ok(all(x[2].split("@")[0] == x[1] for x in za), "Stelle beginnt mit der Sorte")
    ok(all(x[1] == "buecher" for x in za if x[0] in ("buch", "buchq", "buchq3", "stapelbuch", "buecherstapel")) and all(x[1] == "papier" for x in za if x[0] == "ordner"), "Bücher sind „Bücher und Medien“, Ordner „Papier“")
    ORT = {"deskB": "tisch", "deskF": "tisch", "regal": "regal", "regalq": "regal", "regaltop": "oben", "sill": "fenster", "under": "unter", "chair": "stuhl", "lamp": "stuhl"}
    bad = [x for x in za if x[3] in ORT and x[2].split("@")[1] != ORT[x[3]]]
    ok(not bad, "Ort der Stelle passt zum Platz im Bild: " + str(bad[:5]))
    ok(all(pg.evaluate(f"AREA[KAT['{k}'].cat]!=null&&KAT['{k}'].ch.length===3") for k in set(x[1] for x in za)), "jede Sorte hat einen Bereich und drei Aufgaben")
    ctx.close()
    # Hinweis beim ersten Besuch: ohne Zeitabhängigkeit sichtbar, auch mit festgestellter Uhr
    ctx, pg, errs = new({"seen": True, "gv": 3, "settings": {"theme": "system", "vib": True, "mode": None}, "log": []})
    pg.clock.pause_at("2026-10-19T10:00:05")
    ok(pg.locator(".zone-hit.zeig").count() >= 8 and pg.locator(".zhint").inner_text() == "Tipp auf etwas im Bild", "Hinweis beim ersten Besuch sichtbar (Kreise und Etikett)")
    tap(pg, ".zone-hit.zeig", 500); pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    ok(pg.locator(".zone-hit.zeig").count() == 0 and pg.locator(".zhint").count() == 0, "Hinweis geht nach dem ersten Antippen weg")
    ctx.close()
    # Text passt zum Bild: Tippflächen nur für Sorten, von denen noch etwas liegt; ganz abgeräumte Sorten sind nicht antippbar
    ctx, pg, errs = new(json.load(open("/tmp/claude-0/s75.json")))
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    ok(pg.evaluate("[...document.querySelectorAll('.zone-hit')].every(e=>katRest(katOfStelle(e.dataset.v))>0)"), "s75: jede Tippfläche gehört zu einer Sorte, von der noch etwas liegt")
    kz = pg.evaluate("KATEGORIEN.map(k=>[k.id,katRest(k.id)]).filter(x=>x[1]>0).sort((a,b)=>a[1]-b[1])[0]")
    pg.evaluate(f"S.spend.push({{k:'{kz[0]}',n:{kz[1]},ts:now()}});save();render()"); pg.wait_for_timeout(600)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    ok(pg.evaluate(f"katRest('{kz[0]}')") == 0 and pg.evaluate(f"document.querySelectorAll('.zone-hit[data-v^=\"{kz[0]}@\"], .zliste .row[data-v^=\"{kz[0]}@\"]').length") == 0, f"ganz abgeräumte Sorte ({kz[0]}) hat keine Tippfläche und keine Zeile mehr")
    pg.evaluate(f"openSheet('zone','{kz[0]}')"); pg.wait_for_timeout(300)
    ok("alles abgeräumt" in pg.locator("#sheet .box.abr").inner_text() and pg.locator('#sheet [data-a="spend"]').count() == 0, "Blatt der Sorte sagt, dass hier alles abgeräumt ist")
    pg.evaluate("openSheet('stufen');closeSheet()"); pg.wait_for_timeout(300)
    pg.touchscreen.tap(*pg.evaluate("(()=>{const r=document.querySelector('#bild').getBoundingClientRect();return [r.left+r.width*0.62,r.top+6]})()")); pg.wait_for_timeout(500)
    ok(pg.evaluate("SH&&SH.type") in ("bild", "zone"), "Tipp ins Bild öffnet eine Stelle oder das allgemeine Blatt")
    ok(not errs, "s75 ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()
    # Keine Überlappung, auch mit Behaltenem
    for sf, w in [("/tmp/claude-0/s75.json", 393), ("/tmp/claude-0/s75.json", 320), ("/tmp/claude-0/k12b.json", 393), ("/tmp/claude-0/k12b.json", 320), ("/tmp/claude-0/k12.json", 320)]:
        ctx, pg, errs = new(json.load(open(sf)), w=w)
        if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
        nk = pg.locator(".ding-hit").count()
        ok(pg.evaluate(OVL) == 0, f"{sf.split('/')[-1]} {w}px: keine Überlappung mit {nk} Behaltenen ({pg.locator('.zone-hit').count()} Stellen)")
        ok(pg.evaluate(ONSTUFF), f"{sf.split('/')[-1]} {w}px: Stellen liegen auf sichtbarem Kram")
        ok(pg.locator(".zone-hit").count() <= 14, f"{sf.split('/')[-1]} {w}px: höchstens 14 Stellen")
        ok(not errs, "ohne Fehler")
        ctx.close()
    # Alter Stand mit S.order (aus Variante B) lädt, das Feld wird ignoriert
    o = json.load(open("/tmp/claude-0/s5.json")); o["order"] = [{"s": 2, "z": "regal", "c": 2.3}]
    ctx, pg, errs = new(o)
    ok(pg.evaluate("stageOf(raum())") == 2 and pg.evaluate("STUFEN[2].n") in pg.locator(".stufe").inner_text() and not errs, "Stand mit altem S.order lädt ohne Fehler, Stufennamen fest")
    ctx.close()
    # Stufen-Moment nach dem Abräumen, mit Rückgängig im Blatt
    up = {"seen": True, "gv": 3, "spend": [], "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {"zonen-tipp": 1},
          "log": [{"id": "y1", "k": "los", "ts": 1760778000000, "cat": "wo", "size": 6, "weg": "ver"},{"id": "y2", "k": "los", "ts": 1760778000001, "cat": "wo", "size": 6, "weg": "ver"}]}
    ctx, pg, errs = new(up)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    zid = pg.evaluate("Bild.placed().find(z=>z.dot&&katRest(z.kat)>=PREIS).id")
    tap(pg, f'.zone-hit[data-v="{zid}"]', 400)
    tap(pg, '#sheet [data-a="spend"]', 100)
    t0 = pg.evaluate("Date.now()"); seen = None
    for i in range(40):
        pg.wait_for_timeout(100)
        if pg.evaluate("SH&&SH.type") == "moment": seen = pg.evaluate("Date.now()") - t0; break
    ok(seen is not None and 1500 <= seen <= 4000, "Stufen-Moment nach der Überblendung, vor Ablauf des Rückgängig: %s ms" % seen)
    ok(pg.evaluate("SH&&SH.d.m.t") == pg.evaluate("STUFEN[1].n"), "Moment nennt die neue Stufe „Erste Lücke“")
    ok(pg.locator('#sheet [data-a="undo"]').count() == 1, "Rückgängig steht im Moment")
    if pg.locator('#sheet [data-a="undo"]').count(): tap(pg, '#sheet [data-a="undo"]', 500)
    ok(pg.evaluate("[raum(),guthaben()]") == [0, 4] and pg.locator("#layer").get_attribute("hidden") is not None, "Rückgängig aus dem Moment nimmt das Abräumen zurück")
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

    # 15a. Aufgaben im Bild: Handbreit nach Dauer, je Aufgabe einmal am Tag, höchstens CHALCAP am Tag
    base = {"seen": True, "gv": 3, "spend": [], "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {"zonen-tipp": 1, **{f"stage-{n}": 1 for n in range(10)}},
            "check": {"ts": 1760000000000, "ans": {}, "top": ["kl", "pa", "er"], "sum": {}}, "log": []}
    ctx, pg, errs = new(base, ua=andr2)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    ok(pg.evaluate("CHALCAP") == 8 and pg.evaluate("KATEGORIEN.every(k=>k.ch.every(c=>c.w===({5:2,10:3,15:4,20:5})[c.min]))"), "Handbreit je Aufgabe nach Dauer: 5 Min. 2, 10 Min. 3, 15 Min. 4")
    pg.evaluate("A.zone({dataset:{v:'kleidung@boden'}})"); pg.wait_for_timeout(400)
    tap(pg, '#sheet [data-a="chal"][data-v="c-kl1"]', 400)
    ok(W(pg) == 3 and "+3 Handbreit" in pg.locator("#toast .tx").inner_text(), "„Passt es noch?“ (10 Min.) bringt 3: " + pg.locator("#toast .tx").inner_text())
    ok(pg.evaluate("SH&&SH.type") == "zone" and pg.locator('#sheet [data-a="chal"][data-v="c-kl1"]').count() == 0 and pg.locator("#sheet .row.chal .stat.on").count() == 1, "Blatt bleibt offen, die Aufgabe ist abgehakt")
    pg.evaluate("A.chal({dataset:{v:'c-kl1'}})"); pg.wait_for_timeout(200)
    ok(W(pg) == 3 and len([e for e in S(pg)["log"] if e.get("cid") == "c-kl1"]) == 1 and "Heute schon" in pg.locator("#toast .tx").inner_text(), "dieselbe Aufgabe zweimal am selben Tag zählt nicht")
    pg.evaluate("A.chal({dataset:{v:'c-kl2'}});A.chal({dataset:{v:'c-kl3'}})"); pg.wait_for_timeout(200)
    ok(W(pg) == 8, "3 + 2 + 3 = 8: " + str(W(pg)))
    pg.evaluate("A.chal({dataset:{v:'c-bu1'}})"); pg.wait_for_timeout(200)
    ok(W(pg) == 8 and pg.evaluate("tally().parts.chal") == 8 and "Grenze" in pg.locator("#toast .tx").inner_text(), "Tagesdeckel 8 für Aufgaben im Bild: " + pg.locator("#toast .tx").inner_text())
    pg.evaluate("closeSheet()"); jump(pg, DAY); pg.evaluate("render()"); pg.wait_for_timeout(300)
    pg.evaluate("A.chal({dataset:{v:'c-kl1'}})"); pg.wait_for_timeout(200)
    ok(W(pg) == 11, "am nächsten Tag zählt dieselbe Aufgabe wieder: " + str(W(pg)))
    # Behalten: 1 Handbreit, höchstens dreimal am Tag
    pg.evaluate("for(let i=0;i<4;i++) S.log.push({id:'kp'+i,k:'keep',ts:now(),cat:'kl',name:'K'+i}); save()")
    ok(pg.evaluate("tally().parts.keep") == 8, "Behalten bringt 2 je Ding: " + str(pg.evaluate("tally().parts.keep")))
    ok(not errs, "Aufgaben ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 15b. Heute-Karte: Schritt 1 (Aufgabe mit Zeitgeber) → 2 (Abräumen) → 3 (Eintragen oder „Alles bleibt“) → geschafft
    hb_ = dict(base); hb_["log"] = [{"id": "y1", "k": "los", "ts": 1760778000000, "cat": "wo", "size": 3, "weg": "ver"}]
    ctx, pg, errs = new(hb_, ua=andr2)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    ok(pg.locator(".next.heute").count() == 1 and "Schritt 1 von 3" in pg.locator(".heute .next-h").inner_text(), "Startseite zeigt die Heute-Karte, Schritt 1")
    k0 = pg.evaluate("heute().k.id")
    tap(pg, '.heute [data-a="heute-alt"]', 300)
    k1 = pg.evaluate("heute().k.id")
    ok(k1 != k0 and pg.evaluate("KAT[heute().k.id].n") in pg.locator(".heute .hk").inner_text(), "„Andere Sorte“ wechselt die Sorte: %s → %s" % (k0, k1))
    c = pg.evaluate("heute().c")
    ok(pg.locator(".heute h3").inner_text() == c["t"] and pg.locator('.heute [data-a="chal"]').get_attribute("data-v") == c["id"], "Schritt 1 nennt die Aufgabe und bietet „Schon erledigt“")
    tap(pg, '.heute [data-a="heute-go"]', 400)
    ok(pg.evaluate("[SH.type,SH.d.cid]") == ["timer", c["id"]] and pg.locator("#sheet-in h2").inner_text() == c["t"] and c["x"][:30] in pg.locator("#sheet-in").inner_text(), "Zeitgeber zeigt die Aufgabe")
    ok(pg.evaluate("!!SH.d.end") and pg.locator('#sheet [data-a="chal"]').count() == 1, "Los startet den Zeitgeber sofort, „Erledigt“ ist da")
    pg.clock.run_for(c["min"] * 60000 + 3000); pg.wait_for_timeout(300)
    ok(pg.locator('#sheet [data-a="chal"]').count() == 1 and "Erledigt" in pg.locator('#sheet [data-a="chal"]').inner_text() and "Zeit ist um" in pg.locator("#sheet-in").inner_text(), "am Ende zeigt der Zeitgeber „Erledigt“: " + pg.locator("#sheet .btns").inner_text())
    w0 = W(pg); tap(pg, '#sheet [data-a="chal"]', 500)
    ok(W(pg) == w0 + c["w"] and pg.locator("#layer").get_attribute("hidden") is not None, "Erledigt schließt den Zeitgeber und bringt %d Handbreit" % c["w"])
    ok("Schritt 2 von 3" in pg.locator(".heute .next-h").inner_text() and pg.locator('.heute [data-a="spend"]').count() == 1, "danach Schritt 2: Abräumen")
    g, r = pg.evaluate("[guthaben(),raum()]"); cost = pg.evaluate("heute().cost")
    ok(pg.evaluate("katOfStelle(document.querySelector('.heute [data-a=spend]').dataset.v)") == k1, "Abräumen gilt der Sorte des Tages")
    tap(pg, '.heute [data-a="spend"]', 600)
    ok(pg.evaluate("[guthaben(),raum()]") == [g - cost, r + cost], "Abräumen aus der Karte setzt %d ein" % cost)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(300)
    ok("Schritt 3 von 3" in pg.locator(".heute .next-h").inner_text() and pg.locator('.heute [data-a="heute-fertig"]').count() == 1, "danach Schritt 3: Loslassen eintragen oder Alles bleibt")
    tap(pg, '.heute [data-a="heute-fertig"]', 400)
    ok("geschafft" in pg.locator(".heute .next-h").inner_text() and "Alles darf bleiben" in pg.locator("#toast .tx").inner_text(), "„Alles bleibt“: Heute geschafft")
    # anderer Weg in Schritt 3: Loslassen eintragen
    pg.evaluate("S.heute.fertig=false;save();render()"); pg.wait_for_timeout(300)
    tap(pg, '.heute [data-a="zone-go"][data-v="los"]', 400)
    ok(pg.evaluate("SH.d.z") == k1, "Loslassen aus Schritt 3 trägt die Sorte ein")
    tap(pg, '#sheet .opt[data-v="1"]'); tap(pg, '#sheet .chip[data-v="ver"]')
    pg.evaluate("document.querySelector('#sheet-in').scrollTop=9999"); tap(pg, '.btn[data-a="do-los"]', 600)
    ok("geschafft" in pg.locator(".heute .next-h").inner_text(), "nach dem Eintrag: Heute geschafft")
    # Dringendes geht vor
    pg.evaluate("S.wishes.push({id:'wz',name:'Lampe',cat:'ko',price:'',ts:now()-9*DAY,days:7,due:day0(now())-DAY,st:'wait'});save();render()"); pg.wait_for_timeout(300)
    ok(pg.locator(".next.heute").count() == 0 and "Zuerst das" in pg.locator(".next-h").inner_text() and "Lampe" in pg.locator(".next h3").inner_text(), "ein fälliger Wunsch steht als „Zuerst das“ vor der Heute-Karte")
    ok(not errs, "Heute-Karte ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()
    # Schritt 1 über „Schon erledigt“, 320 px ohne seitliches Verschieben
    ctx, pg, errs = new(hb_, w=320)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    sw = pg.evaluate("[document.documentElement.scrollWidth,document.documentElement.clientWidth]")
    ok(sw[0] <= sw[1], "320 px: Heute-Karte ohne seitliches Verschieben: " + str(sw))
    tap(pg, '.heute [data-a="chal"]', 500)
    ok("Schritt 2 von 3" in pg.locator(".heute .next-h").inner_text(), "„Schon erledigt“ führt zu Schritt 2")
    sw = pg.evaluate("[document.documentElement.scrollWidth,document.documentElement.clientWidth]")
    ok(sw[0] <= sw[1], "320 px: Schritt 2 ohne seitliches Verschieben: " + str(sw))
    tap(pg, '.zone-hit', 500)
    sw = pg.evaluate("[document.querySelector('#sheet-in').scrollWidth,document.querySelector('#sheet-in').clientWidth]")
    ok(sw[0] <= sw[1], "320 px: Blatt einer Sorte ohne seitliches Verschieben: " + str(sw))
    small = pg.evaluate("[...document.querySelectorAll('#sheet .btn, #sheet .chip, #sheet .opt')].filter(e=>e.offsetParent).map(e=>[e.textContent.trim().slice(0,20),Math.round(e.getBoundingClientRect().height)]).filter(x=>x[1]<44)")
    ok(not small, "320 px: Knöpfe im Blatt einer Sorte ≥ 44 px: " + str(small))
    ok(not errs, "320 px Heute ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 15c. Wissenskarten: Kasten „Probier es so“ mit Knopf zum Ziel
    ctx, pg, errs = new(base)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    miss = pg.evaluate("""(()=>{ const out=[]; for(const i of IMPULSE){ openSheet('imp',i.id); const b=document.querySelector('#sheet .box.tun');
        if(!b||!b.textContent.includes('Probier es so')||!b.querySelector('.btn')) out.push(i.id) } closeSheet(); return out })()""")
    ok(not miss, "jede Wissenskarte hat „Probier es so“ mit Knopf: fehlt bei " + str(miss[:5]))
    bad = pg.evaluate("""(()=>{ const out=[]; for(const id in TUN){ const T=TUN[id]; const ok=T.a==='chal'?!!CHAL[T.v]:T.a==='ueb'?!!UEB[T.v]:T.a==='aufg'?!!AUF[T.v]:T.a==='open'; if(!ok||!IMP[id]) out.push(id) } return out })()""")
    ok(not bad, "alle Ziele in TUN gibt es: " + str(bad))
    for iid, want in [("i07", ("zone", "erinnerung")), ("i01", ("wish", None)), ("i02", ("ueb", "u24")), ("i24", ("aufgaben", None)), ("i50", ("timer", None))]:
        pg.evaluate(f"openSheet('imp','{iid}')"); pg.wait_for_timeout(250)
        tap(pg, "#sheet .box.tun .btn", 400)
        got = pg.evaluate("SH&&[SH.type,SH.arg]")
        ok(got and got[0] == want[0] and (want[1] is None or str(got[1]).split("@")[0] == want[1]), f"Wissenskarte {iid}: Knopf führt zu {want}: {got}")
        pg.evaluate("closeSheet()"); pg.wait_for_timeout(250)
    pg.evaluate("S.settings.mode='school';save();openSheet('imp','i06')"); pg.wait_for_timeout(250)
    ok(pg.evaluate("TUN.i06.s").split(".")[0] in pg.locator("#sheet .box.tun").inner_text(), "Schule: Kasten zeigt die Schulfassung")
    pg.evaluate("closeSheet()")
    ok(not errs, "Wissenskarten ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 15d. „Selbst abräumen lassen“
    au = dict(base); au["log"] = [{"id": f"y{i}", "k": "los", "ts": 1760778000000 + i, "cat": "wo", "size": 6, "weg": "ver"} for i in range(2)]
    ctx, pg, errs = new(au)
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(400)
    n0 = pg.evaluate("Bild.gone(S.spend,keepers()).length")
    tap(pg, '.tab[data-tab="weg"]', 300)
    sw = pg.locator('.switch[data-a="autospend"]')
    ok(sw.count() == 1 and sw.get_attribute("aria-checked") == "false", "Einstellung „Selbst abräumen lassen“ ist da, aus")
    ga, ra = pg.evaluate("[guthaben(),raum()]")
    tap(pg, '.switch[data-a="autospend"]', 400)
    ok(S(pg)["settings"].get("auto") is True and pg.locator('.switch[data-a="autospend"]').get_attribute("aria-checked") == "true", "Schalter an")
    ok(ga > 0 and pg.evaluate("[guthaben(),raum()]") == [0, ra + ga] and S(pg)["spend"][-1].get("k") == "_alt" and S(pg)["spend"][-1].get("auto") == 1, "Guthaben wird als „_alt“ eingesetzt: " + str(S(pg)["spend"]))
    tap(pg, '.tab[data-tab="home"]', 500)
    ok(pg.evaluate("Bild.gone(S.spend,keepers()).length") > n0, "im Bild ist dadurch etwas fort")
    pg.evaluate("A.chal({dataset:{v:'c-pa1'}})"); pg.wait_for_timeout(400)
    ok(pg.evaluate("[guthaben(),raum()]") == [0, ra + ga + 2], "neue Handbreit setzt das Bild von allein ein: " + str(pg.evaluate("[guthaben(),raum()]")))
    tap(pg, '.tab[data-tab="weg"]', 300); tap(pg, '.switch[data-a="autospend"]', 400); tap(pg, '.tab[data-tab="home"]', 400)
    pg.evaluate("A.chal({dataset:{v:'c-pa2'}})"); pg.wait_for_timeout(400)
    ok(S(pg)["settings"].get("auto") is False and pg.evaluate("[guthaben(),raum()]") == [3, ra + ga + 2], "wieder aus: Guthaben bleibt zum Selbstwählen: " + str(pg.evaluate("[guthaben(),raum()]")))
    ok(not errs, "Selbst abräumen ohne Fehler: " + "; ".join(errs[:2]))
    ctx.close()

    # 13x. Möbel und Stauraum; Schwerpunkt nach der Bestandsaufnahme
    ctx, pg, errs = new({"seen": True, "gv": 3, "spend": [], "settings": {"theme": "system", "vib": True, "mode": None}, "mom": {"zonen-tipp": 1}})
    if pg.locator("#layer:not([hidden])").count(): pg.evaluate("closeSheet()"); pg.wait_for_timeout(300)
    mz = pg.evaluate("Bild.placed().filter(z=>z.kat==='moebel').map(z=>z.id)")
    ok(len(mz) >= 1 and pg.evaluate("Bild._build().filter(p=>p.kat==='moebel').map(p=>p.k).sort().join()") == "kiste,klappstuhl,kommode", "Möbel im Bild: Kommode mit Kiste, Klappstuhl: " + str(mz))
    pg.evaluate(f"A.zone({{dataset:{{v:'{mz[0]}'}}}})"); pg.wait_for_timeout(400)
    t = pg.locator("#sheet-in").inner_text()
    ok("Möbel und Stauraum" in t and "Ein Schrank im Kopf" in t and "Eher aufheben" in t and "Gut loslassen" in t, "Blatt Möbel und Stauraum mit Aufgaben und Hinweisen")
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(300)
    ok(pg.evaluate("CHECK.length") == 11 and pg.evaluate("CHECK.find(c=>c.id==='c11').fokus") is True, "Bestandsaufnahme fragt nach Möbeln, die nur aufbewahren")
    ok(pg.evaluate("focusKats({c01:3,c02:3,c11:3,c09:0,c10:0})") == ["kleidung", "moebel"], "Schwerpunkt aus den Antworten: " + str(pg.evaluate("focusKats({c01:3,c02:3,c11:3,c09:0,c10:0})")))
    ok(pg.evaluate("focusKats({c01:0,c02:1})") == [], "kein Schwerpunkt bei wenig Druck")
    g0 = pg.evaluate("[raum(),Bild.gone(S.spend,keepers()).length]")
    pg.evaluate("openSheet('check',null,{ans:{c01:3,c02:3,c03:0,c04:1,c05:0,c06:0,c07:0,c08:0,c09:2,c10:2,c11:3}}); SH.step=CHECK.length; drawSheet()"); pg.wait_for_timeout(300)
    t = pg.locator("#sheet-in").inner_text()
    ok("Gleich verwandelt sich dein Zimmer" in t and "Möbel und Stauraum" in t and pg.locator('#sheet .btn[data-a="close"]').inner_text() == "Zimmer verwandeln", "Ergebnis kündigt die Verwandlung an, Knopf „Zimmer verwandeln“")
    ok("Dein Zuhause gerade" in t and "kein Urteil über dich" in t and pg.locator("#sheet h3.profil").count() == 1 and "Du bist" not in t, "Momentaufnahme mit Namen, kein Personentyp: " + pg.locator("#sheet h3.profil").inner_text())
    ok(pg.evaluate("profilOf({kl:6,pa:0,er:0,wo:1,ko:5},{c01:3,c02:3,c09:3,c10:2})") == "kl+ko" and pg.evaluate("profilOf({kl:1,pa:1,er:0,wo:0,ko:0},{})") == "ruhig" and pg.evaluate("profilOf({kl:6,pa:6,er:6,wo:6,ko:6},{c01:3,c02:3,c05:3,c06:3})") == "viel", "Momentaufnahme: Paar, ruhig, viel")
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(2600)
    ok(pg.evaluate("bildModel(raum(),keepers()).focus").__contains__("moebel") and pg.evaluate("[raum(),Bild.gone(S.spend,keepers()).length]") == g0, "Schwerpunkt ändert nur die Betonung, nicht die Menge oder den Fortschritt")
    ok(pg.evaluate("heute().k.id") in pg.evaluate("focusKats()"), "Tageskarte beginnt mit einer Schwerpunkt-Sorte: " + pg.evaluate("heute().k.id"))
    ok("Dein Schwerpunkt" in pg.locator(".zliste").text_content(), "Liste „Was liegt hier?“ nennt den Schwerpunkt")
    ok(not errs, "Möbel und Schwerpunkt ohne Fehler: " + "; ".join(errs[:2]))
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
