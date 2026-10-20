# Freiraum (Arbeitstitel, früher „Lichtung“)

Eine helle Web-App, die beim Ausmisten hilft: Dinge gut weitergeben, Kaufwünsche warten lassen, bewusst behalten, kleine Aufgaben abhaken. Das Hauptbild ist ein Raum voller Kartons, der sich mit jedem losgelassenen Ding leert. Mit Wissen aus der Forschung, jede Aussage mit Quelle und Belegstufe. Kein Konto, kein Server, alles bleibt auf dem Gerät.

Live: https://wurstgott.github.io/lichtung/

## Aufbau

- `index.html` – die gebaute App (eine Datei, PWA)
- `src/` – Quellen: `shell.html`, `style.css`, `kern.js`, `wissen_a.js`, `wissen_b.js`, `praxis.js`, `aufgaben.js`, `haptik.js`, `bild.js`, `main.js`
- `src/build.py` – setzt alles zusammen: `cd src && OUT=.. python3 build.py`
- `tests/` – Datenprüfung und Playwright-Abläufe
- `KONZEPT.md` – Kernidee, Datenschema, Haltung

Idee und Auftrag: Carlo Maximilian Engeländer. Alle Rechte vorbehalten.
Schriften: Poppins und Inter, SIL Open Font License.
