"use client";

import { useEffect, useState } from "react";

/**
 * Subscribes to a CSS media query. Returns false on the server and on
 * first client render to avoid hydration mismatches, then updates.
 *
 *   const isDesktop = useMediaQuery("(min-width: 1024px)");
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
