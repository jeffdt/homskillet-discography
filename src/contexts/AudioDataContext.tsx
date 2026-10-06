import React, { useContext } from 'react';
import { AudioDataSource, FrameLoopController, PulseChannel } from '../audio/data/contract';
import { createAudioData } from '../audio/data/createAudioData';

/** What components read: the data source, the frame loop and the pulse channel. */
export interface AudioDataContextValue {
  source: AudioDataSource;
  frameLoop: FrameLoopController;
  pulse: PulseChannel;
}

/**
 * App provides its AudioData here. Outside a provider (isolated components, tests) the default is
 * a real but silent instance: no voices, zero frames, and nothing draws until playing.
 */
export const AudioDataContext = React.createContext<AudioDataContextValue>(createAudioData());

/** The audio data the nearest provider supplies. */
export function useAudioData(): AudioDataContextValue {
  return useContext(AudioDataContext);
}
