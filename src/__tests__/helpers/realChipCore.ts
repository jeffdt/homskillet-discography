import fs from 'fs';
import { fileURLToPath } from 'url';
import CHIP_CORE from '../../chip-core';
import { instantiateChipCore } from '../../audio/loadChipCore';
import { ChipCore, ChipCoreFactory } from '../../audio/types';

const WASM_PATH = fileURLToPath(new URL('../../../public/chip-core.wasm', import.meta.url));
const MUSIC_DIR = fileURLToPath(new URL('../../../public/music/', import.meta.url));

/** Instantiates the committed public/chip-core.wasm in Node, the same way the worklet does. */
export async function loadRealChipCore(): Promise<ChipCore> {
  const module = await WebAssembly.compile(fs.readFileSync(WASM_PATH));
  return instantiateChipCore(CHIP_CORE as unknown as ChipCoreFactory, { module });
}

/** Reads a catalog track, e.g. readTrack('SuperFORE!/parkour.nsf'). */
export function readTrack(relativePath: string): Uint8Array {
  return new Uint8Array(fs.readFileSync(MUSIC_DIR + relativePath));
}
