import { REDUCED_MOTION_QUERY } from '../hooks/useMediaQuery';

/** True when the visitor asked the OS for reduced motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;
}
