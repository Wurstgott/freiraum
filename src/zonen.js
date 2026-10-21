/* Kategorien im Bild: Jedes Ding im Zimmer steht für eine Sorte, die es in fast jedem Zuhause gibt.
   Quelle aller Aussagen: runde5/EVIDENZ5.md (Umfragen mit Eigeninteresse sind als solche benannt).
   Felder: id (wie in bild.js), n Name, kurz Untertitel, cat Bereich, name Vorbelegung beim Eintragen,
   fakt Befunde [{t Text, ev Belegstufe 0–3, q Quelle kurz, u Link}], halten was man eher aufhebt, los was man gut loslassen kann,
   ch Aufgaben [{id, t Titel, x ein Schritt, min Minuten, w Handbreit nach Dauer, s Fassung für die Schule}], imp passender Impuls.
   Handbreit je Aufgabe nach Aufwand: 5 Min. 2, 10 Min. 3, 15 Min. 4, 20 Min. 5. Das Ergebnis ist egal: Behalten zählt wie Weggeben.
   Die erste Aufgabe jeder Sorte ist der Einstieg („fang hiermit an“). */
const KATEGORIEN=[
  {id:"kleidung",n:"Kleidung",kurz:"Kleidung, Schuhe, Taschen",cat:"kl",name:"Kleidung",imp:"i26",
   fakt:[
    {t:"In einer deutschen Online-Umfrage 2025 hatten Menschen im Schnitt rund 90 Kleidungsstücke. Etwa ein Drittel davon trugen sie selten oder fast nie. Die Umfrage stammt von Greenpeace, einer Organisation mit eigenem Anliegen.",ev:1,q:"Greenpeace 2025",u:"https://www.greenpeace.de/publikationen/Einstellungen%20zum%20Kleidungskonsum.pdf"},
    {t:"In Großbritannien wurden rund 30 Prozent der Kleidung mindestens ein Jahr nicht getragen, meist weil sie nicht mehr passte. Befragt wurden fast 8.000 Erwachsene.",ev:1,q:"WRAP 2012",u:"https://wrap.ngo/resources/report/valuing-our-clothes-true-cost-how-we-design-use-and-dispose-clothing-uk-2012"},
    {t:"Der Spruch, man trage nur 20 Prozent seiner Kleidung, ist nicht gemessen. Gemessen sind etwa 30 bis 36 Prozent selten getragener Kleidung.",ev:0,q:"Mythen-Check, EVIDENZ5"}],
   halten:"Kleidung für seltene, aber sichere Anlässe wie Beerdigung, Bewerbung, Winter oder Sport. In Umfragen von Lagerfirmen nennen Menschen solche Stücke oft, wenn sie ein Weggeben bereuen. Die Umfragen sind schwach und haben ein Eigeninteresse.",
   los:"Was nicht passt und dir nicht gefällt. Das sind die häufigsten Gründe, warum Kleidung im Schrank bleibt.",
   ch:[
    {id:"c-kl1",t:"Passt es noch?",min:10,w:3,x:"Probier fünf Stücke an, die du lange nicht getragen hast. Für jedes ein Satz: passt und bleibt, will ich ändern lassen, oder darf weiter."},
    {id:"c-kl2",t:"Der Kleiderstuhl",min:5,w:2,x:"Was auf Stuhl, Bett oder Haken liegt: Tragbares in den Schrank, Getragenes in die Wäsche, Unsicheres in eine Tüte für später."},
    {id:"c-kl3",t:"Ein Fach für seltene Anlässe",min:10,w:3,x:"Leg Kleidung für seltene Anlässe an einen festen Platz: Feier, Bewerbung, Winter, Sport. Sie bleibt, auch wenn du sie selten trägst."}]},
  {id:"buecher",n:"Bücher und Medien",kurz:"Bücher, Zeitschriften, Filme, Spiele",cat:"pa",name:"Bücher",imp:"i05",
   fakt:[
    {t:"In 31 Ländern hatten Erwachsene, die mit 16 Jahren in einem Haushalt mit vielen Büchern lebten, bessere Lese- und Rechenfähigkeiten. Das ist ein Zusammenhang, kein Beweis für eine Ursache.",ev:2,q:"Sikora, Evans & Kelley 2019",u:"https://doi.org/10.1016/j.ssresearch.2018.10.003"},
    {t:"Wie viele Bücher ungelesen im Regal stehen, hat niemand gezählt. Für das Gefühl, ein Buch noch lesen zu müssen, weil es Geld gekostet hat, gibt es aber gute Belege: Was man bezahlt hat, will man nicht verschwenden.",ev:2,q:"Arkes & Blumer 1985"}],
   halten:"Bücher, die du wieder liest oder nachschlägst, und Bücher in Haushalten mit Kindern und Jugendlichen.",
   los:"Doppeltes, veraltete Ratgeber und Reiseführer, Bücher, die du nur noch lesen solltest, aber nicht willst.",
   ch:[
    {id:"c-bu1",t:"Fünf Bücher in die Hand",min:10,w:3,x:"Nimm fünf Bücher aus dem Regal. Für jedes ein Satz: gelesen und behalten, will ich lesen, oder darf weiter. Alle drei Antworten sind gleich gut."},
    {id:"c-bu2",t:"Wer liest es als Nächstes?",min:5,w:2,x:"Wähl ein Buch, das du gern weitergeben würdest, und schreib auf, wem es gefallen könnte. Ein offener Bücherschrank ist auch eine Antwort."},
    {id:"c-bu3",t:"Der Medienstapel",min:15,w:4,x:"Sieh DVDs, CDs oder Spiele durch. Was kannst du noch abspielen, und was hast du in den letzten Jahren eingelegt? Der Rest kommt auf einen Stapel zum Entscheiden."}]},
  {id:"papier",n:"Papier und Unterlagen",kurz:"Briefe, Zettel, Ordner",cat:"pa",name:"Papiere",imp:"i24",
   fakt:[
    {t:"Die Verbraucherzentrale empfiehlt Fristen: Kassenbons und Garantien 2 Jahre, Kontoauszüge 3, Steuerunterlagen meist 4, Steuerbescheide mindestens 10 Jahre. Urkunden, Zeugnisse, Arbeits- und Rentennachweise dauerhaft. Das ersetzt keine Rechtsberatung.",ev:2,q:"Verbraucherzentrale, Stand 23.10.2025",u:"https://www.verbraucherzentrale.de/wissen/digitale-welt/datenschutz/aufbewahrungspflichten-welche-unterlagen-muss-ich-wie-lange-behalten-84296"},
    {t:"Persönliches sollte vor dem Wegwerfen vernichtet werden, also geschreddert oder geschwärzt.",ev:2,q:"Verbraucherzentrale 2025"}],
   halten:"Urkunden, Zeugnisse, Renten- und Arbeitsnachweise und alles, dessen Frist noch läuft.",
   los:"Abgelaufenes, Werbepost und Entwürfe, wenn es die fertige Fassung gibt.",
   ch:[
    {id:"c-pa1",t:"Ein Stapel, drei Häufchen",min:5,w:2,x:"Nimm einen Stapel loser Zettel und Briefe. Mach drei Häufchen: erledigen, ablegen, Altpapier. Persönliches kommt in den Schredder."},
    {id:"c-pa2",t:"Eine Mappe für Dauerhaftes",min:10,w:3,x:"Sammle Urkunden, Zeugnisse und Rentenunterlagen an einem Ort. Hier geht nichts weg. Danach weißt du, was wirklich wichtig ist.",s:"Sammle deine Zeugnisse und Urkunden in einer Mappe. Frag zu Hause, wo sie sicher liegen."},
    {id:"c-pa3",t:"Ein Ordner, eine Frist",min:15,w:4,x:"Nimm einen Ordner. Leg alles heraus, dessen Frist abgelaufen ist, auf einen Stapel zum Schreddern. Was du nicht sicher weißt, bleibt."}]},
  {id:"erinnerung",n:"Erinnerungen",kurz:"Fotos, Andenken, Erbstücke",cat:"er",name:"Erinnerungsstück",imp:"i07",
   fakt:[
    {t:"Ein Foto vom Erinnerungsstück verringerte in mehreren Experimenten das Gefühl, mit dem Ding einen Teil von sich zu verlieren. Bei einer Spendenaktion kamen mit diesem Hinweis mehr Dinge zusammen.",ev:2,q:"Winterich, Reczek & Irwin 2017",u:"https://doi.org/10.1509/jm.16.0311"},
    {t:"In Umfragen werden Erinnerungsstücke, Fotos und Erbstücke am häufigsten genannt, wenn Menschen ein Weggeben bereuen. Die Umfragen stammen von Lagerfirmen. Eine wissenschaftliche Studie zum Bedauern nach dem Ausmisten gibt es nicht.",ev:1,q:"StoreAnyBox 2015; YouGov/Safestore"}],
   halten:"Unersetzliches wie Briefe, Fotos und Erbstücke, auch wenn du sie selten ansiehst. Hier gibt es keinen Druck.",
   los:"Mehrfaches, zum Beispiel zehn Konzertkarten statt einer, wenn ein Stück oder ein Foto die Erinnerung trägt.",
   ch:[
    {id:"c-er1",t:"Ein Stück, ein Foto",min:5,w:2,x:"Fotografier ein Erinnerungsstück und schreib einen Satz dazu, woran es dich erinnert. Das Ding bleibt, wenn du willst."},
    {id:"c-er2",t:"Eine Kiste ansehen",min:15,w:4,x:"Öffne eine Kiste mit Andenken, ohne Ziel. Erzähl dir zu drei Dingen, woran sie erinnern. Nichts muss gehen.",s:"Öffne eine Kiste mit deinen eigenen Andenken. Erzähl dir zu drei Dingen, woran sie erinnern."},
    {id:"c-er3",t:"Das Beste von vielen",min:10,w:3,x:"Nimm eine Sammlung gleichartiger Dinge, etwa Karten oder Kinderzeichnungen. Wähl die drei, die die Erinnerung am besten tragen. Über die anderen entscheidest du später."}]},
  {id:"kueche",n:"Küche und Geschirr",kurz:"Tassen, Geschirr, Geräte, Vorräte",cat:"wo",name:"Küchensachen",
   fakt:[
    {t:"In britischen Umfragen von Firmen haben viele Menschen mindestens ein ungenutztes Küchengerät, am häufigsten Sandwich-Toaster, Mixer und Entsafter. Die Umfragen haben ein Eigeninteresse und nennen ihre Stichprobe nicht. Für Deutschland gibt es keine unabhängige Zählung.",ev:1,q:"Halifax 2017; Tefal 2026"},
    {t:"Für Dinge, die man besitzt, verlangt man im Mittel etwa dreimal so viel, wie man selbst dafür zahlen würde. Das macht Weggeben schwerer, als es sein müsste.",ev:3,q:"Horowitz & McConnell 2002",u:"https://doi.org/10.1006/jeem.2001.1215"}],
   halten:"Was du jede Woche nutzt, und ein Gerät für Gäste, wenn es dafür wirklich läuft.",
   los:"Geräte für einen einzigen Zweck, den ein anderes Gerät mit erledigt, und Geschirr über die übliche Zahl von Gästen hinaus. Das ist eine Erfahrungsregel.",
   ch:[
    {id:"c-ku1",t:"Die Becher zählen",min:5,w:2,x:"Zähl Becher oder Gläser. Wie viele brauchst du an einem vollen Tag mit Besuch? Die Lieblinge bleiben, über den Rest entscheidest du später."},
    {id:"c-ku2",t:"Die Geräte-Liste",min:10,w:3,x:"Schreib alle Elektrogeräte der Küche auf und daneben, wann du sie zuletzt benutzt hast. Nur aufschreiben, nichts entscheiden.",s:"Schreib mit deiner Familie auf, welche Küchengeräte es gibt und wann sie zuletzt liefen."},
    {id:"c-ku3",t:"Eine Schublade",min:10,w:3,x:"Leer eine Küchenschublade. Leg zurück, was du im letzten Monat benutzt hast. Den Rest legst du in eine Kiste mit Datum."}]},
  {id:"technik",n:"Kabel und Technik",kurz:"Kabel, Ladegeräte, alte Handys",cat:"wo",name:"Kabel und Geräte",
   fakt:[
    {t:"In deutschen Haushalten liegen nach einer Umfrage von 2026 etwa 167 Millionen ungenutzte alte Handys. Als Gründe nannten 28 Prozent Sorge um ihre Daten und 11 Prozent, dass sie nicht wissen, wohin damit. Die Umfrage stammt vom Branchenverband Bitkom.",ev:1,q:"Bitkom 2026",u:"https://www.bitkom.org/Presse/Presseinformation/Deutsche-horten-167-Millionen-Alt-Handys"},
    {t:"Große Supermärkte und Elektrohändler nehmen kleine Elektrogeräte bis 25 Zentimeter kostenlos zurück, auch ohne Neukauf. Wertstoffhöfe nehmen sie ebenfalls kostenlos.",ev:2,q:"Umweltbundesamt 2022, ElektroG",u:"https://www.umweltbundesamt.de/presse/pressemitteilungen/25000-zusaetzliche-rueckgabestellen-fuer"}],
   halten:"Ein Ersatzgerät und Ladekabel für Geräte, die du noch hast.",
   los:"Alte Geräte, nachdem du die Daten gelöscht hast, und Kabel ohne Gerät.",
   ch:[
    {id:"c-te1",t:"Kabel zuordnen",min:10,w:3,x:"Nimm die Kabelkiste. Leg jedes Kabel zu dem Gerät, zu dem es gehört. Was übrig bleibt, kommt in eine Tüte für die Rücknahme."},
    {id:"c-te2",t:"Ein altes Gerät leeren",min:15,w:4,x:"Sichere Fotos, setz ein altes Handy zurück und nimm SIM- und Speicherkarte heraus. Ob es danach bleibt oder geht, entscheidest du später.",s:"Frag zu Hause, ob ein altes Handy herumliegt. Das Löschen der Daten macht ihr zusammen."},
    {id:"c-te3",t:"Wo kann es hin?",min:5,w:2,x:"Schreib auf, welcher Supermarkt, Elektroladen oder Wertstoffhof in deiner Nähe kleine Geräte annimmt."}]},
  {id:"deko",n:"Deko und Kleinkram",kurz:"Figuren, Dosen, Geschenke, Kleinkram",cat:"wo",name:"Kleinkram",imp:"i51",
   fakt:[
    {t:"Wer ein Geschenk weitergibt, kränkt die Schenkenden weniger, als Beschenkte glauben. Das zeigten fünf Studien. Weiterverschenken fanden Schenkende besser als Wegwerfen.",ev:2,q:"Adams, Flynn & Norton 2012",u:"https://doi.org/10.1177/0956797612439718"},
    {t:"In einer Befragung von fast 1.500 Menschen hing viel Unordnung mit geringerem Wohlbefinden zusammen. Dinge, die zur eigenen Person gehören, machten das Zuhause dagegen persönlicher.",ev:1,q:"Roster, Ferrari & Jurkat 2016"}],
   halten:"Was du täglich siehst und magst.",
   los:"Geschenke, die du nur aus Pflicht aufhebst.",
   ch:[
    {id:"c-de1",t:"Eine Fläche",min:10,w:3,x:"Nimm alles von einem Regalbrett oder einer Fensterbank. Stell nur zurück, was du sehen willst. Der Rest kommt in eine Kiste mit Datum."},
    {id:"c-de2",t:"Ein Pflicht-Geschenk",min:5,w:2,x:"Such ein Geschenk, das du nur aus Pflicht behältst. Überleg, wer sich darüber freuen würde. Du darfst es auch behalten."},
    {id:"c-de3",t:"Eine Dose öffnen",min:5,w:2,x:"Öffne eine Dose, Kiste oder Schale mit Kleinkram. Was du kennst und nutzt, bleibt. Was du nicht erkennst, kommt in die Vielleicht-Kiste."}]},
  {id:"verpackung",n:"Kartons und Tüten",kurz:"Versandkartons, Tüten, Verpackungen",cat:"ko",name:"Kartons und Tüten",
   fakt:[
    {t:"Für die Gewährleistung brauchst du keine Originalverpackung. Auch beim Widerruf im Onlinehandel darf der Händler die Rückgabe meist nicht davon abhängig machen.",ev:2,q:"ERGO Rechtsportal; OLG Frankfurt 1 U 127/05",u:"https://www.ergo.de/de/rechtsportal/internetrecht/widerruf-und-rueckgaberecht/ruecksendung-in-originalverpackung"},
    {t:"2021 ging in Deutschland nach einer Händlerbefragung etwa jedes vierte Paket aus dem Onlinehandel zurück.",ev:1,q:"Universität Bamberg, Retourenforschung"}],
   halten:"Die Originalverpackung, solange die Widerrufsfrist von 14 Tagen läuft und du unsicher bist, und ein bis zwei Kartons zum Versenden.",
   los:"Kartons, die du nur für die Garantie aufhebst, und Tüten über das hinaus, was in eine Tüte passt.",
   ch:[
    {id:"c-ve1",t:"Eine Tüte voller Tüten",min:5,w:2,x:"Steck alle Tüten in eine Tüte. Was nicht hineinpasst, geht zum Wertstoff oder an jemanden, der Tüten braucht."},
    {id:"c-ve2",t:"Der Karton-Check",min:5,w:2,x:"Prüf jeden aufgehobenen Karton: Läuft noch eine Rückgabefrist? Wenn nicht, darf er weg, außer du brauchst ihn zum Versenden."},
    {id:"c-ve3",t:"Noch verpackt",min:10,w:3,x:"Such Dinge, die noch verpackt sind oder nicht passen. Prüf, ob du sie noch zurückgeben kannst. Wenn nicht, kann jemand anderes sie nutzen."}]},
  {id:"hobby",n:"Hobby, Sport, Spielzeug",kurz:"Sportsachen, Bastelzeug, Spiele",cat:"wo",name:"Hobbysachen",imp:"i45",
   fakt:[
    {t:"Menschen überschätzen, wie oft sie etwas künftig nutzen. Im Fitnessstudio zahlten Mitglieder mit Monatsvertrag pro Besuch mehr als mit einer Zehnerkarte.",ev:2,q:"DellaVigna & Malmendier 2006",u:"https://doi.org/10.1257/aer.96.3.694"},
    {t:"Kleinkinder spielten mit 4 statt 16 Spielzeugen etwa doppelt so lange mit einem Spielzeug. Das war eine kleine Laborstudie. Wegnehmen muss man dafür nichts, es reicht, weniger auf einmal sichtbar zu haben.",ev:1,q:"Dauch et al. 2018",u:"https://doi.org/10.1016/j.infbeh.2017.11.005"},
    {t:"Die Zahl, eine Bohrmaschine werde nur 13 Minuten im Leben benutzt, hat keine bekannte Datengrundlage.",ev:0,q:"Slee 2015"}],
   halten:"Ausrüstung für das, was du tatsächlich tust, und Instrumente. Instrumente und Sportgeräte werden in Umfragen von Lagerfirmen oft genannt, wenn Menschen ein Weggeben bereuen. Die Umfragen sind schwach.",
   los:"Ausrüstung für ein künftiges Ich, das lange nicht kam. Was es gekostet hat, ist kein Grund zu bleiben.",
   ch:[
    {id:"c-ho1",t:"Ehrlich beim Hobby",min:10,w:3,x:"Nimm ein Gerät, das lange nicht benutzt wurde. Frag: Will ich es in den nächsten drei Monaten benutzen? Wenn ja, trag dir einen Termin ein. Wenn nein, darf es zu jemandem, der es nutzt."},
    {id:"c-ho2",t:"Spielzeug tauschen",min:15,w:4,x:"Pack einen Teil des Spielzeugs in eine Kiste und stell sie weg. In einigen Wochen wird getauscht. Kinder entscheiden über ihre eigenen Sachen mit.",s:"Pack einen Teil deiner Spielsachen in eine Kiste und stell sie weg. In ein paar Wochen tauschst du."},
    {id:"c-ho3",t:"Leihen statt besitzen",min:5,w:2,x:"Schau nach, ob es in deiner Nähe eine Bibliothek der Dinge, eine Bücherei mit Geräten oder eine Tauschgruppe gibt."}]},
  {id:"moebel",n:"Möbel und Stauraum",kurz:"Schränke, Kommoden, Regale, Extra-Stühle",cat:"wo",name:"Möbel",imp:"i59",
   fakt:[
    {t:"In Deutschland hat jede Person im Schnitt 49 Quadratmeter Wohnfläche, 1990 waren es 35. Jeder Quadratmeter will geheizt, beleuchtet und gepflegt werden. Nach dem Weltklimarat hat der Zuwachs an Fläche die Fortschritte beim Heizen etwa aufgezehrt. Er nennt dafür mittlere Belege.",ev:2,q:"Umweltbundesamt 2025; IPCC AR6 WGIII Kap. 9",u:"https://www.umweltbundesamt.de/daten/private-haushalte-konsum/wohnen/wohnflaeche"},
    {t:"In einer US-Befragung älterer Menschen sagten die mit mehr Zimmern häufiger, sie hätten mehr Dinge als nötig. Die Zahl stammt aus einem kurzen Fachbeitrag, nicht aus einer begutachteten Studie. Ob der Platz die Dinge anzieht, ist nicht geklärt.",ev:1,q:"Ekerdt 2012 (Newsletter-Beitrag); Hintergrund: Ekerdt & Baker 2014",u:"https://doi.org/10.1093/geronb/gbu003"},
    {t:"In der EU wird der größte Teil alter Möbel verbrannt oder deponiert. Die Schätzung stammt aus einer Studie für einen Umweltverband. Gebraucht weitergegebene Möbel helfen vor allem dann, wenn dafür kein neues gekauft wird.",ev:1,q:"Eunomia für das EEB; Rebound-Studie Dänemark"}],
   halten:"Möbel, die du jede Woche nutzt, Möbel für seltene, aber sichere Anlässe wie Gästebett oder Ausziehtisch, Erbstücke, die dir etwas bedeuten, und alles, was dir Halt und Sicherheit gibt. In kleinen Wohnungen fehlt eher Stauraum, als dass es zu viel gibt.",
   los:"Ein Schrank, der nur aufbewahrt, was du nicht mehr nutzt, und dessen Inhalt woanders Platz hätte. Möbel, die einen Weg versperren, und doppelte Möbel nach einem Zusammenzug oder Erbe.",
   ch:[
    {id:"c-mo1",t:"Ein Schrank im Kopf",min:10,w:3,x:"Wähl einen Schrank oder eine Kommode. Geh Fach für Fach durch und frag: Habe ich das im letzten Jahr benutzt, und wo hätte es sonst Platz? Nimm nichts heraus. Am Ende steht einer von drei Sätzen: Der Schrank wird gebraucht, ein Fach ist frei, oder der Schrank könnte gehen. Alle drei sind gut.",s:"Geh ein Fach in deinem Zimmer durch und frag: Habe ich das im letzten Jahr benutzt? Nimm nichts heraus."},
    {id:"c-mo2",t:"Der Wochen-Rundgang",min:10,w:3,x:"Geh durch die Wohnung. Leg auf jedes Möbel, das du diese Woche benutzt hast, einen Zettel. Schau, wo keiner liegt, und frag: Brauche ich es für einen seltenen Anlass, oder steht es nur? Heute entscheidest du nichts.",s:"Schau in deinem Zimmer, welche Möbel und Kisten du diese Woche benutzt hast. Heute entscheidest du nichts."},
    {id:"c-mo3",t:"Bevor ein neues Regal kommt",min:5,w:2,x:"Schreib auf, was in ein neues Regal oder einen neuen Schrank soll und wie oft du es nutzt. Warte zwei Wochen. Brauchst du die Dinge regelmäßig, ist das neue Möbel eine gute Entscheidung. Wenn nicht, mach zuerst „Ein Schrank im Kopf“."}]}
];
