import Spectrogram from '../Spectrogram';
import React, { PureComponent } from 'react';
import { ColorPalette, VisualizerState, VisualizerProps } from '../types/visualizer';
import { VISUALIZER_PALETTES as COLOR_PALETTES } from '../config/visualizerPalettes';

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
