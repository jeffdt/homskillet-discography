import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { debounce } from 'lodash';

export interface UserSettings {
  showPlayerSettings: boolean;
  [key: string]: any; // Allow additional settings
}

export interface UserContextValue {
  settings: UserSettings;
  updateSettings: (partialSettings: Partial<UserSettings>) => void;
  replaceSettings: (newSettings: UserSettings) => void;
}

const UserContext = createContext<UserContextValue>({
  settings: {
    showPlayerSettings: true,
  },
  updateSettings: () => {},
  replaceSettings: () => {},
});

const DEFAULT_SETTINGS: UserSettings = {
  showPlayerSettings: true,
  audioReactivePulse: true,
  sliderSparksEnabled: true, // enable/disable slider sparks
  sliderSparksExpanded: false, // collapsed by default

  // Slider particle settings
  particleSpawnRate: 20, // min spawn interval (lower = faster)
  particleLifespan: 600, // milliseconds
  particleBaseAngle: 180, // base angle in degrees (0=right, 90=down, 180=left, 270=up)
  particleAngleSpread: 30, // angle spread in degrees (cone width)
  particleSpeed: 1.7, // speed multiplier
  particleSpeedVariance: 20, // speed variance percentage (0-100)
  particleGravity: 0.0, // gravity strength (0=none, 1=normal, 2=strong)
  particleHueVariation: 30, // hue degrees
  particleFadeMode: 'fade', // 'fade' or 'instant'

  // Visualizer settings
  visualizerTheme: 0, // default to MW Green theme
  visualizerThemesExpanded: false, // collapsed by default for cleaner view

  // UI Palette settings
  uiPalette: 0, // default to MW Green (index 0)
  uiPaletteSelectorExpanded: false, // collapsed by default
};

function migrateSettings(settings: Partial<UserSettings>): UserSettings {
  const migratedSettings: UserSettings = { ...settings } as UserSettings;
  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    if (settings[key] === undefined) {
      migratedSettings[key] = DEFAULT_SETTINGS[key];
    }
  });
  return migratedSettings;
}

interface UserProviderProps {
  children: ReactNode;
}

const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const settingsStr = window.localStorage.getItem('settings');
      return migrateSettings(settingsStr ? JSON.parse(settingsStr) : DEFAULT_SETTINGS);
    } catch (e) {
      console.error('Could not load settings from localStorage', e);
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Could not save settings to localStorage', e);
    }
  }, [settings]);

  const saveSettings = useMemo(() => {
    return debounce((newSettings: UserSettings) => {
      // Settings are automatically saved via useEffect
    }, 1000);
  }, []);

  const updateSettings = useCallback(
    (partialSettings: Partial<UserSettings>) => {
      const newSettings = { ...settings, ...partialSettings };
      setSettings(newSettings);
      saveSettings(newSettings);
    },
    [settings, saveSettings]
  );

  const replaceSettings = useCallback(
    (newSettings: UserSettings) => {
      setSettings(newSettings);
      saveSettings(newSettings);
    },
    [saveSettings]
  );

  return (
    <UserContext.Provider
      value={{
        settings,
        updateSettings,
        replaceSettings,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };
