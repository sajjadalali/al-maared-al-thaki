// Tells the server about errors a visitor hits (20 Nov), so a page that is
// broken on someone's phone shows up in `site_errors` (src/server/siteErrors.ts)
// instead of only on their screen.
//
// ERROR_REPORTER runs inline in the page's <head> (src/app/layout.tsx), before
// the site's JavaScript, so it still reports when that JavaScript or the styles
// fail to load. Plain old JavaScript on purpose: it must run on any browser.
// It reports:
// - a stylesheet or script that failed to load (resource-failed),
// - an uncaught error or rejected promise (js-error, promise-rejection),
// - a page that finished loading without the site's styles (css-missing):
//   globals.css sets --site-css on :root, so without it the CSS never applied.
// At most 8 reports per page, each one only once.

export const REPORT_URL = "/api/site-errors";

export const ERROR_REPORTER = `(function(){
var sent=0,seen={};
function send(kind,message,detail,extra){try{
var key=kind+"|"+message;if(seen[key]||sent>=8)return;seen[key]=1;sent++;
var body=JSON.stringify({kind:kind,message:String(message==null?"":message).slice(0,1000),detail:detail?String(detail).slice(0,6000):null,page:location.pathname+location.search,viewport:innerWidth+"x"+innerHeight,extra:extra||null});
if(navigator.sendBeacon&&navigator.sendBeacon("${REPORT_URL}",body))return;
fetch("${REPORT_URL}",{method:"POST",body:body,keepalive:true});
}catch(e){}}
window.__siteReport=send;
addEventListener("error",function(e){var t=e.target;
if(t&&t!==window){var tag=t.tagName;if(tag==="LINK"||tag==="SCRIPT")send("resource-failed",t.href||t.src||"",null,{tag:tag});return;}
send("js-error",e.message,(e.error&&e.error.stack)||(e.filename+":"+e.lineno+":"+e.colno));},true);
addEventListener("unhandledrejection",function(e){var r=e.reason;send("promise-rejection",r&&r.message?r.message:String(r),r&&r.stack);});
addEventListener("load",function(){setTimeout(function(){try{
if(getComputedStyle(document.documentElement).getPropertyValue("--site-css").trim()==="1")return;
var links=[].slice.call(document.querySelectorAll('link[rel="stylesheet"]')).map(function(l){return l.getAttribute("href")+(l.sheet?" loaded":" no-sheet");});
var css=performance.getEntriesByType?performance.getEntriesByType("resource").filter(function(r){return /\\.css(\\?|$)/.test(r.name);}).map(function(r){return r.name+" status="+(r.responseStatus||"?")+" bytes="+r.transferSize;}):[];
send("css-missing","the page loaded without the site's styles",null,{links:links,cssRequests:css});
}catch(e){}},0);});
})();`;

type Report = (kind: string, message: string, detail?: string | null, extra?: Record<string, unknown> | null) => void;

/** For the error pages: reports what React caught (a page or the whole layout failed). */
export function reportCaughtError(kind: "error-boundary" | "global-error", error: unknown) {
  const err = error instanceof Error ? error : null;
  const digest = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest?: unknown }).digest) : undefined;
  const message = err?.message ?? String(error);
  const report = (window as unknown as { __siteReport?: Report }).__siteReport;
  const extra = digest ? { digest } : null;
  if (report) {
    report(kind, message, err?.stack, extra);
    return;
  }
  // The global error page has no <head> of the site's, so no inline reporter.
  try {
    const body = JSON.stringify({
      kind,
      message,
      detail: err?.stack ?? null,
      page: location.pathname + location.search,
      viewport: `${innerWidth}x${innerHeight}`,
      extra,
    });
    if (!navigator.sendBeacon?.(REPORT_URL, body)) void fetch(REPORT_URL, { method: "POST", body, keepalive: true });
  } catch {
    // Reporting must never break the error page itself.
  }
}
