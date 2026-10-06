import React from 'react';
import { createFrameLoop } from '../../audio/data/FrameLoop';
import { createPulseChannel } from '../../audio/data/PulseChannel';
import { AudioDataContext, AudioDataContextValue } from '../../contexts/AudioDataContext';
import { ManualScheduler, StaticAudioDataSource } from './frameHarness';

/** A hand-driven FrameLoop over a StaticAudioDataSource, plus a pulse channel, for component tests. */
export function createTestAudioData() {
  const scheduler = new ManualScheduler();
  const source = new StaticAudioDataSource();
  const frameLoop = createFrameLoop({ source, scheduler });
  const pulse = createPulseChannel(frameLoop, source.layout);
  const value: AudioDataContextValue = { source, frameLoop, pulse };
  return { scheduler, source, frameLoop, pulse, value };
}

/** Wraps ui in an AudioDataContext provider. */
export function withAudioData(value: AudioDataContextValue, ui: React.ReactElement) {
  return <AudioDataContext.Provider value={value}>{ui}</AudioDataContext.Provider>;
}
