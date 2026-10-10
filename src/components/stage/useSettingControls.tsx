import React, { useContext } from 'react';
import { UserContext } from '../UserProvider';
import StageSlider from './StageSlider';
import StageToggle from './StageToggle';
import {
  SCOPE_ZOOM,
  StageSliderDef,
  StageToggleDef,
  sliderSetting,
  toggleSetting,
} from './stageControls';

/** The stored settings plus renderers for slider and switch defs, shared by the Visualizer and Interface panels. */
export function useSettingControls() {
  const { settings, updateSettings } = useContext(UserContext);

  const slider = (def: StageSliderDef, disabled = false) => (
    <StageSlider
      key={def.id}
      def={def}
      value={def === SCOPE_ZOOM ? settings.scopeSpan : sliderSetting(settings, def)}
      disabled={disabled}
      onChange={(value) => updateSettings({ [def.key]: value })}
    />
  );

  const toggle = (def: StageToggleDef, disabled = false) => (
    <StageToggle
      key={def.id}
      id={def.id}
      label={def.label}
      explanation={def.explanation}
      checked={toggleSetting(settings, def)}
      disabled={disabled}
      onChange={(on) => updateSettings({ [def.key]: def.toValue(on) })}
    />
  );

  return { settings, updateSettings, slider, toggle };
}
