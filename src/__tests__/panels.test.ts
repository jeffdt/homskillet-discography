import { describe, it, expect } from 'vitest';
import {
  INITIAL_PANELS,
  PanelState,
  isPanelOpen,
  panelInSlot,
  panelsReducer,
  topmostPanel,
} from '../shell/panels';

const open = (state: PanelState, id: any, compact = false) =>
  panelsReducer(state, { type: 'open', id, compact });

describe('panelsReducer (wide layout)', () => {
  it('keeps one panel per slot and allows left and right together', () => {
    let s = open(INITIAL_PANELS, 'albums');
    s = open(s, 'stage');
    expect(s.open).toEqual(['albums', 'stage']);
    expect(panelInSlot(s, 'left')).toBe('albums');
    expect(panelInSlot(s, 'right')).toBe('stage');
  });

  it('swaps mixer and stage in the right slot', () => {
    let s = open(open(INITIAL_PANELS, 'stage'), 'mixer');
    expect(s.open).toEqual(['mixer']);
    expect(isPanelOpen(s, 'stage')).toBe(false);
  });

  it('toggle opens then closes', () => {
    let s = panelsReducer(INITIAL_PANELS, { type: 'toggle', id: 'about', compact: false });
    expect(isPanelOpen(s, 'about')).toBe(true);
    s = panelsReducer(s, { type: 'toggle', id: 'about', compact: false });
    expect(isPanelOpen(s, 'about')).toBe(false);
  });

  it('closeTopmost walks back in opening order', () => {
    let s = open(open(open(INITIAL_PANELS, 'albums'), 'mixer'), 'about');
    expect(topmostPanel(s)).toBe('about');
    s = panelsReducer(s, { type: 'closeTopmost' });
    expect(topmostPanel(s)).toBe('mixer');
    s = panelsReducer(s, { type: 'closeTopmost' });
    s = panelsReducer(s, { type: 'closeTopmost' });
    expect(topmostPanel(s)).toBeNull();
    expect(panelsReducer(s, { type: 'closeTopmost' })).toBe(s);
  });

  it('reopening a panel moves it to the top', () => {
    const s = open(open(open(INITIAL_PANELS, 'albums'), 'stage'), 'albums');
    expect(s.open).toEqual(['stage', 'albums']);
  });
});

describe('panelsReducer (compact layout)', () => {
  it('opening any panel closes the others', () => {
    const s = open(open(INITIAL_PANELS, 'albums', true), 'about', true);
    expect(s.open).toEqual(['about']);
  });

  it('after switching from wide to compact the most recent panel is topmost', () => {
    const wide = open(open(INITIAL_PANELS, 'albums'), 'stage');
    expect(topmostPanel(wide)).toBe('stage');
    const afterEscape = panelsReducer(wide, { type: 'closeTopmost' });
    expect(topmostPanel(afterEscape)).toBe('albums');
  });
});
