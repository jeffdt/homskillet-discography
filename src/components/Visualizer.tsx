import Spectrogram, { DEFAULT_COLOR_PALETTE } from '../Spectrogram';
import React, { PureComponent } from 'react';
import { ColorPalette, VisualizerState, VisualizerProps } from '../types/visualizer';

const COLOR_PALETTES: ColorPalette[] = [
  {
    label: 'MW Green',
    colors: ['#101010', '#202020', '#66CB01', '#9BFE38', '#FEFEFE'],
  },
  {
    label: 'Game Genie',
    colors: DEFAULT_COLOR_PALETTE,
  },
  {
    label: 'Midnight',
    colors: ['#020024', '#090979', '#0f5a9e', '#0fd7b1', '#f2f2f2'],
  },
  {
    label: 'Sunset',
    colors: ['#020202', '#35012c', '#731630', '#ee4c2c', '#fde06f', '#fffce8'],
  },
  {
    label: 'Monochrome',
    colors: ['#050505', '#303030', '#606060', '#a0a0a0', '#f0f0f0'],
  },
];
const VIS_WIDTH = 448;

export default class Visualizer extends PureComponent<VisualizerProps, VisualizerState> {
  private spectrogram!: Spectrogram;
  private freqCanvasRef: React.RefObject<HTMLCanvasElement>;
  private specCanvasRef: React.RefObject<HTMLCanvasElement>;

  constructor(props: VisualizerProps) {
    super(props);

    this.state = {
      enabled: true,
      colorPalette: props.persistedSettings.visualizerTheme ?? 0,
    };

    this.freqCanvasRef = React.createRef();
    this.specCanvasRef = React.createRef();
  }

  componentDidMount() {
    // Only initialize spectrogram if chipCore is loaded
    if (!this.props.chipCore) return;

    this.spectrogram = new Spectrogram(
      this.props.chipCore,
      this.props.audioCtx,
      this.props.sourceNode,
      this.freqCanvasRef.current!,
      this.specCanvasRef.current!,
      null,
    );
    // Hardcode best quality settings
    this.spectrogram.setMode(2); // Constant Q - best quality
    this.spectrogram.setWeighting(1); // A-Weighting - natural sound
    this.spectrogram.setSpeed(2); // Medium speed
    this.spectrogram.setColorPalette(COLOR_PALETTES[this.state.colorPalette].colors);
  }

  componentDidUpdate(prevProps: VisualizerProps, prevState: VisualizerState) {
    // Initialize spectrogram if chipCore just became available
    if (!prevProps.chipCore && this.props.chipCore && !this.spectrogram) {
      this.spectrogram = new Spectrogram(
        this.props.chipCore,
        this.props.audioCtx,
        this.props.sourceNode,
        this.freqCanvasRef.current!,
        this.specCanvasRef.current!,
        null,
      );
      // Hardcode best quality settings
      this.spectrogram.setMode(2); // Constant Q
      this.spectrogram.setWeighting(1); // A-Weighting
      this.spectrogram.setSpeed(2); // Medium speed
      this.spectrogram.setColorPalette(COLOR_PALETTES[this.state.colorPalette].colors);
    }

    // Update theme if changed
    if (this.spectrogram && prevState.colorPalette !== this.state.colorPalette) {
      this.spectrogram.setColorPalette(COLOR_PALETTES[this.state.colorPalette].colors);
    }

    if (this.spectrogram) {
      this.spectrogram.setPaused(this.state.enabled ? this.props.paused : true);
    }
  }

  handleToggleVisualizer = (e: React.MouseEvent<HTMLInputElement>) => {
    const enabled = (e.target as HTMLInputElement).value === 'true';
    this.setState({enabled: enabled});
  };

  handleThemeClick = (themeIndex: number) => {
    this.setState({ colorPalette: themeIndex });
    this.props.onThemeChange(themeIndex);
  };

  render() {
    const enabledStyle: React.CSSProperties = {
      display: this.state.enabled ? 'block' : 'none',
      width: VIS_WIDTH,
      boxSizing: 'border-box',
    };
    return (
      <div className='Visualizer'>
        <h3 className='Visualizer-toggle'>
          Visualizer{' '}
          <input onClick={this.handleToggleVisualizer}
                 id='vis-on'
                 type='radio'
                 value={'true'}
                 defaultChecked={this.state.enabled === true}
                 name='visualizer-enabled'/>
          <label htmlFor='vis-on' className='inline'>On</label>
          <input onClick={this.handleToggleVisualizer}
                 id='vis-off'
                 type='radio'
                 value={'false'}
                 defaultChecked={this.state.enabled === false}
                 name='visualizer-enabled'/>
          <label htmlFor='vis-off' className='inline'>Off</label>
        </h3>
        <div className='Visualizer-options' style={enabledStyle}>
          <div className="Visualizer-themes">
            <h4>Theme</h4>
            <div className="Visualizer-theme-grid">
              {COLOR_PALETTES.map((palette, i) => (
                <div
                  key={`theme-${i}`}
                  className={`Visualizer-theme-card ${this.state.colorPalette === i ? 'selected' : ''}`}
                  onClick={() => this.handleThemeClick(i)}
                >
                  <div
                    className="Visualizer-theme-swatch"
                    style={{
                      background: `linear-gradient(to right, ${palette.colors.join(', ')})`
                    }}
                  />
                  <span className="Visualizer-theme-label">{palette.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <canvas style={enabledStyle} className='Visualizer-analyzer' width={VIS_WIDTH} height={60}
                ref={this.freqCanvasRef}/>
        <canvas style={enabledStyle} className='Visualizer-spectrogram' width={VIS_WIDTH} height={800}
                ref={this.specCanvasRef}/>
      </div>
    );
  }
}
