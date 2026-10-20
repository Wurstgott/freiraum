/* Freiraum – feste Kerndaten. ids ändern sich nie. */
const APPNAME="Freiraum";
const APPSUB="Mehr Luft, mehr Lieblingsdinge";

const AREAS=[
  {id:"kl",n:"Kleidung",lang:"Kleidung, Schuhe, Taschen"},
  {id:"wo",n:"Wohnen",lang:"Küche, Möbel, Geräte, Werkzeug, Hobby"},
  {id:"pa",n:"Papier & Digitales",lang:"Unterlagen, Bücher, Fotos, Dateien, Apps"},
  {id:"er",n:"Erinnerungen",lang:"Geschenke, Erbstücke, Sammlungen, Andenken"},
  {id:"ko",n:"Kaufen & Teilen",lang:"Wünsche, Einkäufe, Leihen, Erlebnisse"}
];
const AREA=Object.fromEntries(AREAS.map(a=>[a.id,a]));

/* Stufen: Name, Text und Bild sind deckungsgleich. Schwellen in „Weite“. */
const STUFEN=[
  {w:0,  n:"Vollgestellt",   x:"Kartons, Kisten und Tüten stehen überall. Nur wenig Licht kommt durch das Fenster."},
  {w:1,  n:"Erster Karton",  x:"Drei große Kartonstapel sind weg. Mitten im Raum wird es lichter."},
  {w:5,  n:"Ein Stück Boden",x:"Vor dem Fenster ist ein Stück Boden frei. Man sieht die hellen Dielen."},
  {w:12, n:"Fenster frei",   x:"Auf der Bank unter dem Fenster steht nichts mehr. Das Licht fällt bis auf den Boden."},
  {w:24, n:"Freie Ecke",     x:"Der Boden in der linken Ecke ist frei. Auch an der Wand hängt weniger."},
  {w:44, n:"Luft zum Atmen", x:"Mehr als die Hälfte der Kisten ist fort. Zwischen den Dingen ist überall Platz."},
  {w:75, n:"Sonnenfleck",    x:"Der Lichtfleck vom Fenster ist ganz frei. Er leuchtet kräftig auf den Dielen."},
  {w:115,n:"Klare Flächen",  x:"Die Bank und das Wandbord sind leer, bis auf das, was du behältst."},
  {w:170,n:"Weiter Raum",    x:"Die Wände und das Regal sind leer. Auf dem Boden steht keine Kiste mehr."},
  {w:250,n:"Lieblingsraum",  x:"Der Raum ist leer und hell. Auf Bank, Bord und Regal steht nur noch, was du gern hast und bewusst behältst."}
];

const SIZES=[
  {v:1,n:"Ein Ding",x:"ein Buch, ein Pullover, eine Tasse"},
  {v:3,n:"Eine Tüte oder Kiste",x:"mehrere Dinge auf einmal"},
  {v:5,n:"Etwas Großes",x:"ein Möbelstück, ein Gerät, ein Fahrrad"}
];
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
