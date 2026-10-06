import { useEffect, useRef } from 'react';
import { ShortcutAction, resolveShortcut } from '../shell/shortcuts';

/** Return false from a handler to leave the key's default behavior in place. */
export type ShortcutHandlers = Partial<Record<ShortcutAction, () => boolean | void>>;

/** Routes document keydowns through resolveShortcut to the given handlers. */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      const action = resolveShortcut({
        key: e.key,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        repeat: e.repeat,
        isComposing: e.isComposing,
        defaultPrevented: e.defaultPrevented,
        target: el
          ? {
              tagName: el.tagName,
              type: (el as HTMLInputElement).type,
              isContentEditable: el.isContentEditable,
              role: el.getAttribute('role') ?? undefined,
            }
          : null,
      });
      if (!action) return;
      const handler = handlersRef.current[action];
      if (!handler) return;
      if (handler() !== false) e.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
