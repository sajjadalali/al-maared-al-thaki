"use client";

import { useEffect } from "react";

/**
 * Holds the page still while a sheet or menu covers it (21 Nov): before, the
 * page behind the filters and the phone menu moved with the finger, most of
 * all on iPhones. Like Sadeem's chat (ChatWidget), it stops the root from
 * scrolling and puts back what was there when it closes.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [active]);
}
