# Docker Build System Contribution Plan for chip-player-js

## Objective

Create a Docker-based build system for chip-player-js that allows contributors to build chip-core.js and chip-core.wasm without needing to manually install Emscripten or clone/build multiple external dependencies.

## Background

The homskillet-discography fork successfully implemented a Docker build solution that:
- Eliminates need for local Emscripten installation
- Handles external dependency cloning and compilation automatically
- Solves macOS Sequoia SDK compatibility issues
- Provides one-command build: `npm run build-chip-core:docker`

This approach would be even more valuable for the upstream repo due to its many external dependencies.

## Current Upstream Dependencies

Based on the upstream chip-player-js build system, the following external libraries need to be cloned and built:

**External (must be cloned alongside repo):**
1. `game-music-emu` - Core GME library (NSF, SPC, GBS, etc.)
2. `libxmp` - Extended module player (MOD, S3M, IT, XM)
3. `fluidlite` - SoundFont synthesizer for MIDI

**Internal subprojects (included in repo):**
1. `libvgm` - Video game music format player
2. `psflib` - PlayStation sound format library
3. `lazyusf2` - N64 USF player
4. `libADLMIDI` - OPL3 MIDI synthesizer
5. `mdxmini` - X68000 MDX player
6. `farbrausch-v2m` - V2M synthesizer

## Implementation Plan

### Phase 1: Create Dockerfile

Create a `Dockerfile` that:

1. **Base image**: Use `emscripten/emsdk:3.1.39` (proven stable version)

2. **Install system dependencies**:
   ```dockerfile
   RUN apt-get update && apt-get install -y \
       cmake \
       python-is-python3 \
       git \
       && rm -rf /var/lib/apt/lists/*
   ```

3. **Clone and build external dependencies at root level** (`/`):
   - game-music-emu
   - libxmp
   - fluidlite

   Each following this pattern:
   ```dockerfile
   WORKDIR /
   RUN git clone https://github.com/mmontag/game-music-emu.git && \
       cd game-music-emu && \
       mkdir build && cd build && \
       emcmake cmake -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF .. && \
       emmake make -j$(nproc)
   ```

4. **Set working directory for chip-core build**:
   ```dockerfile
   WORKDIR /build
   ```

5. **Copy package files and install Node dependencies**:
   ```dockerfile
   COPY package.json package-lock.json* /build/
   RUN npm install
   ```
   Note: This is critical - missing `npm install` was one of our early failures.

6. **Copy build script and source files**:
   ```dockerfile
   COPY scripts/build-chip-core.js /build/scripts/
   COPY config/paths.js /build/config/
   # Copy any C/C++ source files needed (like showcqtbar.c)
   # May need to copy internal subproject directories as well
   ```

7. **Create output directory**:
   ```dockerfile
   RUN mkdir -p /build/public
   ```
   Note: The build script moves .wasm to public/, so this directory must exist.

8. **Run build**:
   ```dockerfile
   RUN node scripts/build-chip-core.js
   ```

### Phase 2: Create docker-compose.yml

```yaml
version: '3.8'

services:
  chip-core:
    build:
      context: .
    image: chip-player-js-builder
    volumes:
      - ./src:/output/src
      - ./public:/output/public
    command: >
      sh -c "cp /build/src/chip-core.js /output/src/chip-core.js &&
             cp /build/public/chip-core.wasm /output/public/chip-core.wasm &&
             echo '✅ chip-core.js copied to src/' &&
             echo '✅ chip-core.wasm copied to public/' &&
             echo '' &&
             echo 'Build complete! You can now run: npm start'"
```

**Important**: Use `docker compose` (space) not `docker-compose` (hyphen) - the latter is legacy syntax.

### Phase 3: Create .dockerignore

```
# Exclude everything to keep build context small
*

# Include only what's needed for chip-core build
!scripts/build-chip-core.js
!config/paths.js
!src/showcqtbar.c
# Add other C/C++ sources as needed
# Add internal subproject directories
!libvgm/
!psflib/
!lazyusf2/
!libADLMIDI/
!mdxmini/
!farbrausch-v2m/
!package.json
!package-lock.json
```

This dramatically reduces Docker build context and speeds up builds.

### Phase 4: Add npm Script

In `package.json`, add:
```json
{
  "scripts": {
    "build-chip-core:docker": "docker compose run --rm chip-core"
  }
}
```

### Phase 5: Testing Strategy

Test the complete flow from scratch:

1. **Initial build** (takes ~10 minutes first time):
   ```bash
   npm run build-chip-core:docker
   ```

2. **Verify outputs exist**:
   ```bash
   ls -lh src/chip-core.js      # Should be ~60-100KB
   ls -lh public/chip-core.wasm # Size will vary based on all modules
   ```

3. **Test app runs**:
   ```bash
   npm install
   npm start
   # Open browser, verify audio playback works for all formats
   ```

4. **Test rebuild** (should be fast using Docker cache):
   ```bash
   rm src/chip-core.js public/chip-core.wasm
   npm run build-chip-core:docker
   ```

### Phase 6: Documentation

Create `.docker/README.md` with:
- Overview of Docker build approach
- Prerequisites (Docker installed)
- Usage instructions
- Troubleshooting section
- Comparison to manual Emscripten setup

Update main `README.md` with:
- Docker as recommended build method
- Note about artifacts NOT being committed (unlike our fork)
- Clear instructions: clone → `npm run build-chip-core:docker` → `npm start`

## Issues Encountered and Solutions

Document these for future maintainers:

### Issue 1: docker-compose vs docker compose
**Problem**: `docker-compose` command not found on newer Docker installations
**Solution**: Use `docker compose` (space) - this is Docker Compose v2 syntax

### Issue 2: Cannot find module 'chalk'
**Problem**: Node dependencies not installed in container
**Solution**: Add `npm install` step to Dockerfile after copying package.json

### Issue 3: python: not found
**Problem**: node-gyp requires `python` command but container has `python3`
**Solution**: Install `python-is-python3` package in Dockerfile

### Issue 4: game-music-emu not found
**Problem**: External libs built in wrong location (Dockerfile WORKDIR affects relative paths)
**Solution**: Build external dependencies at root level (`/`) so `../game-music-emu` resolves correctly from `/build`

### Issue 5: Cannot stat chip-core.wasm
**Problem**: Build script moves .wasm to public/ but directory doesn't exist
**Solution**: Add `mkdir -p /build/public` to Dockerfile before build step

### Issue 6: Wrong copy path in docker-compose
**Problem**: docker-compose tried to copy from `/build/src/chip-core.wasm` but build script moves it to `/build/public/`
**Solution**: Copy from correct path: `/build/public/chip-core.wasm`

### Issue 7: macOS Sequoia SDK conflicts
**Problem**: Native Emscripten builds fail on macOS Sequoia with "Unsupported architecture" errors
**Context**: Docker solves this by using Linux base image with compatible toolchain

## Differences from Homskillet Fork

The upstream repo has these key differences to account for:

1. **More dependencies**: Must clone/build libxmp, fluidlite in addition to game-music-emu
2. **Larger artifacts**: chip-core files will be significantly larger (many more audio formats)
3. **Internal subprojects**: Must copy internal lib directories (libvgm, psflib, etc.) to build context
4. **No artifact commits**: Upstream doesn't commit chip-core.js/wasm (too large), so Docker becomes critical path
5. **Different catalog system**: Ignore catalog/music file differences - focus only on chip-core build

## Benefits for Upstream Contributors

1. **Eliminates cumbersome setup**: No more manual cloning of 3+ external repos
2. **Cross-platform**: Works identically on Linux, macOS, Windows
3. **Reproducible**: Same Docker image = identical build environment
4. **Version locked**: Emscripten 3.1.39 prevents toolchain drift issues
5. **One command**: `npm run build-chip-core:docker` vs 10+ steps in current docs

## Next Steps

1. Fork upstream chip-player-js repository
2. Implement Docker setup following this plan
3. Test thoroughly with all audio formats
4. Create documentation
5. Submit pull request to upstream with clear benefits explained

## Starter Prompt for Claude Code

```
I want to add a Docker-based build system to chip-player-js that eliminates the need for
manual Emscripten installation and external dependency management.

The current build process requires:
1. Installing Emscripten SDK locally
2. Manually cloning game-music-emu, libxmp, and fluidlite alongside the repo
3. Building each library with Emscripten individually
4. Running build-chip-core.js to link everything

I want to automate all of this with Docker. See .claude/upstream-docker-contribution-plan.md
for the detailed plan, which includes:
- Complete Dockerfile structure
- All issues we encountered and their solutions
- Testing strategy
- Documentation requirements

Please implement the Docker build system following the plan. Focus on:
1. Creating Dockerfile that clones and builds all external dependencies automatically
2. Setting up docker-compose.yml for easy artifact extraction
3. Adding npm script for convenient usage
4. Testing that the build works end-to-end

The goal is a one-command solution: `npm run build-chip-core:docker`
```
