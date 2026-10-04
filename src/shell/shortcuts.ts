export type ShortcutAction =
  | 'togglePause'
  | 'prevTrack'
  | 'nextTrack'
  | 'seekBack'
  | 'seekForward'
  | 'toggleFullscreen'
  | 'closeTopmost'
  | 'toggleMixer'
  | 'toggleStage'
  | 'toggleAlbums'
  | 'speedDown'
  | 'speedDownFine'
  | 'speedUp'
  | 'speedUpFine';

export interface ShortcutTarget {
  tagName: string;
  type?: string;
  isContentEditable?: boolean;
  role?: string;
}

export interface ShortcutKey {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: ShortcutTarget | null;
  repeat?: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
}

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number']);
const SPACE_ROLES = new Set(['button', 'checkbox', 'radio', 'switch', 'menuitem', 'tab', 'link']);
const CONTINUOUS_ACTIONS = new Set<ShortcutAction>([
  'seekBack',
  'seekForward',
  'speedDown',
  'speedDownFine',
  'speedUp',
  'speedUpFine',
]);
const SPACE_INPUT_TYPES = new Set(['checkbox', 'radio', 'button', 'submit', 'reset']);

/** Uppercased tag name of the target, or empty when there is none. */
function tagOf(target: ShortcutTarget | null): string {
  return target ? target.tagName.toUpperCase() : '';
}

/** Lowercased input type, defaulting to text like the DOM does. */
function inputType(target: ShortcutTarget | null): string {
  return target && target.type ? target.type.toLowerCase() : 'text';
}

/** True when the target accepts typed text and must keep every key. */
function isTextEntry(target: ShortcutTarget | null): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = tagOf(target);
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return tag === 'INPUT' && TEXT_INPUT_TYPES.has(inputType(target));
}

/** True for a range input or role=slider element, which owns the arrow keys. */
function isRangeInput(target: ShortcutTarget | null): boolean {
  if (target && target.role === 'slider') return true;
  return tagOf(target) === 'INPUT' && inputType(target) === 'range';
}

/** True when Space activates the focused control instead of toggling playback. */
function activatesOnSpace(target: ShortcutTarget | null): boolean {
  if (target && target.role && SPACE_ROLES.has(target.role)) return true;
  const tag = tagOf(target);
  if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return true;
  return tag === 'INPUT' && SPACE_INPUT_TYPES.has(inputType(target));
}

/** Maps a keydown to a shell action, leaving keys the focused control needs untouched. */
export function resolveShortcut(e: ShortcutKey): ShortcutAction | null {
  if (e.isComposing || e.defaultPrevented) return null;
  const action = resolveUnguarded(e);
  if (action && e.repeat && !CONTINUOUS_ACTIONS.has(action)) return null;
  return action;
}

/** Maps a key to an action ignoring repeat, composition and prior handling. */
function resolveUnguarded(e: ShortcutKey): ShortcutAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === 'Escape') return 'closeTopmost';
  if (isTextEntry(e.target)) return null;

  switch (e.key) {
    case ' ':
      return activatesOnSpace(e.target) ? null : 'togglePause';
    case '-':
      return 'speedDown';
    case '_':
      return 'speedDownFine';
    case '=':
      return 'speedUp';
    case '+':
      return 'speedUpFine';
    default:
  }

  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (isRangeInput(e.target)) return null;
    if (e.key === 'ArrowLeft') return e.shiftKey ? 'seekBack' : 'prevTrack';
    return e.shiftKey ? 'seekForward' : 'nextTrack';
  }

  switch (e.key.toLowerCase()) {
    case 'f':
      return 'toggleFullscreen';
    case 'm':
      return 'toggleMixer';
    case 's':
      return 'toggleStage';
    case 'a':
      return 'toggleAlbums';
    default:
      return null;
  }
}
