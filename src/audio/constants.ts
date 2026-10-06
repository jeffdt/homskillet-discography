/** GME multi-channel mode emits 8 stereo pairs per frame, one per voice (voice i lands in pair i % 8). */
export const VOICE_PAIRS = 8;
export const INTERLEAVED_CHANNELS = VOICE_PAIRS * 2;

/** Frames per gme_play call while playing; equals the AudioWorklet render quantum. */
export const RENDER_CHUNK_FRAMES = 128;

/** int16 to float. The old GMEPlayer divided by 65535, so this keeps today's loudness. */
export const OUTPUT_SCALE = 1 / 65536;

/** Mute and solo changes ramp each voice's gain over this many frames so they never click. */
export const GAIN_RAMP_FRAMES = 128;

/** Pause, unpause and seek fade the output over this long to avoid pops. */
export const DECLICK_MS = 5;

/** Fade-out that starts when a track reaches its duration (the old GMEPlayer used 4000 ms). */
export const END_FADE_MS = 4000;

/**
 * Output frames emulated per frame rendered while seeking. At 64x a 128-frame quantum emulates
 * 8192 frames (171 ms at 48 kHz), about 1.2 ms of CPU on an Apple-silicon Mac. Output is silent
 * during a seek, so an overrun on a slow device only lengthens the silence.
 */
export const SEEK_SPEED = 64;

/** Frames per gme_play call while seeking (size of the scratch buffer). */
export const SEEK_CHUNK_FRAMES = 1024;

/** GME's default play_length; tracks reporting it play for EXTENDED_PLAY_LENGTH_MS instead. */
export const DEFAULT_PLAY_LENGTH_MS = 150000;
export const EXTENDED_PLAY_LENGTH_MS = 180000;

/** Analysis taps: per-voice mono, decimated by averaging this many frames. */
export const TAP_DECIMATION = 2;

/** Samples per voice in each tap snapshot (about 43 ms at 24 kHz). Sub-project 3 may tune it. */
export const TAP_WINDOW = 1024;

/** Ring capacity per voice. Must be a power of two and larger than TAP_WINDOW. */
export const TAP_RING = 4096;

/** Samples per voice the main thread keeps in TapHistory (683 ms at 24 kHz). Power of two. */
export const TAP_HISTORY = 16384;

/** The pooled transport posts one snapshot per this many output frames (16 ms at 48 kHz). */
export const TAP_POST_INTERVAL_FRAMES = 768;

/** Transfer buffers the pooled transport cycles between the threads. */
export const TAP_POOL_SIZE = 4;

/** Main-thread position extrapolation never runs further than this past the newest status. */
export const MAX_POSITION_EXTRAPOLATION_S = 0.25;

/** How long a running AudioContext may take to report the processor ready before falling back. */
export const WORKLET_READY_TIMEOUT_MS = 5000;

export const CHIP_PROCESSOR_NAME = 'chip-processor';
