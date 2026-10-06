/**
 * Stub implementation of chip-core for development without WebAssembly.
 *
 * Implements the game-music-emu calls the audio engine uses, including multi-channel mode, and
 * writes quiet fake per-voice waveforms so the visualizer and analysis taps have data. The engine
 * runs the stub on a silent ScriptProcessor, so nothing is audible (see createAudioEngine).
 */

const HEAP_BYTES = 4 * 1024 * 1024;
const HEAP_START = 1024;
const VOICE_PAIRS = 8;
const FAKE_LEVEL = 3000;
// The stub's own end-of-track comes after the engine's 4 s fade, so the fade ends tracks first.
const STUB_TRAILING_MS = 10000;
const GME_INFO_BYTES = 64 + 16 * 4;

const MOCK_TRACK_INFO = {
  length: 180000,
  intro_length: 0,
  loop_length: 120000,
  play_length: 180000,
  system: 'Nintendo NES',
  game: 'Mock Game',
  song: 'Mock Song',
  author: 'Homskillet',
  copyright: '2024',
  comment: 'This is a mock track for stub mode development',
  dumper: '',
};

const MOCK_VOICE_NAMES = ['Square 1', 'Square 2', 'Triangle', 'Noise', 'DMC'];

function fakeVoiceSample(voice, frame, emu) {
  const t = frame / emu.rate;
  const swell = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.25 * t + voice);
  let wave;
  switch (voice) {
    case 0:
      wave = (t * 220) % 1 < 0.5 ? 1 : -1;
      break;
    case 1:
      wave = (t * 330) % 1 < 0.25 ? 1 : -1;
      break;
    case 2:
      wave = 4 * Math.abs(((t * 110) % 1) - 0.5) - 1;
      break;
    case 3:
      emu.noise = (emu.noise * 1103515245 + 12345) & 0x7fffffff;
      wave = emu.noise & 0x4000 ? 0.5 : -0.5;
      break;
    default:
      wave = ((t * 55) % 1) * 2 - 1;
  }
  return Math.round(wave * swell * FAKE_LEVEL);
}

function ChipCoreStub() {
  console.warn('[STUB MODE] Using mock chip-core implementation - no actual audio playback');

  const buffer = new ArrayBuffer(HEAP_BYTES);
  const HEAPU8 = new Uint8Array(buffer);
  const HEAP16 = new Int16Array(buffer);
  const HEAP32 = new Int32Array(buffer);
  const view = new DataView(buffer);
  const sizes = new Map();
  const freeBlocks = [];
  const strings = new Map();
  const emulators = new Map();
  let heapPointer = HEAP_START;
  let nextEmuId = 1;

  function malloc(size) {
    const aligned = Math.max(8, (size + 7) & ~7);
    const reuse = freeBlocks.findIndex((block) => block.size >= aligned);
    if (reuse !== -1) {
      const block = freeBlocks.splice(reuse, 1)[0];
      sizes.set(block.ptr, block.size);
      return block.ptr;
    }
    if (heapPointer + aligned > HEAP_BYTES) throw new Error('[STUB] mock heap exhausted');
    const ptr = heapPointer;
    heapPointer += aligned;
    sizes.set(ptr, aligned);
    return ptr;
  }

  function free(ptr) {
    const size = sizes.get(ptr);
    if (size === undefined) return;
    sizes.delete(ptr);
    freeBlocks.push({ ptr, size });
  }

  function staticString(text) {
    if (strings.has(text)) return strings.get(text);
    const ptr = malloc(text.length + 1);
    for (let i = 0; i < text.length; i++) HEAPU8[ptr + i] = text.charCodeAt(i) & 0xff;
    HEAPU8[ptr + text.length] = 0;
    strings.set(text, ptr);
    return ptr;
  }

  function createEmu(rate, multi) {
    const id = nextEmuId++;
    emulators.set(id, { rate, multi, tempo: 1, positionMs: 0, frame: 0, ended: false, noise: 1 });
    return id;
  }

  const stub = {
    HEAPU8,
    HEAP16,
    HEAP32,
    HEAPU16: new Uint16Array(buffer),
    HEAPF32: new Float32Array(buffer),

    _malloc: malloc,
    _free: free,

    getValue: (ptr, type) => {
      if (type === 'i8') return view.getInt8(ptr);
      if (type === 'i16') return view.getInt16(ptr, true);
      if (type === 'i32' || type === 'i8*' || type === '*') return view.getInt32(ptr, true);
      if (type === 'float') return view.getFloat32(ptr, true);
      if (type === 'double') return view.getFloat64(ptr, true);
      return 0;
    },

    setValue: (ptr, value, type) => {
      if (type === 'i8') view.setInt8(ptr, value);
      else if (type === 'i16') view.setInt16(ptr, value, true);
      else if (type === 'i32' || type === '*') view.setInt32(ptr, value, true);
      else if (type === 'float') view.setFloat32(ptr, value, true);
      else if (type === 'double') view.setFloat64(ptr, value, true);
    },

    UTF8ToString: (ptr) => {
      let text = '';
      for (let i = ptr; ptr && HEAPU8[i] !== 0; i++) text += String.fromCharCode(HEAPU8[i]);
      return text;
    },

    _gme_identify_header: () => staticString('NSF'),
    _gme_identify_extension: () => 1,
    _gme_new_emu_multi_channel: (type, rate) => createEmu(rate, true),
    _gme_load_data: () => 0,
    _gme_multi_channel: (id) => (emulators.get(id)?.multi ? 1 : 0),

    _gme_open_data: (dataPtr, size, emuOutPtr, rate) => {
      HEAP32[emuOutPtr >> 2] = createEmu(rate, false);
      return 0;
    },

    _gme_delete: (id) => {
      emulators.delete(id);
    },

    _gme_play: (id, count, outPtr) => {
      const emu = emulators.get(id);
      if (!emu) return 0;
      const channels = emu.multi ? VOICE_PAIRS * 2 : 2;
      const frames = Math.floor(count / channels);
      const base = outPtr >> 1;
      for (let f = 0; f < frames; f++) {
        let mix = 0;
        for (let v = 0; v < VOICE_PAIRS; v++) {
          const s = v < MOCK_VOICE_NAMES.length ? fakeVoiceSample(v, emu.frame + f, emu) : 0;
          if (emu.multi) {
            HEAP16[base + f * channels + 2 * v] = s;
            HEAP16[base + f * channels + 2 * v + 1] = s;
          } else {
            mix += s;
          }
        }
        if (!emu.multi) {
          const clamped = Math.max(-32768, Math.min(32767, mix));
          HEAP16[base + f * 2] = clamped;
          HEAP16[base + f * 2 + 1] = clamped;
        }
      }
      emu.frame += frames;
      emu.positionMs += (frames / emu.rate) * 1000 * emu.tempo;
      if (emu.positionMs >= MOCK_TRACK_INFO.play_length + STUB_TRAILING_MS) emu.ended = true;
      return 0;
    },

    _gme_start_track: (id) => {
      const emu = emulators.get(id);
      if (!emu) return -1;
      emu.positionMs = 0;
      emu.frame = 0;
      emu.ended = false;
      return 0;
    },

    _gme_seek_scaled: (id, ms) => {
      const emu = emulators.get(id);
      if (!emu) return -1;
      emu.positionMs = ms;
      emu.ended = false;
      return 0;
    },

    _gme_tell_scaled: (id) => Math.floor((emulators.get(id)?.positionMs ?? 0) + 1e-6),
    _gme_track_ended: (id) => (emulators.get(id)?.ended === false ? 0 : 1),
    _gme_track_count: () => 1,

    _gme_set_tempo: (id, tempo) => {
      const emu = emulators.get(id);
      if (emu) emu.tempo = tempo;
    },

    _gme_set_stereo_depth: () => {},
    _gme_set_fade: () => {},
    _gme_ignore_silence: () => {},
    _gme_mute_voices: () => {},

    _gme_voice_count: (id) => (emulators.has(id) ? MOCK_VOICE_NAMES.length : 0),

    _gme_voice_name: (id, index) =>
      index >= 0 && index < MOCK_VOICE_NAMES.length ? staticString(MOCK_VOICE_NAMES[index]) : 0,

    _gme_track_info: (id, infoOutPtr) => {
      const info = malloc(GME_INFO_BYTES);
      HEAPU8.fill(0, info, info + GME_INFO_BYTES);
      const ints = info >> 2;
      HEAP32[ints] = MOCK_TRACK_INFO.length;
      HEAP32[ints + 1] = MOCK_TRACK_INFO.intro_length;
      HEAP32[ints + 2] = MOCK_TRACK_INFO.loop_length;
      HEAP32[ints + 3] = MOCK_TRACK_INFO.play_length;
      const fields = ['system', 'game', 'song', 'author', 'copyright', 'comment', 'dumper'];
      fields.forEach((field, k) => {
        HEAP32[(info + 64 + 4 * k) >> 2] = staticString(MOCK_TRACK_INFO[field]);
      });
      HEAP32[infoOutPtr >> 2] = info;
      return 0;
    },

    _gme_free_info: (info) => free(info),

    // Constant-Q transform stubs (visualization). Returning 0 disables CQT.
    _cqt_init: () => 0,
    _cqt_bin_to_freq: (binIndex) => 440 * Math.pow(2, (binIndex - 69) / 12),
    _cqt_calc: () => {},
    _cqt_render_line: () => {},

    FS: {
      mkdir: () => {},
      mount: () => {},
      syncfs: (populate, callback) => {
        if (callback) callback(null);
      },
    },
  };

  return Promise.resolve(stub);
}

export default ChipCoreStub;
