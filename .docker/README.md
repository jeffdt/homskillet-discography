# Docker Build Tool Setup

This project uses Docker as a **build tool** for the chip-core WebAssembly module, not as a dev environment. You continue using your local tools (VS Code, terminal, etc.) for everything else.

## Why Docker?

Building chip-core requires Emscripten, which has compatibility issues with macOS Sequoia. Docker provides a consistent Linux build environment without requiring local Emscripten setup.

## Quick Start

### First Time Setup

```bash
# Build the Docker image (takes ~10 minutes, caches for future use)
docker compose build chip-core
```

### Build chip-core

```bash
# Build chip-core and copy artifacts locally
bun run build-chip-core:docker

# Or use docker compose directly:
docker compose run --rm chip-core
```

This outputs:
- `src/chip-core.js` - JavaScript wrapper for WebAssembly
- `public/chip-core.wasm` - Compiled game-music-emu library

### Continue Normal Development

```bash
# Start local dev server (no Docker involved)
bun start
```

Visit http://localhost:3000 - your local tools work normally!

## When Do You Need This?

You only need to rebuild chip-core if you:
- Clone the repo fresh (artifacts are committed, so usually not needed)
- Modify `src/showcqtbar.c` (visualizer C code)
- Update game-music-emu library

**Most development doesn't require rebuilding chip-core.**

## How It Works

1. **Docker builds** game-music-emu and chip-core inside a container
2. **Outputs** compiled artifacts to your local filesystem
3. **You continue** using your local Bun, IDE, git, etc.

Docker is only used as a compiler - not as a dev environment.

## Publishing the Image (Optional)

To share the pre-built image across machines:

### Setup GitHub Container Registry

```bash
# Create a Personal Access Token on GitHub with write:packages scope
# Then login:
echo "YOUR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Push Image

```bash
# Tag the image
docker tag homskillet-chip-core-builder ghcr.io/YOUR_USERNAME/homskillet-chip-core-builder:latest

# Push to registry
docker push ghcr.io/YOUR_USERNAME/homskillet-chip-core-builder:latest
```

### Pull on Another Machine

```bash
# Login (one time)
echo "YOUR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Pull the image
docker pull ghcr.io/YOUR_USERNAME/homskillet-chip-core-builder:latest

# Build chip-core locally
bun run build-chip-core:docker
```

## Troubleshooting

### Docker not installed
Install [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Image build fails
```bash
# Clear cache and rebuild
docker compose build --no-cache chip-core
```

### Permission errors on copied files
```bash
# Fix ownership (macOS/Linux)
sudo chown -R $USER:$USER src/chip-core.js public/chip-core.wasm
```

### Want to inspect the container?
```bash
# Get a shell inside the container
docker compose run --rm chip-core /bin/bash

# Then explore:
ls -la /build/src/
ls -la /build/game-music-emu/
```

## Alternative: Skip Docker Entirely

The compiled artifacts (`chip-core.js` and `chip-core.wasm`) are committed to the repo. If you're not modifying C++ code, you don't need Docker at all - just `bun start` and go!
