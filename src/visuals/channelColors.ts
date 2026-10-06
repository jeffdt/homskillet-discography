import {
  CHANNEL_COUNT,
  DEFAULT_CHANNEL_PALETTE_ID,
  channelPaletteById,
} from '../config/channelPalettes';

/** The CSS custom property holding a voice index's channel color: '--ch-0' to '--ch-7'. */
export function channelColorVar(index: number): string {
  return `--ch-${index}`;
}

/** The active channel colors, mirrored into the --ch-N CSS variables. */
export interface ChannelColorStore {
  /** CHANNEL_COUNT lowercase '#rrggbb' colors indexed by voice; frozen, a new array per change. */
  get(): readonly string[];
  /** Calls listener after every change (never per frame). Returns the unsubscribe function. */
  subscribe(listener: (colors: readonly string[]) => void): () => void;
  /** Applies new colors; a shorter list repeats, an empty one means the default palette. */
  set(colors: readonly string[]): void;
}

function normalize(colors: readonly string[]): readonly string[] {
  const source = colors.length ? colors : channelPaletteById(DEFAULT_CHANNEL_PALETTE_ID).channels;
  return Object.freeze(
    Array.from({ length: CHANNEL_COUNT }, (_, i) => source[i % source.length].toLowerCase())
  );
}

/** A store that writes --ch-0..N on root (when given) and notifies subscribers on change. */
export function createChannelColorStore(
  root: HTMLElement | null,
  initial: readonly string[]
): ChannelColorStore {
  let current = normalize(initial);
  const listeners = new Set<(colors: readonly string[]) => void>();
  const write = () => {
    if (root) current.forEach((color, i) => root.style.setProperty(channelColorVar(i), color));
  };
  write();
  return {
    get: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(colors) {
      const next = normalize(colors);
      if (next.every((color, i) => color === current[i])) return;
      current = next;
      write();
      listeners.forEach((listener) => listener(current));
    },
  };
}

/** The app's channel colors. Only AppShell sets them (from settings.channelPalette). */
export const channelColors: ChannelColorStore = createChannelColorStore(
  typeof document === 'undefined' ? null : document.documentElement,
  channelPaletteById(DEFAULT_CHANNEL_PALETTE_ID).channels
);
