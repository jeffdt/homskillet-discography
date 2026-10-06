import React, { useEffect } from 'react';
import { useAudioData } from '../contexts/AudioDataContext';

/** Writes the audio pulse to ref's CSS custom property while active; writes 0 while inactive. */
export function usePulseTarget(
  ref: React.RefObject<HTMLElement>,
  property: string,
  active: boolean
): void {
  const { pulse } = useAudioData();
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (!active) {
      element.style.setProperty(property, '0');
      return undefined;
    }
    return pulse.attach(element, property);
  }, [pulse, ref, property, active]);
}
