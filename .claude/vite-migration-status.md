# Vite Migration Status Report

**Date:** 2025-12-20
**Status:** INCOMPLETE - ChipCore not loading
**Branch:** convert-webpack-to-vite

## Summary

The Webpack to Vite migration is mostly complete, but the app is currently **non-functional** due to chipCore (WebAssembly module) not loading properly. The UI renders, files can be browsed, but clicking songs does nothing because the audio engine never initializes.

## What Works ✅

1. **Build System Migration**
   - ✅ Vite configuration created and working
   - ✅ Vitest configuration created and working
   - ✅ Dev server starts in 254ms (was 10-30s with Webpack)
   - ✅ All tests pass (3/3 in 631ms)
   - ✅ Production builds succeed
   - ✅ HMR (Hot Module Replacement) works

2. **Node.js Module Replacements**
   - ✅ Replaced `querystring` with `URLSearchParams` API in:
     - util.ts
     - Browse.tsx
     - DirectoryLink.tsx
     - App.tsx
   - ✅ Replaced `path.dirname()` with custom `dirname()` helper in:
     - util.ts
     - App.tsx
   - ✅ Replaced `path.extname()` with custom `extname()` helper in:
     - GMEPlayer.js
   - ✅ Fixed `global` → `window` in Spectrogram.js

3. **Race Condition Guards**
   - ✅ Added guards to Visualizer component for undefined chipCore
   - ✅ Added guards to App sequencer methods
   - ✅ Fixed Toast component API call (was passing object instead of string + level)

## What Doesn't Work ❌

### Critical Issue: ChipCore Never Loads

**Symptom:**
- Clicking songs does nothing
- Console shows: "Sequencer not ready yet, cannot play"
- JavaScript check reveals: `window.ChipPlayer.chipCore` is `undefined`

**Root Cause:**
The `await ChipCore({...})` call in `App.tsx:initChipCore()` appears to never resolve. This is the WebAssembly module initialization.

**Evidence:**
```javascript
// In browser console:
window.ChipPlayer && window.ChipPlayer.chipCore
// Returns: 'ChipCore NOT loaded'
```

**Location:**
- File: `src/components/App.tsx`
- Method: `async initChipCore(audioCtx, playerNode, bufferSize)`
- Line: ~141 (await ChipCore({...}))

## Commits Made

1. **d16df7f** - Fix browser compatibility issues for Vite
   - Replaced Node.js modules with browser-native alternatives
   - Fixed incorrect toast API call
   - App loads successfully after this commit

2. **7b66927** - Replace remaining Node.js modules in App.tsx and GMEPlayer.js
   - Completed Node.js module removal
   - Added dirname() and extname() helpers

3. **cb98cb1** - Fix race conditions with async chipCore initialization
   - Added guards to prevent undefined errors
   - But revealed the underlying issue: chipCore never loads

## Technical Details

### ChipCore Loading Flow

```typescript
// App.tsx constructor (line ~135)
this.initChipCore(audioCtx, playerNode, bufferSize);

// App.tsx:initChipCore (line ~138)
async initChipCore(audioCtx, playerNode, bufferSize) {
  try {
    this.chipCore = await ChipCore({  // ← HANGS HERE
      locateFile: (path, prefix) => {
        if (path.endsWith('.wasm') || path.endsWith('.wast'))
          return `${BASE_URL}/${path}`;
        return prefix + path;
      },
      print: (msg) => console.debug('[stdout] ' + msg),
      printErr: (msg) => console.debug('[stderr] ' + msg),
    });
  } catch (e) {
    // Error handler
  }

  // After chipCore loads, sequencer is created (line ~193)
  this.sequencer = new Sequencer(players, null, ...);
}
```

### ChipCore Import

```typescript
// App.tsx:9-10
import * as ChipCoreModule from '../chip-core';
const ChipCore = (ChipCoreModule as any).CHIP_CORE || ChipCoreModule;
```

The `chip-core.js` file is Emscripten-generated CommonJS code. We handle it with a wildcard import + fallback pattern.

### Files Involved

- `src/chip-core.js` - Emscripten-generated, committed to repo
- `public/chip-core.wasm` - WebAssembly binary, committed to repo
- `src/components/App.tsx` - Initializes chipCore
- `src/players/GMEPlayer.js` - Uses chipCore for audio playback

## Why This Worked With Webpack

Webpack and Vite handle module loading differently:

1. **Webpack:** Uses polyfills, aggressive bundling, different module resolution
2. **Vite:** Native ESM, no automatic polyfills, different async loading semantics

The chipCore Emscripten module may have timing/loading issues specific to Vite's module system.

## Next Steps for Debugging

### 1. Check Network Tab
```
Look for:
- Is chip-core.wasm loading? (Status 200?)
- Is chip-core.js loading correctly?
- Any CORS errors?
- Check request/response headers
```

### 2. Add Detailed Logging
```typescript
// In App.tsx:initChipCore, add:
async initChipCore(audioCtx, playerNode, bufferSize) {
  console.log('[DEBUG] Starting chipCore initialization...');
  console.log('[DEBUG] ChipCore module:', ChipCore);
  console.log('[DEBUG] BASE_URL:', BASE_URL);

  try {
    console.log('[DEBUG] Calling await ChipCore({...})');
    this.chipCore = await ChipCore({
      locateFile: (path, prefix) => {
        const url = path.endsWith('.wasm') || path.endsWith('.wast')
          ? `${BASE_URL}/${path}`
          : prefix + path;
        console.log('[DEBUG] locateFile:', path, '→', url);
        return url;
      },
      print: (msg) => console.log('[EMCC stdout]', msg),
      printErr: (msg) => console.log('[EMCC stderr]', msg),
    });
    console.log('[DEBUG] chipCore loaded!', this.chipCore);
  } catch (e) {
    console.error('[DEBUG] chipCore failed to load:', e);
    // ...
  }
}
```

### 3. Check Vite Configuration

Current `vite.config.ts` may need adjustments:

```typescript
// Check these settings:
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  },
}

// May need to add:
optimizeDeps: {
  exclude: ['chip-core'], // Don't pre-bundle chipCore
}

// Or configure WASM handling:
assetsInclude: ['**/*.wasm'],
```

### 4. Verify Emscripten Module Format

Check if `chip-core.js` is exporting correctly for ESM:

```bash
# Check what chip-core.js exports
head -50 src/chip-core.js
tail -50 src/chip-core.js

# Look for:
# - module.exports =
# - exports.CHIP_CORE =
# - export default
```

### 5. Try Alternative Import Methods

In `App.tsx`, try different import patterns:

```typescript
// Current:
import * as ChipCoreModule from '../chip-core';
const ChipCore = (ChipCoreModule as any).CHIP_CORE || ChipCoreModule;

// Alternative 1: Dynamic import
const ChipCoreModule = await import('../chip-core');
const ChipCore = ChipCoreModule.CHIP_CORE || ChipCoreModule.default;

// Alternative 2: Require (if Vite supports)
const ChipCore = require('../chip-core').CHIP_CORE;

// Alternative 3: Direct default import
import ChipCore from '../chip-core';
```

### 6. Check Browser Console for Emscripten Errors

Emscripten prints its own debug messages. Look for:
- `[EMCC stdout]` messages
- `[EMCC stderr]` messages
- WebAssembly instantiation errors
- Memory allocation errors

### 7. Compare Working Webpack Build

If you still have the Webpack version:

```bash
# Build with Webpack (old)
git checkout main
npm start

# Check browser console - what logs appear?
# Check Network tab - how is chip-core.wasm loaded?
# Compare with Vite behavior
```

## Potential Solutions

### Option A: Fix Vite Loading (Preferred)
- Debug why ChipCore() hangs
- Adjust Vite config for WASM/Emscripten
- May need plugin: `vite-plugin-wasm`

### Option B: Rebuild chip-core.wasm
```bash
# If Emscripten module is incompatible with Vite's ESM:
npm run build-chip-core:docker
# Or locally:
npm run build-chip-core

# This regenerates chip-core.js and chip-core.wasm
# May need to update Emscripten flags for ESM output
```

### Option C: Use Vite Plugin
```bash
npm install vite-plugin-wasm vite-plugin-top-level-await
```

Add to `vite.config.ts`:
```typescript
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
  ],
});
```

## Files Modified (All Committed)

### Configuration Files
- `.claude/TODO.md` - Removed M5 task
- `vite.config.ts` - Vite configuration
- `vitest.config.ts` - Test configuration
- `postcss.config.js` - PostCSS config
- `tsconfig.json` - Updated for Vite
- `package.json` - Updated scripts and dependencies

### Source Files Fixed
- `src/Spectrogram.js` - Changed global → window
- `src/components/App.tsx` - Replaced querystring/path, added sequencer guards
- `src/components/Browse.tsx` - Replaced querystring
- `src/components/DirectoryLink.tsx` - Replaced querystring
- `src/components/Visualizer.tsx` - Added chipCore guards
- `src/util.ts` - Replaced querystring/path, added helpers
- `src/players/GMEPlayer.js` - Replaced path, added extname helper
- `src/config/index.ts` - Updated env vars
- `src/index.tsx` - Updated env vars, GA init

## Test Commands

```bash
# Start dev server (works)
npm start

# Run tests (works)
npm test

# Build production (works)
npm run build

# The app loads and renders but clicking songs fails
# because chipCore never initializes
```

## Warning to Address

There's a React warning (non-breaking):
```
Warning: Can't call setState on a component that is not yet mounted.
```

This is at `App.tsx:153` where `setState({ loading: false })` is called in the chipCore error handler. This happens because `initChipCore` is called from the constructor before the component mounts.

**Fix:** Change `this.setState({ loading: false })` to `this.state.loading = false`

But DO NOT fix this until chipCore loading is resolved - it will just hide whether the code path is being hit.

## Questions for Investigation

1. **Is chipCore() actually being called?** Add console.log before await
2. **Does the await resolve or reject?** Add .then/.catch handlers
3. **Is chip-core.wasm being fetched?** Check Network tab
4. **Are there CORS issues?** Check console for CORS errors
5. **Is the locateFile callback being called?** Add logging
6. **What does ChipCore export?** Log the module before calling it
7. **Does it work in production build?** Try `npm run build && npm run preview`

## Relevant Documentation

- Vite WASM support: https://vite.dev/guide/features.html#webassembly
- Emscripten Module: https://emscripten.org/docs/api_reference/module.html
- vite-plugin-wasm: https://github.com/Menci/vite-plugin-wasm

## Contact Points

- Migration plan: `.claude/migration-journals/vite-migration-checkpoint-*.md`
- Deployment plan: `.claude/deployment-plan.md`
- Project instructions: `CLAUDE.md`

## Recommendation

**Priority:** Debug chipCore loading FIRST before any other work. The entire app depends on this WebAssembly module. Without it, no audio playback is possible.

Start with adding detailed logging to `App.tsx:initChipCore()` and checking the browser's Network tab to see if chip-core.wasm is being requested and loaded successfully.
