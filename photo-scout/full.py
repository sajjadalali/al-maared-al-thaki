import json, urllib.parse, urllib.request, os
UA = {"User-Agent": "al-maared-al-thaki-photo-scout/1.0 (https://github.com/sajjadalali/al-maared-al-thaki)"}
os.makedirs("photo-scout/out/full", exist_ok=True)
for name in json.load(open("photo-scout/full.json")):
    url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(name.replace(" ", "_")) + "?width=1280"
    data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
    open("photo-scout/out/full/" + name.replace("/", "_"), "wb").write(data); print("ok", name, len(data))
