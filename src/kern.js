/* Freiraum – feste Kerndaten. ids ändern sich nie. */
const APPNAME="Freiraum";
const APPSUB="Entscheiden, was bleibt";

const AREAS=[
  {id:"kl",n:"Kleidung",lang:"Kleidung, Schuhe, Taschen"},
  {id:"wo",n:"Wohnen",lang:"Küche, Möbel, Geräte, Werkzeug, Hobby"},
  {id:"pa",n:"Papier & Digitales",lang:"Unterlagen, Bücher, Fotos, Dateien, Apps"},
  {id:"er",n:"Erinnerungen",lang:"Geschenke, Erbstücke, Sammlungen, Andenken"},
  {id:"ko",n:"Kaufen & Teilen",lang:"Wünsche, Einkäufe, Leihen, Erlebnisse"}
];
const AREA=Object.fromEntries(AREAS.map(a=>[a.id,a]));

/* Stufen: wie viel vom Kram im Bild abgeräumt ist. Schwellen in Schwung, der im Bild eingesetzt ist.
   Die Namen sagen nur, wie viel frei ist, nicht wo: Was geht, wählt man selbst. */
const STUFEN=[
  {w:0,  n:"Alles da",           x:"Hier wohnt jemand, und alles liegt irgendwo: Tisch, Stuhl, Regal und Boden sind voll."},
  {w:3,  n:"Erste Lücke",        x:"Zum ersten Mal ist etwas fort. Man sieht, wo vorher etwas lag."},
  {w:8,  n:"Etwas Luft",         x:"Etwa ein Siebtel vom Kram im Bild ist weg. Das Zimmer ist noch voll, aber nicht mehr ganz."},
  {w:16, n:"Ein Fünftel frei",   x:"Ein Fünftel vom Kram im Bild ist abgeräumt."},
  {w:28, n:"Wege frei",          x:"Fast ein Drittel vom Kram im Bild ist fort. Der Rest wirkt schon ruhiger."},
  {w:45, n:"Viel Luft",          x:"Zwei Fünftel vom Kram im Bild sind abgeräumt. Die Wand wird heller."},
  {w:70, n:"Halb frei",          x:"Gut die Hälfte vom Kram im Bild ist fort. Man sieht wieder Flächen."},
  {w:105,n:"Zwei Drittel frei",  x:"Zwei Drittel vom Kram im Bild sind abgeräumt."},
  {w:150,n:"Fast ruhig",         x:"Nur noch ein Fünftel liegt herum. Die Farben sind ruhig."},
  {w:210,n:"Genug",              x:"Ein bewohntes Zimmer mit Platz dazwischen. Was hier steht, hat einen Grund."}
];
/* Allgemeine Schritte für den Zeitgeber, für fast jedes Zuhause */
const SCHRITTE=[
  ["Eine Ablage frei","Such dir eine Fläche, auf der sich etwas gesammelt hat: Tisch, Kommode, Fensterbank. Was dort hingehört, bleibt. Der Rest bekommt einen Platz oder kommt in eine Tüte zum Entscheiden.",10],
  ["Eine Schublade","Nimm eine einzige Schublade. Was du kennst und nutzt, bleibt. Was du nicht erkennst, kommt in die Vielleicht-Kiste.",10],
  ["Der Stuhl, auf dem Kleidung liegt","Was du trägst, kommt in den Schrank oder in die Wäsche. Was du nicht mehr trägst, kommt in eine Tüte für später.",5],
  ["Ein Regalbrett","Wähle ein Brett. Stell zuerst zurück, was du wirklich benutzt oder liest. Was nicht mehr passt, kommt auf einen Stapel zum Entscheiden.",15],
  ["Ein Stapel Papier","Nimm einen Stapel Briefe oder Zettel. Erledigtes kommt weg, Wichtiges in einen Ordner, Offenes an einen festen Platz.",10],
  ["Ein Karton, der lange zu ist","Öffne einen Karton, der lange nicht offen war. Wenn du nicht mehr weißt, was drin ist, ist das schon eine Antwort.",15],
  ["Eine Ecke am Boden","Such dir eine Ecke, in der etwas steht. Zehn Minuten, dann hörst du auf.",10],
  ["Was doppelt da ist","Such in einem Bereich nach Dingen, die du doppelt hast: Scheren, Ladekabel, Tassen. Lass eins oder zwei, der Rest kann weiter.",10],
  ["Unter dem Bett oder dem Tisch","Hol alles hervor und entscheide Stück für Stück: behalten, weitergeben, Vielleicht-Kiste.",15],
  ["Ein Platz für Neues","Wenn etwas Neues kommt: Wo soll es stehen? Hat es keinen Platz, lass es als Wunsch warten.",5]
];

/* Größen beim Loslassen in Handbreit. 5 („Etwas Großes“) gab es in der ersten Fassung, alte Einträge zählen weiter 5. */
const SIZES=[
  {v:1,n:"Ein Ding",x:"ein Buch, ein Pulli, eine Tasse"},
  {v:3,n:"Eine Tüte",x:"mehrere kleine Dinge"},
  {v:6,n:"Ein Karton",x:"eine volle Kiste"},
  {v:10,n:"Ein Möbel",x:"ein Möbel, ein Gerät, ein Fahrrad"}
];
const SIZE_ALT={5:"Etwas Großes"};
const WEGE=[
  {id:"ver",n:"Verschenkt",g:1},
  {id:"spe",n:"Gespendet",g:1},
  {id:"vk", n:"Verkauft",g:1},
  {id:"rec",n:"Recycelt",g:0},
  {id:"mue",n:"Entsorgt",g:0}
];
const WEG=Object.fromEntries(WEGE.map(w=>[w.id,w]));

/* Gründe, ein Ding bewusst zu behalten */
const GRUENDE=[
  {id:"oft",n:"Ich nutze es oft",x:"Ein Ding, das viel gebraucht wird, verdient seinen Platz. Was lange hält und oft benutzt wird, muss nicht neu gekauft werden."},
  {id:"kann",n:"Es macht mich fähig",x:"Werkzeuge, Instrumente und Sportsachen, mit denen du etwas selbst kannst, stärken Selbstständigkeit und Können.",imp:"i45"},
  {id:"sinn",n:"Es trägt Bedeutung",x:"Manche Dinge halten Erinnerungen und Beziehungen fest. Wenige davon können viel geben.",imp:"i33"},
  {id:"gut",n:"Es tut mir gut",x:"Manches freut dich immer wieder, wenn du es siehst oder benutzt. Das ist ein guter Grund."}
];
const GRUND=Object.fromEntries(GRUENDE.map(g=>[g.id,g]));
const MAXKEEP=12;

/* Wartezeiten für Wünsche */
const WAITS=[
  {d:7,n:"7 Tage",x:"für kleinere Dinge"},
  {d:30,n:"30 Tage",x:"die übliche Regel"},
  {d:90,n:"90 Tage",x:"für große Anschaffungen"}
];

/* Belegstufen */
const EV=[
  {n:"Denkanstoß",x:"Eine Idee oder Theorie. Sie ist plausibel, wurde aber nicht direkt geprüft."},
  {n:"Vorläufig",x:"Eine einzelne Studie, eine kleine Stichprobe oder Wiederholungen mit gemischtem Ergebnis."},
  {n:"Solide",x:"Mehrere Studien oder eine große, sorgfältige Studie zeigen dasselbe."},
  {n:"Gut belegt",x:"Metaanalysen oder viele unabhängige Wiederholungen kommen zum selben Ergebnis."}
];

/* Stationen je Bereich. Für Kaufen & Teilen gelten eigene Stationen. */
const STATIONEN={
  std:[
    {n:"Hingeschaut",x:"Du hast den Bereich in der Bestandsaufnahme eingeschätzt oder ein Ding daraus geprüft."},
    {n:"Losgelassen",x:"Du hast drei Dinge oder Tüten aus diesem Bereich weitergegeben. Bei Erinnerungen zählt auch jede bewusste Entscheidung, ob ein Stück bleibt."},
    {n:"Bewusst behalten",x:"Ein Ding aus diesem Bereich steht mit Grund in deinem Raum."},
    {n:"Geübt",x:"Du hast eine Übung aus diesem Bereich durchgezogen."},
    {n:"Nachgehalten",x:"Du hast eine Nachfrage beantwortet oder eine Vielleicht-Kiste aufgelöst."}
  ],
  ko:[
    {n:"Hingeschaut",x:"Du hast den Bereich in der Bestandsaufnahme eingeschätzt oder ein Ding geprüft."},
    {n:"Wunsch geparkt",x:"Du hast einen Kaufwunsch notiert und warten lassen."},
    {n:"Geteilt",x:"Du hast etwas geliehen, getauscht oder geteilt, statt es zu kaufen."},
    {n:"Geübt",x:"Du hast eine Übung aus diesem Bereich durchgezogen."},
    {n:"Gewartet",x:"Ein Wunsch hat seine volle Wartezeit bekommen, und du hast entschieden."}
  ]
};

/* Hilfe, wenn Loslassen oder Kaufen sehr schwer wird */
const HILFE=[
  {n:"Hausarztpraxis",x:"Ein guter erster Schritt. Sie kann an Psychotherapie oder Beratung weitervermitteln."},
  {n:"Suchtberatung",x:"Beratungsstellen helfen auch bei Kaufsucht, kostenlos und vertraulich. Adressen findest du über die Hausarztpraxis oder die Suchthilfe-Verzeichnisse der Länder."},
  {n:"Telefonseelsorge",x:"Wenn Sorgen zu groß werden: 0800 111 0 111, 0800 111 0 222 oder 116 123, kostenlos, rund um die Uhr.",tel:"08001110111"},
  {n:"Nummer gegen Kummer",x:"116 111 für Kinder und Jugendliche, kostenlos.",tel:"116111"},
  {n:"krisenchat.de",x:"Chat-Beratung für Menschen unter 25 Jahren, rund um die Uhr.",u:"https://krisenchat.de"},
  {n:"Schuldnerberatung",x:"Wenn Käufe zu Schulden geführt haben: Verbraucherzentralen und Wohlfahrtsverbände beraten kostenlos oder günstig."}
];
