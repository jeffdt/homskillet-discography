import { VoiceInfo } from '../data/contract';
import { computeVoiceLevels, unityVoiceLevels } from '../render/voiceGains';
import { RendererSettings, VoiceLevels } from '../types';
import { CHANNEL_LEVELS } from '../../components/mixer/channelLevels';
import { formatPercent, MIXER_SLIDERS } from '../../components/mixer/mixerControls';
import { mixOf } from '../../components/mixer/voiceMix';

/** File formats a track can be downloaded as. */
export type ExportFormat = 'mp3' | 'wav';

export const EXPORT_SAMPLE_RATE = 48000;
export const MP3_KBPS = 320;
export const MIN_EXPORT_MS = 5000;
export const MAX_EXPORT_MS = 600000;
export const LONG_WAV_MS = 300000;
export const EXPORT_ARTIST = 'homskillet';

const WAV_HEADER_BYTES = 44;
const WAV_BYTES_PER_FRAME = 4;

/** Reads "m:ss" or a bare number of seconds into ms; null when it is neither. */
export function parseLength(text: string): number | null {
  const trimmed = text.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const match = /^(\d+):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;
  return (Number(match[1]) * 60 + Number(match[2])) * 1000;
}

/** Formats ms as "m:ss", rounded to the nearest second. */
export function formatLength(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Why a length cannot be exported, or null when it can. */
export function lengthError(ms: number | null): string | null {
  if (ms === null) return 'Enter a length like 3:04.';
  if (ms < MIN_EXPORT_MS) return `Must be at least ${formatLength(MIN_EXPORT_MS)}.`;
  if (ms > MAX_EXPORT_MS) return `Must be at most ${formatLength(MAX_EXPORT_MS)}.`;
  return null;
}

/** Output frames in an export of lengthMs. */
export function exportFrameCount(lengthMs: number): number {
  return Math.round((lengthMs * EXPORT_SAMPLE_RATE) / 1000);
}

/** Expected file size in bytes. */
export function estimateBytes(format: ExportFormat, lengthMs: number): number {
  if (format === 'wav') return exportFrameCount(lengthMs) * WAV_BYTES_PER_FRAME + WAV_HEADER_BYTES;
  return Math.round(((MP3_KBPS * 1000) / 8) * (lengthMs / 1000));
}

/** "about N MB", never below 1. */
export function formatMegabytes(bytes: number): string {
  return `about ${Math.max(1, Math.round(bytes / 1e6))} MB`;
}

/** True for WAVs long enough to deserve the size warning. */
export function isLongWav(format: ExportFormat, lengthMs: number): boolean {
  return format === 'wav' && lengthMs > LONG_WAV_MS;
}

/** The Mixer state an export can use. Slider values are keyed by MixerSliderDef.id. */
export interface MixSnapshot {
  tempo: number;
  subbass: number;
  stereoWidth: number;
  voices: readonly VoiceInfo[];
}

function sliderDefault(id: string): number {
  return MIXER_SLIDERS.find((def) => def.id === id)!.defaultValue;
}

/** Slider values of the original song. */
export const ORIGINAL_MIX_VALUES = {
  tempo: sliderDefault('tempo'),
  subbass: sliderDefault('subbass'),
  stereoWidth: sliderDefault('stereoWidth'),
};

const EPSILON = 1e-9;

function changedSliders(mix: MixSnapshot) {
  return MIXER_SLIDERS.filter((def) => Math.abs(mix[def.id] - def.defaultValue) > EPSILON);
}

/** True when mute and solo leave no voice audible, so the mix would be silence. */
export function mixSilent(mix: MixSnapshot): boolean {
  return mix.voices.length > 0 && !mix.voices.some((voice) => voice.audible);
}

/** Each heard voice's Vol, Pan or Verb that is off its default, as "Triangle Vol 150%". */
function changedLevels(mix: MixSnapshot): string[] {
  const parts: string[] = [];
  mix.voices
    .filter((voice) => voice.audible)
    .forEach((voice) => {
      CHANNEL_LEVELS.forEach((def) => {
        if (Math.abs(voice[def.id] - def.defaultValue) > EPSILON)
          parts.push(`${voice.name} ${def.label} ${def.format(voice[def.id])}`);
      });
    });
  return parts;
}

/** True when the mix sounds different from the original song. */
export function mixDiffers(mix: MixSnapshot): boolean {
  return (
    changedSliders(mix).length > 0 ||
    mix.voices.some((voice) => !voice.audible) ||
    changedLevels(mix).length > 0
  );
}

/** One line naming what differs from the original, e.g. "Speed 110% · Triangle muted". */
export function mixSummary(mix: MixSnapshot): string {
  const parts = changedSliders(mix).map((def) => `${def.label} ${formatPercent(mix[def.id])}`);
  if (mixSilent(mix)) {
    parts.push('All voices silent');
  } else if (mix.voices.some((voice) => voice.soloed)) {
    const heard = mix.voices.filter((voice) => voice.audible).map((voice) => voice.name);
    parts.push(`Only ${heard.join(' + ')}`);
  } else {
    mix.voices.filter((voice) => voice.muted).forEach((voice) => parts.push(`${voice.name} muted`));
  }
  if (!mixSilent(mix)) parts.push(...changedLevels(mix));
  return parts.join(' · ');
}

/** Renderer settings and per-voice levels for an export; a null mix means the original song. */
export function exportSettings(mix: MixSnapshot | null): {
  settings: RendererSettings;
  levels: VoiceLevels;
} {
  const values = mix ?? ORIGINAL_MIX_VALUES;
  const levels = mix ? computeVoiceLevels(mixOf(mix.voices)) : unityVoiceLevels();
  return {
    settings: {
      tempo: values.tempo,
      subBass: values.subbass,
      stereoWidth: values.stereoWidth,
      loopForever: false,
    },
    levels,
  };
}

/** Replaces characters file systems reject with "-" and collapses whitespace. */
export function sanitizeFileName(name: string): string {
  return (
    name
      // eslint-disable-next-line no-control-regex
      .replace(/[/\\:*?"<>|\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** "homskillet - Title.ext", with " (custom mix)" for a mix that differs from the original. */
export function exportFileName(title: string, customMix: boolean, format: ExportFormat): string {
  const suffix = customMix ? ' (custom mix)' : '';
  return `${sanitizeFileName(`${EXPORT_ARTIST} - ${title}${suffix}`)}.${format}`;
}
