# Homskillet Discography

An interactive discography website for NSF (NES Sound Format) files created by Homskillet.

This music was developed over a period of 3-4 years for several video games I was building.

This is a fork of [Chip Player JS](https://github.com/mmontag/chip-player-js) by Matt Montag, customized into a personal music showcase.

## Technology Stack

The application uses C/C++ audio libraries ([game-music-emu](https://github.com/mmontag/game-music-emu)) compiled to WebAssembly with Emscripten, combined with a React frontend. Audio playback is handled via Web Audio API.

## Development

### Prerequisites
- Node.js and npm
- CMake
- [Emscripten SDK (emsdk)](https://github.com/emscripten-core/emsdk)

### Quick Start

```sh
# Install dependencies
npm install

# Start development server
npm start
```

The application will be available at `http://localhost:3000`.

### Building the WebAssembly Core

The project uses game-music-emu compiled to WebAssembly for NSF playback. To rebuild the WebAssembly module:

```sh
# Build chip-core.wasm
npm run build-chip-core
```

Note: The build script expects emsdk at `~/src/emsdk`. Update the `build-chip-core` script in `package.json` if your emsdk is in a different location.

### Building for Production

```sh
# Full build (catalog + chip-core + frontend)
npm run build

# Frontend-only build (faster, skips catalog and chip-core rebuild)
npm run build-lite
```

### Deployment

```sh
# Deploy to GitHub Pages (full build)
npm run deploy

# Deploy to GitHub Pages (frontend only)
npm run deploy-lite
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
