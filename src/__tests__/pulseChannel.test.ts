import { describe, expect, it } from 'vitest';
import { createFrameLoop } from '../audio/data/FrameLoop';
import { createPulseChannel } from '../audio/data/PulseChannel';
import { ManualScheduler, StaticAudioDataSource } from './helpers/frameHarness';

function setup() {
  const scheduler = new ManualScheduler();
  const source = new StaticAudioDataSource();
  source.frame.mixSpectrum.fill(0.4); // a loud mid band: pulse target 1
  const frameLoop = createFrameLoop({ source, scheduler });
  frameLoop.setPlaying(true);
  const pulse = createPulseChannel(frameLoop, source.layout);
  const run = (frames: number, startMs = 0) => {
    for (let i = 0; i < frames; i++) scheduler.tick(startMs + (i * 1000) / 60);
  };
  return { scheduler, frameLoop, pulse, run };
}

describe('PulseChannel', () => {
  it('writes the smoothed pulse to every attached element each frame', () => {
    const { pulse, run } = setup();
    const button = document.createElement('button');
    const bars = document.createElement('span');
    pulse.attach(button, '--pulse-intensity');
    pulse.attach(bars, '--level');
    run(30);
    expect(Number(button.style.getPropertyValue('--pulse-intensity'))).toBeGreaterThan(0.9);
    expect(bars.style.getPropertyValue('--level')).toBe(
      button.style.getPropertyValue('--pulse-intensity')
    );
  });

  it('does no frame work with nothing attached, and writes 0 on detach', () => {
    const { frameLoop, pulse, run } = setup();
    expect(frameLoop.isRunning()).toBe(false);
    const element = document.createElement('div');
    const detach = pulse.attach(element, '--x');
    expect(frameLoop.isRunning()).toBe(true);
    run(5);
    detach();
    expect(frameLoop.isRunning()).toBe(false);
    expect(element.style.getPropertyValue('--x')).toBe('0');
  });

  it('writes 0 and stops when disabled, and starts from 0 when enabled again', () => {
    const { frameLoop, pulse, run, scheduler } = setup();
    const element = document.createElement('div');
    pulse.attach(element, '--x');
    run(30);
    pulse.setEnabled(false);
    expect(element.style.getPropertyValue('--x')).toBe('0');
    expect(frameLoop.isRunning()).toBe(false);
    pulse.setEnabled(true);
    scheduler.tick(10000);
    expect(Number(element.style.getPropertyValue('--x'))).toBe(0);
  });
});
