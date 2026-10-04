export type PanelId = 'albums' | 'mixer' | 'stage' | 'about';
export type PanelSlot = 'left' | 'right' | 'center';

export const PANEL_SLOTS: Record<PanelId, PanelSlot> = {
  albums: 'left',
  mixer: 'right',
  stage: 'right',
  about: 'center',
};

export const PANEL_TITLES: Record<PanelId, string> = {
  albums: 'Albums',
  mixer: 'Mixer',
  stage: 'Stage',
  about: 'About',
};

/** Open panels, oldest first; the last entry is the topmost one. */
export interface PanelState {
  open: PanelId[];
}

export const INITIAL_PANELS: PanelState = { open: [] };

export type PanelAction =
  | { type: 'open'; id: PanelId; compact: boolean }
  | { type: 'toggle'; id: PanelId; compact: boolean }
  | { type: 'close'; id: PanelId }
  | { type: 'closeTopmost' };

/** True when the panel is open. */
export function isPanelOpen(state: PanelState, id: PanelId): boolean {
  return state.open.includes(id);
}

/** The most recently opened panel, or null. */
export function topmostPanel(state: PanelState): PanelId | null {
  return state.open.length ? state.open[state.open.length - 1] : null;
}

/** The open panel occupying a wide-layout slot, or null. */
export function panelInSlot(state: PanelState, slot: PanelSlot): PanelId | null {
  return state.open.find((id) => PANEL_SLOTS[id] === slot) || null;
}

/** Panel open/close rules: one panel per slot on wide layouts, one panel total on compact layouts. */
export function panelsReducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case 'open': {
      const slot = PANEL_SLOTS[action.id];
      const kept = action.compact
        ? []
        : state.open.filter((id) => id !== action.id && PANEL_SLOTS[id] !== slot);
      return { open: [...kept, action.id] };
    }
    case 'toggle':
      return isPanelOpen(state, action.id)
        ? panelsReducer(state, { type: 'close', id: action.id })
        : panelsReducer(state, { type: 'open', id: action.id, compact: action.compact });
    case 'close':
      return isPanelOpen(state, action.id)
        ? { open: state.open.filter((id) => id !== action.id) }
        : state;
    case 'closeTopmost':
      return state.open.length ? { open: state.open.slice(0, -1) } : state;
    default:
      return state;
  }
}
