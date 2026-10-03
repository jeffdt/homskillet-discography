# Dockerfile for building chip-core WebAssembly module
# This is a build-only container - it outputs artifacts to your local machine
# You continue development locally with your own tools

FROM emscripten/emsdk:3.1.39

# Install cmake and python (required for game-music-emu and node-gyp)
RUN apt-get update && apt-get install -y cmake python-is-python3 && rm -rf /var/lib/apt/lists/*

# Clone and build game-music-emu in parent directory (as expected by build script).
# Pinned so every machine builds the same emulator; bump deliberately to pick up upstream changes.
ARG GME_REPO=https://github.com/mmontag/game-music-emu.git
ARG GME_COMMIT=1bab5aba4e6280451ef3ceb3c88b3ba5951dfd3a
WORKDIR /
RUN git clone "$GME_REPO" game-music-emu && \
    cd game-music-emu && \
    git checkout "$GME_COMMIT" && \
    mkdir build && \
    cd build && \
    emcmake cmake -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF .. && \
    emmake make -j$(nproc)

# Set working directory for chip-core build
WORKDIR /build

# Copy package files and install dependencies
COPY package.json package-lock.json* /build/
RUN npm install

# Copy necessary files for chip-core build
COPY scripts/build-chip-core.js /build/scripts/
COPY config/paths.js /build/config/
COPY src/showcqtbar.c /build/src/

# Create public directory for wasm output
RUN mkdir -p /build/public

# Build chip-core (generates chip-core.js and chip-core.wasm)
RUN node scripts/build-chip-core.js

# Output files will be copied from:
# /build/src/chip-core.js -> local src/chip-core.js
# /build/src/chip-core.wasm -> local public/chip-core.wasm
