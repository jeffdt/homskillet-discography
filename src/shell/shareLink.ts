import { VOICE_PAIRS } from '../audio/constants';
import {
  DEFAULT_VOICE_PAN,
  DEFAULT_VOICE_REVERB,
  DEFAULT_VOICE_VOLUME,
  voicePan,
  voiceReverb,
  voiceVolume,
} from '../audio/render/voiceGains';
import { VoiceMix } from '../audio/types';
import { MIXER_SLIDERS, MixerSliderId } from '../components/mixer/mixerControls';
import { VISUALIZER_DEFAULTS } from '../config/stageSettings';

/*
 * A share link is a ?play= link that also carries what made the song sound and look the way it
 * did. Only values that differ from the defaults go in, so an untouched mix gives a plain
 * ?play= link:
 *
 *   speed, bass, stereo   Mixer sliders as plain numbers: speed=0.5
 *   mute, solo            voice indices run together: mute=02 mutes voices 0 and 2
 *   vol, pan, verb        percent per voice from voice 0, "_" between, trailing defaults
 *                         dropped: vol=100_50 halves voice 1, pan=0_-40 moves it 40% left
 *   viz                   changed visualizer settings as base64url JSON
 */

/** Mixer slider ids by their share parameter. */
const SLIDER_PARAMS: Record<string, MixerSliderId> = {
  speed: 'tempo',
  bass: 'subbass',
  stereo: 'stereoWidth',
};

/** Every query parameter a share link adds besides play and t. */
export const SHARE_PARAMS = [
  ...Object.keys(SLIDER_PARAMS),
  'mute',
  'solo',
  'vol',
  'pan',
  'verb',
  'viz',
] as const;

type VisualizerSettings = typeof VISUALIZER_DEFAULTS;
type VisualizerKey = keyof VisualizerSettings;

/** What a share link carries besides the track. Each part is missing when it is the default. */
export interface SharedSettings {
  sliders: Partial<Record<MixerSliderId, number>>;
  mix: VoiceMix | null;
  visualizer: Partial<VisualizerSettings>;
}

/** What to put in a share link. */
export interface ShareLinkInput {
  trackId: string;
  /** Start position in ms, or null to start from the top. */
  startMs: number | null;
  sliders?: Record<MixerSliderId, number>;
  mix?: VoiceMix | null;
  visualizer?: Record<string, unknown> | null;
}

const EPSILON = 1e-6;

function sliderDef(id: MixerSliderId) {
  return MIXER_SLIDERS.find((def) => def.id === id)!;
}

function differs(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) > EPSILON;
  return a !== b;
}

/** Mixer slider values that differ from their defaults, rounded to the slider's step. */
export function changedSliders(
  sliders: Record<MixerSliderId, number>
): Partial<Record<MixerSliderId, number>> {
  const changed: Partial<Record<MixerSliderId, number>> = {};
  MIXER_SLIDERS.forEach((def) => {
    const value = sliders[def.id];
    if (Number.isFinite(value) && differs(value, def.defaultValue)) changed[def.id] = value;
  });
  return changed;
}

/** Visualizer settings that differ from VISUALIZER_DEFAULTS and have the default's type. */
export function changedVisualizer(settings: Record<string, unknown>): Partial<VisualizerSettings> {
  const changed: Record<string, unknown> = {};
  (Object.keys(VISUALIZER_DEFAULTS) as VisualizerKey[]).forEach((key) => {
    const value = settings[key];
    const fallback = VISUALIZER_DEFAULTS[key];
    if (typeof value !== typeof fallback) return;
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    if (differs(value, fallback)) changed[key] = value;
  });
  return changed as Partial<VisualizerSettings>;
}

/** True when the mix sounds different from the song as written. */
export function mixChanged(mix: VoiceMix): boolean {
  for (let v = 0; v < VOICE_PAIRS; v++) {
    if (mix.muted[v] || mix.soloed[v]) return true;
    if (differs(voiceVolume(mix, v), DEFAULT_VOICE_VOLUME)) return true;
    if (differs(voicePan(mix, v), DEFAULT_VOICE_PAN)) return true;
    if (differs(voiceReverb(mix, v), DEFAULT_VOICE_REVERB)) return true;
  }
  return false;
}

function indicesOf(flags: readonly boolean[]): string {
  let out = '';
  for (let v = 0; v < VOICE_PAIRS; v++) if (flags[v]) out += v;
  return out;
}

function percentList(level: (v: number) => number, fallback: number): string {
  const values = Array.from({ length: VOICE_PAIRS }, (_, v) => Math.round(level(v) * 100));
  const fallbackPercent = Math.round(fallback * 100);
  while (values.length > 0 && values[values.length - 1] === fallbackPercent) values.pop();
  return values.join('_');
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string | null {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** The query string (no "?") for a share link. */
export function buildShareQuery(input: ShareLinkInput): string {
  const params = new URLSearchParams();
  params.set('play', input.trackId);
  if (input.startMs !== null && input.startMs > 0)
    params.set('t', String(Math.floor(input.startMs)));
  if (input.sliders) {
    const changed = changedSliders(input.sliders);
    Object.entries(SLIDER_PARAMS).forEach(([param, id]) => {
      const value = changed[id];
      if (value !== undefined) params.set(param, String(Math.round(value * 1000) / 1000));
    });
  }
  const mix = input.mix;
  if (mix && mixChanged(mix)) {
    const muted = indicesOf(mix.muted);
    const soloed = indicesOf(mix.soloed);
    const volume = percentList((v) => voiceVolume(mix, v), DEFAULT_VOICE_VOLUME);
    const pan = percentList((v) => voicePan(mix, v), DEFAULT_VOICE_PAN);
    const reverb = percentList((v) => voiceReverb(mix, v), DEFAULT_VOICE_REVERB);
    if (muted) params.set('mute', muted);
    if (soloed) params.set('solo', soloed);
    if (volume) params.set('vol', volume);
    if (pan) params.set('pan', pan);
    if (reverb) params.set('verb', reverb);
  }
  if (input.visualizer) {
    const changed = changedVisualizer(input.visualizer);
    if (Object.keys(changed).length > 0) params.set('viz', toBase64Url(JSON.stringify(changed)));
  }
  // Slashes and spaces stay readable, like the address bar's own ?play= links.
  return params.toString().replace(/%2F/g, '/');
}

/** The full share URL: siteUrl is the site's address up to and including its base path. */
export function buildShareUrl(input: ShareLinkInput, siteUrl: string): string {
  return `${siteUrl}?${buildShareQuery(input)}`;
}

function parseIndices(text: string | null): boolean[] {
  const flags = new Array<boolean>(VOICE_PAIRS).fill(false);
  if (!text) return flags;
  for (const char of text) {
    const v = Number(char);
    if (Number.isInteger(v) && v >= 0 && v < VOICE_PAIRS) flags[v] = true;
  }
  return flags;
}

/** Percent list to fractions; anything unreadable takes the fallback (clamped later). */
function parsePercents(text: string | null, fallback: number): number[] {
  const values = new Array<number>(VOICE_PAIRS).fill(fallback);
  if (!text) return values;
  text
    .split('_')
    .slice(0, VOICE_PAIRS)
    .forEach((part, v) => {
      const percent = part === '' ? NaN : Number(part);
      if (Number.isFinite(percent)) values[v] = percent / 100;
    });
  return values;
}

function parseVisualizer(text: string | null): Partial<VisualizerSettings> {
  if (!text) return {};
  const json = fromBase64Url(text);
  if (json === null) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? changedVisualizer(parsed)
      : {};
  } catch {
    return {};
  }
}

/** Reads a share link's settings from a query string; anything malformed is left out. */
export function parseSharedSettings(search: string): SharedSettings {
  const params = new URLSearchParams(search);
  const sliders: Partial<Record<MixerSliderId, number>> = {};
  Object.entries(SLIDER_PARAMS).forEach(([param, id]) => {
    const raw = params.get(param);
    const value = raw === null || raw === '' ? NaN : Number(raw);
    if (!Number.isFinite(value)) return;
    const def = sliderDef(id);
    sliders[id] = Math.min(def.max, Math.max(def.min, value));
  });
  const mix: VoiceMix = {
    muted: parseIndices(params.get('mute')),
    soloed: parseIndices(params.get('solo')),
    volume: parsePercents(params.get('vol'), DEFAULT_VOICE_VOLUME),
    pan: parsePercents(params.get('pan'), DEFAULT_VOICE_PAN),
    reverb: parsePercents(params.get('verb'), DEFAULT_VOICE_REVERB),
  };
  return {
    sliders,
    mix: mixChanged(mix) ? mix : null,
    visualizer: parseVisualizer(params.get('viz')),
  };
}

/** True when shared settings would change anything. */
export function hasSharedSettings(shared: SharedSettings): boolean {
  return (
    Object.keys(shared.sliders).length > 0 ||
    shared.mix !== null ||
    Object.keys(shared.visualizer).length > 0
  );
}
