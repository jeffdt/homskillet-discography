/** Where a box sits on screen; the subset of DOMRect the handoff needs. */
export interface Box {
  left: number;
  top: number;
  height: number;
}

/** Duration of the title-to-top-bar logo move, in ms. */
export const LOGO_HANDOFF_MS = 700;

/**
 * The transform that makes an element sitting at `to` appear at `from` instead, with the
 * origin at its top-left corner. Animating from this transform to none performs a FLIP move.
 */
export function handoffTransform(from: Box, to: Box): string {
  const scale = to.height > 0 ? from.height / to.height : 1;
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale})`;
}
