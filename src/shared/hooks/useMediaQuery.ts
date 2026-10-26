import { useEffect, useState } from "react";

/**
 * Hook simples pra media queries. Zero deps.
 *
 * ```ts
 * const isMobile = useMediaQuery("(max-width: 1000px)");
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export const BREAKPOINTS = {
  mobile: "(max-width: 640px)",
  tablet: "(max-width: 1024px)",
  desktop: "(min-width: 1025px)",
} as const;
