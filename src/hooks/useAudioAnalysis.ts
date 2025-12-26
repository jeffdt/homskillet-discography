import { useEffect, useRef, useState } from 'react';

interface AudioAnalysisOptions {
  audioCtx: AudioContext | null;
  sourceNode: ScriptProcessorNode | null;
  paused: boolean;
  ejected: boolean;
  enabled: boolean;
}

interface AudioAnalysisResult {
  amplitude: number;
}

/**
 * Custom hook for audio analysis using Web Audio API
 * Extracts mid-to-high frequencies (500 Hz - 4 kHz) to capture leads, snares, and melodic elements
 * Runs only when enabled and playing
 */
export function useAudioAnalysis(options: AudioAnalysisOptions): AudioAnalysisResult {
  const { audioCtx, sourceNode, paused, ejected, enabled } = options;
  const [amplitude, setAmplitude] = useState(0);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const smoothedAmplitudeRef = useRef(0);

  useEffect(() => {
    // Only create analyser when enabled and audio context exists
    if (!enabled || !audioCtx || !sourceNode) {
      return;
    }

    // Create analyser node
    const analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 512;
    analyserNode.smoothingTimeConstant = 0.2;
    analyserNode.minDecibels = -90;
    analyserNode.maxDecibels = -30;

    // Connect source to analyser
    sourceNode.connect(analyserNode);
    analyserNodeRef.current = analyserNode;

    // Frequency data buffer
    const frequencyData = new Uint8Array(analyserNode.frequencyBinCount);

    // Cleanup function
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (analyserNodeRef.current) {
        try {
          sourceNode.disconnect(analyserNodeRef.current);
        } catch (e) {
          // Node might already be disconnected
        }
        analyserNodeRef.current = null;
      }
    };
  }, [enabled, audioCtx, sourceNode]);

  useEffect(() => {
    // Stop analysis when paused, ejected, or disabled
    if (paused || ejected || !enabled || !analyserNodeRef.current) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setAmplitude(0);
      smoothedAmplitudeRef.current = 0;
      return;
    }

    const analyserNode = analyserNodeRef.current;
    const frequencyData = new Uint8Array(analyserNode.frequencyBinCount);

    // Analysis loop
    const analyze = () => {
      // Get frequency data
      analyserNode.getByteFrequencyData(frequencyData);

      // Extract broad frequency range including bass, leads, and snares
      // For 512 FFT size: bin_frequency = (bin_index * sampleRate) / fftSize
      // At 48kHz: each bin ≈ 93.75 Hz
      // Targeting ~100 Hz - 4 kHz to capture bass, pulse leads, and percussion
      // bin 1 ≈ 94 Hz (bass), bin 43 ≈ 4031 Hz (snares/leads)
      const startBin = 1;
      const endBin = 43;
      const targetBins = frequencyData.slice(startBin, endBin);

      // Calculate RMS (root mean square) of target bins
      const sumSquares = targetBins.reduce((sum, value) => sum + value * value, 0);
      const rms = Math.sqrt(sumSquares / targetBins.length);

      // Normalize to 0-1 range (255 is max Uint8 value)
      let normalized = rms / 255;

      // Apply moderate gain boost (2.0x) to reach higher intensities
      normalized = Math.min(normalized * 2.0, 1.0);

      // Apply squared curve to create dynamic range
      // Less aggressive than cubic, allows intense sounds to reach 1.0
      normalized = normalized * normalized;

      // Apply exponential smoothing for fluid animation
      // α = 0.2 for more responsiveness (was 0.15)
      const alpha = 0.2;
      smoothedAmplitudeRef.current = alpha * normalized + (1 - alpha) * smoothedAmplitudeRef.current;

      // Update amplitude state (only if change is significant to reduce re-renders)
      const newAmplitude = smoothedAmplitudeRef.current;
      setAmplitude(prev => {
        // Only update if change > 0.02 to reduce unnecessary re-renders
        return Math.abs(newAmplitude - prev) > 0.02 ? newAmplitude : prev;
      });

      // Continue loop
      rafIdRef.current = requestAnimationFrame(analyze);
    };

    // Start analysis loop
    rafIdRef.current = requestAnimationFrame(analyze);

    // Cleanup
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [paused, ejected, enabled]);

  return { amplitude };
}
