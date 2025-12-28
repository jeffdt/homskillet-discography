/**
 * Stub implementation of chip-core for development without WebAssembly
 *
 * This provides a mock implementation of the game-music-emu API that allows
 * the UI to function without actually loading chip-core.wasm.
 *
 * Useful for:
 * - UI/UX development without complex build dependencies
 * - Remote/lightweight development environments
 * - Testing UI behavior without audio playback
 */

// Mock heap for memory operations
const mockHeap = new Uint8Array(1024 * 1024); // 1MB mock heap
let heapPointer = 1000; // Start allocations at offset 1000

// Mock emulator state
const mockEmulators = new Map();
let emuIdCounter = 1;

// Mock track info for a typical NSF file
const MOCK_TRACK_INFO = {
  length: 180000,        // 3 minutes
  intro_length: 0,
  loop_length: 120000,   // 2 minute loop
  play_length: 180000,
  system: 'Nintendo NES',
  game: 'Mock Game',
  song: 'Mock Song',
  author: 'Homskillet',
  copyright: '2024',
  comment: 'This is a mock track for stub mode development',
  dumper: '',
  voice_count: 5,        // NES has 5 channels
};

// Mock voice names for NES
const MOCK_VOICE_NAMES = [
  'Square 1',
  'Square 2',
  'Triangle',
  'Noise',
  'DMC',
];

function ChipCoreStub() {
  console.warn('[STUB MODE] Using mock chip-core implementation - no actual audio playback');

  const stub = {
    // Memory management stubs
    _malloc: (size) => {
      const ptr = heapPointer;
      heapPointer += size;
      return ptr;
    },

    _free: (ptr) => {
      // No-op in stub mode
    },

    HEAPU8: mockHeap,

    getValue: (ptr, type) => {
      // Return appropriate default values based on type
      if (type === 'i8' || type === 'i16') return 0;
      if (type === 'i32') return 0;
      if (type === 'i64') return 0;
      if (type === 'float' || type === 'double') return 0.0;
      if (type === '*') return 0; // pointer
      return 0;
    },

    setValue: (ptr, value, type) => {
      // No-op in stub mode
    },

    UTF8ToString: (ptr) => {
      return 'Mock String';
    },

    // Game Music Emu function stubs
    _gme_open_data: (data, size, emuPtr, sampleRate) => {
      const emuId = emuIdCounter++;
      mockEmulators.set(emuId, {
        currentTrack: 0,
        position: 0,
        tempo: 1.0,
        stereoDepth: 0,
        trackCount: 1,
        voiceCount: 5,
        mutedVoices: 0,
        ended: false,
        fadeStart: -1,
        fadeDuration: 0,
      });
      // Write emulator ID to the pointer location
      stub.setValue(emuPtr, emuId, 'i32');
      return 0; // Success
    },

    _gme_delete: (ctx) => {
      mockEmulators.delete(ctx);
    },

    _gme_play: (ctx, sampleCount, buffer) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return -1;

      // Generate silence (zeros) into the buffer
      // In real mode this would be actual audio samples
      for (let i = 0; i < sampleCount * 2; i++) {
        mockHeap[buffer + i * 2] = 0;
        mockHeap[buffer + i * 2 + 1] = 0;
      }

      // Simulate playback progression
      emu.position += (sampleCount / 48000) * 1000; // Convert samples to ms at 48kHz

      // Check if we should end
      if (emu.fadeStart >= 0 && emu.position >= emu.fadeStart + emu.fadeDuration) {
        emu.ended = true;
      } else if (emu.position >= MOCK_TRACK_INFO.length) {
        emu.ended = true;
      }

      return 0;
    },

    _gme_start_track: (ctx, track) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return -1;

      emu.currentTrack = track;
      emu.position = 0;
      emu.ended = false;
      return 0;
    },

    _gme_seek_scaled: (ctx, ms) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return -1;

      emu.position = ms;
      emu.ended = false;
      return 0;
    },

    _gme_tell_scaled: (ctx) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return 0;

      return Math.floor(emu.position);
    },

    _gme_track_count: (ctx) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return 0;

      return emu.trackCount;
    },

    _gme_track_ended: (ctx) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return 1;

      return emu.ended ? 1 : 0;
    },

    _gme_track_info: (ctx, infoPtr, track) => {
      // Write mock track info structure to memory
      // This is a simplified version - the real structure is complex
      // The GMEPlayer will read this structure to get metadata

      // For stub mode, we'll just write some basic values
      // In reality this is a C struct with many fields
      stub.setValue(infoPtr, MOCK_TRACK_INFO.length, 'i32');
      stub.setValue(infoPtr + 4, MOCK_TRACK_INFO.intro_length, 'i32');
      stub.setValue(infoPtr + 8, MOCK_TRACK_INFO.loop_length, 'i32');

      return 0;
    },

    _gme_set_tempo: (ctx, tempo) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return;

      emu.tempo = tempo;
    },

    _gme_set_stereo_depth: (ctx, depth) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return;

      emu.stereoDepth = depth;
    },

    _gme_set_fade: (ctx, startMs, duration) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return;

      emu.fadeStart = startMs;
      emu.fadeDuration = duration;
    },

    _gme_voice_count: (ctx) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return 0;

      return emu.voiceCount;
    },

    _gme_voice_name: (ctx, index) => {
      if (index < 0 || index >= MOCK_VOICE_NAMES.length) {
        return 0; // null pointer
      }

      // Write voice name to mock heap and return pointer
      const name = MOCK_VOICE_NAMES[index];
      const ptr = stub._malloc(name.length + 1);
      for (let i = 0; i < name.length; i++) {
        mockHeap[ptr + i] = name.charCodeAt(i);
      }
      mockHeap[ptr + name.length] = 0; // null terminator

      return ptr;
    },

    _gme_mute_voices: (ctx, bitmask) => {
      const emu = mockEmulators.get(ctx);
      if (!emu) return;

      emu.mutedVoices = bitmask;
    },

    _gme_ignore_silence: (ctx, enable) => {
      // No-op in stub mode
    },

    // Constant-Q Transform stubs (for visualization)
    _cqt_init: (sampleRate, bins, db, fMin, fMax, supersample) => {
      return 1; // Return a mock CQT context ID
    },

    _cqt_bin_to_freq: (binIndex) => {
      // Return a mock frequency
      return 440 * Math.pow(2, (binIndex - 69) / 12);
    },

    _cqt_calc: (dataPtr1, dataPtr2) => {
      // No-op in stub mode
    },

    _cqt_render_line: (dataPtr) => {
      // No-op in stub mode
    },

    // Filesystem stub
    FS: {
      mkdir: () => {},
      mount: () => {},
      syncfs: (populate, callback) => {
        // Call callback immediately with no error
        if (callback) callback(null);
      },
    },
  };

  // Return a promise that resolves immediately (mimics Emscripten module initialization)
  return Promise.resolve(stub);
}

export default ChipCoreStub;
