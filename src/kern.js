/* Lichtung – feste Kerndaten. ids ändern sich nie. */
const APPNAME="Lichtung";
const APPSUB="Platz für das, was bleibt";

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
  {w:0,  n:"Dickicht",       x:"Der Wald steht dicht. Nur ein kleiner Lichtfleck erreicht den Boden."},
  {w:1,  n:"Erste Lücke",    x:"Ein paar Bäume sind gegangen. Zwischen den Kronen öffnet sich eine Lücke."},
  {w:5,  n:"Lichtschacht",   x:"Durch die Lücke fällt jetzt ein Lichtstrahl bis auf den Boden."},
  {w:12, n:"Moosboden",      x:"Wo Licht hinkommt, wächst Moos. Der Boden der Lichtung wird grün."},
  {w:24, n:"Farne",          x:"Am Rand der Lichtung breiten sich Farne aus."},
  {w:44, n:"Baumstumpf",     x:"Ein alter Stumpf ist stehen geblieben. Er ist ein Platz zum Sitzen."},
  {w:75, n:"Quelle",         x:"Eine kleine Quelle sammelt sich zu einem Tümpel. Der Himmel spiegelt sich darin."},
  {w:115,n:"Wildblumen",     x:"Auf dem offenen Boden blühen Wildblumen in vielen Farben."},
  {w:170,n:"Offener Himmel", x:"Über der Lichtung ist der Himmel weit. Man sieht Wolken."},
  {w:250,n:"Weiter Blick",   x:"Am hinteren Rand öffnet sich der Wald. Man sieht bis zu den Hügeln."}
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
    {n:"Bewusst behalten",x:"Ein Ding aus diesem Bereich steht mit Grund in deiner Lichtung."},
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
