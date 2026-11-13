// Test mode: open any page with ?test and the conversations started in this
// browser from then on are marked as tests in the chat logs; ?test=0 ends it.
// Kept apart from chatStore.ts so the always-loaded chat button can read the
// address on page load without pulling in the chat itself.

const TEST_KEY = "autopro:test";

/** Same as TEST_SESSION_PREFIX in src/app/api/chat/route.ts and scripts/sadeem-check.mjs. */
export const TEST_SESSION_PREFIX = "5ade7e57-";

/** Reads ?test from the address (and remembers it), then says whether test mode is on. */
export function testMode(): boolean {
  try {
    const flag = new URLSearchParams(window.location.search).get("test");
    if (flag === "0") window.localStorage.removeItem(TEST_KEY);
    else if (flag !== null) window.localStorage.setItem(TEST_KEY, "1");
    return window.localStorage.getItem(TEST_KEY) === "1";
  } catch {
    return false;
  }
}
