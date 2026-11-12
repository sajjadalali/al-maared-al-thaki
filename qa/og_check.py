import json, re, html, struct, sys, urllib.request
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
cars = json.load(open("src/data/cars.json"))
out = {"bad": [], "sizes": [], "sample": None}
def dims(d):
    i = 2
    while i < len(d):
        m = d[i + 1]; l = struct.unpack(">H", d[i + 2:i + 4])[0]
        if m in (0xC0, 0xC2): return struct.unpack(">HH", d[i + 5:i + 9])
        i += 2 + l
for c in cars:
    h = urllib.request.urlopen(f"{BASE}/cars/{c['id']}").read().decode()
    meta = {m[0]: html.unescape(m[1]) for m in re.findall(r'<meta (?:property|name)="([^"]+)" content="([^"]*)"', h)}
    if out["sample"] is None: out["sample"] = {k: v for k, v in meta.items() if k.startswith("og:")}
    img = meta.get("og:image", "")
    r = urllib.request.urlopen(BASE + re.sub(r"^https?://[^/]+", "", img)); data = r.read()
    out["sizes"].append(len(data))
    ok = str(c["year"]) in meta.get("og:title", "") and f"{c['price']:,}" in meta.get("og:description", "") and r.headers["content-type"] == "image/jpeg" and dims(data) == (630, 1200) and img.startswith("https://maared-al-thaki.duckdns.org/cars/")
    if not ok: out["bad"].append([c["id"], meta.get("og:title"), img, r.headers["content-type"]])
print("OG_JSON_BEGIN"); print(json.dumps(out, ensure_ascii=False)); print("OG_JSON_END")
