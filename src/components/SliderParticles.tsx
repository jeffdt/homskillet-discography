import React, { PureComponent } from 'react';

interface Particle {
  id: number;
  x: number; // Starting X position (pixels from left)
  y: number; // Starting Y position (pixels from top)
  vx: number; // Velocity X (-1 to 1)
  vy: number; // Velocity Y (-1 to 1)
  hueOffset: number; // Slight hue variation (0-30)
}

interface SliderParticlesProps {
  knobX: number; // Knob X position in pixels
  knobY: number; // Knob Y position in pixels
  shouldSpawn: boolean; // Whether to spawn particles (only during playback, not dragging)
  intensity: number; // Audio intensity (0-1) affects spawn rate, speed, and brightness

  // Settings (all optional with defaults)
  spawnRate?: number; // Min spawn interval in ms (lower = faster)
  lifespan?: number; // Particle lifetime in ms
  maxCount?: number; // Max particles on screen
  speedX?: number; // Horizontal velocity multiplier
  speedY?: number; // Vertical spread multiplier
  hueVariation?: number; // Hue variation in degrees
}

interface SliderParticlesState {
  particles: Particle[];
}

const MAX_PARTICLES = 15;
const PARTICLE_LIFETIME_MS = 600;
const MIN_SPAWN_INTERVAL_MS = 40;
const MAX_SPAWN_INTERVAL_MS = 120;
const NUM_SPAWNERS = 2; // Multiple independent spawners for randomness

export default class SliderParticles extends PureComponent<SliderParticlesProps, SliderParticlesState> {
  private nextId = 0;
  private spawnerTimers: NodeJS.Timeout[] = [];

  constructor(props: SliderParticlesProps) {
    super(props);
    this.state = {
      particles: [],
    };
  }

  componentDidUpdate(prevProps: SliderParticlesProps): void {
    // Start spawners when shouldSpawn becomes true
    if (!prevProps.shouldSpawn && this.props.shouldSpawn) {
      this.startSpawners();
    }

    // Stop spawners when shouldSpawn becomes false
    if (prevProps.shouldSpawn && !this.props.shouldSpawn) {
      this.stopSpawners();
    }
  }

  componentWillUnmount(): void {
    this.stopSpawners();
  }

  startSpawners(): void {
    // Start multiple independent spawners with random intervals
    for (let i = 0; i < NUM_SPAWNERS; i++) {
      this.scheduleNextSpawn();
    }
  }

  stopSpawners(): void {
    // Clear all spawner timers
    this.spawnerTimers.forEach(timer => clearTimeout(timer));
    this.spawnerTimers = [];
    // Clear all particles
    this.setState({ particles: [] });
  }

  scheduleNextSpawn(): void {
    const minSpawnInterval = this.props.spawnRate ?? MIN_SPAWN_INTERVAL_MS;
    const maxSpawnInterval = minSpawnInterval * 3; // Max is 3x the min
    const randomDelay = minSpawnInterval + Math.random() * (maxSpawnInterval - minSpawnInterval);

    const timer = setTimeout(() => {
      const maxParticles = this.props.maxCount ?? MAX_PARTICLES;
      if (this.props.shouldSpawn && this.state.particles.length < maxParticles) {
        this.spawnParticle();
      }
      // Schedule the next spawn if still active
      if (this.props.shouldSpawn) {
        this.scheduleNextSpawn();
      }
    }, randomDelay);

    this.spawnerTimers.push(timer);
  }

  spawnParticle(): void {
    const { knobX, knobY } = this.props;

    // Random velocity: fly LEFT like sparks being carved off with wide fan
    // Very slight upward bias to compensate for gravity pulling particles down
    const speedXMultiplier = this.props.speedX ?? 1.1;
    const speedYMultiplier = this.props.speedY ?? 2.0;
    const hueVariation = this.props.hueVariation ?? 30;

    const vx = -0.4 - Math.random() * speedXMultiplier; // -0.4 to -(0.4 + speedX) (wide speed variation)
    const vy = (Math.random() - 0.55) * speedYMultiplier; // Vertical spread controlled by speedY
    const hueOffset = Math.random() * hueVariation; // 0 to hueVariation degrees hue shift

    const particle: Particle = {
      id: this.nextId++,
      x: knobX,
      y: knobY,
      vx,
      vy,
      hueOffset,
    };

    this.setState((prevState) => ({
      particles: [...prevState.particles, particle],
    }));

    // Schedule particle removal after lifetime
    const lifetime = this.props.lifespan ?? PARTICLE_LIFETIME_MS;
    setTimeout(() => {
      this.setState((prevState) => ({
        particles: prevState.particles.filter(p => p.id !== particle.id),
      }));
    }, lifetime);
  }

  render(): React.ReactNode {
    const lifetime = this.props.lifespan ?? PARTICLE_LIFETIME_MS;
    const distanceMultiplier = lifetime / PARTICLE_LIFETIME_MS; // Scale distance to maintain velocity

    return (
      <div className="SliderParticles">
        {this.state.particles.map((particle) => (
          <div
            key={particle.id}
            className="SliderParticle"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              '--particle-vx': particle.vx,
              '--particle-vy': particle.vy,
              '--particle-hue': particle.hueOffset,
              '--particle-lifetime': `${lifetime}ms`,
              '--particle-distance-multiplier': distanceMultiplier,
            } as React.CSSProperties}
          />
        ))}
      </div>
    );
  }
}
