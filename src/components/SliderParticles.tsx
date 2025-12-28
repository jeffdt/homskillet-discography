import React, { PureComponent } from 'react';

interface Particle {
  id: number;
  x: number; // Starting X position (pixels from left)
  y: number; // Starting Y position (pixels from top)
  vx: number; // Velocity X (-1 to 1)
  vy: number; // Velocity Y (-1 to 1)
  gravity: number; // Gravity strength (0-2)
  hueOffset: number; // Slight hue variation (0-30)
  startTime: number; // Animation start time (ms)
  lifetime: number; // Particle lifetime (ms)
}

interface SliderParticlesProps {
  knobX: number; // Knob X position in pixels
  knobY: number; // Knob Y position in pixels
  shouldSpawn: boolean; // Whether to spawn particles (only during playback, not dragging)
  intensity: number; // Audio intensity (0-1) affects spawn rate, speed, and brightness

  // Settings (all optional with defaults)
  spawnRate?: number; // Min spawn interval in ms (lower = faster)
  lifespan?: number; // Particle lifetime in ms
  baseAngle?: number; // Base angle in degrees (0=right, 90=down, 180=left, 270=up)
  angleSpread?: number; // Angle spread in degrees (cone width)
  speed?: number; // Speed multiplier
  speedVariance?: number; // Speed variance percentage (0-100)
  gravity?: number; // Gravity strength (0=none, 1=normal, 2=strong)
  hueVariation?: number; // Hue variation in degrees
}

interface SliderParticlesState {
  particles: Particle[];
  animationTime: number; // Current animation time for RAF updates
}

const MAX_PARTICLES = 15;
const PARTICLE_LIFETIME_MS = 600;
const MIN_SPAWN_INTERVAL_MS = 40;
const MAX_SPAWN_INTERVAL_MS = 120;
const NUM_SPAWNERS = 2; // Multiple independent spawners for randomness

export default class SliderParticles extends PureComponent<SliderParticlesProps, SliderParticlesState> {
  private nextId = 0;
  private spawnerTimers: NodeJS.Timeout[] = [];
  private animationFrameId: number | null = null;

  constructor(props: SliderParticlesProps) {
    super(props);
    this.state = {
      particles: [],
      animationTime: performance.now(),
    };
  }

  componentDidMount(): void {
    this.startAnimationLoop();
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
    this.stopAnimationLoop();
  }

  startAnimationLoop(): void {
    const animate = () => {
      const now = performance.now();
      // Remove expired particles and update animation time
      this.setState((prevState) => ({
        particles: prevState.particles.filter(p => (now - p.startTime) < p.lifetime),
        animationTime: now,
      }));
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
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
      if (this.props.shouldSpawn) {
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

    // Get settings with defaults
    const baseAngle = this.props.baseAngle ?? 180;
    const angleSpread = this.props.angleSpread ?? 30;
    const baseSpeed = this.props.speed ?? 1.0;
    const speedVariance = this.props.speedVariance ?? 20;
    const gravity = this.props.gravity ?? 0.5;
    const hueVariation = this.props.hueVariation ?? 30;

    // Calculate random angle: baseAngle ± angleSpread
    const angleOffset = (Math.random() - 0.5) * 2 * angleSpread; // Random ±angleSpread
    const angleDegrees = baseAngle + angleOffset;
    const angleRadians = (angleDegrees * Math.PI) / 180;

    // Calculate random speed with variance
    const speedVarianceFactor = 1 + (Math.random() - 0.5) * 2 * (speedVariance / 100);
    const speed = baseSpeed * speedVarianceFactor;

    // Convert angle and speed to velocity components
    const vx = Math.cos(angleRadians) * speed;
    const vy = Math.sin(angleRadians) * speed;

    const hueOffset = Math.random() * hueVariation;
    const lifetime = this.props.lifespan ?? PARTICLE_LIFETIME_MS;

    const particle: Particle = {
      id: this.nextId++,
      x: knobX,
      y: knobY,
      vx,
      vy,
      gravity,
      hueOffset,
      startTime: performance.now(),
      lifetime,
    };

    this.setState((prevState) => ({
      particles: [...prevState.particles, particle],
    }));
  }

  render(): React.ReactNode {
    const now = this.state.animationTime;

    return (
      <div className="SliderParticles">
        {this.state.particles.map((particle) => {
          // Calculate elapsed time in seconds
          const elapsedMs = now - particle.startTime;
          const t = elapsedMs / 1000;

          // Physics: position = initial + velocity*time + 0.5*gravity*time^2
          const pixelScale = 80; // Base distance scale
          const x = particle.x + particle.vx * pixelScale * t;
          const y = particle.y + particle.vy * pixelScale * t + 0.5 * particle.gravity * pixelScale * t * t;

          // Calculate opacity fade (1.0 at start, 0.0 at end)
          const progress = elapsedMs / particle.lifetime;
          const opacity = Math.max(0, 1 - progress);

          return (
            <div
              key={particle.id}
              className="SliderParticle"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                opacity,
              }}
            />
          );
        })}
      </div>
    );
  }
}
