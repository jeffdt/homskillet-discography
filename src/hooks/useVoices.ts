import { useEffect, useState } from 'react';
import { VoiceInfo } from '../audio/data/contract';
import { useAudioData } from '../contexts/AudioDataContext';

/** The loaded track's voices; re-renders only on load, unload and mute/solo changes. */
export function useVoices(): VoiceInfo[] {
  const { source } = useAudioData();
  const [voices, setVoices] = useState<VoiceInfo[]>(() => source.getVoices());
  useEffect(() => {
    setVoices(source.getVoices());
    return source.onVoicesChanged(setVoices);
  }, [source]);
  return voices;
}
