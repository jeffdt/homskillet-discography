import React, { useContext } from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { UserContext, UserContextValue, UserProvider } from '../components/UserProvider';

/** Node's experimental localStorage shadows jsdom's here, so install an in-memory one. */
function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  });
}

describe('UserProvider', () => {
  beforeEach(installMemoryLocalStorage);

  it('keeps every update made in the same event, not just the last', () => {
    let context: UserContextValue | null = null;
    function Probe() {
      context = useContext(UserContext);
      return null;
    }
    render(
      <UserProvider>
        <Probe />
      </UserProvider>
    );
    act(() => {
      context!.updateSettings({ tempo: 0.5 });
      context!.updateSettings({ 'gme.subbass': 0.4 });
    });
    expect(context!.settings).toMatchObject({ tempo: 0.5, 'gme.subbass': 0.4 });
    expect(JSON.parse(window.localStorage.getItem('settings')!)).toMatchObject({
      tempo: 0.5,
      'gme.subbass': 0.4,
    });
  });
});
