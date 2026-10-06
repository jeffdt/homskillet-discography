import { EngineKind, TapTransport } from '../types';

/** Picks where audio renders; a missing wasm always means stub mode. */
export function chooseEngineKind(options: {
  forcedKind: EngineKind | null;
  wasmAvailable: boolean;
  audioWorkletAvailable: boolean;
}): EngineKind {
  if (!options.wasmAvailable || options.forcedKind === 'stub') return 'stub';
  if (options.forcedKind === 'script-processor') return 'script-processor';
  return options.audioWorkletAvailable ? 'worklet' : 'script-processor';
}

/** SharedArrayBuffer needs crossOriginIsolated (dev server yes, GitHub Pages no). */
export function chooseTapTransport(options: {
  crossOriginIsolated: boolean;
  forced: TapTransport | null;
}): TapTransport {
  if (!options.crossOriginIsolated || options.forced === 'pooled') return 'pooled';
  return 'shared';
}

const KIND_PARAMS: Record<string, EngineKind> = {
  worklet: 'worklet',
  script: 'script-processor',
  stub: 'stub',
};

/** Reads ?engine=worklet|script|stub and ?taps=pooled|shared, for testing fallbacks in a browser. */
export function parseEngineOverrides(search: string): {
  forcedKind: EngineKind | null;
  forcedTapTransport: TapTransport | null;
} {
  const params = new URLSearchParams(search);
  const engine = params.get('engine');
  const taps = params.get('taps');
  return {
    forcedKind:
      (engine &&
        Object.prototype.hasOwnProperty.call(KIND_PARAMS, engine) &&
        KIND_PARAMS[engine]) ||
      null,
    forcedTapTransport: taps === 'pooled' || taps === 'shared' ? taps : null,
  };
}
