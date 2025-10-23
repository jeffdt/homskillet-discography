import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';

const UserContext = createContext({
  settings: {},
  updateSettings: () => {},
  replaceSettings: () => {},
});

const DEFAULT_SETTINGS = {
  showPlayerSettings: false,
};

function migrateSettings(settings) {
  const migratedSettings = { ...settings };
  Object.keys(DEFAULT_SETTINGS).forEach(key => {
    if (settings[key] === undefined) {
      migratedSettings[key] = DEFAULT_SETTINGS[key];
    }
  });
  return migratedSettings;
}

const UserProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const settings = window.localStorage.getItem('settings');
      return migrateSettings(settings ? JSON.parse(settings) : DEFAULT_SETTINGS);
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
    return debounce((newSettings) => {
      // Settings are automatically saved via useEffect
    }, 1000);
  }, []);

  const updateSettings = useCallback((partialSettings) => {
    const newSettings = { ...settings, ...partialSettings };
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const replaceSettings = useCallback((newSettings) => {
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
