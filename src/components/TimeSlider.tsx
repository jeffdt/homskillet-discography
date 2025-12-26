import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import Slider from "./Slider";
import { useAudioPulse } from '../contexts/AudioPulseContext';
import { UserContext } from './UserProvider';

//  46 ms = 2048/44100 sec or 21.7 fps
// 400 ms = 2.5 fps
const UPDATE_INTERVAL_MS = 100;
const pad = (n: number): string => n < 10 ? '0' + n : String(n);

interface TimeSliderProps {
  paused: boolean;
  currentSongDurationMs: number;
  getCurrentPositionMs: () => number;
  onChange: (event: number) => void;
}

export default function TimeSlider(props: TimeSliderProps): React.ReactElement {
  const { paused, currentSongDurationMs, getCurrentPositionMs, onChange } = props;
  const [draggedSongPositionMs, setDraggedSongPositionMs] = useState(-1);
  const [currentSongPositionMs, setCurrentSongPositionMs] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { amplitude } = useAudioPulse();
  const userContext = useContext(UserContext);

  // Extract particle settings from user context
  const particleSettings = {
    intenseInterval: userContext.settings.particleIntenseInterval,
    quietInterval: userContext.settings.particleQuietInterval,
    minSpeed: userContext.settings.particleMinSpeed,
    maxSpeed: userContext.settings.particleMaxSpeed,
    maxParticles: userContext.settings.particleMaxCount,
  };

  useEffect(() => {
    if (!paused) {
      timerRef.current = setInterval(() => {
        setCurrentSongPositionMs(Math.min(getCurrentPositionMs(), currentSongDurationMs));
      }, UPDATE_INTERVAL_MS);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [paused, getCurrentPositionMs, currentSongDurationMs]);

  const getSongPos = useCallback((): number => {
    return currentSongPositionMs / currentSongDurationMs;
  }, [currentSongPositionMs, currentSongDurationMs]);

  const getTime = useCallback((ms: number): string => {
    const sign = ms < 0 ? '-' : '';
    ms = Math.abs(ms);
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${sign}${min}:${pad(sec)}`;
  }, []);

  const getTimeLabel = useCallback((): string => {
    const val = draggedSongPositionMs >= 0 ? draggedSongPositionMs : currentSongPositionMs;
    return getTime(val);
  }, [draggedSongPositionMs, currentSongPositionMs, getTime]);

  const handlePositionDrag = useCallback((event: React.ChangeEvent<HTMLInputElement> | number): void => {
    const pos = typeof event === 'number' ? event : (event.target ? parseFloat(event.target.value) : 0);
    setDraggedSongPositionMs(pos * currentSongDurationMs);
  }, [currentSongDurationMs]);

  const handlePositionDrop = useCallback((event: React.ChangeEvent<HTMLInputElement> | number): void => {
    const pos = typeof event === 'number' ? event : (event.target ? parseFloat(event.target.value) : 0);
    setDraggedSongPositionMs(-1);
    setCurrentSongPositionMs(draggedSongPositionMs);
    onChange(pos);
  }, [draggedSongPositionMs, onChange]);

  return (
    <div className='TimeSlider'>
      <Slider
        pos={getSongPos()}
        onDrag={handlePositionDrag}
        onChange={handlePositionDrop}
        shouldSpawnParticles={!paused}
        pulseIntensity={amplitude}
        particleSettings={particleSettings}
      />
      <div className='TimeSlider-labels'>
        <div>{getTimeLabel()}</div>
        <div>{getTime(currentSongDurationMs)}</div>
      </div>
    </div>
  );
}
