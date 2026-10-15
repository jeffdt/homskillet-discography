import React from 'react';
import { VoiceMix } from '../../audio/types';
import { useVoices } from '../../hooks/useVoices';
import ChannelStrip from './ChannelStrip';
import {
  CHIP_DESCRIPTIONS,
  groupByChip,
  setVoiceLevel,
  toggleMute,
  toggleSolo,
  VoiceLevel,
} from './voiceMix';

/** Shown instead of strips while no track is loaded (spec 3.2). */
export const EMPTY_CHANNELS_HINT = 'Play a song to see its channels.';

interface ChannelStripsProps {
  onVoiceMixChange: (mix: VoiceMix) => void;
}

/** The loaded track's channels, grouped by sound chip. Re-renders only on load, unload and mix changes. */
export default function ChannelStrips({ onVoiceMixChange }: ChannelStripsProps) {
  const voices = useVoices();
  if (voices.length === 0) return <p className="Mixer-hint">{EMPTY_CHANNELS_HINT}</p>;

  const onToggleMute = (index: number) => onVoiceMixChange(toggleMute(voices, index));
  const onToggleSolo = (index: number) => onVoiceMixChange(toggleSolo(voices, index));
  const onLevelChange = (index: number, level: VoiceLevel, value: number) =>
    onVoiceMixChange(setVoiceLevel(voices, index, level, value));

  return (
    <div className="ChannelStrips">
      {groupByChip(voices).map((group) => (
        <section key={group.chip} className="ChannelStrips-chip">
          <h4 className="ChannelStrips-chip-name">{group.chip}</h4>
          {CHIP_DESCRIPTIONS[group.chip] && (
            <p className="Mixer-explain">{CHIP_DESCRIPTIONS[group.chip]}</p>
          )}
          <ul className="ChannelStrips-list">
            {group.voices.map((voice) => (
              <ChannelStrip
                key={voice.index}
                voice={voice}
                onToggleMute={onToggleMute}
                onToggleSolo={onToggleSolo}
                onLevelChange={onLevelChange}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
