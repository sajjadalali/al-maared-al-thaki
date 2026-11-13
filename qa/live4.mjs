// Live check of PR #82. This branch is deleted afterwards.
const SITE = "https://maared-al-thaki.duckdns.org";
for (const path of ["/", "/cars", "/cars/car-001"]) {
  const html = await (await fetch(SITE + path)).text();
  console.log(path, "| tap-target:", html.includes("tap-target"), "| min-h-11:", (html.match(/min-h-11/g) ?? []).length, "| 33 سيارة متوفرة:", html.includes("33 سيارة") || html.includes("33<!-- --> سيارة"));
}
const home = await (await fetch(SITE + "/")).text();
console.log("brand counts:", [...home.matchAll(/(\d+ سيار[ةات]+|سيارة واحدة|سيارتان)/g)].map((m) => m[1]).slice(0, 16).join(" | "));
