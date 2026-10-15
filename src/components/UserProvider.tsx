import React, { createContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { DEFAULT_CHANNEL_PALETTE_ID } from '../config/channelPalettes';
import { STAGE_DEFAULTS } from '../config/stageSettings';

export interface UserSettings {
  showPlayerSettings: boolean;
  channelPalette: string;
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
    channelPalette: DEFAULT_CHANNEL_PALETTE_ID,
  },
  updateSettings: () => {},
  replaceSettings: () => {},
});

const DEFAULT_SETTINGS: UserSettings = {
  showPlayerSettings: true,
  ...STAGE_DEFAULTS,
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

  // Merges into the latest settings, so several updates in one event all land.
  const updateSettings = useCallback((partialSettings: Partial<UserSettings>) => {
    setSettings((current) => ({ ...current, ...partialSettings }));
  }, []);

  const replaceSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings);
  }, []);

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
