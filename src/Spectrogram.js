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

  setWeighting(mode) {
    this.weighting = mode;
  }

  setSpeed(speed) {
    this.specSpeed = speed;
  }

  setColorPalette(colors) {
    const palette = Array.isArray(colors) && colors.length >= 2 ? colors : DEFAULT_COLOR_PALETTE;
    this.colorMap = chroma.scale(palette).domain([0, 255]);
  }

  setPeakDecayRate(rate) {
    this.peakDecayRate = rate;
  }

  updateFrame() {
    if (this.paused) return;
    requestAnimationFrame(this.updateFrame);

    const fqHeight = this.freqCanvas.height;
    const canvasWidth = this.freqCanvas.width;
    const hCoeff = fqHeight / 256.0;
    const specSpeed = this.specSpeed;
    const data = this.byteFrequencyData;
    const analyserNode = this.analyserNode;
    const freqCtx = this.freqCtx;
    //const specCtx = this.specCtx;
    const tempCtx = this.tempCtx;
    // Clear canvases - let transparent background show the natural UI background
    freqCtx.clearRect(0, 0, this.freqCanvas.width, this.freqCanvas.height);
    tempCtx.clearRect(0, 0, this.tempCanvas.width, specSpeed);

    // Draw note-based frequency band columns (piano roll style)
    if (this.cqtFreqs) {
      // Convert frequency to MIDI note number
      const freqToMidi = (freq) => 12 * Math.log2(freq / 440) + 69;

      let currentNote = -1;
      let bandStart = 0;
      const colors = ['#101010', '#181818']; // Alternating dark grays for each note
      let colorIndex = 0;

      for (let x = 0; x < canvasWidth; x++) {
        const freq = this.cqtFreqs[x];
        const midiNote = Math.round(freqToMidi(freq));

        // When note changes, draw the previous band
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
      // Draw final band
      freqCtx.fillStyle = colors[colorIndex % 2];
      freqCtx.fillRect(bandStart, 0, canvasWidth - bandStart, fqHeight);
    }

    const _start = performance.now();
    const dataHeap = new Float32Array(this.core.HEAPF32.buffer, this.dataPtr, this.cqtSize);

    analyserNode.getFloatTimeDomainData(dataHeap);
    if (!dataHeap.every((n) => n === 0)) {
      this.core._cqt_calc(this.dataPtr, this.dataPtr);
      this.core._cqt_render_line(this.dataPtr);
      // copy output to canvas
      for (let x = 0; x < canvasWidth; x++) {
        const weighting = this.weighting === WEIGHTING_A ? _aWeightingLUT[x] : 1;
        const val = (255 * weighting * dataHeap[x]) | 0; //this.core.getValue(this.cqtOutput + x * 4, 'float') | 0;
        const h = (val * hCoeff) | 0;
        const style = this.colorMap(val).hex();

        // Update peak hold
        if (!this.peakData[x] || val > this.peakData[x]) {
          this.peakData[x] = val;
        } else {
          this.peakData[x] *= this.peakDecayRate;
        }

        // Draw frequency bar
        freqCtx.fillStyle = style;
        freqCtx.fillRect(x, fqHeight - h, 1, h);

        // Draw peak hold indicator
        const peakH = (this.peakData[x] * hCoeff) | 0;
        const peakStyle = this.colorMap(this.peakData[x]).hex();
        freqCtx.fillStyle = peakStyle;
        freqCtx.fillRect(x, fqHeight - peakH, 1, 2);

        tempCtx.fillStyle = style;
        tempCtx.fillRect(x, 0, 1, specSpeed);
      }
    }

    const _middle = performance.now();

    // tempCtx.drawImage(this.specCanvas, 0, 0);
    // translate the transformation matrix. subsequent draws happen in this frame
    tempCtx.translate(0, specSpeed);
    // draw the copied image
    tempCtx.drawImage(this.tempCanvas, 0, 0);
    // reset the transformation matrix
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);

    this.specCtx.drawImage(this.tempCanvas, 0, 0);

    const _end = performance.now();

    if (_debug) {
      _calcTime += _middle - _start;
      _totalTime += _end - _start;
      _timeCount++;
      if (_timeCount >= 200) {
        console.log(
          '[Viz] %s ms analysis, %s ms total (%s fps) (%s% utilization)',
          (_calcTime / _timeCount).toFixed(2),
          (_totalTime / _timeCount).toFixed(2),
          ((1000 * _timeCount) / (_start - _lastTime)).toFixed(1),
          ((100 * _totalTime) / (_end - _lastTime)).toFixed(1)
        );
        _calcTime = 0;
        _timeCount = 0;
        _totalTime = 0;
        _lastTime = _start;
      }
    }
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
