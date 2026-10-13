import { END_FADE_MS } from '../constants';
import { ChipRenderer } from '../render/ChipRenderer';
import { ChipCore, RendererSettings } from '../types';
import { Encoder } from './encoders';
import { EXPORT_SAMPLE_RATE, exportFrameCount } from './exportPlan';

export const EXPORT_CHUNK_FRAMES = 4096;

/** One export: the track, its wall-clock length, and the mix to render it with. */
export interface ExportJob {
  bytes: Uint8Array;
  path: string;
  lengthMs: number;
  settings: RendererSettings;
  gains: ArrayLike<number>;
}

/**
 * Renders a track from 0:00 for exactly job.lengthMs of output and returns the encoded file as
 * byte parts. The end fade fills the last END_FADE_MS at any speed; a track that ends early is
 * padded with the renderer's silence.
 */
export function renderExport(
  core: ChipCore,
  job: ExportJob,
  encoder: Encoder,
  onProgress?: (fraction: number) => void
): Uint8Array[] {
  const totalFrames = exportFrameCount(job.lengthMs);
  const renderer = new ChipRenderer(core, EXPORT_SAMPLE_RATE, () => {});
  // Gains set before load start at their targets, so muted voices never ramp in.
  renderer.setGains(job.gains);
  renderer.load(job.bytes, job.path, {
    ...job.settings,
    loopForever: false,
    // The renderer's clock runs in song time, which moves at `tempo` times wall-clock.
    durationMs: (job.lengthMs - END_FADE_MS) * job.settings.tempo,
  });
  const left = new Float32Array(EXPORT_CHUNK_FRAMES);
  const right = new Float32Array(EXPORT_CHUNK_FRAMES);
  const parts = encoder.start();
  try {
    for (let done = 0; done < totalFrames; ) {
      const frames = Math.min(EXPORT_CHUNK_FRAMES, totalFrames - done);
      const leftChunk = left.subarray(0, frames);
      const rightChunk = right.subarray(0, frames);
      renderer.render(leftChunk, rightChunk);
      parts.push(...encoder.encode(leftChunk, rightChunk));
      done += frames;
      onProgress?.(done / totalFrames);
    }
    parts.push(...encoder.finish());
  } finally {
    renderer.unload();
  }
  return parts;
}
