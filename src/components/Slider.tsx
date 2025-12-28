import React, { PureComponent } from 'react';
import autoBindReact from 'auto-bind/react';
import SliderParticles from './SliderParticles';

interface SliderProps {
  pos: number;
  onDrag: (pos: number) => void;
  onChange: (pos: number) => void;
  shouldSpawnParticles?: boolean; // Whether to spawn particles (during playback)
  pulseIntensity?: number; // Audio-reactive pulse intensity (0-1)

  // Particle settings (optional, passed to SliderParticles)
  particleSpawnRate?: number;
  particleLifespan?: number;
  particleMaxCount?: number;
  particleSpeedX?: number;
  particleSpeedY?: number;
  particleHueVariation?: number;
}

interface SliderState {
  dragging: boolean;
  draggedPos: number | null;
}

export default class Slider extends PureComponent<SliderProps, SliderState> {
  private node: React.RefObject<HTMLDivElement>;
  private knob: React.RefObject<HTMLDivElement>;
  private chisel: React.RefObject<HTMLDivElement>;

  constructor(props: SliderProps) {
    super(props);
    autoBindReact(this);

    this.node = React.createRef();
    this.knob = React.createRef();
    this.chisel = React.createRef();
    this.state = {
      dragging: false,
      draggedPos: null,
    };
  }

  onMouseMove(event: MouseEvent): void {
    if (this.state.dragging) {
      const node = this.node.current;
      const knob = this.knob.current;
      if (!node || !knob) return;

      const frac = (event.clientX - node.offsetLeft - knob.offsetWidth / 2) / node.offsetWidth;
      const pos = Math.max(Math.min(frac, 1), 0);
      this.setState({
        draggedPos: pos,
      });
      this.props.onDrag(pos);
    }
  }

  onMouseDown(event: React.MouseEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.persist();
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    this.setState({ dragging: true }, () => this.onMouseMove(event.nativeEvent));
  }

  onMouseUp(event: MouseEvent): void {
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    // Wait a moment to prevent 'snapback' (pos momentarily won't match draggedPos)
    setTimeout(() => {
      this.setState({ dragging: false });
    }, 150);
    const draggedPos = this.state.draggedPos;
    if (draggedPos !== null) {
      this.props.onChange(draggedPos);
    }
  }

  render(): React.ReactNode {
    const posValue = Math.max(Math.min((this.state.dragging ? this.state.draggedPos ?? this.props.pos : this.props.pos), 1), 0);
    const pos = posValue * 100 + '%';

    // Calculate chisel position in pixels for particles
    const node = this.node.current;
    const chisel = this.chisel.current;
    let knobX = 0;
    let knobY = 0;

    if (node && chisel) {
      // Chisel position relative to viewport
      const chiselRect = chisel.getBoundingClientRect();
      knobX = chiselRect.left + chiselRect.width / 2; // Center of chisel
      knobY = chiselRect.top + chiselRect.height / 2; // Center of chisel
    }

    const shouldSpawn = this.props.shouldSpawnParticles && !this.state.dragging;

    return (
      <div ref={this.node}
           className="Slider"
           onMouseDown={this.onMouseDown}>
        <div className="Slider-rail"/>
        <div className="Slider-fill" style={{width: pos}}/>
        <div className="Slider-chisel"
             ref={this.chisel}
             style={{left: pos}}/>
        <div className="Slider-knob"
             ref={this.knob}
             style={{left: pos}}/>
        <SliderParticles
          knobX={knobX}
          knobY={knobY}
          shouldSpawn={shouldSpawn}
          intensity={this.props.pulseIntensity ?? 0}
          spawnRate={this.props.particleSpawnRate}
          lifespan={this.props.particleLifespan}
          maxCount={this.props.particleMaxCount}
          speedX={this.props.particleSpeedX}
          speedY={this.props.particleSpeedY}
          hueVariation={this.props.particleHueVariation}
        />
      </div>
    );
  }
}
