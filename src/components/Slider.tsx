import React, { PureComponent } from 'react';
import autoBindReact from 'auto-bind/react';
import SliderParticles from './SliderParticles';

interface SliderProps {
  pos: number;
  onDrag: (pos: number) => void;
  onChange: (pos: number) => void;
  shouldSpawnParticles?: boolean; // Whether to spawn particles (during playback)

  // Particle settings (optional, passed to SliderParticles)
  particleSpawnRate?: number;
  particleLifespan?: number;
  particleBaseAngle?: number;
  particleAngleSpread?: number;
  particleSpeed?: number;
  particleSpeedVariance?: number;
  particleGravity?: number;
  particleFadeMode?: string;
}

interface SliderState {
  dragging: boolean;
  draggedPos: number | null;
}

export default class Slider extends PureComponent<SliderProps, SliderState> {
  private node: React.RefObject<HTMLDivElement>;
  private knob: React.RefObject<HTMLDivElement>;
  private chisel: React.RefObject<HTMLDivElement>;
  private readonly fill = React.createRef<HTMLDivElement>();

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

      // Bounding rect, not offsetLeft: offsetLeft is relative to the nearest positioned ancestor.
      const rect = node.getBoundingClientRect();
      const frac = (event.clientX - rect.left - knob.offsetWidth / 2) / rect.width;
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

  /** Moves the fill, chisel and knob to pos (0..1) without rendering; ignored while dragging. */
  showPosition(pos: number): void {
    if (this.state.dragging) return;
    const left = `${Math.max(Math.min(pos, 1), 0) * 100}%`;
    if (this.fill.current) this.fill.current.style.width = left;
    if (this.chisel.current) this.chisel.current.style.left = left;
    if (this.knob.current) this.knob.current.style.left = left;
  }

  render(): React.ReactNode {
    const posValue = Math.max(
      Math.min(this.state.dragging ? (this.state.draggedPos ?? this.props.pos) : this.props.pos, 1),
      0
    );
    const pos = posValue * 100 + '%';
    const shouldSpawn = !!this.props.shouldSpawnParticles && !this.state.dragging;

    return (
      <div ref={this.node} className="Slider" onMouseDown={this.onMouseDown}>
        <div className="Slider-rail" />
        <div className="Slider-fill" ref={this.fill} style={{ width: pos }} />
        <div className="Slider-chisel" ref={this.chisel} style={{ left: pos }} />
        <div className="Slider-knob" ref={this.knob} style={{ left: pos }} />
        <SliderParticles
          anchor={this.chisel}
          shouldSpawn={shouldSpawn}
          spawnRate={this.props.particleSpawnRate}
          lifespan={this.props.particleLifespan}
          baseAngle={this.props.particleBaseAngle}
          angleSpread={this.props.particleAngleSpread}
          speed={this.props.particleSpeed}
          speedVariance={this.props.particleSpeedVariance}
          gravity={this.props.particleGravity}
          fadeMode={this.props.particleFadeMode}
        />
      </div>
    );
  }
}
