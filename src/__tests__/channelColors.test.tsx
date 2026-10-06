import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { channelPaletteById } from '../config/channelPalettes';
import { useChannelColors } from '../hooks/useChannelColors';
import { channelColorVar, channelColors, createChannelColorStore } from '../visuals/channelColors';

const CHROMATIC = channelPaletteById('chromatic').channels;
const GAME_BOY = channelPaletteById('game-boy').channels;

function cssVar(element: HTMLElement, index: number): string {
  return element.style.getPropertyValue(channelColorVar(index));
}

afterEach(() => {
  channelColors.set(CHROMATIC);
});

describe('channelColors singleton', () => {
  it('starts on Chromatic and writes it to the document root on import', () => {
    expect(channelColors.get()).toEqual(CHROMATIC);
    for (let i = 0; i < 8; i++) expect(cssVar(document.documentElement, i)).toBe(CHROMATIC[i]);
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
    const store = createChannelColorStore(root, CHROMATIC);
    store.set(GAME_BOY);
    expect(store.get()).toEqual(GAME_BOY);
    for (let i = 0; i < 8; i++) expect(cssVar(root, i)).toBe(GAME_BOY[i]);
  });

  it('cycles a shorter list, lowercases, and falls back to Chromatic for an empty one', () => {
    const store = createChannelColorStore(null, CHROMATIC);
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
    expect(store.get()).toEqual(CHROMATIC);
  });

  it('notifies subscribers once per change and not for the same colors', () => {
    const store = createChannelColorStore(null, CHROMATIC);
    const listener = vi.fn();
    store.subscribe(listener);
    store.set([...CHROMATIC]);
    expect(listener).not.toHaveBeenCalled();
    store.set(GAME_BOY);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(store.get());
  });

  it('hands out a new frozen array on each change', () => {
    const store = createChannelColorStore(null, CHROMATIC);
    const before = store.get();
    store.set(GAME_BOY);
    expect(store.get()).not.toBe(before);
    expect(Object.isFrozen(store.get())).toBe(true);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createChannelColorStore(null, CHROMATIC);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set(GAME_BOY);
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
    expect(screen.getByText(CHROMATIC[0])).toBeTruthy();
    act(() => channelColors.set(GAME_BOY));
    expect(screen.getByText(GAME_BOY[0])).toBeTruthy();
  });
});
