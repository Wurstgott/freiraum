/* Kleine Aufgaben: antippen, wenn erledigt. ids ändern sich nie.
   art: "einmal" = dauerhafte Änderung, zählt einmal; "oft" = wiederholbar, höchstens einmal am Tag.
   w: Weite nach Wirkung (einmal 2–4, oft 1–2). zu: zählt in den Tagesdeckel von "los" oder "teil", sonst eigener Deckel. */
const AUFGABEN=[
  // Kleidung
  {id:"a01",cat:"kl",art:"oft",w:1,t:"Ein Teil geflickt",x:"Ein Knopf, eine Naht, ein Loch: Was repariert ist, muss nicht neu gekauft werden.",imp:"i28",zu:"teil"},
  {id:"a02",cat:"kl",art:"oft",w:1,t:"Getragen statt neu gekauft",x:"Du wolltest etwas Neues anziehen und hast stattdessen ein Teil aus deinem Schrank wiederentdeckt.",imp:"i27"},
  {id:"a03",cat:"kl",art:"einmal",w:3,t:"Kleiderbügel umgedreht (Trage-Test)",x:"Alle Bügel stehen verkehrt herum. Was du trägst, drehst du zurück. So siehst du, was du wirklich nutzt.",imp:"i26"},
  {id:"a04",cat:"kl",art:"einmal",w:2,t:"Saisonkleidung weggepackt",x:"Was gerade nicht passt zur Jahreszeit, liegt in einer Kiste. Der Schrank wird übersichtlich, und beim Auspacken siehst du, was fehlt und was nicht.",s:"Was gerade nicht zur Jahreszeit passt, liegt in einer Kiste. Frag zu Hause, wo Platz dafür ist."},
  // Wohnen
  {id:"a05",cat:"wo",art:"oft",w:1,t:"Eine Schublade durchgesehen",x:"Eine einzige Schublade, nicht mehr. Was raus soll, trägst du danach unter „Loslassen“ ein.",imp:"i24"},
  {id:"a06",cat:"wo",art:"oft",w:1,t:"Eine Fläche freigeräumt",x:"Ein Tisch, eine Ablage oder ein Regalbrett ist wieder frei und bleibt es bis morgen."},
  {id:"a07",cat:"wo",art:"oft",w:2,t:"Etwas repariert",x:"Ein Gerät, ein Möbel oder ein Fahrrad läuft wieder, ohne dass etwas Neues her musste.",imp:"i29",zu:"teil"},
  {id:"a08",cat:"wo",art:"oft",w:1,t:"Erst aufgebraucht, dann gekauft",x:"Du hast eine Packung, eine Tube oder ein Heft leer gemacht, bevor du Nachschub geholt hast."},
  {id:"a09",cat:"wo",art:"einmal",w:3,t:"Eine Regel für Neues festgelegt",x:"Du hast dir eine feste Regel gegeben, zum Beispiel: Kommt etwas Neues, geht etwas Altes.",imp:"i24"},
  {id:"a10",cat:"wo",art:"einmal",w:2,t:"Werkzeugkiste sortiert",x:"Du weißt jetzt, was du hast. Doppeltes ist aussortiert, Fehlendes kannst du gezielt leihen.",imp:"i45",s:"Du weißt jetzt, was in deiner Bastel- oder Werkzeugkiste ist. Doppeltes kannst du weitergeben."},
  // Papier & Digitales
  {id:"a11",cat:"pa",art:"einmal",w:3,t:"Werbung-Stopp am Briefkasten",x:"Ein Aufkleber „Bitte keine Werbung“ hält Prospekte fern. Weniger Papier, weniger Kaufreize.",s:"Frag zu Hause, ob ihr einen Aufkleber „Bitte keine Werbung“ an den Briefkasten klebt."},
  {id:"a12",cat:"pa",art:"einmal",w:3,t:"Shopping-Newsletter abbestellt",x:"Alle Werbe-Mails von Läden sind abbestellt. Was nicht im Postfach landet, weckt auch keinen Wunsch.",imp:"i23"},
  {id:"a13",cat:"pa",art:"einmal",w:3,t:"Shopping-Apps gelöscht",x:"Die Apps von Läden und Versandhändlern sind vom Handy. Kaufen geht noch, aber nicht mehr nebenbei.",imp:"i23"},
  {id:"a14",cat:"pa",art:"einmal",w:2,t:"Zahlungsdaten nicht mehr gespeichert",x:"Bei den Shops sind keine Kartendaten mehr hinterlegt. Ein Kauf braucht jetzt einen bewussten Schritt mehr.",s:"Kaufen in Apps braucht jetzt immer eine Bestätigung. Sprich das mit deinen Eltern ab."},
  {id:"a15",cat:"pa",art:"oft",w:1,t:"Einen Papierstapel abgearbeitet",x:"Ein Stapel Briefe, Zettel oder Rechnungen ist erledigt: abgelegt, beantwortet oder im Altpapier."},
  {id:"a16",cat:"pa",art:"oft",w:1,t:"Fünfzig Fotos aussortiert",x:"Doppelte, unscharfe und Bildschirmfotos sind gelöscht. Vorher sind die Lieblingsbilder gesichert.",imp:"i34"},
  {id:"a17",cat:"pa",art:"oft",w:1,t:"Eine App gelöscht",x:"Eine App, die du nicht mehr nutzt, ist weg. Ein Bildschirm voller Symbole wird ruhiger."},
  // Erinnerungen
  {id:"a18",cat:"er",art:"oft",w:1,t:"Ein Erinnerungsstück fotografiert",x:"Du hast ein Foto gemacht und aufgeschrieben, was es dir bedeutet. Ob es bleibt, entscheidest du später.",imp:"i07"},
  {id:"a19",cat:"er",art:"einmal",w:2,t:"Eine Erinnerungskiste eingerichtet",x:"Es gibt eine feste Kiste für Erinnerungen. Was hineinpasst, bleibt. Die Grenze hilft beim Auswählen.",imp:"i33"},
  {id:"a20",cat:"er",art:"oft",w:1,t:"Ein Erlebnis verschenkt",x:"Statt eines Dings hast du gemeinsame Zeit geschenkt: einen Ausflug, ein Essen, einen Kinobesuch.",imp:"i40"},
  {id:"a21",cat:"er",art:"einmal",w:2,t:"Wunschzettel mit Erlebnissen geschrieben",x:"Deine Familie oder Freunde wissen jetzt, dass du dir lieber Zeit und Erlebnisse wünschst als Dinge.",imp:"i40"},
  // Kaufen & Teilen
  {id:"a22",cat:"ko",art:"oft",w:1,t:"Einkaufszettel eingehalten",x:"Du hast nur gekauft, was auf dem Zettel stand. Spontankäufe blieben im Laden."},
  {id:"a23",cat:"ko",art:"oft",w:1,t:"Ein „Nur heute“-Angebot ignoriert",x:"Ein Rabatt, eine Aktion oder ein Countdown hat gelockt, und du hast nicht gekauft.",imp:"i23"},
  {id:"a24",cat:"ko",art:"oft",w:1,t:"Stöbern ohne Grund ausgelassen",x:"Du hast aus Langeweile nicht durch Shops gescrollt oder bist nicht ohne Grund durch Läden gebummelt.",imp:"i20"},
  {id:"a25",cat:"ko",art:"oft",w:2,t:"Etwas verliehen",x:"Jemand anderes musste dank dir nichts kaufen.",zu:"teil"},
  {id:"a26",cat:"ko",art:"einmal",w:3,t:"Bibliotheksausweis geholt",x:"Du hast einen Ausweis für die Bücherei. Bücher, Filme, Spiele und oft auch Werkzeug kannst du jetzt leihen.",imp:"i30"},
  {id:"a27",cat:"ko",art:"einmal",w:3,t:"Einer Tauschgruppe beigetreten",x:"Du bist in einer Gruppe zum Verschenken, Tauschen oder Leihen in deiner Nähe. Das macht Weitergeben und Leihen leicht.",s:"Frag zu Hause, ob es eine Tausch- oder Verschenkgruppe in der Nähe gibt, oder in der Schule einen Tauschtag."},
  {id:"a28",cat:"ko",art:"einmal",w:2,t:"Mitteilungen von Shop-Apps ausgeschaltet",x:"Läden dürfen dir keine Nachrichten mehr aufs Handy schicken.",imp:"i36"}
];
