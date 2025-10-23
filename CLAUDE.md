# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Homskillet Discography** is an interactive discography website for NSF (NES Sound Format) files created by the musician Homskillet. This is a fork of the general-purpose chip-player-js by mmontag, being customized into a personal music showcase site.

### Project Goals

This project is being developed in three phases:

1. **Strip down to minimum** - Remove all components of the general-purpose player that aren't needed (MIDI, XMP, VGM players, Firebase auth, favorites, search, local file uploads, etc.). Simplify to just NSF playback via game-music-emu.

2. **Add custom features** - Build new features to transform this into a personal discography site with custom branding, theming, and presentation tailored for showcasing Homskillet's musical works.

3. **Deploy to GitHub Pages** - Deploy as a fully static site. (See `.claude/deployment-plan.md` for details - AWS is not needed for this small discography).

### Technical Foundation

The application uses C/C++ audio libraries (game-music-emu) compiled to WebAssembly with Emscripten, combined with a React frontend. Audio playback is handled via Web Audio API.

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

See `.claude/deployment-plan.md` for the complete deployment strategy.

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
- `/*` - Browse catalog (simplified single-route structure)
- Query params: `?play=path` to auto-play a file

## Working with TODO.md

- **Always check git history before starting tasks** - Use `git log` to verify if a task from `.claude/TODO.md` has already been completed before beginning work on it.
- **Remove completed tasks** - When you find that a TODO item has been implemented (check commit messages and git history), remove it from the TODO file.
- **Check for completion evidence** - Look for related commits, file changes, and PR merges that indicate the work is done.

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
- **Catalog**: The `./catalog` folder is gitignored. Symlink your music archive here for catalog building. For this project, it will contain Homskillet's NSF files organized by album/release.
- **Sample Rate**: Limited to 48kHz max (MAX_SAMPLE_RATE) due to player compatibility.
- **Deployment**: Configured for GitHub Pages static hosting. See `.claude/deployment-plan.md` for implementation details.

## Current Phase: Stripping Down to Minimum

See `.claude/TODO.md` for the complete task list. Current focus:
- ✅ Remove Firebase (authentication, favorites, login UI)
- ✅ Remove tabbed navigation (Search, Local file uploads)
- ✅ Remove file drop functionality
- 🚧 Simplify to game-music-emu only - remove libxmp, FluidLite, and all non-GME format support
- 🚧 Update branding and styling

## Target Format Support

**Primary focus:** NSF and NSFE (NES Sound Format) - the formats used for Homskillet's music

**Potentially supported via GME:** AY, GBS, SPC (if desired for future expansion)

**Being removed:** All non-GME formats (IT, MOD, S3M, XM, MID, MIDI, VGM, VGZ, V2M, MDX, MINIUSF)
