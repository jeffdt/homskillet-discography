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
const mockHeapBuffer = new ArrayBuffer(4 * 1024 * 1024); // 4MB mock heap buffer
const mockHeap = new Uint8Array(mockHeapBuffer);
const mockHeapF32 = new Float32Array(mockHeapBuffer);
const mockHeapU16 = new Uint16Array(mockHeapBuffer);
const HEAP_START = 1000;
const HEAP_MAX = mockHeapBuffer.byteLength - 1024; // Leave 1KB at the end
let heapPointer = HEAP_START; // Start allocations at offset 1000

// Mock emulator state
const mockEmulators = new Map();
let emuIdCounter = 1;

// Mock track info for a typical NSF file
const MOCK_TRACK_INFO = {
  length: 180000, // 3 minutes
  intro_length: 0,
  loop_length: 120000, // 2 minute loop
  play_length: 180000,
  system: 'Nintendo NES',
  game: 'Mock Game',
  song: 'Mock Song',
  author: 'Homskillet',
  copyright: '2024',
  comment: 'This is a mock track for stub mode development',
  dumper: '',
  voice_count: 5, // NES has 5 channels
};

// Mock voice names for NES
const MOCK_VOICE_NAMES = ['Square 1', 'Square 2', 'Triangle', 'Noise', 'DMC'];

function ChipCoreStub() {
  console.warn('[STUB MODE] Using mock chip-core implementation - no actual audio playback');

  const stub = {
    // Memory management stubs
    _malloc: (size) => {
      const ptr = heapPointer;
      heapPointer += size;

      // Reset heap if we're getting too full (simple garbage collection)
      if (heapPointer > HEAP_MAX) {
        console.warn(
          '[STUB] Heap full, resetting. This may cause issues with multiple concurrent emulators.'
        );
        heapPointer = HEAP_START;
        return HEAP_START;
      }

      return ptr;
    },

    _free: (ptr) => {
      // No-op in stub mode
    },

    HEAPU8: mockHeap,
    HEAPF32: mockHeapF32,
    HEAPU16: mockHeapU16,

    getValue: (ptr, type) => {
      // Read values from the mock heap with bounds checking
      const view = new DataView(mockHeapBuffer);
      try {
        if (type === 'i8') return view.getInt8(ptr);
        if (type === 'i16') return view.getInt16(ptr, true);
        if (type === 'i32' || type === 'i8*' || type === '*') return view.getInt32(ptr, true);
        if (type === 'float') return view.getFloat32(ptr, true);
        if (type === 'double') return view.getFloat64(ptr, true);
      } catch (e) {
        console.warn('[STUB] getValue out of bounds:', ptr, type);
        return 0;
      }
      return 0;
    },

    setValue: (ptr, value, type) => {
      // Write values to the mock heap with bounds checking
      const view = new DataView(mockHeapBuffer);
      try {
        if (type === 'i8') view.setInt8(ptr, value);
        else if (type === 'i16') view.setInt16(ptr, value, true);
        else if (type === 'i32' || type === '*') view.setInt32(ptr, value, true);
        else if (type === 'float') view.setFloat32(ptr, value, true);
        else if (type === 'double') view.setFloat64(ptr, value, true);
      } catch (e) {
        console.warn('[STUB] setValue out of bounds:', ptr, value, type);
      }
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
      // Return 0 to disable CQT in stub mode (returning non-zero would be used as FFT size)
      return 0;
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
