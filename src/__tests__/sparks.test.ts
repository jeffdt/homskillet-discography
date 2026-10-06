import { describe, expect, it } from 'vitest';
import { MAX_SPARKS, SparkSystem } from '../visuals/sparks';

const ORIGIN = () => ({ x: 100, y: 50 });
/** Random fixed at 0.5: waits are 2 x spawnRate, no angle spread, no speed variance. */
const steady = () => new SparkSystem(() => 0.5);

describe('SparkSystem', () => {
  it('spawns from each spawner once its wait elapses', () => {
    const system = steady();
    system.configure({ spawnRate: 40 });
    system.clear();
    system.step(79, ORIGIN);
    expect(system.sparks).toHaveLength(0);
    system.step(1, ORIGIN);
    expect(system.sparks).toHaveLength(2);
    expect(system.sparks[0]).toMatchObject({ x: 100, y: 50, opacity: 1 });
  });

  it('flies along the base angle and falls with gravity', () => {
    const system = steady();
    system.configure({ spawnRate: 1000, lifespan: 600, baseAngle: 180, speed: 1, gravity: 0.5 });
    system.clear();
    system.step(2000, ORIGIN);
    system.step(500, ORIGIN);
    const spark = system.sparks[0];
    expect(spark.x).toBeCloseTo(100 - 80 * 0.5, 6);
    expect(spark.y).toBeCloseTo(50 + 0.5 * 0.5 * 80 * 0.25, 6);
    expect(spark.opacity).toBeCloseTo(1 - 500 / 600, 6);
  });

  it('removes sparks at the end of their life', () => {
    const system = steady();
    system.configure({ spawnRate: 1000, lifespan: 100 });
    system.clear();
    system.step(2000, ORIGIN);
    expect(system.sparks).toHaveLength(2);
    system.step(100, ORIGIN);
    expect(system.sparks).toHaveLength(0);
  });

  it('cuts out at 95% of life in instant mode', () => {
    const system = steady();
    system.configure({ spawnRate: 1000, lifespan: 100, fadeMode: 'instant' });
    system.clear();
    system.step(2000, ORIGIN);
    system.step(90, ORIGIN);
    expect(system.sparks[0].opacity).toBe(1);
    system.step(6, ORIGIN);
    expect(system.sparks[0].opacity).toBe(0);
  });

  it('does not spawn without an origin', () => {
    const system = steady();
    system.configure({ spawnRate: 10 });
    system.step(1000, () => null);
    expect(system.sparks).toHaveLength(0);
  });

  it('caps the number of live sparks', () => {
    const system = steady();
    system.configure({ spawnRate: 1, lifespan: 10000 });
    system.clear();
    system.step(100, ORIGIN);
    expect(system.sparks).toHaveLength(MAX_SPARKS);
  });

  it('never stalls on a zero spawn rate', () => {
    const system = steady();
    system.configure({ spawnRate: 0 });
    system.clear();
    system.step(10, ORIGIN);
    expect(system.sparks.length).toBeGreaterThan(0);
  });

  it('clear removes every spark', () => {
    const system = steady();
    system.configure({ spawnRate: 10 });
    system.step(100, ORIGIN);
    system.clear();
    expect(system.sparks).toHaveLength(0);
  });

  describe('frame rate independence', () => {
    const FRAME_COUNTS = [30, 60, 120, 144];
    /** Not a multiple of the 200 ms wait, so no spawn lands exactly on the last frame boundary. */
    const TOTAL_MS = 1050;

    function run(frames: number) {
      const system = steady();
      system.configure({ spawnRate: 100, lifespan: 100000, baseAngle: 180, gravity: 0.5 });
      system.clear();
      let spawned = 0;
      let live = 0;
      for (let i = 0; i < frames; i++) {
        system.step(TOTAL_MS / frames, ORIGIN);
        spawned += Math.max(0, system.sparks.length - live);
        live = system.sparks.length;
      }
      return { system, spawned, dtMs: TOTAL_MS / frames };
    }

    it('spawns the same number of sparks over the same time at every rate', () => {
      const counts = FRAME_COUNTS.map((frames) => run(frames).spawned);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      expect(counts[0]).toBeGreaterThanOrEqual(8);
    });

    it('places the oldest spark at the same point at every rate', () => {
      const oldest = FRAME_COUNTS.map((frames) => {
        const { system, dtMs } = run(frames);
        return { spark: system.sparks[0], dtMs };
      });
      for (const { spark, dtMs } of oldest) {
        const t = spark.ageMs / 1000;
        expect(spark.x).toBeCloseTo(100 - 80 * t, 6);
        expect(spark.y).toBeCloseTo(50 + 0.5 * 0.5 * 80 * t * t, 6);
        expect(spark.opacity).toBeCloseTo(1 - spark.ageMs / 100000, 6);
        expect(Math.abs(spark.ageMs - (TOTAL_MS - 200))).toBeLessThanOrEqual(dtMs + 1e-6);
      }
      const xs = oldest.map(({ spark }) => spark.x);
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(80 * 0.04);
    });
  });
});
