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
});
