import React, { useContext } from 'react';
import { DEFAULT_CHANNEL_PALETTE_ID } from '../config/channelPalettes';
import ChannelPaletteSettings from './ChannelPaletteSettings';
import UISettings from './UISettings';
import { UserContext } from './UserProvider';

/** Interim Stage slot: the channel palette picker plus the existing visual settings; sub-project 7 replaces its contents. */
export default function StagePanel() {
  const { settings, updateSettings } = useContext(UserContext);
  return (
    <div className="LabSlot">
      <ChannelPaletteSettings
        selectedId={settings.channelPalette ?? DEFAULT_CHANNEL_PALETTE_ID}
        onSelect={(id) => updateSettings({ channelPalette: id })}
      />
      <UISettings persistedSettings={settings} />
    </div>
  );
}
