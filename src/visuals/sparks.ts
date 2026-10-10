/** Spark tuning (the Interface panel's spark settings). */
export interface SparkSettings {
  /** Shortest wait between sparks per spawner in ms; waits range from 1x to 3x this. */
  spawnRate: number;
  lifespan: number;
  /** Degrees: 0 right, 90 down, 180 left, 270 up. */
  baseAngle: number;
  angleSpread: number;
  speed: number;
  /** Percent. */
  speedVariance: number;
  gravity: number;
  fadeMode: 'fade' | 'instant';
}

/** The old SliderParticles defaults. */
export const DEFAULT_SPARK_SETTINGS: SparkSettings = {
  spawnRate: 40,
  lifespan: 600,
  baseAngle: 180,
  angleSpread: 30,
  speed: 1,
  speedVariance: 20,
  gravity: 0.5,
  fadeMode: 'fade',
};

/** Independent spawners, for a less regular rhythm. */
export const SPAWNERS = 2;
/** Most sparks alive at once; spawns beyond it are skipped. */
export const MAX_SPARKS = 64;
/** Pixels per unit of speed per second. */
const PIXEL_SCALE = 80;

/** One spark; x, y and opacity are updated by SparkSystem.step. */
export interface Spark {
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  gravity: number;
  ageMs: number;
  lifetimeMs: number;
  x: number;
  y: number;
  opacity: number;
}

/** Spark physics with no DOM or React: spawn on timers, age, fall and fade, all by elapsed time. */
export class SparkSystem {
  readonly sparks: Spark[] = [];
  private settings: SparkSettings = DEFAULT_SPARK_SETTINGS;
  private readonly waits: number[];

  constructor(private readonly random: () => number = Math.random) {
    this.waits = Array.from({ length: SPAWNERS }, () => this.nextWait());
  }

  /** Applies settings; undefined fields fall back to the defaults. */
  configure(overrides: Partial<SparkSettings>): void {
    const d = DEFAULT_SPARK_SETTINGS;
    this.settings = {
      spawnRate: overrides.spawnRate ?? d.spawnRate,
      lifespan: overrides.lifespan ?? d.lifespan,
      baseAngle: overrides.baseAngle ?? d.baseAngle,
      angleSpread: overrides.angleSpread ?? d.angleSpread,
      speed: overrides.speed ?? d.speed,
      speedVariance: overrides.speedVariance ?? d.speedVariance,
      gravity: overrides.gravity ?? d.gravity,
      fadeMode: overrides.fadeMode ?? d.fadeMode,
    };
  }

  /** Ages and culls sparks, spawns due ones at origin() (none if it returns null), moves them. */
  step(dtMs: number, origin: () => { x: number; y: number } | null): void {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.ageMs += dtMs;
      if (spark.ageMs >= spark.lifetimeMs) this.sparks.splice(i, 1);
    }
    let point: { x: number; y: number } | null | undefined;
    for (let w = 0; w < this.waits.length; w++) {
      this.waits[w] -= dtMs;
      while (this.waits[w] <= 0) {
        this.waits[w] += this.nextWait();
        if (point === undefined) point = origin();
        if (point && this.sparks.length < MAX_SPARKS) this.sparks.push(this.spawn(point));
      }
    }
    for (const spark of this.sparks) this.place(spark);
  }

  /** Removes every spark and restarts the spawn timers. */
  clear(): void {
    this.sparks.length = 0;
    for (let w = 0; w < this.waits.length; w++) this.waits[w] = this.nextWait();
  }

  private nextWait(): number {
    const min = Math.max(1, this.settings.spawnRate);
    return min + this.random() * 2 * min;
  }

  private spawn(point: { x: number; y: number }): Spark {
    const s = this.settings;
    const degrees = s.baseAngle + (this.random() - 0.5) * 2 * s.angleSpread;
    const radians = (degrees * Math.PI) / 180;
    const speed = s.speed * (1 + (this.random() - 0.5) * 2 * (s.speedVariance / 100));
    return {
      originX: point.x,
      originY: point.y,
      vx: Math.cos(radians) * speed,
      vy: Math.sin(radians) * speed,
      gravity: s.gravity,
      ageMs: 0,
      lifetimeMs: s.lifespan,
      x: point.x,
      y: point.y,
      opacity: 1,
    };
  }

  private place(spark: Spark): void {
    const t = spark.ageMs / 1000;
    spark.x = spark.originX + spark.vx * PIXEL_SCALE * t;
    spark.y =
      spark.originY + spark.vy * PIXEL_SCALE * t + 0.5 * spark.gravity * PIXEL_SCALE * t * t;
    const progress = spark.ageMs / spark.lifetimeMs;
    spark.opacity =
      this.settings.fadeMode === 'instant' ? (progress < 0.95 ? 1 : 0) : Math.max(0, 1 - progress);
  }
}
