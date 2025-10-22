# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chip Player JS is a web-based music player for video game and chiptune music formats. It uses C/C++ audio libraries compiled to WebAssembly with Emscripten, combined with a React frontend. The project is based on the original chip-player-js by mmontag.

## Key Commands

### Development
- `npm start` - Start webpack dev server on localhost:3000
- `npm run server` - Start Node.js API server on port 8080 (DEV mode)
- `npm run build-chip-core` - Compile C/C++ libraries to WebAssembly (chip-core.wasm)
- `npm run build-catalog` - Build music catalog index from ./catalog folder
- `npm run build-lite` - Build frontend only (skip catalog/chip-core)
- `npm run build` - Full build (catalog + chip-core + frontend)

### Deployment
- `npm run deploy` - Full build and deploy to GitHub Pages
- `npm run deploy-lite` - Build frontend and deploy (skip chip-core rebuild)

### Additional Scripts
- `npm run fixvgm` - Fix VGM files utility
- `python scripts/httpserver.py` - Python file server on port 8000 for catalog

## Architecture

### Audio Pipeline
The application uses Web Audio API with this graph structure:
```
┌────────────┐      ┌────────────┐      ┌─────────────┐
│ playerNode ├─────>│  gainNode  ├─────>│ destination │
└────────────┘      └────────────┘      └─────────────┘
```

### Player State Machine
Players follow a state machine pattern with 3 states and 5 transitions:
```
                        ╭– (seek) –╮
                        ^          v
 ┌─ ─ ─ ─ ─┐         ┌─────────────────┐            ┌─────────┐
 │ stopped │–(open)–>│     playing     │––(stop)–––>│ stopped │
 └ ─ ─ ─ ─ ┘         └─────────────────┘            └─────────┘
                       | ┌────────┐ ^
               (pause) ╰>│ paused │–╯ (unpause)
                         └────────┘
```

### Component Structure
- **src/components/App.js** - Main application component, manages audio context, player lifecycle, and routing
- **src/components/** - React UI components (AppHeader, AppFooter, Visualizer, Settings, etc.)
- **src/players/** - Player implementations inheriting from Player.js base class
  - GMEPlayer - Game Music Emu formats (NSF, SPC, GBS, etc.)
  - MIDIPlayer - MIDI/SoundFont playback with FluidLite
  - XMPPlayer - Module formats (MOD, S3M, IT, XM) via libxmp
  - VGMPlayer - VGM/VGZ formats via libvgm
  - N64Player - N64 USF formats
  - V2MPlayer - Farbrausch V2M format
  - MDXPlayer - Sharp X68000 MDX format
- **src/Sequencer.js** - Playlist management, shuffle/repeat modes
- **src/Spectrogram.js** - Audio visualization using constant-Q transform
- **src/chip-core.js** - JavaScript interface to Emscripten-compiled WebAssembly module

### Emscripten Build System
The C/C++ audio engines are compiled separately to WebAssembly:
- **scripts/build-chip-core.js** - Main build script that links all static libraries
- **public/chip-core.wasm** - Output WebAssembly module (gitignored)

External dependencies (must be built separately and placed alongside this repo):
- **../game-music-emu/** - Core GME library for game console formats
- **../libxmp/** - Extended module player for tracker formats
- **../fluidlite/** - SoundFont synthesizer for MIDI

Internal subprojects (included in repo):
- **libvgm/** - Video game music format player
- **psflib/** - PlayStation sound format library
- **lazyusf2/** - N64 USF player
- **libADLMIDI/** - OPL3 MIDI synthesizer
- **mdxmini/** - X68000 MDX player
- **farbrausch-v2m/** - V2M synthesizer

Each external library requires Emscripten SDK (emsdk) and must be built with `emcmake cmake ..` followed by `emmake make` to produce static .a libraries that get linked in build-chip-core.js.

### Configuration
- **src/config/index.js** - API endpoints, catalog paths, supported formats, SoundFont list
  - Local dev: localhost:3000 (webpack), localhost:8080 (API), localhost:8000 (catalog)
  - Uses untracked firebaseConfig.js for authentication (being removed per TODO.md)

### Music Catalog
The catalog system indexes music files:
- **scripts/build-catalog.js** generates catalog index
- Expects `./catalog` folder (symlink to local music archive, gitignored)
- Outputs to `server/catalog.json` and `server/directories.json`
- Production uses CATALOG_PREFIX URL for remote catalog access

### Routing
React Router handles navigation:
- `/` - Browse catalog
- `/favorites` - User favorites (Firebase, being removed)
- `/local` - Local file playback via drag-and-drop
- Query params: `?play=path` to auto-play a file

## Development Workflow

1. **Modifying JavaScript/React code**: Just `npm start` and work normally
2. **Modifying C/C++ audio engines**:
   - Rebuild affected library (e.g., `cd ../game-music-emu/build && emmake make`)
   - Run `npm run build-chip-core` to link new WebAssembly
   - Restart `npm start` to load new chip-core.wasm
3. **Adding new formats**:
   - Update FORMATS in src/config/index.js
   - Add player class in src/players/
   - Register in App.js constructor
   - Update build-chip-core.js if new C library needed

## Important Notes

- **Emscripten Path**: package.json expects emsdk at `~/src/emsdk`. Update `build-chip-core` script if different.
- **Catalog**: The `./catalog` folder is gitignored. Symlink your music archive here for catalog building.
- **SoundFonts**: Place .sf2 files in `public/soundfonts/` (gitignored) for MIDI playback.
- **Firebase**: User auth/favorites uses Firebase. Config file `src/config/firebaseConfig.js` is untracked. Per TODO.md, Firebase is being removed from the codebase.
- **Sample Rate**: Limited to 48kHz max (MAX_SAMPLE_RATE) due to player compatibility.
- **GitHub Pages**: Deployment configured for GitHub Pages. Update `homepage` in package.json for different deployment targets.

## Current Work (from TODO.md)

1. Update README with corrected instructions
2. Remove Firebase (authentication, favorites, login UI)
3. Simplify to game-music-emu only - remove libxmp, FluidLite, and all non-GME format support

## Supported Formats (Current)

Game Music Emu formats: AY, GBS, NSF, NSFE, SPC
Module formats (XMP): IT, MOD, S3M, XM
MIDI: MID, MIDI, SMF
VGM: VGM, VGZ
Other: V2M, MDX, MINIUSF

Note: Format support is being simplified to GME-only per TODO.md item #3.
