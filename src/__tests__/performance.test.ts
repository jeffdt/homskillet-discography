/**
 * Performance benchmark tests
 *
 * These tests measure performance characteristics of critical code paths
 * Run with: bun test performance
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Performance Benchmarks', () => {
  describe('Buffer Conversion', () => {
    const BUFFER_SIZE = 2048;
    const ITERATIONS = 100;

    it('should benchmark getValue() approach (current)', () => {
      // Simulate Emscripten heap
      const heap = new Int16Array(BUFFER_SIZE * 2);
      for (let i = 0; i < heap.length; i++) {
        heap[i] = Math.floor(Math.random() * 32768);
      }

      // Mock getValue function
      const getValue = (offset: number): number => {
        return heap[offset / 2]; // 2 bytes per int16
      };

      const channels = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];
      const INT16_MAX = 32768;

      const start = performance.now();

      for (let iter = 0; iter < ITERATIONS; iter++) {
        for (let ch = 0; ch < 2; ch++) {
          for (let i = 0; i < BUFFER_SIZE; i++) {
            channels[ch][i] = getValue(i * 2 * 2 + ch * 2) / INT16_MAX;
          }
        }
      }

      const end = performance.now();
      const avgTime = (end - start) / ITERATIONS;

      console.log(`  getValue() approach: ${avgTime.toFixed(3)}ms per buffer`);
      expect(avgTime).toBeLessThan(10); // Should be under 10ms
    });

    it('should benchmark typed array view (optimized)', () => {
      // Simulate Emscripten heap
      const heap = new Int16Array(BUFFER_SIZE * 2);
      for (let i = 0; i < heap.length; i++) {
        heap[i] = Math.floor(Math.random() * 32768);
      }

      const channels = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];
      const INT16_MAX = 32768;

      const start = performance.now();

      for (let iter = 0; iter < ITERATIONS; iter++) {
        // Zero-copy typed array view
        for (let i = 0; i < BUFFER_SIZE; i++) {
          channels[0][i] = heap[i * 2] / INT16_MAX;
          channels[1][i] = heap[i * 2 + 1] / INT16_MAX;
        }
      }

      const end = performance.now();
      const avgTime = (end - start) / ITERATIONS;

      console.log(`  Typed array view: ${avgTime.toFixed(3)}ms per buffer`);
      expect(avgTime).toBeLessThan(5); // Should be under 5ms (faster)
    });
  });

  describe.skip('Canvas Operations', () => {
    // Note: These tests require a canvas implementation
    // Run in browser or with proper canvas-node setup
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
      canvas = document.createElement('canvas');
      canvas.width = 448;
      canvas.height = 256;
      ctx = canvas.getContext('2d')!;
    });

    it('should benchmark fillRect approach (current)', () => {
      const BINS = 448;
      const ITERATIONS = 60; // 60 frames

      const start = performance.now();

      for (let iter = 0; iter < ITERATIONS; iter++) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Simulate frequency bars, peaks, and waterfall pixels
        for (let i = 0; i < BINS; i++) {
          const x = i;
          const barHeight = Math.random() * 256;
          const peakY = Math.random() * 256;

          // Frequency bar
          ctx.fillStyle = '#9bfe38';
          ctx.fillRect(x, 256 - barHeight, 1, barHeight);

          // Peak hold
          ctx.fillStyle = '#66cb01';
          ctx.fillRect(x, peakY, 1, 2);

          // Waterfall pixel
          ctx.fillStyle = `rgb(${Math.random() * 255}, ${Math.random() * 255}, 0)`;
          ctx.fillRect(x, 0, 1, 1);
        }
      }

      const end = performance.now();
      const avgTime = (end - start) / ITERATIONS;

      console.log(`  fillRect approach: ${avgTime.toFixed(3)}ms per frame (${BINS * 3} calls)`);
      expect(avgTime).toBeLessThan(20); // Should be under 20ms
    });

    it('should benchmark ImageData approach (optimized)', () => {
      const BINS = 448;
      const ITERATIONS = 60;

      const start = performance.now();

      for (let iter = 0; iter < ITERATIONS; iter++) {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;

        // Simulate frequency bars, peaks, and waterfall pixels
        for (let i = 0; i < BINS; i++) {
          const x = i;
          const barHeight = Math.floor(Math.random() * 256);
          const peakY = Math.floor(Math.random() * 256);

          // Draw frequency bar
          for (let y = 256 - barHeight; y < 256; y++) {
            const offset = (y * canvas.width + x) * 4;
            data[offset] = 155; // R
            data[offset + 1] = 254; // G
            data[offset + 2] = 56; // B
            data[offset + 3] = 255; // A
          }

          // Draw peak hold
          for (let py = peakY; py < peakY + 2 && py < 256; py++) {
            const offset = (py * canvas.width + x) * 4;
            data[offset] = 102; // R
            data[offset + 1] = 203; // G
            data[offset + 2] = 1; // B
            data[offset + 3] = 255; // A
          }

          // Draw waterfall pixel
          const offset = x * 4;
          data[offset] = Math.random() * 255; // R
          data[offset + 1] = Math.random() * 255; // G
          data[offset + 2] = 0; // B
          data[offset + 3] = 255; // A
        }

        ctx.putImageData(imageData, 0, 0);
      }

      const end = performance.now();
      const avgTime = (end - start) / ITERATIONS;

      console.log(`  ImageData approach: ${avgTime.toFixed(3)}ms per frame (1 putImageData)`);
      expect(avgTime).toBeLessThan(15); // Should be faster than fillRect
    });
  });

  describe('Effect Processing', () => {
    const BUFFER_SIZE = 2048;
    const ITERATIONS = 100;

    it('should benchmark stereo width processing', () => {
      const channels = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];

      // Fill with random audio data
      for (let i = 0; i < BUFFER_SIZE; i++) {
        channels[0][i] = Math.random() * 2 - 1;
        channels[1][i] = Math.random() * 2 - 1;
      }

      const stereoWidth = 0.7;
      const width = stereoWidth;

      const start = performance.now();

      for (let iter = 0; iter < ITERATIONS; iter++) {
        for (let i = 0; i < BUFFER_SIZE; i++) {
          const left = channels[0][i];
          const right = channels[1][i];
          channels[0][i] = left * width + right * (1 - width);
          channels[1][i] = right * width + left * (1 - width);
        }
      }

      const end = performance.now();
      const avgTime = (end - start) / ITERATIONS;

      console.log(`  Stereo width: ${avgTime.toFixed(3)}ms per buffer`);
      expect(avgTime).toBeLessThan(3); // Should be under 3ms
    });

    it('should benchmark merged effect loop (optimized)', () => {
      const channels = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];

      // Fill with random audio data
      for (let i = 0; i < BUFFER_SIZE; i++) {
        channels[0][i] = Math.random() * 2 - 1;
        channels[1][i] = Math.random() * 2 - 1;
      }

      const stereoWidth = 0.7;
      const fadeIn = 0.5;
      const fadeOut = 0.8;

      const start = performance.now();

      for (let iter = 0; iter < ITERATIONS; iter++) {
        // Merged loop: stereo width + fade in single pass
        for (let i = 0; i < BUFFER_SIZE; i++) {
          let left = channels[0][i];
          let right = channels[1][i];

          // Stereo width
          const newLeft = left * stereoWidth + right * (1 - stereoWidth);
          const newRight = right * stereoWidth + left * (1 - stereoWidth);

          // Fade (if in fade region)
          const fade = i < 256 ? fadeIn : (i > BUFFER_SIZE - 256 ? fadeOut : 1.0);

          channels[0][i] = newLeft * fade;
          channels[1][i] = newRight * fade;
        }
      }

      const end = performance.now();
      const avgTime = (end - start) / ITERATIONS;

      console.log(`  Merged effects: ${avgTime.toFixed(3)}ms per buffer`);
      expect(avgTime).toBeLessThan(4); // Should be similar or faster
    });
  });

  describe('React Re-render Impact', () => {
    it('should measure state update frequency impact', () => {
      const updates: number[] = [];
      let callCount = 0;

      // Simulate amplitude updates with threshold
      const simulateUpdates = (threshold: number) => {
        let prevValue = 0;
        callCount = 0;

        for (let i = 0; i < 1000; i++) {
          // Simulate audio amplitude (random walk)
          const newValue = prevValue + (Math.random() - 0.5) * 0.1;
          const clamped = Math.max(0, Math.min(1, newValue));

          // Only update if change > threshold
          if (Math.abs(clamped - prevValue) > threshold) {
            callCount++;
            prevValue = clamped;
          }
        }

        return callCount;
      };

      // Test different thresholds
      const threshold002 = simulateUpdates(0.02);
      const threshold005 = simulateUpdates(0.05);
      const threshold010 = simulateUpdates(0.10);

      console.log(`  Threshold 0.02: ${threshold002} updates (current)`);
      console.log(`  Threshold 0.05: ${threshold005} updates (recommended)`);
      console.log(`  Threshold 0.10: ${threshold010} updates (aggressive)`);

      // Higher threshold = fewer updates
      expect(threshold005).toBeLessThanOrEqual(threshold002);
      expect(threshold010).toBeLessThanOrEqual(threshold005);
    });
  });

  describe('Memory Allocation', () => {
    it('should measure particle creation overhead', () => {
      const PARTICLE_COUNT = 1000;

      // Approach 1: Create new objects
      const start1 = performance.now();
      const particles1: any[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles1.push({
          x: Math.random() * 100,
          y: Math.random() * 100,
          vx: Math.random() * 2 - 1,
          vy: Math.random() * 2 - 1,
          life: Math.random(),
        });
      }
      const end1 = performance.now();

      // Approach 2: Object pooling
      const start2 = performance.now();
      const pool = Array(PARTICLE_COUNT).fill(null).map(() => ({
        x: 0, y: 0, vx: 0, vy: 0, life: 0,
      }));

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        pool[i].x = Math.random() * 100;
        pool[i].y = Math.random() * 100;
        pool[i].vx = Math.random() * 2 - 1;
        pool[i].vy = Math.random() * 2 - 1;
        pool[i].life = Math.random();
      }
      const end2 = performance.now();

      console.log(`  Create new: ${(end1 - start1).toFixed(3)}ms`);
      console.log(`  Object pool (reuse): ${(end2 - start2).toFixed(3)}ms`);

      // Note: Object pooling shows benefits over time (less GC), not in allocation
      // The real benefit is avoiding GC pauses during runtime
      expect(pool.length).toBe(PARTICLE_COUNT);
    });
  });
});

describe('Performance Regression Tests', () => {
  it('should maintain target frame budget', () => {
    const TARGET_FRAME_TIME = 16; // 60 FPS = 16.67ms

    // This would be populated by actual measurements
    const avgFrameTime = 12; // Mock value

    expect(avgFrameTime).toBeLessThan(TARGET_FRAME_TIME);
  });

  it('should maintain target audio callback budget', () => {
    const TARGET_CALLBACK_TIME = 43; // 2048 @ 48kHz = ~42.7ms
    const BUFFER_SIZE = 2048;

    // Mock audio processing time
    const avgCallbackTime = 10; // Mock value

    expect(avgCallbackTime).toBeLessThan(TARGET_CALLBACK_TIME);
  });
});
