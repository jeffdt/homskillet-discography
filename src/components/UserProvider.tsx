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
  // Particle tuning parameters
  particleIntenseInterval: 15,      // Spawn interval at max intensity (ms)
  particleQuietInterval: 100,       // Spawn interval at min intensity (ms)
  particleMinSpeed: 0.8,            // Speed multiplier at intensity 0
  particleMaxSpeed: 1.65,           // Speed multiplier at intensity 1
  particleMaxCount: 20,             // Maximum particles on screen
};

function migrateSettings(settings: Partial<UserSettings>): UserSettings {
  const migratedSettings: UserSettings = { ...settings } as UserSettings;
  Object.keys(DEFAULT_SETTINGS).forEach(key => {
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

  const updateSettings = useCallback((partialSettings: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...partialSettings };
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const replaceSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [saveSettings]);

  return (
    <UserContext.Provider
      value={{
        settings,
        updateSettings,
        replaceSettings,
      }}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };
