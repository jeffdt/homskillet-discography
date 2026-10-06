import { useEffect, useState } from 'react';
import { decideLowPower, probeFrameTimes } from '../shell/lowPower';

export type PerfMode = 'normal' | 'low';

/** Low on compact layouts and on devices that fail the startup probe; normal otherwise. */
export function usePerfMode(compact: boolean): PerfMode {
  const [lowPower, setLowPower] = useState(false);
  useEffect(() => {
    let live = true;
    probeFrameTimes().then((frameTimesMs) => {
      if (live)
        setLowPower(
          decideLowPower({ hardwareConcurrency: navigator.hardwareConcurrency, frameTimesMs })
        );
    });
    return () => {
      live = false;
    };
  }, []);
  return compact || lowPower ? 'low' : 'normal';
}
