import Spectrogram, { DEFAULT_COLOR_PALETTE } from '../Spectrogram';
import React, { PureComponent } from 'react';
import { ColorPalette, VisualizerState, VisualizerProps } from '../types/visualizer';

const COLOR_PALETTES: ColorPalette[] = [
  // MW Palettes
  {
    label: 'MW Green',
    colors: ['#101010', '#202020', '#66CB01', '#9BFE38', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'MW Yellow',
    colors: ['#101010', '#202020', '#FFBB3E', '#EFE903', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'MW Blue',
    colors: ['#101010', '#202020', '#009FF4', '#66CAFF', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'MW Pink',
    colors: ['#101010', '#202020', '#FF6A9B', '#FFAEC9', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'MW Red',
    colors: ['#101010', '#202020', '#DA0205', '#F0424A', '#FEFEFE', '#FEFEFE'],
  },
  // bz Palettes
  {
    label: 'bz chrome',
    colors: ['#101010', '#000000', '#707070', '#bbbbbb', '#e0e0e0', '#FEFEFE'],
  },
  {
    label: 'bz Negative',
    colors: ['#e0e0e0', '#bbbbbb', '#707070', '#101010', '#101010', '#000000'],
  },
  {
    label: 'bz Moss',
    colors: ['#101010', '#204631', '#538140', '#afc33e', '#d6e896', '#FEFEFE'],
  },
  {
    label: 'bz Olive',
    colors: ['#101010', '#353928', '#626949', '#919a6d', '#bfc5ab', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Desert',
    colors: ['#101010', '#393929', '#7b7363', '#b5a56b', '#e7d69c', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Vapor',
    colors: ['#101010', '#314a63', '#ff5f29', '#ffd69c', '#73c6c6', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Autumn',
    colors: ['#101010', '#301800', '#804000', '#f8b888', '#f8e8e0', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Ocean',
    colors: ['#101010', '#082048', '#486878', '#90c8c8', '#f8f8b8', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Wheat',
    colors: ['#101010', '#405028', '#808840', '#b8c058', '#f8f8c8', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Lime',
    colors: ['#101010', '#081800', '#488818', '#78c838', '#e0f8a0', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Sunset',
    colors: ['#101010', '#301850', '#a82820', '#d89048', '#f8e8c8', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Inferno',
    colors: ['#101010', '#500058', '#f83000', '#f8e850', '#f8f8f8', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Twilight',
    colors: ['#101010', '#282898', '#7830e8', '#e88888', '#f8c0f8', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Emerald',
    colors: ['#101010', '#042022', '#083e34', '#085826', '#5c6b00', '#FEFEFE', '#FEFEFE'],
  },
  {
    label: 'bz Lavender',
    colors: ['#101010', '#301850', '#7a5da5', '#e7d69c', '#f8f8b8', '#FEFEFE', '#FEFEFE'],
  },
  // Misc Palettes
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
];
const VIS_WIDTH = 448;

export default class Visualizer extends PureComponent<VisualizerProps, VisualizerState> {
  private spectrogram!: Spectrogram;
  private freqCanvasRef: React.RefObject<HTMLCanvasElement>;
  private specCanvasRef: React.RefObject<HTMLCanvasElement>;
  private containerRef: React.RefObject<HTMLDivElement>;

  constructor(props: VisualizerProps) {
    super(props);

    this.state = {
      enabled: true,
      colorPalette: props.persistedSettings.visualizerTheme ?? 0,
      isMaximized: false,
    };

    this.freqCanvasRef = React.createRef();
    this.specCanvasRef = React.createRef();
    this.containerRef = React.createRef();
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
      null
    );
    // Hardcode best quality settings
    this.spectrogram.setWeighting(1); // A-Weighting - natural sound
    this.spectrogram.setSpeed(2); // Medium speed
    this.spectrogram.setColorPalette(COLOR_PALETTES[this.state.colorPalette].colors);
    this.spectrogram.setPeakDecayRate(this.props.persistedSettings.peakDecayRate ?? 0.98);
    this.spectrogram.setPeakQuantization(this.props.persistedSettings.peakQuantization ?? 4);
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
        null
      );
      // Hardcode best quality settings
      this.spectrogram.setWeighting(1); // A-Weighting
      this.spectrogram.setSpeed(2); // Medium speed
      this.spectrogram.setColorPalette(COLOR_PALETTES[this.state.colorPalette].colors);
      this.spectrogram.setPeakDecayRate(this.props.persistedSettings.peakDecayRate ?? 0.98);
      this.spectrogram.setPeakQuantization(this.props.persistedSettings.peakQuantization ?? 4);
    }

    // Update theme if changed
    if (this.spectrogram && prevState.colorPalette !== this.state.colorPalette) {
      this.spectrogram.setColorPalette(COLOR_PALETTES[this.state.colorPalette].colors);
    }

    // Update peak decay rate if changed
    if (
      this.spectrogram &&
      prevProps.persistedSettings.peakDecayRate !== this.props.persistedSettings.peakDecayRate
    ) {
      this.spectrogram.setPeakDecayRate(this.props.persistedSettings.peakDecayRate ?? 0.98);
    }

    // Update peak quantization if changed
    if (
      this.spectrogram &&
      prevProps.persistedSettings.peakQuantization !== this.props.persistedSettings.peakQuantization
    ) {
      this.spectrogram.setPeakQuantization(this.props.persistedSettings.peakQuantization ?? 4);
    }

    if (this.spectrogram) {
      this.spectrogram.setPaused(this.state.enabled ? this.props.paused : true);
    }
  }

  handleToggleVisualizer = (e: React.MouseEvent<HTMLInputElement>) => {
    const enabled = (e.target as HTMLInputElement).value === 'true';
    this.setState({ enabled: enabled });
  };

  handleThemeClick = (themeIndex: number) => {
    this.setState({ colorPalette: themeIndex });
    this.props.onThemeChange(themeIndex);
  };

  handleToggleThemes = () => {
    const newState = !this.props.persistedSettings.visualizerThemesExpanded;
    this.props.onThemesExpandedChange(newState);
  };

  handleMaximizeToggle = () => {
    const newMaximized = !this.state.isMaximized;
    this.setState({ isMaximized: newMaximized });
    this.props.onMaximizedChange(newMaximized);

    // Update spectrogram mode and canvas dimensions after state change
    // Use longer timeout to ensure React has applied the CSS class changes
    setTimeout(() => {
      if (!this.spectrogram) return;

      const { analyzerWidth, analyzerHeight, spectrogramWidth, spectrogramHeight } =
        this.calculateDimensions(newMaximized);

      // Set canvas dimensions FIRST
      if (this.freqCanvasRef.current) {
        this.freqCanvasRef.current.width = analyzerWidth;
        this.freqCanvasRef.current.height = analyzerHeight;
      }

      if (this.specCanvasRef.current) {
        this.specCanvasRef.current.width = spectrogramWidth;
        this.specCanvasRef.current.height = spectrogramHeight;
      }

      // THEN switch mode (which syncs temp canvas to the new dimensions)
      this.spectrogram.setHorizontal(newMaximized);
    }, 50);
  };

  calculateDimensions = (isMaximized: boolean) => {
    if (isMaximized) {
      // Horizontal mode: analyzer on right (seismograph), spectrogram on left
      // Get actual container dimensions from the DOM
      const container = this.containerRef.current;
      const containerWidth = container?.offsetWidth || window.innerWidth;
      const containerHeight = container?.offsetHeight || 400;

      // Analyzer: small width, full height (frequency on Y-axis)
      const analyzerWidth = 64;
      const analyzerHeight = containerHeight;

      // Spectrogram: remaining width + 1px overlap to close gap, full height
      const spectrogramWidth = containerWidth - analyzerWidth + 1;
      const spectrogramHeight = containerHeight;

      return { analyzerWidth, analyzerHeight, spectrogramWidth, spectrogramHeight };
    } else {
      // Normal vertical mode: analyzer on top, spectrogram below
      return {
        analyzerWidth: VIS_WIDTH, // 448
        analyzerHeight: 60,
        spectrogramWidth: VIS_WIDTH, // 448
        spectrogramHeight: 800,
      };
    }
  };

  render() {
    // Calculate dimensions once for reuse
    const dims = this.calculateDimensions(this.state.isMaximized);
    const { analyzerWidth, analyzerHeight, spectrogramWidth, spectrogramHeight } = dims;

    // Style for canvases
    const canvasStyle: React.CSSProperties = {
      display: this.state.enabled ? 'block' : 'none',
    };

    // Style for options panel - hide if disabled OR in maximized mode
    const optionsStyle: React.CSSProperties = {
      display: this.state.enabled && !this.state.isMaximized ? 'block' : 'none',
      width: VIS_WIDTH,
      boxSizing: 'border-box',
    };

    // In maximized mode, layout is horizontal (spectrogram left, analyzer right - seismograph style)
    // In normal mode, layout is vertical (analyzer top, spectrogram bottom)
    const canvasInnerStyle: React.CSSProperties = this.state.isMaximized
      ? { display: 'flex', flexDirection: 'row-reverse' }
      : { display: 'flex', flexDirection: 'column' };

    return (
      <div
        ref={this.containerRef}
        className={`Visualizer ${this.state.isMaximized ? 'maximized' : ''}`}
      >
        <h3 className="Visualizer-toggle">
          Visualizer{' '}
          <input
            onClick={this.handleToggleVisualizer}
            id="vis-on"
            type="radio"
            value={'true'}
            defaultChecked={this.state.enabled === true}
            name="visualizer-enabled"
          />
          <label htmlFor="vis-on" className="inline">
            On
          </label>
          <input
            onClick={this.handleToggleVisualizer}
            id="vis-off"
            type="radio"
            value={'false'}
            defaultChecked={this.state.enabled === false}
            name="visualizer-enabled"
          />
          <label htmlFor="vis-off" className="inline">
            Off
          </label>
          <button
            className="Visualizer-maximize-btn"
            onClick={this.handleMaximizeToggle}
            title={this.state.isMaximized ? 'Exit Maximized' : 'Maximize'}
          >
            {this.state.isMaximized ? '⊗' : '⛶'}
          </button>
        </h3>
        <div className="Visualizer-options" style={optionsStyle}>
          <div className="Visualizer-themes">
            <h4 onClick={this.handleToggleThemes}>
              <span
                className={`Visualizer-themes-arrow ${
                  this.props.persistedSettings.visualizerThemesExpanded ? 'expanded' : ''
                }`}
              >
                ▸
              </span>
              Palette
            </h4>
            <div
              className={`Visualizer-themes-content ${
                this.props.persistedSettings.visualizerThemesExpanded ? 'expanded' : ''
              }`}
            >
              <div className="Visualizer-theme-grid">
                {COLOR_PALETTES.map((palette, i) => (
                  <div
                    key={`theme-${i}`}
                    className={`Visualizer-theme-card ${this.state.colorPalette === i ? 'selected' : ''} ${i === 5 || i === 20 ? 'Visualizer-theme-card-new-row' : ''}`}
                    onClick={() => this.handleThemeClick(i)}
                  >
                    <div className="Visualizer-theme-swatch">
                      {palette.colors.slice(0, -1).map((color, colorIndex) => (
                        <div
                          key={`color-${colorIndex}`}
                          className="Visualizer-theme-pixel"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="Visualizer-theme-label">{palette.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="Visualizer-canvases">
          <div className="Visualizer-canvases-inner" style={canvasInnerStyle}>
            <canvas
              style={canvasStyle}
              className="Visualizer-analyzer"
              width={analyzerWidth}
              height={analyzerHeight}
              ref={this.freqCanvasRef}
            />
            <canvas
              style={canvasStyle}
              className="Visualizer-spectrogram"
              width={spectrogramWidth}
              height={spectrogramHeight}
              ref={this.specCanvasRef}
            />
          </div>
        </div>
      </div>
    );
  }
}
