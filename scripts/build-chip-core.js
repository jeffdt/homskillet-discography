const { spawn, execSync } = require('child_process');
const fs = require('fs');
const chalk = require('chalk');
const paths = require('../config/paths');
const path = require('path');

/**
 * Compile the C libraries with emscripten.
 */

// Only GME (Game Music Emu) modules - removed libxmp, fluidlite, libADLMIDI, libvgm, v2m, n64, mdx
const chipModules = [
  {
    name: 'visualizer',
    enabled: true,
    sourceFiles: [
      'src/showcqtbar.c',
    ],
    exportedFunctions: [
      // ---- Visualizer functions: ----
      '_cqt_init',
      '_cqt_calc',
      '_cqt_render_line',
      '_cqt_bin_to_freq',
    ],
    flags: [],
  },
  {
    name: 'gme',
    enabled: true,
    sourceFiles: [
      '../game-music-emu/build/gme/libgme.a',
    ],
    exportedFunctions: [
      '_gme_open_data',
      '_gme_play',
      '_gme_delete',
      '_gme_mute_voices',
      '_gme_track_count',
      '_gme_track_ended',
      '_gme_voice_count',
      '_gme_track_info',
      '_gme_start_track',
      '_gme_open_data',
      '_gme_ignore_silence',
      '_gme_set_tempo',
      '_gme_seek_scaled', // seek_scaled and tell_scaled exist in
      '_gme_tell_scaled', // github.com/mmontag/game-music-emu fork
      '_gme_set_fade',
      '_gme_voice_name',
      '_gme_set_stereo_depth',
    ],
    flags: [
      '-DHAVE_ZLIB_H',    // used by game_music_emu for vgz
      '-DHAVE_STDINT_H',
    ],
  },
];

const compiler = process.env.EMPP_BIN || 'em++';
const jsOutFile = 'src/chip-core.js';
const wasmOutFile = 'src/chip-core.wasm';
const wasmDir = paths.appPublic;
const wasmMapOutFile = wasmOutFile + '.map';
const wasmMapDir = path.resolve(paths.appPublic, '..');
const runtimeMethods = [
  'ALLOC_NORMAL',
  'FS',
  'UTF8ToString',
  'stringToNewUTF8',
  'ccall',
  'getValue',
  'setValue',
  'HEAP8',
  'HEAPU8',
  'HEAP16',
  'HEAPU16',
  'HEAP32',
  'HEAPU32',
  'HEAPF32',
  'HEAPF64',
];
const exportedFns = [
  '_malloc',
  '_free',
].concat(...chipModules.filter(m => m.enabled).map(m => m.exportedFunctions));
const sourceFiles = [].concat(...chipModules.filter(m => m.enabled).map(m => m.sourceFiles));
const moduleFlags = [].concat(...chipModules.filter(m => m.enabled).map(m => m.flags));

const flags = [
  /*
  Build flags for Emscripten 3.1.39. Last updated July 15, 2024
  */
  // '--closure', '1',       // causes TypeError: lib.FS.mkdir is not a function
  // '--llvm-lto', '3',
  // '--clear-cache',        // sometimes Emscripten cache gets "poisoned"
  '--no-heap-copy',
  '-s', 'EXPORTED_FUNCTIONS=[' + exportedFns.join(',') + ']',
  '-s', 'EXPORTED_RUNTIME_METHODS=[' + runtimeMethods.join(',') + ']',
  '-s', 'ALLOW_MEMORY_GROWTH=1',
  '-s', 'ASSERTIONS=0',      // assertions increase runtime size about 100K
  '-s', 'STACK_OVERFLOW_CHECK=2',
  // '-s', 'STACK_SIZE=5MB', // support large VGM and XM files. default is 64KB
                             // disabled after allocating file data on heap
  '-s', 'MODULARIZE=1',
  '-s', 'EXPORT_NAME=CHIP_CORE',
  '-s', 'ENVIRONMENT=web',
  '-s', 'USE_ZLIB=1',
  // '-s', 'EXPORT_ES6=1',   // Disabled - webpack not configured for ES6 modules
  '-s', 'WASM_BIGINT',       // support passing 64 bit integers to/from JS
  '-lidbfs.js',
  '-Os',                     // set to O0 for fast compile during development
  // '-g',                   // include DWARF debug symbols. Increases size ~2.5x
  '-o', jsOutFile,

  /*
   WASM Source Maps

   These source maps require local fileserver running at chip-player-js root
   to expose C/C++ source files to browser; i.e. $ python -m http.server 9000
   Subproject static libraries must also be compiled with the emcc flags:
    `-g4 --source-map-base http://localhost:9000`.
   See lazyusf2/Makefile (for liblazyusf.a).
  */
  // '-g4',                     // include debug information
  // '--source-map-base', 'http://localhost:9000/',

  /*
  Warnings/misc.
   */
  '-Qunused-arguments',
  '-Wno-deprecated',
  '-Wno-logical-op-parentheses',
  '-Wno-c++11-extensions',
  '-Wno-inconsistent-missing-override',
  '-Wno-c++11-narrowing',
  '-std=c++11',

  ...moduleFlags,
];

console.log('Compiling to %s...', jsOutFile);
console.log(`Invocation:\n${compiler} ${chalk.blue(flags.join(' '))} ${chalk.gray(sourceFiles.join(' '))}\n`);
const preJs = `/*eslint-disable*/`;
const args = [].concat(flags, sourceFiles);
const build_proc = spawn(compiler, args, {stdio: 'inherit'});
build_proc.on('exit', function (code) {
  if (code === 0) {
    console.log('Moving %s to %s.', wasmOutFile, wasmDir);
    execSync(`mv ${wasmOutFile} ${wasmDir}`);

    if (fs.existsSync(wasmMapOutFile)) {
      console.log('Moving %s to %s.', wasmMapOutFile, wasmMapDir);
      execSync(`mv ${wasmMapOutFile} ${wasmMapDir}`);
    }

    // Don't use --pre-js because it can get stripped out by closure.
    console.log('Prepending %s: \n%s\n', jsOutFile, preJs.trim());
    execSync(`cat <<EOF > ${jsOutFile}\n${preJs}\n$(cat ${jsOutFile})\nEOF`);
  }
});
