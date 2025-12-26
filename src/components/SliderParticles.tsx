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
    const randomDelay = MIN_SPAWN_INTERVAL_MS + Math.random() * (MAX_SPAWN_INTERVAL_MS - MIN_SPAWN_INTERVAL_MS);

    const timer = setTimeout(() => {
      if (this.props.shouldSpawn && this.state.particles.length < MAX_PARTICLES) {
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
    const vx = -0.4 - Math.random() * 1.1; // -0.4 to -1.5 (wide speed variation)
    const vy = (Math.random() - 0.55) * 2.0; // -1.1 to 0.9 (very slight upward bias, gravity brings them to center)
    const hueOffset = Math.random() * 30; // 0-30 degrees hue shift

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
