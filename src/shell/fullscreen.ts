/** True when the page may enter fullscreen (false on iPhone Safari). */
export function isFullscreenSupported(doc: Document = document): boolean {
  return Boolean(doc.fullscreenEnabled || (doc as any).webkitFullscreenEnabled);
}

/** True while the page is fullscreen. */
export function isFullscreen(doc: Document = document): boolean {
  return Boolean(doc.fullscreenElement || (doc as any).webkitFullscreenElement);
}

/** Enters or leaves fullscreen on the whole page, ignoring browser refusals. */
export function toggleFullscreen(doc: Document = document): void {
  const anyDoc = doc as any;
  if (isFullscreen(doc)) {
    const exit = doc.exitFullscreen || anyDoc.webkitExitFullscreen;
    if (exit) Promise.resolve(exit.call(doc)).catch(() => {});
    return;
  }
  const el = doc.documentElement as any;
  const request = el.requestFullscreen || el.webkitRequestFullscreen;
  if (request) Promise.resolve(request.call(el)).catch(() => {});
}
