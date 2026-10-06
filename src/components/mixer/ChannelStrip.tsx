import React, { useRef } from 'react';
import { VoiceFrame, VoiceInfo } from '../../audio/data/contract';
import { useFrameLoop } from '../../hooks/useFrameLoop';
import {
  FLAT_SCOPE_PATH,
  SCOPE_HEIGHT,
  SCOPE_SAMPLES,
  SCOPE_WIDTH,
  findTrigger,
  levelToMeter,
  scopePath,
} from './scopeMath';

/** A channel's color: the active palette's --ch-N, or the accent until a palette defines it. */
export function channelColor(index: number): string {
  return `var(--ch-${index}, var(--accent))`;
}

interface ChannelStripProps {
  voice: VoiceInfo;
  onToggleMute: (index: number) => void;
  onToggleSolo: (index: number) => void;
}

/**
 * One voice: color swatch, name, Mute and Solo, and a live scope and level meter. The scope and
 * meter are written straight to the DOM from the frame loop, never through React state.
 */
export default function ChannelStrip({ voice, onToggleMute, onToggleSolo }: ChannelStripProps) {
  const { index, name, muted, soloed, audible } = voice;
  const pathRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const drawn = useRef({ path: FLAT_SCOPE_PATH, level: '' });

  useFrameLoop(`mixer-strip-${index}`, (frame: VoiceFrame) => {
    const data = frame.voices[index];
    if (!data) return;
    const path = scopePath(data.waveform, findTrigger(data.waveform, SCOPE_SAMPLES), SCOPE_SAMPLES);
    if (path !== drawn.current.path && pathRef.current) {
      pathRef.current.setAttribute('d', path);
      drawn.current.path = path;
    }
    const level = levelToMeter(data.rms).toFixed(2);
    if (level !== drawn.current.level && fillRef.current) {
      fillRef.current.style.setProperty('--level', level);
      drawn.current.level = level;
    }
  });

  return (
    <li
      className={audible ? 'ChannelStrip' : 'ChannelStrip ChannelStrip--ghost'}
      style={{ '--strip-color': channelColor(index) } as React.CSSProperties}
    >
      <span className="ChannelStrip-swatch" aria-hidden="true" />
      <span className="ChannelStrip-name">
        {name}
        {!audible && <span className="ChannelStrip-status">not heard</span>}
      </span>
      <button
        type="button"
        className="ChannelStrip-toggle ChannelStrip-mute"
        aria-label={`Mute ${name}`}
        aria-pressed={muted}
        onClick={() => onToggleMute(index)}
      >
        Mute
      </button>
      <button
        type="button"
        className="ChannelStrip-toggle ChannelStrip-solo"
        aria-label={`Solo ${name}`}
        aria-pressed={soloed}
        onClick={() => onToggleSolo(index)}
      >
        Solo
      </button>
      <svg
        className="ChannelStrip-scope"
        viewBox={`0 0 ${SCOPE_WIDTH} ${SCOPE_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path ref={pathRef} d={FLAT_SCOPE_PATH} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="ChannelStrip-meter" aria-hidden="true">
        <span ref={fillRef} className="ChannelStrip-meter-fill" />
      </span>
    </li>
  );
}
