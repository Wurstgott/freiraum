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

/* Stufen: benannt nach dem, was im Bild frei wird. Name, Text und Bild sind deckungsgleich.
   Schwellen in Handbreit (Platz, den ein Ding im Regal braucht). */
const STUFEN=[
  {w:0,  n:"Alles da",           x:"Hier wohnt jemand, und alles liegt irgendwo: Tisch, Stuhl, Regal und Boden sind voll."},
  {w:3,  n:"Erste Lücke",        x:"Der Versandkarton und die Tüten vorn am Boden sind weg."},
  {w:8,  n:"Boden in Sicht",     x:"Ganz vorn liegt nichts mehr, der Teppich ist wieder zu sehen. Weiter hinten steht noch einiges."},
  {w:16, n:"Stuhl frei",         x:"Auf dem Stuhl liegt keine Kleidung mehr, nur die Strickjacke hängt dort. Auch die Socke hängt nicht mehr an der Lampe."},
  {w:28, n:"Tischecke frei",     x:"Die linke Hälfte vom Tisch ist frei. Dort kann man wieder etwas abstellen."},
  {w:45, n:"Regal mit Lücken",   x:"Im Regal liegt nichts mehr quer, zwischen den Büchern sind Lücken. Auch am Boden wird es frei."},
  {w:70, n:"Wand ohne Zettel",   x:"Die losen Zettel sind ab. Das Bild und die Pinnwand bleiben."},
  {w:105,n:"Tisch frei",         x:"Auf dem Tisch stehen Laptop, Lampe, Tasse und was du behältst."},
  {w:150,n:"Boden frei",         x:"Am Boden und unter dem Tisch liegt nichts mehr. Das Licht fällt auf die Dielen."},
  {w:210,n:"Genug",              x:"Ein bewohntes Zimmer mit Platz dazwischen. Was hier steht, hat einen Grund."}
];
/* Ein Schritt im eigenen Zimmer je Stufe: was man jetzt tun kann (Titel, Text, Minuten) */
const SCHRITTE=[
  ["Den Versandkarton vorn","Pack aus, was noch drin ist, und bring den Karton zum Altpapier. Das ist der schnellste sichtbare Schritt.",5],
  ["Die Tüten am Boden","Leere zwei Tüten. Was du brauchst, bekommt einen Platz. Der Rest kommt in eine Tüte zum Weitergeben.",10],
  ["Den Stuhl leer räumen","Was du trägst, kommt in den Schrank oder in die Wäsche. Was du nicht mehr trägst, kommt in eine Tüte für später.",5],
  ["Eine Tischecke freiräumen","Nimm dir die linke Hälfte vom Tisch vor. Was du jeden Tag brauchst, bleibt. Alles andere bekommt einen Platz oder kommt in eine Tüte.",10],
  ["Ein Regalfach als Grenze","Wähle ein Fach. Stell zuerst die Bücher hinein, die du wirklich liest. Was nicht mehr passt, kommt in die Vielleicht-Kiste.",15],
  ["Fünf Zettel von der Wand","Lies jeden Zettel einmal. Erledigtes kommt weg, Wichtiges an die Pinnwand oder als Foto ins Handy.",5],
  ["Den Tisch ganz frei","Räum den Tisch leer und stell nur zurück, was du diese Woche benutzt hast.",15],
  ["Unter dem Tisch","Hol alles unter dem Tisch hervor und entscheide Stück für Stück: behalten, weitergeben, Vielleicht-Kiste.",15],
  ["Eine Ecke am Boden","Such dir eine Ecke, in der noch etwas steht. Zehn Minuten, dann hörst du auf.",10],
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
