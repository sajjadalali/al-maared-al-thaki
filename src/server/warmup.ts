// Warms the site after every start (20 Nov), started by src/instrumentation.ts.
//
// A new container starts with an empty image cache, so the first visitor after
// a deploy waited while the server made every car photo from scratch: on
// 19 Nov the first /cars visit took 5.4 s to answer and some photos 38 s.
// That first visitor is usually a showroom owner opening the demo from a QR.
//
// So right after the server is up, it opens its own pages the way a visitor
// would: the home page, /cars, and every car page. From their HTML it takes
// every /_next/image URL (all the widths in each srcset, so phones and
// laptops are both covered) and asks for each one, two at a time. The pages
// get rendered and the photos end up in .next/cache/images before a real
// visitor comes.
//
// With .next/cache/images on a Coolify volume, photos made before the deploy
// are still there and come back at once; only new or changed ones take time.

const BASE = `http://127.0.0.1:${process.env.PORT || 3000}`;
const FIRST_PAGES = ["/", "/cars"];
const AT_ONCE = 2;
const TIMEOUT = 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(path: string): Promise<Response | null> {
  try {
    return await fetch(BASE + path, {
      cache: "no-store",
      headers: { "user-agent": "maared-warmup" },
      signal: AbortSignal.timeout(TIMEOUT),
    });
  } catch {
    return null;
  }
}

/** Waits until the server answers its home page (up to about a minute). */
async function serverUp(): Promise<boolean> {
  for (let i = 0; i < 30; i++) {
    const res = await get("/");
    if (res?.ok) return true;
    await sleep(2000);
  }
  return false;
}

const decode = (s: string) => s.replace(/&amp;/g, "&");

/** Every optimized-image URL in the page: src, srcset and preload links. */
function imagesIn(html: string, into: Set<string>) {
  for (const [, list] of html.matchAll(/(?:srcset|imagesrcset)="([^"]+)"/gi)) {
    for (const entry of list.split(",")) {
      const url = decode(entry.trim().split(/\s+/)[0] ?? "");
      if (url.startsWith("/_next/image?")) into.add(url);
    }
  }
  for (const [, url] of html.matchAll(/src="(\/_next\/image\?[^"]+)"/g)) into.add(decode(url));
}

async function run() {
  if (!(await serverUp())) {
    console.warn("[warmup] the server did not answer; skipped");
    return;
  }
  const started = Date.now();
  const images = new Set<string>();
  const pages = [...FIRST_PAGES];

  for (let i = 0; i < pages.length; i++) {
    const res = await get(pages[i]);
    if (!res?.ok) continue;
    const html = await res.text();
    imagesIn(html, images);
    if (pages[i] === "/cars") {
      for (const [, id] of html.matchAll(/href="\/cars\/(car-[\w-]+)"/g)) {
        if (!pages.includes(`/cars/${id}`)) pages.push(`/cars/${id}`);
      }
    }
  }

  const queue = [...images];
  let failed = 0;
  await Promise.all(
    Array.from({ length: AT_ONCE }, async () => {
      for (let url = queue.shift(); url; url = queue.shift()) {
        const res = await get(url);
        if (!res?.ok) failed++;
        await res?.arrayBuffer().catch(() => undefined);
      }
    })
  );

  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`[warmup] ${pages.length} pages, ${images.size} images (${failed} failed) in ${seconds}s`);
}

/** Starts warming in the background; the server does not wait for it. */
export function startWarmup() {
  if (process.env.NODE_ENV !== "production") return;
  setTimeout(() => {
    run().catch((error) => console.warn("[warmup] stopped:", error));
  }, 3000);
}
