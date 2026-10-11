import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { DEFAULT_CHANNEL_PALETTE_ID, channelPaletteById } from '../config/channelPalettes';
import { useChannelColors } from '../hooks/useChannelColors';
import { channelColorVar, channelColors, createChannelColorStore } from '../visuals/channelColors';

const DEFAULT_COLORS = channelPaletteById(DEFAULT_CHANNEL_PALETTE_ID).channels;
const NES = channelPaletteById('nes').channels;

function cssVar(element: HTMLElement, index: number): string {
  return element.style.getPropertyValue(channelColorVar(index));
}

afterEach(() => {
  channelColors.set(DEFAULT_COLORS);
});

describe('channelColors singleton', () => {
  it('starts on the default palette and writes it to the document root on import', () => {
    expect(channelColors.get()).toEqual(DEFAULT_COLORS);
    for (let i = 0; i < 8; i++) expect(cssVar(document.documentElement, i)).toBe(DEFAULT_COLORS[i]);
  });
});

describe('channelColorVar', () => {
  it('names the CSS variable for a voice index', () => {
    expect(channelColorVar(0)).toBe('--ch-0');
    expect(channelColorVar(7)).toBe('--ch-7');
  });
});

describe('createChannelColorStore', () => {
  it('writes --ch-0 to --ch-7 on its root and returns the colors', () => {
    const root = document.createElement('div');
    const store = createChannelColorStore(root, DEFAULT_COLORS);
    store.set(NES);
    expect(store.get()).toEqual(NES);
    for (let i = 0; i < 8; i++) expect(cssVar(root, i)).toBe(NES[i]);
  });

  it('cycles a shorter list, lowercases, and falls back to the default palette for an empty one', () => {
    const store = createChannelColorStore(null, DEFAULT_COLORS);
    store.set(['#AA0000', '#00BB00']);
    expect(store.get()).toEqual([
      '#aa0000',
      '#00bb00',
      '#aa0000',
      '#00bb00',
      '#aa0000',
      '#00bb00',
      '#aa0000',
      '#00bb00',
    ]);
    store.set([]);
    expect(store.get()).toEqual(DEFAULT_COLORS);
  });

  it('notifies subscribers once per change and not for the same colors', () => {
    const store = createChannelColorStore(null, DEFAULT_COLORS);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set([...DEFAULT_COLORS]);
    expect(listener).not.toHaveBeenCalled();
    store.set(NES);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(store.get());
  });

  it('hands out a new frozen array on each change', () => {
    const store = createChannelColorStore(null, DEFAULT_COLORS);
    const before = store.get();
    store.set(NES);
    expect(store.get()).not.toBe(before);
    expect(Object.isFrozen(store.get())).toBe(true);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createChannelColorStore(null, DEFAULT_COLORS);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set(NES);
    expect(listener).not.toHaveBeenCalled();
  });
});

function FirstColor() {
  const colors = useChannelColors();
  return <p>{colors[0]}</p>;
}

describe('useChannelColors', () => {
  it('re-renders with the new colors when the palette changes', () => {
    render(<FirstColor />);
    expect(screen.getByText(DEFAULT_COLORS[0])).toBeTruthy();
    act(() => channelColors.set(NES));
    expect(screen.getByText(NES[0])).toBeTruthy();
  });
});
