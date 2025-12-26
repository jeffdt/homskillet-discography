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
  // Tuning parameters (optional, will use defaults if not provided)
  intenseInterval?: number;  // Spawn interval at max intensity (ms)
  quietInterval?: number;    // Spawn interval at min intensity (ms)
  minSpeed?: number;
  maxSpeed?: number;
  maxParticles?: number;
}

interface SliderParticlesState {
  particles: Particle[];
}

// Default values (can be overridden via props)
const DEFAULT_MAX_PARTICLES = 20;
const PARTICLE_LIFETIME_MS = 600;
const DEFAULT_INTENSE_INTERVAL_MS = 15;  // Spawn every 15ms at max intensity
const DEFAULT_QUIET_INTERVAL_MS = 100;   // Spawn every 100ms at min intensity
const DEFAULT_MIN_SPEED = 0.8;
const DEFAULT_MAX_SPEED = 1.65;
const NUM_SPAWNERS = 2; // Multiple independent spawners for varied timing

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
    // Modulate spawn rate based on intensity using linear interpolation
    // intensity 0.0 -> quietInterval (slow spawning)
    // intensity 1.0 -> intenseInterval (fast spawning)
    const intensity = this.props.intensity;

    // Use props or defaults
    const intenseInterval = this.props.intenseInterval ?? DEFAULT_INTENSE_INTERVAL_MS;
    const quietInterval = this.props.quietInterval ?? DEFAULT_QUIET_INTERVAL_MS;
    const maxParticles = this.props.maxParticles ?? DEFAULT_MAX_PARTICLES;

    // Interpolate between quiet and intense intervals
    // Higher intensity = shorter interval (faster spawning)
    const spawnInterval = quietInterval - (intensity * (quietInterval - intenseInterval));

    const timer = setTimeout(() => {
      if (this.props.shouldSpawn && this.state.particles.length < maxParticles) {
        this.spawnParticle();
      }
      // Schedule the next spawn if still active
      if (this.props.shouldSpawn) {
        this.scheduleNextSpawn();
      }
    }, spawnInterval);

    this.spawnerTimers.push(timer);
  }

  spawnParticle(): void {
    const { knobX, knobY, intensity } = this.props;

    // Use props or defaults for speed
    const minSpeed = this.props.minSpeed ?? DEFAULT_MIN_SPEED;
    const maxSpeed = this.props.maxSpeed ?? DEFAULT_MAX_SPEED;

    // Modulate velocity based on intensity
    const speedMultiplier = minSpeed + (intensity * (maxSpeed - minSpeed));

    // Random velocity: fly LEFT like sparks being carved off with wide fan
    // Very slight upward bias to compensate for gravity pulling particles down
    const baseVx = -0.4 - Math.random() * 1.1; // -0.4 to -1.5
    const baseVy = (Math.random() - 0.55) * 2.0; // -1.1 to 0.9
    const vx = baseVx * speedMultiplier;
    const vy = baseVy * speedMultiplier;

    // Static bright green color (no hue variation based on intensity)
    const hueOffset = Math.random() * 15; // Slight green variation only

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
    setTimeout(() => {
      this.setState((prevState) => ({
        particles: prevState.particles.filter(p => p.id !== particle.id),
      }));
    }, PARTICLE_LIFETIME_MS);
  }

  render(): React.ReactNode {
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
            } as React.CSSProperties}
          />
        ))}
      </div>
    );
  }
}
