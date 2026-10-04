// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  chooseEngineKind,
  chooseTapTransport,
  parseEngineOverrides,
} from '../../audio/engine/engineKind';

describe('chooseEngineKind', () => {
  it('uses the worklet when wasm and AudioWorklet are available', () => {
    expect(
      chooseEngineKind({ forcedKind: null, wasmAvailable: true, audioWorkletAvailable: true })
    ).toBe('worklet');
  });

  it('falls back to ScriptProcessor without AudioWorklet', () => {
    expect(
      chooseEngineKind({ forcedKind: null, wasmAvailable: true, audioWorkletAvailable: false })
    ).toBe('script-processor');
  });

  it('uses the stub whenever wasm is missing, even if another kind is forced', () => {
    expect(
      chooseEngineKind({ forcedKind: 'worklet', wasmAvailable: false, audioWorkletAvailable: true })
    ).toBe('stub');
  });

  it('honors forced kinds', () => {
    const available = { wasmAvailable: true, audioWorkletAvailable: true };
    expect(chooseEngineKind({ forcedKind: 'script-processor', ...available })).toBe(
      'script-processor'
    );
    expect(chooseEngineKind({ forcedKind: 'stub', ...available })).toBe('stub');
  });
});

describe('chooseTapTransport', () => {
  it('uses pooled buffers when not crossOriginIsolated (GitHub Pages)', () => {
    expect(chooseTapTransport({ crossOriginIsolated: false, forced: null })).toBe('pooled');
    expect(chooseTapTransport({ crossOriginIsolated: false, forced: 'shared' })).toBe('pooled');
  });

  it('uses shared memory when crossOriginIsolated unless pooled is forced', () => {
    expect(chooseTapTransport({ crossOriginIsolated: true, forced: null })).toBe('shared');
    expect(chooseTapTransport({ crossOriginIsolated: true, forced: 'pooled' })).toBe('pooled');
  });
});

describe('parseEngineOverrides', () => {
  it('reads engine and taps query parameters', () => {
    expect(parseEngineOverrides('?engine=script&taps=pooled')).toEqual({
      forcedKind: 'script-processor',
      forcedTapTransport: 'pooled',
    });
    expect(parseEngineOverrides('?play=a.nsf&engine=stub')).toEqual({
      forcedKind: 'stub',
      forcedTapTransport: null,
    });
  });

  it('ignores inherited object keys as engine names', () => {
    expect(parseEngineOverrides('?engine=constructor').forcedKind).toBeNull();
    expect(parseEngineOverrides('?engine=__proto__').forcedKind).toBeNull();
  });

  it('ignores unknown values', () => {
    expect(parseEngineOverrides('?engine=fast&taps=carrier-pigeon')).toEqual({
      forcedKind: null,
      forcedTapTransport: null,
    });
  });
});
