# Stub Mode

## Overview

Stub mode allows the Homskillet Discography site to run without the chip-core WebAssembly module. This enables lightweight development and testing of UI features without needing to build or load the complex C/C++ audio engine.

## How It Works

The application automatically detects when chip-core fails to load and falls back to stub implementations:

1. **Automatic Fallback**: When `chip-core.wasm` fails to load (missing file, network error, etc.), the app automatically loads `chip-core-stub.js` instead
2. **Mock Audio Engine**: The stub provides a complete mock implementation of the game-music-emu API that returns dummy values
3. **Mock Catalog Data**: If `catalog.json` and `directories.json` fail to load, the app uses mock catalog data from `src/stub-data/mock-directories.ts`
4. **UI Fully Functional**: All UI components work normally - you can browse folders, "play" songs, adjust controls, etc.
5. **No Actual Audio**: The stub generates silence instead of actual music

## When to Use Stub Mode

Stub mode is ideal for:

- **UI/UX Development**: Work on styling, layout, and visual features without audio dependencies
- **Remote Environments**: Develop in cloud IDEs or containers where building WebAssembly is impractical
- **Lightweight Testing**: Test React components and UI behavior without the overhead of audio processing
- **New Contributor Onboarding**: Get started with frontend development without Emscripten setup
- **CI/CD Pipelines**: Run UI tests in environments without WebAssembly support

## Enabling Stub Mode

### Method 1: Remove chip-core.wasm (Automatic)

Simply delete or rename `public/chip-core.wasm`:

```bash
# Temporarily enable stub mode
mv public/chip-core.wasm public/chip-core.wasm.bak

# Start dev server
bun start

# Restore chip-core when done
mv public/chip-core.wasm.bak public/chip-core.wasm
```

The app will detect the missing WASM file and automatically use the stub.

### Method 2: Network Failure (Automatic)

Stub mode also activates if the WASM file fails to load due to network issues, CORS errors, or browser limitations.

### Method 3: Development Without Catalog Files (Automatic)

If `catalog.json` or `directories.json` are missing, the app uses mock catalog data with a few sample tracks.

## Visual Indicators

When stub mode is active, you'll see:

- **Warning Toast**: "Running in STUB MODE - no actual audio playback. UI development only."
- **Console Warning**: "[STUB MODE] Using mock chip-core implementation - no actual audio playback"
- **Silent Playback**: The player appears to play but produces no sound

## What Works in Stub Mode

✅ **Fully Functional**:
- Browse catalog folders and files
- Click to "play" tracks (no audio)
- Adjust tempo, stereo width, and other player parameters
- Use playback controls (play, pause, stop, seek)
- View metadata (mock data)
- Voice channel controls
- Playlist/shuffle/repeat modes
- All UI components and styling
- Time slider progression (simulated)

❌ **Not Available**:
- Actual audio playback
- Real music files (uses mock catalog)
- Audio visualization (visualizer disabled)
- Real metadata from NSF files

## Architecture

### Files Involved

- **`src/chip-core-stub.js`**: Mock implementation of the chip-core API
- **`src/stub-data/mock-directories.ts`**: Mock catalog and directory data
- **`src/components/App.tsx`**: Automatic fallback logic for chip-core loading
- **`src/handleShufflePlayLogic.ts`**: Fallback for catalog loading

### Mock API Surface

The stub implements all game-music-emu functions used by the app:

```javascript
// Memory management
_malloc, _free, getValue, setValue, UTF8ToString

// Audio playback
_gme_open_data, _gme_delete, _gme_play, _gme_start_track

// Playback control
_gme_seek_scaled, _gme_tell_scaled, _gme_track_ended

// Metadata
_gme_track_count, _gme_track_info, _gme_voice_count, _gme_voice_name

// Audio parameters
_gme_set_tempo, _gme_set_stereo_depth, _gme_set_fade, _gme_mute_voices

// Visualization (stubs)
_cqt_init, _cqt_calc, _cqt_render_line
```

## Limitations

- No actual audio playback (generates silence)
- Mock catalog has only 3 demo tracks (vs. 100+ real tracks)
- Metadata is generic mock data
- Visualizer is disabled
- Cannot test actual audio processing or timing
- Cannot verify NSF file compatibility

## Switching Back to Full Mode

To exit stub mode and use the real chip-core:

1. Ensure `public/chip-core.wasm` exists
2. Rebuild chip-core if needed: `bun run build-chip-core:docker`
3. Refresh the browser

The app will automatically load the real chip-core instead of the stub.

## Development Workflow

**Typical stub mode workflow:**

```bash
# Enable stub mode
mv public/chip-core.wasm public/chip-core.wasm.bak

# Develop UI features
bun start
# Work on components, styling, etc.

# Restore full mode when testing audio
mv public/chip-core.wasm.bak public/chip-core.wasm
# Refresh browser to load real chip-core
```

## Testing

The stub mode is designed to match the real chip-core API as closely as possible. However, always test with the real chip-core before committing changes that affect:

- Audio playback logic
- Player state machine
- Metadata parsing
- Voice channel handling
- Timing-sensitive features

## Future Enhancements

Potential improvements to stub mode:

- [ ] Environment variable to force stub mode even when WASM is available
- [ ] Configurable mock catalog (load from JSON file)
- [ ] Simulated audio visualization (mock waveforms)
- [ ] Mock metadata generation from file names
- [ ] Stub mode indicator in UI (badge or status bar)
- [ ] Unit tests that run in stub mode
