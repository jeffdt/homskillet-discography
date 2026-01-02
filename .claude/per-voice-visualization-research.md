# Per-Voice Visualization Research (E8)

**Status**: Feasible - GME fully supports per-voice audio extraction
**Date**: 2026-01-02
**Researched by**: Claude (Agent ae87aae)

## Executive Summary

Game-music-emu provides complete infrastructure for extracting individual voice/channel audio separately. It is **technically possible** to render each NES voice (Square 1, Square 2, Triangle, Noise, DMC) to separate audio buffers, enabling color-coded visualization where each voice has its own color in the spectrogram.

## NES Voice Channels

The NES APU (Audio Processing Unit) has **5 distinct voices**:

1. **Square 1** - Melodic lead channel
2. **Square 2** - Melodic harmony channel
3. **Triangle** - Bass/melody channel (lower frequencies)
4. **Noise** - Percussion/sound effects
5. **DMC** - Delta Modulation Channel (samples)

## GME Architecture for Per-Voice Audio

### 1. Multi_Buffer System

Location: `game-music-emu/gme/Multi_Buffer.h`

The `Multi_Buffer` class is an abstract interface for multi-channel sound output:

- `set_channel_count()` - Allocates separate buffers for each channel
- `channel()` method - Returns a `channel_t` struct with separate `Blip_Buffer` pointers for center, left, and right

Each channel can route to its own `Blip_Buffer`, allowing independent sample extraction.

### 2. Classic_Emu Voice Routing

Location: `game-music-emu/gme/Classic_Emu.h` (lines 67-71)

```cpp
virtual void set_voice( int index, Blip_Buffer* center,
        Blip_Buffer* left, Blip_Buffer* right )
```

This method allows setting output buffers for individual voices. When called with separate buffers, each voice's audio goes to its own buffer.

### 3. NES APU Per-Voice Output

Location: `game-music-emu/gme/Nes_Apu.h` (lines 54-57)

```cpp
// Same as set_output(), but for a particular channel
// 0: Square 1, 1: Square 2, 2: Triangle, 3: Noise, 4: DMC
enum { osc_count = 5 };
void set_output( int chan, Blip_Buffer* buf );
```

The NES APU directly supports routing each of the 5 voices to separate buffers.

### 4. NSF Emulator Integration

Location: `game-music-emu/gme/Nsf_Emu.cpp` (lines 299-325)

The `Nsf_Emu::set_voice()` method routes voices to buffers via the underlying chip emulators. For NSF files, it delegates to:

- NES APU (5 voices)
- Optional expansion chips (VRC6, FME7, MMC5, FDS, Namco, VRC7)

### 5. Official Documentation

Location: `game-music-emu/gme.txt` (lines 322-325)

> "Emulators that support a custom sound buffer can have _every_ voice routed to a different Blip_Buffer, allowing custom processing on each voice. For example you could record a Game Boy track as a 4-channel sound file."

This explicitly confirms per-voice extraction is a documented, supported feature.

### 6. Effects_Buffer for Advanced Control

Location: `game-music-emu/gme/Effects_Buffer.h`

The `Effects_Buffer` class provides advanced per-channel configuration:

- Individual volume and panning per voice
- Per-voice surround and echo control
- Supports up to 32 separate buffers

## Implementation Strategy

### Phase 1: C++ Custom Multi_Buffer

Create a custom `Multi_Buffer` implementation that:

1. Allocates 5 separate `Blip_Buffer` instances (one per NES voice)
2. Overrides `channel()` method to return the appropriate buffer for each voice index
3. Provides methods to read samples from each buffer independently

### Phase 2: Emscripten Bindings

Modify `scripts/build-chip-core.js` to export additional functions:

**Currently exported**:

- `_gme_mute_voices`
- `_gme_voice_count`
- `_gme_voice_name`

**Need to add**:

- `_gme_set_buffer` - Inject custom Multi_Buffer
- `_blip_samples_avail` - Check how many samples are available in a buffer
- `_blip_read_samples` - Read samples from a specific voice's buffer
- Custom functions to initialize and manage the per-voice Multi_Buffer

### Phase 3: JavaScript Player Updates

Modify `src/players/GMEPlayer.js`:

**Current architecture**: Single `gme_play()` call returns mixed stereo audio

**New architecture**:

1. Initialize custom Multi_Buffer with 5 channels
2. Call per-voice rendering functions
3. Read samples from each of the 5 voice buffers separately
4. Either:
   - Create 5 separate audio streams to analyze independently, OR
   - Mix them in JavaScript with ability to analyze before mixing

### Phase 4: Visualizer Updates

Modify `src/Spectrogram.js` to handle per-voice visualization:

**Option A: Layered/Overlaid Approach**

- Create 5 separate analyser nodes (one per voice)
- Run constant-Q transform on each voice separately
- Render 5 frequency analyses on the same canvas with different colors
- Blend colors where frequencies overlap

**Option B: Stacked Approach**

- Display 5 mini-spectrograms vertically
- Each gets its own color from the palette
- Easier to see individual voice contributions

**Option C: Hybrid**

- Main spectrogram shows mixed audio (current behavior)
- Toggle per-voice mode to see layered colored voices
- Allow muting voices in real-time to see their contribution

### Phase 5: Color Mapping

Suggested color assignments based on Metallic Wing Green palette:

- **Square 1**: `#9BFE38` (accent green) - Primary melody
- **Square 2**: `#66CB01` (accent dark green) - Harmony
- **Triangle**: `#009FF4` (MW Blue) - Bass frequencies
- **Noise**: `#DA0205` (MW Red) - Percussion
- **DMC**: `#FFBB3E` (MW Yellow) - Samples

Could also make this user-configurable in Settings.

## Visualization Concepts

### Concept 1: Rainbow Spectrogram

- Each voice rendered as a separate layer
- Colors blend additively where multiple voices occupy same frequency
- Preserves current spectrogram waterfall effect

### Concept 2: Split View

- Frequency analyzer shows all 5 voices stacked vertically
- Each voice gets thin horizontal strip
- Spectrogram remains mixed or cycles through voices

### Concept 3: Voice Isolator

- Add voice toggles to UI (like the existing mute feature)
- Click a voice to see ONLY its frequency contribution
- Shift-click to add multiple voices
- Great for educational/exploratory purposes

### Concept 4: Channel Strip View

- Show 5 separate mini-analyzers side-by-side
- Each displays its voice's waveform or frequency spectrum
- Color-coded by voice type
- Like a mixing console view

## Performance Considerations

### Computational Cost

- Running 5 separate constant-Q transforms will be ~5x more expensive
- May need to reduce quality settings or use simpler FFT for per-voice mode
- Consider making this an opt-in feature (toggle in Settings)

### Memory Usage

- 5 separate audio buffers instead of 1 mixed buffer
- 5 separate analyser nodes (if using Web Audio API approach)
- Minimal impact on modern devices

### Optimization Strategies

- Only analyze voices that are currently active/audible
- Use requestIdleCallback for non-critical voice processing
- Provide "performance mode" that disables per-voice visualization

## Alternative Approaches

### Approach 1: Mute-Based Isolation (Simpler)

Instead of true per-voice buffers, use the existing `gme_mute_voices()` API:

1. Render audio 5 times per frame, each with a different voice isolated
2. Analyze each separately
3. Combine visualizations

**Pros**: No C++ changes, no Emscripten binding updates
**Cons**: 5x audio rendering cost, potential timing issues, hacky

### Approach 2: Hybrid (Start Simple, Upgrade Later)

Phase 1: Implement mute-based isolation for proof-of-concept
Phase 2: If performance is acceptable, keep it
Phase 3: If not, implement true Multi_Buffer approach

### Approach 3: Post-Processing (AI/DSL)

Use audio source separation techniques to split mixed audio:

- Machine learning models (Spleeter, Demucs)
- Digital signal processing algorithms

**Pros**: No GME modifications needed
**Cons**: Computationally expensive, less accurate, requires additional libraries

## Current Project Integration

### Existing Voice Control

`src/players/GMEPlayer.js` already has:

- `getVoiceName(index)` - Returns voice name from GME
- `getNumVoices()` - Returns voice count
- `setVoiceMask(voiceMask)` - Mutes/unmutes voices via bitmask
- `voiceMask` array tracking which voices are enabled

This provides a foundation for per-voice visualization controls.

### Web Audio Graph

Current audio pipeline from `CLAUDE.md`:

```
┌────────────┐      ┌────────────┐      ┌─────────────┐
│ playerNode ├─────>│  gainNode  ├─────>│ destination │
└────────────┘      └────────────┘      └─────────────┘
```

With per-voice visualization, it would become:

```
┌─────────────┐      ┌──────────────┐      ┌──────────┐
│ voice1Node  ├─────>│ analyser1    ├─────>│          │
└─────────────┘      └──────────────┘      │          │
┌─────────────┐      ┌──────────────┐      │          │
│ voice2Node  ├─────>│ analyser2    ├─────>│  merger  ├───> gainNode ───> destination
└─────────────┘      └──────────────┘      │          │
       ...                  ...             │          │
┌─────────────┐      ┌──────────────┐      │          │
│ voice5Node  ├─────>│ analyser5    ├─────>│          │
└─────────────┘      └──────────────┘      └──────────┘
```

## Expansion Chips Support

NSF files can use expansion chips beyond the base NES APU. These would require additional voice handling:

- **VRC6**: +3 voices (2 pulse, 1 sawtooth)
- **FME7/Sunsoft 5B**: +3 voices (3 square waves)
- **MMC5**: +2 voices (2 pulse)
- **FDS**: +1 voice (wavetable synthesis)
- **Namco 163**: +1-8 voices (wavetable)
- **VRC7**: +6 voices (FM synthesis)

For the initial implementation, focus on the base 5 NES voices. Expansion chip support can be added later if needed.

## Related TODOs

- **E4**: Explore more visualizer options - Per-voice visualization would be a great addition to this exploration
- **M6**: Performance audit - Per-voice rendering would need performance testing

## Recommended Next Steps

1. **Prototype with mute-based approach** - Quick proof-of-concept to validate UX
2. **User testing** - Does color-coded per-voice visualization actually enhance the experience?
3. **If validated, implement proper Multi_Buffer** - More performant long-term solution
4. **Add UI controls** - Voice color selection, toggle per-voice mode, voice solo/mute
5. **Document the feature** - Explain what each NES voice does (educational aspect aligns with project philosophy)

## References

- `game-music-emu/gme/Multi_Buffer.h` - Multi-channel buffer interface
- `game-music-emu/gme/Classic_Emu.h` - Voice routing methods
- `game-music-emu/gme/Nes_Apu.h` - NES APU per-voice output
- `game-music-emu/gme/Nsf_Emu.cpp` - NSF emulator voice routing
- `game-music-emu/gme.txt` - Official documentation (lines 322-325)
- `game-music-emu/gme/Effects_Buffer.h` - Advanced multi-buffer implementation
