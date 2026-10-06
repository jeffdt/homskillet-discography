import { TAP_HISTORY } from '../constants';

/** Samples per voice in VoiceData.waveform (43 ms at 24 kHz). */
export const WAVEFORM_SAMPLES = 1024;
/** Newest waveform samples VoiceData.rms measures (21 ms at 24 kHz). */
export const RMS_SAMPLES = 512;
/** VoiceData.rms rises with this time constant... */
export const RMS_ATTACK_MS = 10;
/** ...and falls with this one, like a level meter. */
export const RMS_RELEASE_MS = 150;

/** Mix samples fed to the constant-Q transform: 171 ms at 24 kHz covers its longest kernel (measured 2026-10-06). */
export const MIX_INPUT_SAMPLES = 4096;
/** Taps are scaled to -1..1 per voice, twice the engine's output scale; this matches what the old AnalyserNode saw. */
export const MIX_SCALE = 0.5;
/** Furthest the analysis window may sit behind the newest tap sample to line up with what is audible. */
export const MAX_ALIGN_DELAY_SAMPLES = TAP_HISTORY - MIX_INPUT_SAMPLES;

/** The bins and range of the old Spectrogram: 448 log-spaced bins from about A0 to C8. */
export const SPECTRUM_BINS = 448;
export const SPECTRUM_MIN_HZ = 25.95;
export const SPECTRUM_MAX_HZ = 4504;
/** showcqtbar's volume argument (the old visualizer's `db`). */
export const CQT_VOLUME = 32;

/** FFT size for per-voice spectra and the stub-mode mix spectrum (85 ms at 24 kHz). */
export const VOICE_FFT_SIZE = 2048;
/** FFT spectra report sqrt(FFT_SPECTRUM_GAIN * amplitude); 16 lands within 15% of the CQT peak for a sine (measured 2026-10-06). */
export const FFT_SPECTRUM_GAIN = 16;

/** dtMs never exceeds this, so a stall or a hidden tab cannot make animations jump. */
export const MAX_FRAME_DT_MS = 100;
/** FrameLoop global cap on compact and low-power devices (spec 3.10). */
export const LOW_POWER_MAX_FPS = 30;
/** A consumer capped at maxFps draws once at least 1000 / maxFps minus this many ms have passed (rAF jitter). */
export const FPS_TOLERANCE_MS = 2;
/** Frames between FrameLoopStats reports. */
export const STATS_EVERY_FRAMES = 300;

/** The audio pulse is the mix spectrum's RMS between these frequencies (leads and snares)... */
export const PULSE_MIN_HZ = 500;
export const PULSE_MAX_HZ = 4000;
/** ...boosted by this gain before clipping at 1 and squaring... */
export const PULSE_GAIN = 2.5;
/** ...and smoothed with this time constant (the old per-frame alpha of 0.2 at 60 fps). */
export const PULSE_SMOOTHING_MS = 75;
