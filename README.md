# Freiraum (Arbeitstitel, früher „Lichtung“)

Eine helle, forschungsbasierte Web-App fürs Ausmisten: Dinge gut weitergeben, Kaufwünsche warten lassen, bewusst behalten, kleine Aufgaben abhaken. Das Hauptbild ist ein überladenes, bewohntes Zimmer, das mit jedem losgelassenen Ding Stück für Stück leerer wird. Fortschritt wird in „Handbreit“ gemessen. Mit Wissen aus der Forschung, jede Aussage mit Quelle und Belegstufe. Kein Konto, kein Server, alles bleibt auf dem Gerät.

Live: https://wurstgott.github.io/freiraum/

## Aufbau

- `index.html` – die gebaute App (eine Datei, PWA)
- `src/` – Quellen: `shell.html`, `style.css`, `kern.js`, `wissen_a.js`, `wissen_b.js`, `praxis.js`, `aufgaben.js`, `haptik.js`, `bild.js`, `main.js`
- `src/build.py` – setzt alles zusammen: `cd src && OUT=.. python3 build.py`
- `tests/` – Datenprüfung und Playwright-Abläufe
- `KONZEPT.md` – Kernidee, Datenschema, Haltung

Idee und Auftrag: Carlo Maximilian Engeländer. Alle Rechte vorbehalten.
Schriften: TeX Gyre Schola (GUST Font License) und Inter (SIL Open Font License).
