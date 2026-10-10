import { describe, expect, it, vi } from 'vitest';
import { App } from '../components/App';

/** A stand-in for the App instance the mixer handlers run on, with or without a loaded player. */
function fakeApp(withPlayer: boolean) {
  const player = { playerKey: 'gme', setTempo: vi.fn(), setParameter: vi.fn() };
  const updateSettings = vi.fn();
  const self = Object.assign(Object.create(App.prototype), {
    state: { tempo: 1 },
    sequencer: { getPlayer: () => (withPlayer ? player : null) },
    props: { userContext: { settings: {}, updateSettings } },
    setState: vi.fn(),
  });
  return { self, player, updateSettings };
}

describe('App mixer settings', () => {
  it('saves speed for every song as it changes', () => {
    const { self, player, updateSettings } = fakeApp(true);
    App.prototype.handleTempoChange.call(self, 1.5);
    expect(player.setTempo).toHaveBeenCalledWith(1.5);
    expect(updateSettings).toHaveBeenCalledWith({ tempo: 1.5 });
  });

  it('saves bass and stereo for every song as they change', () => {
    const { self, player, updateSettings } = fakeApp(true);
    App.prototype.handleParamChange.call(self, 'subbass', 0.8);
    expect(player.setParameter).toHaveBeenCalledWith('subbass', 0.8);
    expect(updateSettings).toHaveBeenCalledWith({ 'gme.subbass': 0.8 });
  });

  it('saves changes made before any song plays', () => {
    const { self, updateSettings } = fakeApp(false);
    App.prototype.handleTempoChange.call(self, 0.75);
    App.prototype.handleParamChange.call(self, 'stereoWidth', 0.25);
    expect(updateSettings).toHaveBeenCalledWith({ tempo: 0.75 });
    expect(updateSettings).toHaveBeenCalledWith({ 'gme.stereoWidth': 0.25 });
  });

  it('saves the speed keys too', () => {
    const { self, updateSettings } = fakeApp(true);
    App.prototype.setSpeedRelative.call(self, 0.25);
    expect(updateSettings).toHaveBeenCalledWith({ tempo: 1.25 });
  });
});
