import React from 'react';
import autoBindReact from 'auto-bind/react';
import { AudioDataContext, AudioDataContextValue } from '../contexts/AudioDataContext';
import Slider from './Slider';

/** The knob and elapsed time move this often while playing (the label changes once a second anyway). */
const POSITION_MAX_FPS = 30;
const TIME_SLIDER_LOOP_ID = 'time-slider';
const pad = (n: number): string => (n < 10 ? '0' + n : String(n));

interface TimeSliderProps {
  paused: boolean;
  currentSongDurationMs: number;
  getCurrentPositionMs: () => number;
  onChange: (event: number) => void;
  /** Repeat is on: the track loops forever, so elapsed time runs past the nominal duration. */
  looping?: boolean;

  // Particle settings (optional, passed to Slider)
  particleEnabled?: boolean;
  particleSpawnRate?: number;
  particleLifespan?: number;
  particleBaseAngle?: number;
  particleAngleSpread?: number;
  particleSpeed?: number;
  particleSpeedVariance?: number;
  particleGravity?: number;
  particleFadeMode?: string;
}

interface TimeSliderState {
  draggedSongPositionMs: number;
}

/**
 * Seekable progress bar. While playing, a FrameLoop consumer moves the knob and rewrites the
 * elapsed label directly, so playback causes no React renders; React renders only on prop changes
 * and drags.
 */
export default class TimeSlider extends React.Component<TimeSliderProps, TimeSliderState> {
  static contextType = AudioDataContext;
  private positionMs: number;
  private removeFromLoop: (() => void) | null = null;
  private readonly slider = React.createRef<Slider>();
  private readonly elapsed = React.createRef<HTMLDivElement>();

  constructor(props: TimeSliderProps) {
    super(props);
    autoBindReact(this);
    this.state = { draggedSongPositionMs: -1 };
    this.positionMs = this.readPosition();
  }

  componentDidMount(): void {
    const { frameLoop } = this.context as AudioDataContextValue;
    this.removeFromLoop = frameLoop.add(TIME_SLIDER_LOOP_ID, this.sync, {
      maxFps: POSITION_MAX_FPS,
    });
  }

  /** Prop changes (pause, seek, track change) resync at once, even while the loop is stopped. */
  componentDidUpdate(): void {
    this.sync();
  }

  componentWillUnmount(): void {
    if (this.removeFromLoop) this.removeFromLoop();
  }

  /** Reads the position and moves the knob and elapsed label without rendering. */
  sync(): void {
    this.positionMs = this.readPosition();
    if (this.state.draggedSongPositionMs >= 0) return;
    if (this.slider.current) this.slider.current.showPosition(this.getSongPos());
    const label = this.elapsed.current;
    const text = this.getTime(this.positionMs);
    if (label && label.textContent !== text) label.textContent = text;
  }

  readPosition(): number {
    const { getCurrentPositionMs, currentSongDurationMs, looping } = this.props;
    const position = getCurrentPositionMs();
    return looping ? position : Math.min(position, currentSongDurationMs);
  }

  getSongPos(): number {
    return this.positionMs / this.props.currentSongDurationMs;
  }

  getTimeLabel(): string {
    const ms =
      this.state.draggedSongPositionMs >= 0 ? this.state.draggedSongPositionMs : this.positionMs;
    return this.getTime(ms);
  }

  getTime(ms: number): string {
    const sign = ms < 0 ? '-' : '';
    ms = Math.abs(ms);
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${sign}${min}:${pad(sec)}`;
  }

  handlePositionDrag(event: React.ChangeEvent<HTMLInputElement> | number): void {
    const pos =
      typeof event === 'number' ? event : event.target ? parseFloat(event.target.value) : 0;
    this.setState({ draggedSongPositionMs: pos * this.props.currentSongDurationMs });
  }

  handlePositionDrop(event: React.ChangeEvent<HTMLInputElement> | number): void {
    if (this.state.draggedSongPositionMs >= 0) this.positionMs = this.state.draggedSongPositionMs;
    this.setState({ draggedSongPositionMs: -1 });
    const pos =
      typeof event === 'number' ? event : event.target ? parseFloat(event.target.value) : 0;
    this.props.onChange(pos);
  }

  render(): React.ReactNode {
    return (
      <div className="TimeSlider">
        <Slider
          ref={this.slider}
          pos={this.getSongPos()}
          onDrag={this.handlePositionDrag}
          onChange={this.handlePositionDrop}
          shouldSpawnParticles={!this.props.paused && (this.props.particleEnabled ?? true)}
          particleSpawnRate={this.props.particleSpawnRate}
          particleLifespan={this.props.particleLifespan}
          particleBaseAngle={this.props.particleBaseAngle}
          particleAngleSpread={this.props.particleAngleSpread}
          particleSpeed={this.props.particleSpeed}
          particleSpeedVariance={this.props.particleSpeedVariance}
          particleGravity={this.props.particleGravity}
          particleFadeMode={this.props.particleFadeMode}
        />
        <div className="TimeSlider-labels">
          <div ref={this.elapsed}>{this.getTimeLabel()}</div>
          <div>
            {this.props.looping ? (
              <span aria-label="Loops forever">∞</span>
            ) : (
              this.getTime(this.props.currentSongDurationMs)
            )}
          </div>
        </div>
      </div>
    );
  }
}
