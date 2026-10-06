import React from 'react';
import { useAudioPulse } from '../contexts/AudioPulseContext';

/** Three small bars that follow the audio pulse; a leaf so only it re-renders per pulse. */
export default function LevelIndicator({ active }: { active: boolean }) {
  const { amplitude } = useAudioPulse();
  const level = active ? Math.min(1, amplitude) : 0;
  return (
    <span
      className="LevelIndicator"
      aria-hidden="true"
      style={{ '--level': level } as React.CSSProperties}
    >
      <span />
      <span />
      <span />
    </span>
  );
}
