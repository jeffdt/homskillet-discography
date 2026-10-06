import { describe, it, expect } from 'vitest';
import { ShortcutKey, resolveShortcut } from '../shell/shortcuts';

const key = (k: string, extra: Partial<ShortcutKey> = {}): ShortcutKey => ({
  key: k,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  target: { tagName: 'BODY' },
  ...extra,
});

describe('resolveShortcut', () => {
  it('maps the spec table', () => {
    expect(resolveShortcut(key(' '))).toBe('togglePause');
    expect(resolveShortcut(key('ArrowLeft'))).toBe('prevTrack');
    expect(resolveShortcut(key('ArrowRight'))).toBe('nextTrack');
    expect(resolveShortcut(key('ArrowLeft', { shiftKey: true }))).toBe('seekBack');
    expect(resolveShortcut(key('ArrowRight', { shiftKey: true }))).toBe('seekForward');
    expect(resolveShortcut(key('f'))).toBe('toggleFullscreen');
    expect(resolveShortcut(key('F', { shiftKey: true }))).toBe('toggleFullscreen');
    expect(resolveShortcut(key('Escape'))).toBe('closeTopmost');
    expect(resolveShortcut(key('m'))).toBe('toggleMixer');
    expect(resolveShortcut(key('v'))).toBe('toggleStage');
    expect(resolveShortcut(key('a'))).toBe('toggleAlbums');
  });

  it('keeps the existing speed keys', () => {
    expect(resolveShortcut(key('-'))).toBe('speedDown');
    expect(resolveShortcut(key('_'))).toBe('speedDownFine');
    expect(resolveShortcut(key('='))).toBe('speedUp');
    expect(resolveShortcut(key('+'))).toBe('speedUpFine');
  });

  it('leaves browser and OS shortcuts alone', () => {
    expect(resolveShortcut(key('f', { metaKey: true }))).toBeNull();
    expect(resolveShortcut(key('a', { ctrlKey: true }))).toBeNull();
    expect(resolveShortcut(key('ArrowLeft', { altKey: true }))).toBeNull();
  });

  it('ignores everything but Escape while typing', () => {
    for (const target of [
      { tagName: 'INPUT', type: 'text' },
      { tagName: 'INPUT', type: 'search' },
      { tagName: 'INPUT' },
      { tagName: 'TEXTAREA' },
      { tagName: 'DIV', isContentEditable: true },
    ]) {
      expect(resolveShortcut(key('a', { target }))).toBeNull();
      expect(resolveShortcut(key(' ', { target }))).toBeNull();
      expect(resolveShortcut(key('Escape', { target }))).toBe('closeTopmost');
    }
  });

  it('lets a focused range slider keep its arrow keys', () => {
    const target = { tagName: 'INPUT', type: 'range' };
    expect(resolveShortcut(key('ArrowLeft', { target }))).toBeNull();
    expect(resolveShortcut(key('ArrowRight', { target, shiftKey: true }))).toBeNull();
    expect(resolveShortcut(key(' ', { target }))).toBe('togglePause');
    expect(resolveShortcut(key('m', { target }))).toBe('toggleMixer');
  });

  it('lets Space activate focused buttons, links and checkboxes', () => {
    for (const target of [
      { tagName: 'BUTTON' },
      { tagName: 'A' },
      { tagName: 'INPUT', type: 'checkbox' },
      { tagName: 'INPUT', type: 'radio' },
    ]) {
      expect(resolveShortcut(key(' ', { target }))).toBeNull();
    }
    expect(resolveShortcut(key('ArrowRight', { target: { tagName: 'BUTTON' } }))).toBe('nextTrack');
  });

  it('returns null for unmapped keys and a missing target', () => {
    expect(resolveShortcut(key('q'))).toBeNull();
    expect(resolveShortcut(key(' ', { target: null }))).toBe('togglePause');
  });

  it('ignores auto-repeat on toggle keys but not on seek and speed keys', () => {
    expect(resolveShortcut(key(' ', { repeat: true }))).toBeNull();
    expect(resolveShortcut(key('f', { repeat: true }))).toBeNull();
    expect(resolveShortcut(key('ArrowRight', { repeat: true }))).toBeNull();
    expect(resolveShortcut(key('Escape', { repeat: true }))).toBeNull();
    expect(resolveShortcut(key('ArrowRight', { shiftKey: true, repeat: true }))).toBe(
      'seekForward'
    );
    expect(resolveShortcut(key('-', { repeat: true }))).toBe('speedDown');
  });

  it('ignores composing and already handled events', () => {
    expect(resolveShortcut(key('Escape', { isComposing: true }))).toBeNull();
    expect(resolveShortcut(key('a', { isComposing: true }))).toBeNull();
    expect(resolveShortcut(key('Escape', { defaultPrevented: true }))).toBeNull();
    expect(resolveShortcut(key(' ', { defaultPrevented: true }))).toBeNull();
  });

  it('respects ARIA roles on custom controls', () => {
    expect(
      resolveShortcut(key('ArrowLeft', { target: { tagName: 'DIV', role: 'slider' } }))
    ).toBeNull();
    expect(resolveShortcut(key(' ', { target: { tagName: 'DIV', role: 'button' } }))).toBeNull();
    expect(resolveShortcut(key(' ', { target: { tagName: 'DIV', role: 'checkbox' } }))).toBeNull();
    expect(resolveShortcut(key('ArrowRight', { target: { tagName: 'DIV', role: 'button' } }))).toBe(
      'nextTrack'
    );
  });

  it('lets a focused radio keep its arrow keys', () => {
    const radio = { tagName: 'BUTTON', role: 'radio' };
    expect(resolveShortcut(key('ArrowRight', { target: radio }))).toBeNull();
    expect(resolveShortcut(key('ArrowLeft', { target: radio, shiftKey: true }))).toBeNull();
    const input = { tagName: 'INPUT', type: 'radio' };
    expect(resolveShortcut(key('ArrowLeft', { target: input }))).toBeNull();
    expect(resolveShortcut(key('ArrowRight', { target: { tagName: 'BUTTON' } }))).toBe('nextTrack');
  });
});
