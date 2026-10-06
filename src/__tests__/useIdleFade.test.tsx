import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { IdleTimer, useIdleFade } from '../hooks/useIdleFade';

function Probe({ enabled }: { enabled: boolean }) {
  const idle = useIdleFade({ enabled });
  return <div data-testid="probe" data-idle={String(idle)} />;
}

const idleAttr = () => screen.getByTestId('probe').getAttribute('data-idle');
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const emit = (type: string) =>
  act(() => {
    window.dispatchEvent(new Event(type));
  });

describe('IdleTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reports idle after the timeout and wakes on poke', () => {
    const onChange = vi.fn();
    const timer = new IdleTimer(1000, onChange);
    timer.poke();
    vi.advanceTimersByTime(999);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenLastCalledWith(true);
    timer.poke();
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('stop cancels silently', () => {
    const onChange = vi.fn();
    const timer = new IdleTimer(1000, onChange);
    timer.poke();
    timer.stop();
    vi.advanceTimersByTime(5000);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('useIdleFade', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('goes idle after 3 seconds without input', () => {
    render(<Probe enabled />);
    expect(idleAttr()).toBe('false');
    advance(2999);
    expect(idleAttr()).toBe('false');
    advance(1);
    expect(idleAttr()).toBe('true');
  });

  it('wakes immediately on pointer, key, touch or wheel input, then counts down again', () => {
    render(<Probe enabled />);
    for (const type of [
      'pointermove',
      'mousemove',
      'keydown',
      'touchstart',
      'wheel',
      'pointerdown',
    ]) {
      advance(3000);
      expect(idleAttr()).toBe('true');
      emit(type);
      expect(idleAttr()).toBe('false');
    }
  });

  it('never goes idle while disabled', () => {
    render(<Probe enabled={false} />);
    advance(10000);
    expect(idleAttr()).toBe('false');
  });

  it('shows the chrome again when disabled while idle', () => {
    const { rerender } = render(<Probe enabled />);
    advance(3000);
    expect(idleAttr()).toBe('true');
    rerender(<Probe enabled={false} />);
    expect(idleAttr()).toBe('false');
    advance(10000);
    expect(idleAttr()).toBe('false');
  });
});
