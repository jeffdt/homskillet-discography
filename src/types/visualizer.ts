export interface ColorPalette {
  label: string;
  colors: string[];
}

export interface WeightingMode {
  label: string;
  description: string;
}

export interface VisualizerState {
  vizMode: number;
  weightingMode: number;
  fftSize: number;
  speed: number;
  enabled: boolean;
  colorPalette: number;
}

export interface VisualizerProps {
  chipCore: any;
  audioCtx: AudioContext;
  sourceNode: ScriptProcessorNode;
  paused: boolean;
}
