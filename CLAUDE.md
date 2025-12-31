# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Homskillet Discography** is a technical sandbox for exploring audio-visual and game development concepts, powered by NSF (NES Sound Format) files created by the musician Homskillet. This is a fork of the general-purpose chip-player-js by mmontag, being transformed into an interactive audio-visual laboratory and experimentation platform.

### Core Philosophy: Exploration and Interactivity

**This project is as much about learning and experimentation as it is about listening to music.** The goal is to create an engaging technical playground where visitors can:

- Explore how audio visualization techniques work
- Tweak parameters and see real-time effects
- Understand the connection between audio data and visual representation
- Experiment with audio processing controls (tempo, stereo width, bass boost, etc.)
- Learn about WebAssembly, Web Audio API, and game music emulation

**When implementing features, always consider:**

1. **Expose configuration where appropriate** - If you're adding a new visual effect, algorithm parameter, or audio processing feature, consider exposing controls so visitors can experiment with it. Make the invisible visible.

2. **Add audio-reactivity opportunities** - Look for places where existing or new visual elements could respond to audio data (frequency bands, amplitude, beats, etc.). The visualizer isn't the only place that can react to music.

3. **Make experimentation inviting** - Use clear labels, helpful tooltips, and logical groupings. The goal is to make technical concepts accessible and explorable, not intimidating.

4. **Document the "why" and "how"** - When exposing controls, consider adding brief explanations of what the parameter does or what technique is being demonstrated.

### Project Goals

This project is being developed in three phases:

1. **Strip down to minimum** - Remove all components of the general-purpose player that aren't needed (MIDI, XMP, VGM players, Firebase auth, favorites, search, local file uploads, etc.). Simplify to just NSF playback via game-music-emu.

2. **Add custom features** - Build new features to transform this into an interactive audio-visual laboratory with custom branding, theming, and presentation. Focus on exposing interesting technical concepts in an accessible way.

3. **Deploy to GitHub Pages** - Deploy as a fully static site. (See `.claude/deployment-plan.md` for details - AWS is not needed for this small discography).

### Technical Foundation

The application uses C/C++ audio libraries (game-music-emu) compiled to WebAssembly with Emscripten, combined with a React frontend. Audio playback is handled via Web Audio API.

## Key Commands

### Development

- `bun start` - Start Vite dev server on localhost:3000
- `bun run server` - Start Node.js API server on port 8080 (DEV mode)
- `bun test` - Run Vitest unit tests

**Note:** During active development, assume the dev server is already running. Do not attempt to start it automatically.

- `bun run build-chip-core:docker` - **Recommended**: Build chip-core using Docker (no Emscripten setup needed)
- `bun run build-chip-core` - Build chip-core locally (requires Emscripten setup)
- `bun run build-catalog` - Build music catalog index from public/music/ folder
- `bun run build-lite` - Build frontend only (skip catalog/chip-core)
- `bun run build` - Full build (catalog + chip-core + frontend)

### Deployment

- `bun run deploy` - Full build and deploy to GitHub Pages
- `bun run deploy-lite` - Build frontend and deploy (skip chip-core rebuild)

See `.claude/deployment-plan.md` for the complete deployment strategy.

### Additional Scripts

- `bun run fixvgm` - Fix VGM files utility (legacy, being removed)

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

- **src/components/App.tsx** - Main application component, manages audio context, player lifecycle, and routing
- **src/components/** - React UI components (mostly TypeScript)
  - Browse.tsx - Directory browser for music catalog
  - Visualizer.tsx - Audio visualization canvas
  - PlayerParams.tsx - Player controls (tempo, stereo width, bass boost)
  - Settings.tsx - User settings panel
  - TimeSlider.tsx, VolumeSlider.tsx - Audio controls
- **src/players/** - Audio player implementations (JavaScript)
  - Player.js - Base class with state machine logic (stopped/playing/paused)
  - GMEPlayer.js - Game Music Emu player (NSF, NSFE, SPC, GBS, AY)
  - ChipWorkletProcessor.js - Web Audio worklet for audio processing
  - Legacy players (being removed): MIDIPlayer, XMPPlayer, VGMPlayer, etc.
- **src/Sequencer.ts** - Playlist management, shuffle/repeat modes
- **src/Spectrogram.js** - Audio visualization using constant-Q transform
- **src/chip-core.js** - JavaScript interface to Emscripten-compiled WebAssembly module (auto-generated)

### Emscripten Build System

The C/C++ audio engines are compiled to WebAssembly:

- **scripts/build-chip-core.js** - Main build script that links all static libraries
- **public/chip-core.wasm** - Output WebAssembly module (committed to repo)
- **src/chip-core.js** - Generated JavaScript interface (committed to repo)

Primary dependency:

- **game-music-emu/** - Included as git submodule, provides NSF/NSFE player core

Legacy dependencies (being removed):

- libxmp, fluidlite, libvgm, psflib, lazyusf2, libADLMIDI, mdxmini, farbrausch-v2m

Building requires Emscripten SDK 3.1.39. Use Docker (`bun run build-chip-core:docker`) to avoid local Emscripten setup.

### Configuration

- **src/config/index.ts** - API endpoints, catalog paths, supported formats
  - Local dev: localhost:3000 (webpack dev server)
  - Production: Static files served from build/ directory via GitHub Pages

### Music Catalog

The catalog system indexes music files for browsing and playback:

- **scripts/build-catalog.js** - Scans public/music/ and generates catalog indexes
- **public/catalog.json** - Flat list of all music file paths (for playlist generation)
- **public/directories.json** - Nested directory structure with metadata (size, type, index)
- Music files live in **public/music/** organized by album/project folders (committed to repo)
- Only GME formats are indexed: NSF, NSFE, AY, GBS, SPC
- Run `bun run build-catalog` after adding/removing music files to regenerate indexes

### Routing

React Router handles navigation:

- `/*` - Browse catalog (simplified single-route structure)
- Query params: `?play=path` to auto-play a file

## Working with TODO.md

- **Always check git history before starting tasks** - Use `git log` to verify if a task from `.claude/TODO.md` has already been completed before beginning work on it.
- **Remove completed tasks** - When you find that a TODO item has been implemented (check commit messages and git history), remove it from the TODO file.
- **Check for completion evidence** - Look for related commits, file changes, and PR merges that indicate the work is done.

## Working with tmp directory

- Occasionally I will place files in `.claude/tmp` to provide context for our conversation.
- If I mention an image or screenshot, and I do not attach one directly to the prompt and you do not know what I'm talking about, check `./claude/tmp/screenshots` first.

## Development Workflow

1. **Modifying JavaScript/React/TypeScript code**:
   - Run `bun start` for hot-reloading dev server
   - TypeScript files compile automatically via Vite
   - Run `bun test` to verify unit tests still pass

2. **Adding music files**:
   - Add NSF files to `public/music/AlbumName/`
   - Run `bun run build-catalog` to regenerate indexes
   - Refresh browser to see new files in catalog

3. **Modifying C/C++ audio engines** (rare):
   - Rebuild game-music-emu submodule if needed
   - Run `bun run build-chip-core:docker` (or `bun run build-chip-core` if emsdk installed)
   - Restart `bun start` to load new chip-core.wasm

4. **Writing tests**:
   - Create test files in `src/__tests__/` with `.test.ts` or `.test.tsx` extension
   - Use Vitest and React Testing Library
   - Run `bun test` to execute all tests

## Design & Styling Guidelines

### Color Palette

The project uses a custom "Metallic Wing Green" color palette defined in `src/index.css` (lines 14-34). **Always use CSS variables from this palette for all UI elements.**

#### Available Color Variables:

**Accent Colors:**

- `--accent` (#9bfe38) - Light green, main accent (playing songs, hover feedback, title)
- `--accent-dark` (#66cb01) - Dark green, darker accent for active/pressed states

**Functional Colors:**

- `--clickable` (#c3c3c3) - Light gray for interactive elements
- `--active` (var(--accent-dark)) - Active/pressed states
- `--button` (#202020) - Button backgrounds
- `--selected` (var(--accent)) - Selected items
- `--focus` (#202020) - Focus indication
- `--background` (#101010) - Main background
- `--shadow` (#000000) - Shadows

**Grayscale Neutrals:**

- `--neutral0` (#101010) - Black
- `--neutral1` (#202020) - Dark gray
- `--neutral2` (#7f7f7f) - Medium gray (body text)
- `--neutral3` (#c3c3c3) - Light gray (emphasized text)
- `--neutral4` (#fefefe) - Metallic Wing White (headings, high contrast)

#### Important Rules:

1. **Always use CSS variables first** - Use `var(--neutral4)` instead of hardcoded colors like `#fefefe` or `rgba(255, 255, 255, 1)`
2. **Never use pure white** - Use `var(--neutral4)` instead of `#ffffff` or `rgb(255, 255, 255)`
3. **If unclear which color to use** - Stop and use the `AskUserQuestion` tool to ask which palette variable should be used
4. **If user requests a color not in the palette** - Stop and use the `AskUserQuestion` tool to confirm whether to:
   - Add a new variable to the palette
   - Use the requested color directly (for special cases like gradients)
   - Map to an existing palette color

#### Examples:

✅ **Good:**

```css
border: 1px solid var(--neutral4);
color: var(--accent);
background: var(--background);
```

❌ **Bad:**

```css
border: 1px solid #fefefe;
color: #9bfe38;
background: rgb(16, 16, 16);
```

## Building chip-core WebAssembly Module

The chip-core module (game-music-emu compiled to WebAssembly) is required for audio playback. You have two options:

### Option 1: Docker (Recommended)

Use Docker as a build tool - no Emscripten setup needed:

```bash
# First time: Build the Docker image (~10 minutes)
docker compose build chip-core

# Build chip-core (outputs to src/ and public/)
bun run build-chip-core:docker

# Continue with normal development
bun start
```

The Docker container builds chip-core and copies the artifacts to your local machine. You continue using your local tools for everything else.

### Option 2: Local Emscripten Setup

For local building without Docker, install Emscripten at `../emsdk`:

```bash
cd ..
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 3.1.39
./emsdk activate 3.1.39
cd ../homskillet-discography

# Clone game-music-emu
cd ..
git clone https://github.com/mmontag/game-music-emu.git
cd game-music-emu
mkdir build && cd build
source ../../emsdk/emsdk_env.sh
emcmake cmake -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF ..
emmake make -j4

# Build chip-core
cd ../../homskillet-discography
bun run build-chip-core
```

**Note**: macOS Sequoia (24.x) has compatibility issues with Emscripten. Docker is recommended for macOS users.

## Important Notes

- **Compiled Artifacts**: `chip-core.js` and `chip-core.wasm` are committed to the repo for convenience. Most contributors won't need to rebuild them.
- **TypeScript Migration**: The codebase is ~85% TypeScript. Most React components and utilities are migrated. The player layer (Player.js, GMEPlayer.js, Spectrogram.js) remains JavaScript.
- **Music Files**: All music is stored in `public/music/` and committed to the repo. To add new tracks:
  1. Add NSF files to `public/music/AlbumName/`
  2. Run `bun run build-catalog` to regenerate catalog indexes
  3. Commit both music files and updated catalog JSON files
- **Sample Rate**: Limited to 48kHz max (MAX_SAMPLE_RATE) due to player compatibility.
- **Testing**: Vitest configured for TypeScript unit tests. Run `bun test` to execute tests. Test files go in `src/__tests__/`.
- **Deployment**: Configured for GitHub Pages static hosting. See `.claude/deployment-plan.md` for implementation details.

## Project Status

See `.claude/TODO.md` for the complete task list and active work items.

**Phase 1 (Stripping Down)**: Mostly complete

- ✅ Removed Firebase authentication, favorites, login UI
- ✅ Removed tabbed navigation (Search, Local file uploads)
- ✅ Removed file drop functionality
- ✅ TypeScript migration (~85% complete)
- 🚧 Simplify to game-music-emu only (remove libxmp, FluidLite, non-GME formats)
- 🚧 Update branding and styling

**Phase 2 (Custom Features)**: In progress

- See TODO.md sections for Simplification and Enhancement tasks

**Phase 3 (Deployment)**: Configured but not deployed yet

- GitHub Pages deployment scripts ready (`bun run deploy`)

## Target Format Support

**Primary focus:** NSF and NSFE (NES Sound Format) - the formats used for Homskillet's music

**Potentially supported via GME:** AY, GBS, SPC (if desired for future expansion)

**Being removed:** All non-GME formats (IT, MOD, S3M, XM, MID, MIDI, VGM, VGZ, V2M, MDX, MINIUSF)
