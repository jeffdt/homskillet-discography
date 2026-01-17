import React from 'react';
import Slider from './Slider';
import autoBindReact from 'auto-bind/react';
import { useAudioPulse } from '../contexts/AudioPulseContext';

//  46 ms = 2048/44100 sec or 21.7 fps
// 400 ms = 2.5 fps
const UPDATE_INTERVAL_MS = 100;
const pad = (n: number): string => (n < 10 ? '0' + n : String(n));

interface TimeSliderProps {
  paused: boolean;
  currentSongDurationMs: number;
  getCurrentPositionMs: () => number;
  onChange: (event: number) => void;

  // Particle settings (optional, passed to Slider)
  particleEnabled?: boolean;
  particleSpawnRate?: number;
  particleLifespan?: number;
  particleBaseAngle?: number;
  particleAngleSpread?: number;
  particleSpeed?: number;
  particleSpeedVariance?: number;
  particleGravity?: number;
  particleHueVariation?: number;
  particleFadeMode?: string;
}

interface TimeSliderState {
  draggedSongPositionMs: number;
  currentSongPositionMs: number;
}

export default class TimeSlider extends React.Component<TimeSliderProps, TimeSliderState> {
  private timer: NodeJS.Timeout | null = null;

  constructor(props: TimeSliderProps) {
    super(props);
    autoBindReact(this);

    this.state = {
      draggedSongPositionMs: -1,
      currentSongPositionMs: 0,
    };
  }

  componentDidUpdate(prevProps: TimeSliderProps): void {
    if (prevProps.paused === true && this.props.paused === false) {
      this.timer = setInterval(() => {
        const { getCurrentPositionMs, currentSongDurationMs } = this.props;
        this.setState({
          currentSongPositionMs: Math.min(getCurrentPositionMs(), currentSongDurationMs),
        });
      }, UPDATE_INTERVAL_MS);
    } else if (prevProps.paused === false && this.props.paused === true) {
      if (this.timer) {
        clearInterval(this.timer);
      }
    }
  }

  componentWillUnmount(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  getSongPos(): number {
    return this.state.currentSongPositionMs / this.props.currentSongDurationMs;
  }

  getTimeLabel(): string {
    const val =
      this.state.draggedSongPositionMs >= 0
        ? this.state.draggedSongPositionMs
        : this.state.currentSongPositionMs;
    return this.getTime(val);
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
    // Update current time position label
    this.setState({
      draggedSongPositionMs: pos * this.props.currentSongDurationMs,
    });
  }

  handlePositionDrop(event: React.ChangeEvent<HTMLInputElement> | number): void {
    this.setState({
      draggedSongPositionMs: -1,
      currentSongPositionMs: this.state.draggedSongPositionMs,
    });
    const pos =
      typeof event === 'number' ? event : event.target ? parseFloat(event.target.value) : 0;
    this.props.onChange(pos);
  }

  render(): React.ReactNode {
    return (
      <div className="TimeSlider">
        <Slider
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
          particleHueVariation={this.props.particleHueVariation}
          particleFadeMode={this.props.particleFadeMode}
        />
        <div className="TimeSlider-labels">
          <div>{this.getTimeLabel()}</div>
          <div>{this.getTime(this.props.currentSongDurationMs)}</div>
        </div>
      </div>
    );
  }
}
