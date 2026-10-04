import React, { useContext } from 'react';
import UISettings from './UISettings';
import { UserContext } from './UserProvider';
import VisualizerPaletteSettings from './VisualizerPaletteSettings';

/** Interim Stage slot hosting the existing visual settings unchanged; sub-project 7 replaces its contents. */
export default function StagePanel() {
  const { settings, updateSettings } = useContext(UserContext);
  return (
    <div className="LabSlot">
      <VisualizerPaletteSettings
        selected={settings.visualizerTheme ?? 0}
        onSelect={(index) => updateSettings({ visualizerTheme: index })}
      />
      <UISettings persistedSettings={settings} />
    </div>
  );
}
