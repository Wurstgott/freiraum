/* Platzhalter für die Entwicklung, solange die echten Inhalte fehlen */
var IMPULSE_A=typeof IMPULSE_A!=="undefined"?IMPULSE_A:[
 {id:"i01",cat:"ko",t:"Erlebnisse halten länger als Dinge",x:"Platzhaltertext für einen Befund mit konkreten Zahlen. Er wird später durch den recherchierten Text ersetzt. Hier stehen etwa fünfzig bis achtzig Wörter, damit das Layout realistisch aussieht und Umbrüche geprüft werden können.",c:"Platzhalter für die Einordnung mit Grenzen der Studie.",src:"Van Boven, L., & Gilovich, T. (2003). To do or to have? Journal of Personality and Social Psychology, 85(6), 1193–1202.",u:"https://doi.org/10.1037/0022-3514.85.6.1193",ev:2,typ:"Experiment",tip:"Das kann heißen: Wenn du zwischen einem Ding und einem Erlebnis schwankst, lohnt sich ein zweiter Blick auf das Erlebnis."},
 {id:"i05",cat:"wo",t:"Was wir haben, bewerten wir höher",x:"Platzhaltertext für den Besitztumseffekt mit Zahlen.",c:"Platzhalter.",src:"Kahneman, D., Knetsch, J. L., & Thaler, R. H. (1990).",u:"https://doi.org/10.1086/261737",ev:2,typ:"Experiment",tip:"Platzhalter-Deutung."}];
var QUIZ_A=typeof QUIZ_A!=="undefined"?QUIZ_A:[{id:"q01",q:"Platzhalterfrage?",o:["A","B"],r:1,x:"Platzhalter-Erklärung.",imp:"i01"}];
var IMPULSE_B=typeof IMPULSE_B!=="undefined"?IMPULSE_B:[];
var QUIZ_B=typeof QUIZ_B!=="undefined"?QUIZ_B:[];
var UEBUNGEN=typeof UEBUNGEN!=="undefined"?UEBUNGEN:[
 {id:"u01",cat:"kl",t:"Bügel umdrehen",d:21,x:"Häng alle Kleider mit umgedrehtem Bügel auf. Was du trägst, hängst du richtig herum zurück.",steps:["Alle Bügel umdrehen.","Getragenes richtig herum zurückhängen.","Nach drei Wochen nachsehen."],wenn:"Wenn ich ein Teil nach dem Waschen aufhänge, dann drehe ich den Bügel richtig herum.",warum:"So siehst du ohne Raten, was du wirklich trägst.",imp:"i01"},
 {id:"u02",cat:"ko",t:"Wunschliste mit Wartezeit",d:30,x:"Schreib jeden Kaufwunsch auf und warte dreißig Tage.",steps:["Wunsch notieren.","Warten.","Neu entscheiden."],wenn:"Wenn ich etwas kaufen will, dann parke ich es zuerst.",warum:"Mit Abstand entscheidest du kühler.",imp:"i23"},
 {id:"u03",cat:"pa",t:"Eine Schublade am Tag",d:5,x:"Nimm dir an fünf Tagen je eine Schublade vor.",steps:["Schublade leeren.","Sortieren.","Zurücklegen, was bleibt."],wenn:"Wenn ich abends den Tisch abräume, dann nehme ich mir eine Schublade vor.",warum:"Kleine Portionen machen den Anfang leicht.",imp:"i24"}];
var BEGRIFFE=typeof BEGRIFFE!=="undefined"?BEGRIFFE:[
 {id:"b01",t:"Besitztumseffekt",x:"Platzhalter-Erklärung.",bsp:"Du willst deine alte Jacke für 80 Euro verkaufen, würdest selbst aber nur 30 zahlen.",imp:"i05"},
 {id:"b02",t:"Versunkene Kosten",x:"Platzhalter.",bsp:"Du behältst das teure Kleid, obwohl es nie passt, weil es so viel gekostet hat.",imp:"i06"},
 {id:"b03",t:"Hedonische Anpassung",x:"Platzhalter.",bsp:"Das neue Handy begeistert dich eine Woche lang. Nach einem Monat ist es einfach dein Handy.",imp:"i04"}];
var MONATE=typeof MONATE!=="undefined"?MONATE:Array.from({length:12},(_,i)=>({t:"Monatsthema "+(i+1),x:"Platzhalter.",cat:"pa",u:"u03"}));
var CHECK=typeof CHECK!=="undefined"?CHECK:["kl","kl","wo","wo","pa","pa","er","er","ko","ko"].map((c,i)=>({id:"c"+String(i+1).padStart(2,"0"),cat:c,q:"Platzhalterfrage "+(i+1)+"?",o:["Nie","Selten","Manchmal","Oft"]}));
