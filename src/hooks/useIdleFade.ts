import { useEffect, useState } from 'react';

export const IDLE_TIMEOUT_MS = 3000;

const ACTIVITY_EVENTS = [
  'pointermove',
  'pointerdown',
  'mousemove',
  'keydown',
  'touchstart',
  'wheel',
];

/** Counts down from the last activity and reports idle/awake transitions. */
export class IdleTimer {
  private handle: ReturnType<typeof setTimeout> | null = null;
  private idle = false;

  constructor(
    private readonly timeoutMs: number,
    private readonly onChange: (idle: boolean) => void
  ) {}

  /** Records activity: wakes if idle and restarts the countdown. */
  poke(): void {
    if (this.idle) {
      this.idle = false;
      this.onChange(false);
    }
    this.clear();
    this.handle = setTimeout(() => {
      this.handle = null;
      this.idle = true;
      this.onChange(true);
    }, this.timeoutMs);
  }

  /** Cancels the countdown without notifying. */
  stop(): void {
    this.clear();
    this.idle = false;
  }

  /** Clears any pending countdown timeout. */
  private clear(): void {
    if (this.handle !== null) {
      clearTimeout(this.handle);
      this.handle = null;
    }
  }
}

/** Single source of truth for chrome visibility: true after timeoutMs of no input while enabled. */
export function useIdleFade({
  enabled,
  timeoutMs = IDLE_TIMEOUT_MS,
}: {
  enabled: boolean;
  timeoutMs?: number;
}): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    setIdle(false);
    if (!enabled) return undefined;
    const timer = new IdleTimer(timeoutMs, setIdle);
    const poke = () => timer.poke();
    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, poke, { passive: true }));
    timer.poke();
    return () => {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, poke));
      timer.stop();
    };
  }, [enabled, timeoutMs]);

  return idle;
}
