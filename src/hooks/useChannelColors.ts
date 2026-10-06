import { useEffect, useState } from 'react';
import { channelColors } from '../visuals/channelColors';

/** The active channel colors (index = voice index); re-renders only when the palette changes. */
export function useChannelColors(): readonly string[] {
  const [colors, setColors] = useState<readonly string[]>(() => channelColors.get());
  useEffect(() => {
    setColors(channelColors.get());
    return channelColors.subscribe(setColors);
  }, []);
  return colors;
}
