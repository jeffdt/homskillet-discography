import { FrameLoop, PulseChannel, SpectrumLayout, VoiceFrame } from './contract';
import { PulseMeter } from './PulseMeter';

/** FrameLoop id of the one consumer that drives every pulse target. */
export const PULSE_LOOP_ID = 'audio-pulse';

/**
 * The audio pulse as CSS custom properties: one FrameLoop consumer computes the pulse once per
 * frame from the mix spectrum and writes it to every attached element. It registers only while
 * enabled and something is attached, so a paused or pulse-free page does no work.
 */
export function createPulseChannel(frameLoop: FrameLoop, layout: SpectrumLayout): PulseChannel {
  const targets = new Map<HTMLElement, string>();
  const meter = new PulseMeter(layout);
  let enabled = true;
  let remove: (() => void) | null = null;

  const draw = (frame: VoiceFrame, dtMs: number) => {
    const text = meter.update(frame.mixSpectrum, dtMs).toFixed(3);
    targets.forEach((property, element) => element.style.setProperty(property, text));
  };

  const sync = () => {
    const wanted = enabled && targets.size > 0;
    if (wanted && !remove) {
      meter.reset();
      remove = frameLoop.add(PULSE_LOOP_ID, draw);
    } else if (!wanted && remove) {
      remove();
      remove = null;
    }
  };

  return {
    attach(element, property) {
      targets.set(element, property);
      sync();
      return () => {
        if (targets.get(element) !== property) return;
        targets.delete(element);
        element.style.setProperty(property, '0');
        sync();
      };
    },
    setEnabled(next) {
      enabled = next;
      if (!next) targets.forEach((property, element) => element.style.setProperty(property, '0'));
      sync();
    },
  };
}
