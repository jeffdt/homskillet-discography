export interface ColorPalette {
  label: string;
  colors: string[];
}

export interface WeightingMode {
  label: string;
  description: string;
}

export interface VisualizerState {
  enabled: boolean;
  colorPalette: number;
}

export interface VisualizerProps {
  chipCore: any;
  audioCtx: AudioContext;
  sourceNode: ScriptProcessorNode;
  paused: boolean;
  persistedSettings: Record<string, any>;
  onThemeChange: (theme: number) => void;
}
