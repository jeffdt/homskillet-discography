import { useEffect, useRef } from 'react';
import { FrameDraw, FrameLoopOptions } from '../audio/data/contract';
import { useAudioData } from '../contexts/AudioDataContext';

/** useFrameLoop options: FrameLoop's plus enabled. */
export interface UseFrameLoopOptions extends FrameLoopOptions {
  /** Register only while true. Default true. */
  enabled?: boolean;
}

/** Registers draw with the FrameLoop while mounted; always calls the latest draw without re-registering. */
export function useFrameLoop(id: string, draw: FrameDraw, options: UseFrameLoopOptions = {}): void {
  const { frameLoop } = useAudioData();
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const { enabled = true, maxFps, runWhilePaused } = options;
  useEffect(() => {
    if (!enabled) return undefined;
    return frameLoop.add(id, (frame, dtMs) => drawRef.current(frame, dtMs), {
      maxFps,
      runWhilePaused,
    });
  }, [frameLoop, id, enabled, maxFps, runWhilePaused]);
}
