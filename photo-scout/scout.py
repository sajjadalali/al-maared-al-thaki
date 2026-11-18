# Finds Commons photos for a few cars and makes numbered contact sheets.
import json, sys, time, io, os, urllib.parse, urllib.request
from PIL import Image, ImageDraw
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "al-maared-al-thaki-photo-scout/1.0 (https://github.com/sajjadalali/al-maared-al-thaki)"}
def api(params):
    params = {**params, "format": "json", "formatversion": "2"}
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers=UA)
    for i in range(4):
        try:
            return json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:
            time.sleep(3 * (i + 1)); err = e
    raise err
CARS = json.load(open("photo-scout/queries.json"))
os.makedirs("photo-scout/out", exist_ok=True)
for car, spec in CARS.items():
    titles = []
    for q in spec.get("search", []):
        r = api({"action": "query", "list": "search", "srsearch": q, "srnamespace": 6, "srlimit": 25})
        titles += [x["title"] for x in r["query"]["search"]]
    for cat in spec.get("categories", []):
        r = api({"action": "query", "list": "categorymembers", "cmtitle": cat, "cmtype": "file", "cmlimit": 60})
        titles += [x["title"] for x in r.get("query", {}).get("categorymembers", [])]
    seen = []; [seen.append(t) for t in titles if t not in seen and t.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
    seen = seen[:60]
    infos = []
    for i in range(0, len(seen), 20):
        r = api({"action": "query", "titles": "|".join(seen[i:i+20]), "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 360})
        for p in r["query"]["pages"]:
            if "imageinfo" not in p: continue
            ii = p["imageinfo"][0]; m = ii.get("extmetadata", {})
            g = lambda k: (m.get(k, {}) or {}).get("value", "")
            infos.append({"title": p["title"], "thumb": ii.get("thumburl"), "w": ii.get("width"), "h": ii.get("height"),
                          "license": g("LicenseShortName"), "artist": g("Artist"), "date": g("DateTimeOriginal")[:20], "desc": g("ImageDescription")[:160]})
    tiles = []
    for n, info in enumerate(infos):
        try:
            req = urllib.request.Request(info["thumb"], headers=UA)
            im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB")
            im.thumbnail((360, 240)); tile = Image.new("RGB", (360, 262), "white"); tile.paste(im, (0, 22))
            ImageDraw.Draw(tile).text((4, 4), f"#{n}  {info['license'][:22]}", fill="black")
            tiles.append(tile); info["n"] = n
            print(f"{car} #{n} | {info['title']} | {info['license']} | {info['w']}x{info['h']} | artist={info['artist'][:80]} | {info['desc'][:100]}")
            time.sleep(0.3)
        except Exception as e:
            print(f"{car} #{n} FAILED {info['title']} {e}")
    cols = 4
    for s in range(0, len(tiles), 16):
        part = tiles[s:s+16]; rows = (len(part) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * 360, rows * 262), "#ddd")
        for k, t in enumerate(part): sheet.paste(t, ((k % cols) * 360, (k // cols) * 262))
        sheet.save(f"photo-scout/out/{car}-{s//16}.jpg", quality=80)
    json.dump(infos, open(f"photo-scout/out/{car}.json", "w"), ensure_ascii=False, indent=1)
