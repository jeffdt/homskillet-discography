# Homskillet Discography

A technical sandbox for exploring audio-visual and game development concepts, powered by NSF (NES Sound Format) music created by Homskillet.

This project is as much about experimentation and learning as it is about listening to music. It's a playground for testing audio visualization techniques, real-time audio processing, interactive UI patterns, and WebAssembly integration. Visitors are encouraged to tweak settings, explore controls, and see how different parameters affect the audio-visual experience.

The music was developed over a period of 3-4 years for several video games I was building.

This is a fork of [Chip Player JS](https://github.com/mmontag/chip-player-js) by Matt Montag, transformed into an interactive audio-visual laboratory.

## Technology Stack

The application uses C/C++ audio libraries ([game-music-emu](https://github.com/mmontag/game-music-emu)) compiled to WebAssembly with Emscripten, combined with a React frontend. Audio playback is handled via Web Audio API.

## Development

### Prerequisites

- Node.js and Bun
- Docker (for building WebAssembly module)

### Quick Start

```sh
# Install dependencies
bun install

# Start development server
bun start
```

The application will be available at `http://localhost:3000`.

### Building the WebAssembly Core

The project uses game-music-emu compiled to WebAssembly for NSF playback. The WebAssembly module is built using Docker:

```sh
# First time: Build the Docker image (~10 minutes)
docker compose build chip-core

# Build chip-core.wasm and chip-core.js
bun run build-chip-core:docker
```

Note: The compiled artifacts (chip-core.wasm and chip-core.js) are committed to the repo, so most contributors won't need to rebuild them.

### Building for Production

```sh
# Full build (catalog + chip-core + frontend)
bun run build

# Frontend-only build (faster, skips catalog and chip-core rebuild)
bun run build-lite
```

### Deployment

```sh
# Deploy to GitHub Pages (full build)
bun run deploy

# Deploy to GitHub Pages (frontend only)
bun run deploy-lite
```

## Project Structure

- **src/components/** - React UI components
- **src/players/** - Player implementations (GMEPlayer for NSF files)
- **src/config/** - Configuration files
- **public/** - Static assets
- **server/** - Development API server
- **catalog/** - Music files directory (gitignored, symlink your music here)

## License

This project is licensed under [GPLv3](LICENSE), inherited from the upstream Chip Player JS project and its dependencies.

## Attribution

Forked from [Chip Player JS](https://github.com/mmontag/chip-player-js) by Matt Montag.

Built upon several open-source projects including:

- [game-music-emu](https://github.com/mmontag/game-music-emu) - Game console music format emulation
- [Emscripten](https://emscripten.org/) - C/C++ to WebAssembly compiler
- [React](https://react.dev/) - UI framework
