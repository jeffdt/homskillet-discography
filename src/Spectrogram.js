import autoBind from 'auto-bind';
import chroma from 'chroma-js';

const WEIGHTING_NONE = 0;
const WEIGHTING_A = 1;
const DEFAULT_COLOR_PALETTE = [
  '#000000',
  '#0000a0',
  '#6000a0',
  '#962761',
  '#dd1440',
  '#f0b000',
  '#ffffa0',
  '#ffffff',
];
const _debug = window.location.search.indexOf('debug=true') !== -1;
let _aWeightingLUT;
let _calcTime = 0;
let _totalTime = 0;
let _timeCount = 0;
let _lastTime = 0;

function _getAWeighting(f) {
  var f2 = f * f;
  return (
    (1.5 * 1.2588966 * 148840000 * f2 * f2) /
    ((f2 + 424.36) * Math.sqrt((f2 + 11599.29) * (f2 + 544496.41)) * (f2 + 148840000))
  );
}

export default class Spectrogram {
  constructor(
    chipCore,
    audioCtx,
    sourceNode,
    freqCanvas,
    specCanvas,
    pianoKeysImage,
    minDb = -90,
    maxDb = -30
  ) {
    autoBind(this);

    // Constant Q setup
    this.core = chipCore;
    const db = 32;
    const supersample = 0;
    const cqtBins = freqCanvas.width;
    //                MIDI note  16 ==   20.60 hz
    // Piano key  1 = MIDI note  21 ==   27.50 hz
    // Piano key 88 = MIDI note 108 == 4186.01 hz
    //                MIDI note 127 == 12543.8 hz
    const fMin = 25.95;
    const fMax = 4504.0;
    const cqtSize = this.core._cqt_init(audioCtx.sampleRate, cqtBins, db, fMin, fMax, supersample);
    if (!cqtSize) {
      console.error('Error initializing constant Q transform. Constant Q will be disabled.');
    } else {
      this.cqtFreqs = Array(cqtBins)
        .fill()
        .map((_, i) => this.core._cqt_bin_to_freq(i));
      _aWeightingLUT = this.cqtFreqs.map((f) => 0.5 + 0.5 * _getAWeighting(f));
    }
    this.cqtSize = cqtSize;
    this.dataPtr = this.core._malloc(cqtSize * 4);

    this.paused = true;
    this.weighting = WEIGHTING_NONE;
    this.horizontal = false; // Horizontal mode: frequency vertical, time horizontal (right-to-left)

    this.analyserNode = audioCtx.createAnalyser();
    sourceNode.connect(this.analyserNode);

    this.analyserNode.minDecibels = minDb;
    this.analyserNode.maxDecibels = maxDb;
    this.analyserNode.smoothingTimeConstant = 0.0;
    this.analyserNode.fftSize = this.cqtSize || 2048;

    this.freqCanvas = freqCanvas;
    this.specCanvas = specCanvas;
    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = this.specCanvas.width;
    this.tempCanvas.height = this.specCanvas.height;

    this.freqCtx = this.freqCanvas.getContext('2d', { alpha: true });
    this.specCtx = this.specCanvas.getContext('2d', { alpha: true });
    this.tempCtx = this.tempCanvas.getContext('2d', { alpha: true });
    this.setColorPalette(DEFAULT_COLOR_PALETTE);

    this.pianoKeysImage = pianoKeysImage;

    // Peak hold for frequency analyzer
    this.peakData = [];
    this.peakDecayRate = 0.95; // How fast peaks fall (0.95 = slow decay)

    this.updateFrame();
  }

  setPaused(paused) {
    if (this.paused && !paused) {
      requestAnimationFrame(this.updateFrame);
    }
    this.paused = paused;
  }

  setCanvasDimensions(width, height) {
    // Reinitialize CQT with new width
    this.cqtSize = this.core._cqt_init(
      this.audioCtx.sampleRate,
      width,
      this.params.minFreq,
      this.params.maxFreq,
      this.params.bpo
    );

    // Update analyzer fftSize
    this.analyserNode.fftSize = this.cqtSize;

    // Rebuild frequency array and A-weighting LUT
    this.cqtFreqs = Array.from({ length: width }, (_, i) => this.core._cqt_freq(i));
    this._buildAWeightingLUT();

    // Resize temp canvas
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;

    // Clear peak data array
    this.peakData = new Array(width).fill(0);
  }

  setWeighting(mode) {
    this.weighting = mode;
  }

  setSpeed(speed) {
    this.specSpeed = speed;
  }

  setHorizontal(horizontal) {
    this.horizontal = horizontal;
    // Sync temp canvas to spec canvas dimensions and clear all canvases
    this.syncTempCanvas();
  }

  // Sync temp canvas dimensions with spec canvas (call after resizing spec canvas)
  syncTempCanvas() {
    if (this.tempCanvas && this.specCanvas) {
      this.tempCanvas.width = this.specCanvas.width;
      this.tempCanvas.height = this.specCanvas.height;
      // Clear all canvases to start fresh after resize
      if (this.tempCtx) {
        this.tempCtx.clearRect(0, 0, this.tempCanvas.width, this.tempCanvas.height);
      }
      if (this.specCtx) {
        this.specCtx.clearRect(0, 0, this.specCanvas.width, this.specCanvas.height);
      }
      if (this.freqCtx) {
        this.freqCtx.clearRect(0, 0, this.freqCanvas.width, this.freqCanvas.height);
      }
      // Reset peak data since canvas dimensions changed
      this.peakData = [];
    }
  }

  setColorPalette(colors) {
    const palette = Array.isArray(colors) && colors.length >= 2 ? colors : DEFAULT_COLOR_PALETTE;
    this.colorMap = chroma.scale(palette).domain([0, 255]);
  }

  updateFrame() {
    if (this.paused) return;
    requestAnimationFrame(this.updateFrame);

    const _start = performance.now();

    if (this.horizontal) {
      this.updateFrameHorizontal();
    } else {
      this.updateFrameVertical();
    }

    const _end = performance.now();

    if (_debug) {
      _totalTime += _end - _start;
      _timeCount++;
      if (_timeCount >= 200) {
        console.log(
          '[Viz] %s ms total (%s fps)',
          (_totalTime / _timeCount).toFixed(2),
          ((1000 * _timeCount) / (_end - _lastTime)).toFixed(1)
        );
        _timeCount = 0;
        _totalTime = 0;
        _lastTime = _start;
      }
    }
  }

  // Vertical mode: frequency on X-axis, time flows top-to-bottom
  updateFrameVertical() {
    const fqHeight = this.freqCanvas.height;
    const canvasWidth = this.freqCanvas.width;
    const hCoeff = fqHeight / 256.0;
    const specSpeed = this.specSpeed;
    const analyserNode = this.analyserNode;
    const freqCtx = this.freqCtx;
    const tempCtx = this.tempCtx;

    // Clear canvases
    freqCtx.clearRect(0, 0, this.freqCanvas.width, this.freqCanvas.height);
    tempCtx.clearRect(0, 0, this.tempCanvas.width, specSpeed);

    // Draw note-based frequency band columns (piano roll style)
    if (this.cqtFreqs) {
      const freqToMidi = (freq) => 12 * Math.log2(freq / 440) + 69;
      let currentNote = -1;
      let bandStart = 0;
      const colors = ['#101010', '#181818'];
      let colorIndex = 0;

      for (let x = 0; x < canvasWidth; x++) {
        const freq = this.cqtFreqs[x];
        const midiNote = Math.round(freqToMidi(freq));
        if (midiNote !== currentNote) {
          if (currentNote !== -1) {
            freqCtx.fillStyle = colors[colorIndex % 2];
            freqCtx.fillRect(bandStart, 0, x - bandStart, fqHeight);
            colorIndex++;
          }
          currentNote = midiNote;
          bandStart = x;
        }
      }
      freqCtx.fillStyle = colors[colorIndex % 2];
      freqCtx.fillRect(bandStart, 0, canvasWidth - bandStart, fqHeight);
    }

    const dataHeap = new Float32Array(this.core.HEAPF32.buffer, this.dataPtr, this.cqtSize);
    analyserNode.getFloatTimeDomainData(dataHeap);

    if (!dataHeap.every((n) => n === 0)) {
      this.core._cqt_calc(this.dataPtr, this.dataPtr);
      this.core._cqt_render_line(this.dataPtr);

      for (let x = 0; x < canvasWidth; x++) {
        const weighting = this.weighting === WEIGHTING_A ? _aWeightingLUT[x] : 1;
        const val = (255 * weighting * dataHeap[x]) | 0;
        const h = (val * hCoeff) | 0;
        const style = this.colorMap(val).hex();

        // Update peak hold
        if (!this.peakData[x] || val > this.peakData[x]) {
          this.peakData[x] = val;
        } else {
          this.peakData[x] *= this.peakDecayRate;
        }

        // Draw frequency bar (grows upward)
        freqCtx.fillStyle = style;
        freqCtx.fillRect(x, fqHeight - h, 1, h);

        // Draw peak hold indicator
        const peakH = (this.peakData[x] * hCoeff) | 0;
        freqCtx.fillStyle = this.colorMap(this.peakData[x]).hex();
        freqCtx.fillRect(x, fqHeight - peakH, 1, 2);

        // Draw to temp canvas for waterfall
        tempCtx.fillStyle = style;
        tempCtx.fillRect(x, 0, 1, specSpeed);
      }
    }

    // Scroll waterfall downward
    tempCtx.translate(0, specSpeed);
    tempCtx.drawImage(this.tempCanvas, 0, 0);
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.specCtx.drawImage(this.tempCanvas, 0, 0);
  }

  // Horizontal mode: frequency on Y-axis (low at bottom), time flows right-to-left
  updateFrameHorizontal() {
    const fqWidth = this.freqCanvas.width;
    const wCoeff = fqWidth / 256.0;
    const specSpeed = this.specSpeed;
    const analyserNode = this.analyserNode;
    const freqCtx = this.freqCtx;
    const tempCtx = this.tempCtx;
    // Use tempCanvas dimensions for spectrogram
    const tempWidth = this.tempCanvas.width;
    const tempHeight = this.tempCanvas.height;
    // Both canvases should have same height for alignment
    const canvasHeight = this.freqCanvas.height;

    // Clear analyzer canvas with solid dark background
    freqCtx.fillStyle = '#101010';
    freqCtx.fillRect(0, 0, this.freqCanvas.width, this.freqCanvas.height);

    const dataHeap = new Float32Array(this.core.HEAPF32.buffer, this.dataPtr, this.cqtSize);
    analyserNode.getFloatTimeDomainData(dataHeap);

    if (!dataHeap.every((n) => n === 0)) {
      this.core._cqt_calc(this.dataPtr, this.dataPtr);
      this.core._cqt_render_line(this.dataPtr);

      // Number of CQT frequency bins (output of constant Q transform)
      // Use same bin count for both analyzer and spectrogram so frequencies align
      const numBins = this.cqtFreqs.length;

      // Calculate height per frequency band for each canvas
      // Add 1 pixel overlap to ensure no gaps from rounding
      const analyzerBinHeight = Math.ceil(canvasHeight / numBins) + 1;
      const specBinHeight = Math.ceil(tempHeight / numBins) + 1;

      // Draw analyzer bars and spectrogram column in same loop
      for (let i = 0; i < numBins; i++) {
        const weighting = this.weighting === WEIGHTING_A ? _aWeightingLUT[i] : 1;
        const val = (255 * weighting * dataHeap[i]) | 0;
        const style = this.colorMap(val).hex();

        // Update peak hold
        if (!this.peakData[i] || val > this.peakData[i]) {
          this.peakData[i] = val;
        } else {
          this.peakData[i] *= this.peakDecayRate;
        }

        // Map frequency bin to y position (low freq at bottom, high at top)
        // Use same formula for both so frequencies align
        const analyzerY = canvasHeight - Math.ceil(((i + 1) / numBins) * canvasHeight);
        const specY = tempHeight - Math.ceil(((i + 1) / numBins) * tempHeight);

        // Draw analyzer frequency bar (grows rightward from left edge)
        const w = (val * wCoeff) | 0;
        freqCtx.fillStyle = style;
        freqCtx.fillRect(0, analyzerY, w, analyzerBinHeight);

        // Draw analyzer peak hold indicator
        const peakW = (this.peakData[i] * wCoeff) | 0;
        freqCtx.fillStyle = this.colorMap(this.peakData[i]).hex();
        freqCtx.fillRect(peakW - 2, analyzerY, 2, analyzerBinHeight);

        // Draw spectrogram pixel
        tempCtx.fillStyle = style;
        tempCtx.fillRect(tempWidth - specSpeed, specY, specSpeed, specBinHeight);
      }
    }

    // Scroll waterfall leftward (shift existing content left, new data on right)
    tempCtx.translate(-specSpeed, 0);
    tempCtx.drawImage(this.tempCanvas, 0, 0);
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);
    // Clear the right edge where new data will be drawn next frame
    tempCtx.clearRect(tempWidth - specSpeed, 0, specSpeed, tempHeight);
    this.specCtx.drawImage(this.tempCanvas, 0, 0);
  }
}

// getFloatTimeDomainData polyfill for Safari
if (window.AnalyserNode && !window.AnalyserNode.prototype.getFloatTimeDomainData) {
  var uint8 = new Uint8Array(32768);
  window.AnalyserNode.prototype.getFloatTimeDomainData = function (array) {
    this.getByteTimeDomainData(uint8);
    for (var i = 0, imax = array.length; i < imax; i++) {
      array[i] = (uint8[i] - 128) * 0.0078125;
    }
  };
}

export { DEFAULT_COLOR_PALETTE };
