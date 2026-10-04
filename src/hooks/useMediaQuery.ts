import { useEffect, useState } from 'react';

/** Portrait phones and narrow portrait windows: bottom sheets and a pinned dock. Landscape phones use the wide layout. */
export const COMPACT_LAYOUT_QUERY = '(max-width: 768px) and (orientation: portrait)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Current match state of a media query; false where matchMedia is unavailable. */
function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

/** Tracks a CSS media query; false where matchMedia is unavailable (jsdom). */
export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = () => setValue(mql.matches);
    onChange();
    // addListener rather than addEventListener: Safari before 14 only supports the former.
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);
  return value;
}
