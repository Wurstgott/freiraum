"""Erzeugt Testzustände: python3 mkstate.py <weite> <keepers> <teil> <wartende> <datei>"""
import json, sys, time
W, K, T, Wt, out = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
now = int(time.mktime((2026, 10, 19, 11, 0, 0, 0, 0, -1)) * 1000)
DAY = 864e5
cats = ["kl", "wo", "pa", "er", "ko"]
log = []; i = 0; rest = W - 3 * T
while rest > 0:
    sz = 5 if rest >= 5 else 3 if rest >= 3 else 1
    log.append({"id": f"l{i}", "k": "los", "ts": now - (60 - i % 60) * DAY - i * 1000, "cat": cats[i % 4], "size": sz, "weg": ["ver", "spe", "vk", "rec", "mue"][i % 5], "name": f"Ding {i}", "ask": now - 10 * DAY, "miss": "nein" if i % 3 else None})
    rest -= sz; i += 1
for j in range(T):
    log.append({"id": f"t{j}", "k": "teil", "ts": now - (j + 1) * 2 * DAY, "name": "Bohrmaschine", "how": "leih", "cat": "wo"})
why = ["oft", "kann", "sinn", "gut"]
keep = [{"id": f"k{j}", "ts": now - 20 * DAY, "name": ["Omas Teekanne", "Akkuschrauber", "Wanderschuhe", "Gitarre", "Fotoalbum", "Kochmesser", "Fahrrad", "Wintermantel", "Schachspiel", "Lieblingsbuch", "Zelt", "Nähmaschine"][j], "cat": cats[j % 5], "why": why[j % 4], "note": "", "next": now + 70 * DAY} for j in range(K)]
wishes = [{"id": f"w{j}", "name": f"Wunsch {j}", "cat": "ko", "price": "", "ts": now - 3 * DAY, "days": 30, "due": now + 27 * DAY, "st": "wait"} for j in range(Wt)]
log.sort(key=lambda e: e["ts"])
st = {"seen": True, "created": now - 90 * DAY, "settings": {"theme": "system", "vib": True, "mode": None}, "log": log, "keep": keep, "wishes": wishes,
      "check": {"ts": now - 50 * DAY, "ans": {}, "top": ["kl", "ko", "pa"], "sum": {}},
      "mom": {f"stage-{n}": 1 for n in range(10)}, "shown": None, "hint": {"day": "", "key": "", "later": "2026-10-19", "off": {}}}
json.dump(st, open(out, "w"))
