# Freiraum – Konzept

Autor und Auftraggeber: Carlo Maximilian Engeländer. Alle Rechte vorbehalten.

## Kernidee

Das Hauptbild ist ein Raum. Am Anfang ist er mit Kartons, Kisten und Tüten vollgestellt. Wer Dinge gut weitergibt und weniger Neues hereinlässt, schafft Platz: Der Raum wird leerer und heller, und Licht fällt auf freie Dielen. So entsteht Freiraum, im Zimmer und im Kopf. Die wenigen Dinge, die man bewusst behält, bekommen einen festen Platz auf Bank, Bord und Regal.

Die App ist nicht gegen Besitz. Sie fragt, welcher Besitz einem dient. Werkzeuge, die selbstständig machen, Dinge, die man oft benutzt, und Dinge mit echter Bedeutung bekommen einen Ehrenplatz. Der Wissensteil erklärt mit Quellen, warum Loslassen schwerfällt und wo Besitz sinnvoll ist.

Zielgruppe: Erwachsene und Jugendliche ab etwa 14 Jahren. Alle Texte müssen für 14-Jährige verständlich und für Erwachsene tragfähig sein. Es gibt einen Modus „Ich gehe zur Schule“ mit eigenen Fassungen.

## Was die App nie tut

- Sie zählt keine Serien, die verfallen. Nichts verfällt, wenn man eine Pause macht.
- Sie schickt keine Push-Nachrichten, hat kein Konto und keinen Server.
- Sie belohnt nicht das Wegwerfen. Weitergeben, Verschenken und Reparieren zählen genauso viel Platz, aber die Bilanz zeigt ehrlich, wie viel im Müll gelandet ist.
- Sie verkauft nichts und verlinkt keine Shops.
- Sie lobt nicht überschwänglich. Rückmeldungen sind sachlich.

## Fünf Bereiche

| id | Name | Farbe |
|---|---|---|
| kl | Kleidung | Heidekraut |
| wo | Wohnen (Küche, Möbel, Geräte, Werkzeug, Hobby) | Rinde |
| pa | Papier & Digitales | Bachblau |
| er | Erinnerungen (Geschenke, Erbstücke, Sammlungen, Fotos) | Flieder |
| ko | Kaufen & Teilen (Konsum, Wünsche, Leihen, Erlebnisse) | Moos |

## Die vier Handlungen

1. **Loslassen**: ein Ding oder eine Tüte weitergeben (verschenkt, gespendet, verkauft, verliehen, recycelt, entsorgt). Macht den Raum freier. Nach 30 Tagen fragt die App einmal: „Hast du es vermisst?“ So sammelt man eigene Belege.
2. **Behalten mit Grund**: ein Ding bewusst behalten, mit einem von vier Gründen (oft benutzt, macht mich fähig, trägt Bedeutung, tut mir gut). Es bekommt dann einen festen Platz im Raum. Höchstens zwölf. Nach 90 und 365 Tagen: „Stimmt der Grund noch?“
3. **Wunsch parken**: einen Kaufwunsch notieren und 7, 30 oder 90 Tage warten. Er wartet als gestrichelter Platzhalter vor der Tür. Danach entscheidet man: lassen, leihen oder gebraucht, bewusst kaufen, weiter warten. Verblasste Wünsche werden zu Lichtpunkten.
4. **Vielleicht-Kiste**: Dinge, bei denen man unsicher ist, kommen für 30 Tage in eine Kiste. Was man nicht herausgeholt hat, kann man danach leichter gehen lassen.

Dazu: **Ein Ding prüfen** (geführte Entscheidungshilfe mit fünf Fragen), **Übungen** (mehrtägige Experimente mit Wenn-dann-Plan), **Wissen** (Impulse mit Quellen und Belegstufe, Quiz, Begriffe), **Bestandsaufnahme** (zehn Fragen, ergibt die drei wichtigsten Bereiche).

## Datenschema für Inhalte

Alle Inhalte sind JavaScript-Datenobjekte. Jede `id` ist fest und ändert sich nie. Texte stehen in deutschen Anführungszeichen „…“, nie in geraden Anführungszeichen innerhalb der Strings. Es wird geduzt. Keine Emojis.

### Impulse (`IMPULSE`)

```js
{ id:"i01", cat:"ko",
  t:"Titel, kurz, als Aussage oder Frage",
  x:"Befund, 50–80 Wörter, mit konkreten Zahlen, in einfachen ganzen Sätzen",
  c:"Einordnung: Grenzen der Studie, Gegenposition, Replikationslage. 25–60 Wörter",
  src:"Nachname, Initiale., & Nachname, Initiale. (Jahr). Titel. Zeitschrift, Band(Heft), Seiten.",
  u:"https://doi.org/… (geprüft)",
  ev:2,            // 0 Denkanstoß, 1 vorläufig, 2 solide, 3 gut belegt
  typ:"Experiment", // Experiment | Beobachtung | Übersicht | Idee
  tip:"Was das für dich heißen kann. Als Deutung formuliert, nie über den Befund hinaus. 15–35 Wörter",
  s:"optional: Schulfassung des tip, wenn der Erwachsenen-tip für Jugendliche nicht passt",
  myth:false        // true nur für „Oft gehört, schlecht belegt“
}
```

Belegstufen (schriftliche Skala):
- 0 Denkanstoß: eine Idee oder Theorie, plausibel, aber nicht direkt geprüft.
- 1 vorläufig: einzelne Studie, kleine Stichprobe oder widersprüchliche Wiederholungen.
- 2 solide: mehrere Studien oder eine große, sorgfältige Studie zeigen dasselbe.
- 3 gut belegt: Metaanalysen oder viele unabhängige Wiederholungen.

### Quiz-Duelle (`QUIZ`)

```js
{ id:"q01", q:"Frage", o:["Antwort A","Antwort B"], r:0, x:"Erklärung 20–45 Wörter", imp:"i01" }
```

### Übungen (`UEBUNGEN`)

```js
{ id:"u01", cat:"kl", t:"Titel", d:7,   // Dauer in Tagen (1–30)
  x:"Was man tut, 25–50 Wörter",
  steps:["Schritt 1","Schritt 2","Schritt 3"],
  wenn:"Vorschlag für einen Wenn-dann-Plan: Wenn …, dann …",
  warum:"Ein Satz, warum das hilft",
  imp:"i12",        // passender Impuls
  s:"optional: Schulfassung von x (für Jugendliche, die bei den Eltern wohnen)" }
```

### Begriffe (`BEGRIFFE`)

```js
{ id:"b01", t:"Besitztumseffekt", x:"Erklärung 25–45 Wörter",
  bsp:"Eine kurze Alltagssituation, an der man den Begriff erkennt (für das Quiz). Der Begriff selbst kommt darin nicht vor.",
  imp:"i05" }
```

### Monatsthemen (`MONATE`), 12 Stück, Index 0 = Januar

```js
{ t:"Titel", x:"Ein bis zwei Sätze, warum das jetzt passt", cat:"pa", u:"u05" }
```

### Bestandsaufnahme (`CHECK`), 10 Fragen

```js
{ id:"c01", cat:"kl", q:"Frage", o:["Antwort mit 0 Druck","…1","…2","…3 viel Druck"] }
```

## Impuls-Themenliste (feste ids)

Die Autoren füllen diese Plätze. Wenn sich ein Befund nicht mit einer echten, geprüften Quelle belegen lässt, wird das Thema durch ein verwandtes ersetzt und das im Bericht genannt. Quellen werden nie erfunden.

| id | cat | Thema |
|---|---|---|
| i01 | ko | Erlebnisse machen nachhaltiger glücklich als Dinge (Van Boven & Gilovich 2003) |
| i02 | ko | Vorfreude auf Erlebnisse ist angenehmer als auf Dinge (Kumar, Killingsworth & Gilovich 2014) |
| i03 | ko | Der Erlebnisvorteil ist kleiner, wenn das Geld knapp ist (Lee, Hall & Wood 2018) |
| i04 | ko | Hedonische Anpassung: Die Freude an Neuem verblasst |
| i05 | wo | Besitztumseffekt (Kahneman, Knetsch & Thaler 1990), mit Einordnung |
| i06 | wo | Versunkene Kosten: „Es war doch teuer“ (Arkes & Blumer 1985) |
| i07 | er | Ein Foto vom Erinnerungsstück erleichtert das Weggeben (Winterich, Reczek & Irwin 2017) |
| i08 | wo | Unordnung zu Hause und Stresshormon (Saxbe & Repetti 2010) |
| i09 | wo | Unordnung und das Gefühl von Zuhause (Roster, Ferrari & Jurkat 2016) |
| i10 | wo | Gegenposition: Unordnung und Kreativität (Vohs, Redden & Rahinel 2013), mit Replikationslage |
| i11 | pa | Visuelle Unordnung bindet Aufmerksamkeit (McMains & Kastner 2011) |
| i12 | ko | Materialismus und Wohlbefinden, Metaanalyse (Dittmar et al. 2014) |
| i13 | ko | Lassen sich materialistische Werte ändern? (Kasser et al. 2014) |
| i14 | ko | Freiwillige Einfachheit, Umwelt und Zufriedenheit (Brown & Kasser 2005) |
| i15 | ko | Was sagt die Forschung zu Minimalismus selbst? (Übersichtsarbeit, z. B. Hook et al. oder Lloyd & Pennington) |
| i16 | er | Dinge als Teil des Selbst (Belk 1988), Idee |
| i17 | wo | Wo Besitz sinnvoll ist: Werkzeuge, Autonomie und Kompetenz (Selbstbestimmungstheorie) |
| i18 | ko | Zeit kaufen statt Dinge (Whillans et al. 2017) |
| i19 | ko | Geld für andere ausgeben (Dunn, Aknin & Norton 2008), mit Replikationslage |
| i20 | ko | Frustkauf: Hilft Shoppen gegen schlechte Laune? (Rick, Pereira & Burson 2014) |
| i21 | ko | Kaufsucht: Wie verbreitet ist sie? (Maraz, Griffiths & Demetrovics 2016) |
| i22 | wo | Horten (Messie-Syndrom): Verbreitung und Behandlung |
| i23 | ko | Heiß und kalt: Warum Warten beim Kaufen hilft (Empathielücke, Loewenstein) |
| i24 | ko | Wenn-dann-Pläne (Gollwitzer & Sheeran 2006) |
| i25 | ko | Neustart-Effekt (Dai, Milkman & Riis 2014) |
| i26 | kl | Wie viel Kleidung wir kaufen und kaum tragen (Umfrage Deutschland) |
| i27 | kl | Kleidung wird kürzer genutzt (Ellen MacArthur Foundation 2017) |
| i28 | kl | Länger tragen senkt den Fußabdruck (WRAP) |
| i29 | wo | Bei Elektronik steckt das meiste in der Herstellung: länger nutzen, reparieren, gebraucht kaufen |
| i30 | ko | Mythos: „Eine Bohrmaschine wird nur 13 Minuten benutzt“ (myth:true) |
| i31 | wo | Mythos: „Jeder Mensch besitzt 10.000 Dinge“ (myth:true) |
| i32 | ko | Zu viel Auswahl lähmt? Die Metaanalysen sind gemischt (Scheibehenne et al. 2010; Chernev et al. 2015) |
| i33 | er | Nostalgie tut gut: wo Erinnerungsstücke sinnvoll sind (Sedikides, Wildschut) |
| i34 | pa | Fotografieren statt Hinschauen: Wer alles fotografiert, erinnert weniger (Henkel 2014) |
| i35 | pa | Das Handy in Reichweite (Ward et al. 2017), mit gescheiterten Wiederholungen |
| i36 | ko | Werbung und Materialismus bei Kindern und Jugendlichen (Opree, Buijzen & Valkenburg) |
| i37 | ko | Statusgüter: Wofür wir uns vergleichen (Solnick & Hemenway 1998) |
| i38 | ko | Macht mehr Geld glücklicher? (Killingsworth, Kahneman & Mellers 2023) |
| i39 | wo | IKEA-Effekt: Selbstgebautes schätzen wir mehr (Norton, Mochon & Ariely 2012) |
| i40 | er | Erlebnisse schenken verbindet mehr (Chan & Mogilner 2017) |
| i41 | ko | Moralische Lizenz: Nach dem Guten das Nachlassen (Blanken et al. 2015), mit Replikationslage |
| i42 | kl | Entscheidungsmüdigkeit und Kapselgarderobe: Die Ego-Depletion-Forschung wackelt (Hagger et al. 2016) |

## Sprache

- Einfache, ganze Sätze. Keine Satzfragmente, kein Pathos, nichts Kitschiges, keine Werbesprache.
- Für 14-Jährige verständlich, für Erwachsene tragfähig. Fachbegriffe beim ersten Mal erklären.
- Zahlen mit Einheit und Bezug. Keine Scheingenauigkeit.
- Keine Ratschläge über den Befund hinaus. Deutungen als Deutung kennzeichnen („Das kann heißen …“).
- Jugendliche wohnen oft bei den Eltern: Schulfassungen erinnern daran, nur über eigene Dinge zu entscheiden.
