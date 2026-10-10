import fs from 'fs';
import { fileURLToPath } from 'url';
import CHIP_CORE from '../chip-core';
import { instantiateChipCore } from '../audio/loadChipCore';
import { ChipCore, ChipCoreFactory } from '../audio/types';

const WASM_PATH = fileURLToPath(new URL('../../public/chip-core.wasm', import.meta.url));
const MUSIC_DIR = fileURLToPath(new URL('../../public/music/', import.meta.url));
const CATALOG_PATH = fileURLToPath(new URL('../../public/catalog.json', import.meta.url));

/** Instantiates the committed public/chip-core.wasm in Node or bun, the same way the worklet does. */
export async function loadChipCoreFromDisk(): Promise<ChipCore> {
  const module = await WebAssembly.compile(fs.readFileSync(WASM_PATH));
  return instantiateChipCore(CHIP_CORE as unknown as ChipCoreFactory, { module });
}

/** Reads a catalog track by its path under public/music, e.g. 'SuperFORE!/parkour.nsf'. */
export function readMusicFile(relativePath: string): Uint8Array {
  return new Uint8Array(fs.readFileSync(MUSIC_DIR + relativePath));
}

/** Every catalog track path (public/catalog.json), in catalog order. */
export function readCatalog(): string[] {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}
