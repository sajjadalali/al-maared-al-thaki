"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * The phone's back button (Android) or back swipe (iPhone) closes an open
 * sheet, menu or photo viewer, instead of leaving the page (21 Nov). Sadeem's
 * chat does the same in ChatWidget.
 *
 * Opening it adds a history entry marked with `key`; stepping back off that
 * entry closes it. `dismiss` is for its own ✕, backdrop or button: it takes
 * that entry back off, so the next back leaves the page as usual. If the URL
 * changed while it was open (new filters), the entry stays as that URL's
 * own, unmarked: back then returns to the filters from before, like any
 * other change of page.
 *
 * While it is open the page may change its URL (the filters do
 * router.replace, and Next drops the mark when it replaces the entry): call
 * the returned `replacing()` just before, and pass the URL as `sync`, so the
 * mark goes back on; and `onBack`, which gets the address that was on screen
 * once the browser has stepped back to the entry from before the sheet
 * opened, to put it back (the buyer's choices stay). Only a replace announced
 * by `replacing()` is marked again: stepping back also changes the URL, and
 * Next renders that before any popstate listener of ours can tell.
 */
export function useBackCloses(
  open: boolean,
  close: () => void,
  key: string,
  options: { sync?: string; onBack?: (href: string) => void } = {}
) {
  const { sync, onBack } = options;
  const closeRef = useRef(close);
  const onBackRef = useRef(onBack);
  useEffect(() => {
    closeRef.current = close;
    onBackRef.current = onBack;
  });
  const pushed = useRef(false);
  const href = useRef("");
  const openedOn = useRef("");
  const leaving = useRef(false);
  const replaced = useRef(false);

  // Open: add the marked entry, or mark it again after the page replaced it.
  useEffect(() => {
    if (!open) {
      pushed.current = false;
      leaving.current = false;
      replaced.current = false;
      return;
    }
    if (leaving.current) return;
    // `href` follows the address only on its own entry, never on a step back.
    if (window.history.state?.[key]) {
      href.current = window.location.href;
      return;
    }
    if (pushed.current) {
      if (!replaced.current) return;
      replaced.current = false;
      window.history.replaceState({ ...window.history.state, [key]: true }, "");
    } else {
      window.history.pushState({ [key]: true }, "");
      pushed.current = true;
      openedOn.current = window.location.href;
    }
    href.current = window.location.href;
  }, [open, sync, key]);

  // Back off the marked entry: close, and bring back the address on screen.
  // In the capture phase, so it runs before Next's own popstate handler: that
  // one renders the page right away, and the effect above would otherwise
  // mark the entry the browser just stepped back to.
  useEffect(() => {
    if (!open) return;
    const onPop = () => {
      if (window.history.state?.[key]) return;
      pushed.current = false;
      leaving.current = true;
      const was = href.current;
      closeRef.current();
      const restore = onBackRef.current;
      // After Next has handled the step back.
      if (restore && was && was !== window.location.href) setTimeout(() => restore(was), 0);
    };
    window.addEventListener("popstate", onPop, true);
    return () => window.removeEventListener("popstate", onPop, true);
  }, [open, key]);

  const dismiss = useCallback(() => {
    const marked = pushed.current && window.history.state?.[key];
    if (marked && window.location.href === openedOn.current) return window.history.back();
    if (marked) {
      const state = { ...window.history.state };
      delete state[key];
      window.history.replaceState(state, "");
    }
    pushed.current = false;
    closeRef.current();
  }, [key]);
  const replacing = useCallback(() => {
    replaced.current = true;
  }, []);
  return { dismiss, replacing };
}
