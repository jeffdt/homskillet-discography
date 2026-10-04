import { ChipCore, ChipCoreFactory, WasmSource } from './types';

/** chip-core.wasm compiled on the main thread, plus its bytes for browsers that cannot transfer a Module. */
export interface CompiledWasm {
  module: WebAssembly.Module;
  bytes: ArrayBuffer;
}

/**
 * Instantiates chip-core from an already compiled module or raw bytes. Used on the main thread,
 * inside the AudioWorklet (which cannot fetch), and by tests running in Node.
 */
export function instantiateChipCore(factory: ChipCoreFactory, wasm: WasmSource): Promise<ChipCore> {
  return new Promise((resolve, reject) => {
    factory({
      instantiateWasm(
        imports: WebAssembly.Imports,
        receive: (instance: WebAssembly.Instance, module?: WebAssembly.Module) => void
      ) {
        const instantiating = wasm.module
          ? WebAssembly.instantiate(wasm.module, imports).then((instance) =>
              receive(instance, wasm.module)
            )
          : WebAssembly.instantiate(wasm.bytes as ArrayBuffer, imports).then((result) =>
              receive(result.instance, result.module)
            );
        // Emscripten ignores this promise, so surface instantiation failures ourselves.
        instantiating.catch(reject);
        return {};
      },
      print: (message: string) => console.debug('[chip-core] ' + message),
      printErr: (message: string) => console.debug('[chip-core] ' + message),
    }).then(resolve, reject);
  });
}

/** Fetches and compiles chip-core.wasm. Returns null (stub mode) if it is missing or invalid. */
export async function compileChipCoreWasm(url: string): Promise<CompiledWasm | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    return { module: await WebAssembly.compile(bytes), bytes };
  } catch (e) {
    console.warn('Failed to load chip-core.wasm, falling back to stub mode:', e);
    return null;
  }
}
