import React, { useRef } from 'react';
import { usePulseTarget } from '../hooks/usePulseTarget';

/** Three small bars that follow the audio pulse through the --level CSS variable (no re-renders). */
export default function LevelIndicator({ active }: { active: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  usePulseTarget(ref, '--level', active);
  return (
    <span ref={ref} className="LevelIndicator" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
