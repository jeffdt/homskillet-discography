import { SpectrumCore } from '../../audio/types';

/** A spectrum core without a constant-Q transform, like chip-core-stub.js. */
export const NO_CQT_CORE: SpectrumCore = {
  HEAPF32: new Float32Array(16),
  _malloc: () => 0,
  _free: () => {},
  _cqt_init: () => 0,
  _cqt_calc: () => {},
  _cqt_render_line: () => {},
};
