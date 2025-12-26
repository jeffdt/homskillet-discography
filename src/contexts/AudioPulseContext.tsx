import React, { createContext, useContext, ReactNode } from 'react';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';

interface AudioPulseContextType {
  amplitude: number;
}

const AudioPulseContext = createContext<AudioPulseContextType>({
  amplitude: 0,
});

interface AudioPulseProviderProps {
  audioCtx: AudioContext | null;
  sourceNode: ScriptProcessorNode | null;
  paused: boolean;
  ejected: boolean;
  enabled: boolean;
  children: ReactNode;
}

/**
 * Provider component that analyzes audio and distributes amplitude data
 * Only runs audio analysis when enabled=true to save CPU
 */
export const AudioPulseProvider: React.FC<AudioPulseProviderProps> = ({
  audioCtx,
  sourceNode,
  paused,
  ejected,
  enabled,
  children,
}) => {
  const { amplitude } = useAudioAnalysis({
    audioCtx,
    sourceNode,
    paused,
    ejected,
    enabled,
  });

  return (
    <AudioPulseContext.Provider value={{ amplitude }}>
      {children}
    </AudioPulseContext.Provider>
  );
};

/**
 * Hook to access audio pulse amplitude data
 * Returns { amplitude: number } where amplitude is 0-1
 */
export const useAudioPulse = (): AudioPulseContextType => {
  return useContext(AudioPulseContext);
};
