// Makes the chat wallpaper tile (src/app/globals.css, chat-wallpaper): run
// `node scripts/chat-wallpaper.mjs` and paste the printed data URI there.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as L from "lucide-react";
// [icon, x, y, rotate, scale] in a 280x280 tile; spread so the tile repeats without seams.
const placed = [
  ["Car", 18, 22, -12, 1.05], ["MessageCircle", 120, 14, 8, 0.85], ["KeyRound", 210, 40, 24, 0.9],
  ["Fuel", 64, 92, 10, 0.85], ["Sparkles", 168, 96, -8, 0.8], ["Gauge", 236, 132, -14, 0.9],
  ["MapPin", 20, 168, 6, 0.85], ["Tag", 104, 176, -20, 0.85], ["ShieldCheck", 190, 196, 10, 0.85],
  ["SteeringWheel" in L ? "SteeringWheel" : "LifeBuoy", 54, 236, 18, 0.9], ["CalendarCheck", 150, 250, -6, 0.8], ["Car", 240, 238, 14, 0.8],
];
const inner = (name) => renderToStaticMarkup(React.createElement(L[name])).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
let g = "";
for (const [n, x, y, r, s] of placed) {
  if (!L[n]) throw new Error("no icon " + n);
  g += `<g transform="translate(${x} ${y}) rotate(${r} 12 12) scale(${s})">${inner(n)}</g>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280"><g fill="none" stroke="#0b1322" stroke-opacity="0.075" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${g}</g></svg>`;
const uri = "data:image/svg+xml," + svg.replace(/"/g, "'").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/#/g, "%23").replace(/\s+/g, " ");

console.log(uri);

