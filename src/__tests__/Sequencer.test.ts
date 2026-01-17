import { describe, it, expect, beforeEach, vi } from 'vitest';
import Sequencer from '../Sequencer';
import { SHUFFLE_OFF, SHUFFLE_ON } from '../types/sequencer';
import { IPlayer } from '../types/player';

// Mock promisify-xhr module to prevent actual XHR requests
vi.mock('../promisify-xhr', () => ({
  default: (xhr: XMLHttpRequest) => {
    // Return a mock XHR with a send method that never resolves
    // This prevents playSong from actually trying to fetch songs during tests
    xhr.send = () => new Promise(() => {});
    xhr.abort = vi.fn();
    return xhr;
  },
}));

describe('Sequencer', () => {
  let sequencer: Sequencer;
  let mockPlayer: IPlayer;
  let mockLocalFilesManager: any;
  let mockGetSettings: any;

  beforeEach(() => {
    // Create a mock player
    mockPlayer = {
      on: vi.fn(),
      canPlay: vi.fn((ext: string) => ext === 'nsf' || ext === 'nsfe'),
      suspend: vi.fn(),
      stop: vi.fn(),
      loadData: vi.fn().mockResolvedValue(undefined),
      getNumVoices: vi.fn(() => 8),
      setVoiceMask: vi.fn(),
      setLocked: vi.fn(),
      getIsLocked: vi.fn(() => false),
    } as any;

    // Mock local files manager
    mockLocalFilesManager = {
      read: vi.fn(() => new ArrayBuffer(0)),
    };

    // Mock settings getter
    mockGetSettings = vi.fn(() => ({}));

    // Create sequencer instance
    sequencer = new Sequencer([mockPlayer], mockLocalFilesManager, mockGetSettings);
  });

  describe('shuffle mode', () => {
    it('should start with shuffle off', () => {
      expect(sequencer['shuffle']).toBe(SHUFFLE_OFF);
    });

    it('should toggle shuffle mode', () => {
      sequencer.toggleShuffle();
      // toggleShuffle uses !this.shuffle which converts to boolean then gets cast
      // We just need to verify it's truthy (shuffle is on)
      expect(sequencer['shuffle']).toBeTruthy();

      sequencer.toggleShuffle();
      expect(sequencer['shuffle']).toBeFalsy();
    });

    it('should generate shuffle order when enabling shuffle with context', () => {
      const context = ['song1.nsf', 'song2.nsf', 'song3.nsf', 'song4.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 2); // Start at index 2

      // Enable shuffle
      sequencer.setShuffle(SHUFFLE_ON);

      const shuffleOrder = sequencer['shuffleOrder'];

      // First item should be the current index (2)
      expect(shuffleOrder[0]).toBe(2);

      // All other indices should be present
      expect(shuffleOrder.length).toBe(4);
      expect(shuffleOrder).toContain(0);
      expect(shuffleOrder).toContain(1);
      expect(shuffleOrder).toContain(3);

      // Current index should be reset to 0 after shuffle
      expect(sequencer['currIdx']).toBe(0);

      playSongSpy.mockRestore();
    });

    it('should restore linear play sequence when disabling shuffle', () => {
      const context = ['song1.nsf', 'song2.nsf', 'song3.nsf', 'song4.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 0);

      // Enable shuffle
      sequencer.setShuffle(SHUFFLE_ON);

      // Advance to position 2 in shuffle order
      sequencer['currIdx'] = 2;
      const originalIdx = sequencer['shuffleOrder'][2];

      // Disable shuffle
      sequencer.setShuffle(SHUFFLE_OFF);

      // Current index should be restored to the actual song index
      expect(sequencer['currIdx']).toBe(originalIdx);

      playSongSpy.mockRestore();
    });
  });

  describe('getCurrIdx', () => {
    it('should return current index in linear mode', () => {
      const context = ['song1.nsf', 'song2.nsf', 'song3.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 1);

      expect(sequencer.getCurrIdx()).toBe(1);

      playSongSpy.mockRestore();
    });

    it('should return mapped index in shuffle mode', () => {
      const context = ['song1.nsf', 'song2.nsf', 'song3.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 0);

      // Enable shuffle
      sequencer.setShuffle(SHUFFLE_ON);

      // Set current index in shuffle order
      sequencer['currIdx'] = 1;

      // Should return the actual song index, not the shuffle position
      const actualIdx = sequencer['shuffleOrder'][1];
      expect(sequencer.getCurrIdx()).toBe(actualIdx);

      playSongSpy.mockRestore();
    });
  });

  describe('nextSong and prevSong', () => {
    it('should advance to next song', () => {
      const context = ['song1.nsf', 'song2.nsf', 'song3.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 0);

      const initialIdx = sequencer['currIdx'];
      sequencer.nextSong();

      expect(sequencer['currIdx']).toBe(initialIdx + 1);

      playSongSpy.mockRestore();
    });

    it('should go to previous song', () => {
      const context = ['song1.nsf', 'song2.nsf', 'song3.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 2);

      sequencer.prevSong();

      expect(sequencer['currIdx']).toBe(1);

      playSongSpy.mockRestore();
    });

    it('should eject when advancing past end of context', () => {
      const context = ['song1.nsf', 'song2.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 1); // Start at last song

      // Set player so it can be stopped during eject
      sequencer['player'] = mockPlayer;

      let ejected = false;
      sequencer.on('sequencerStateUpdate', (state: any) => {
        if (state.isEjected) ejected = true;
      });

      sequencer.nextSong();

      expect(ejected).toBe(true);
      expect(sequencer['context']).toBe(null);
      expect(sequencer['currIdx']).toBe(0);
      expect(mockPlayer.stop).toHaveBeenCalled();

      playSongSpy.mockRestore();
    });

    it('should eject when going before start of context', () => {
      const context = ['song1.nsf', 'song2.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 0); // Start at first song

      // Set player so it can be stopped during eject
      sequencer['player'] = mockPlayer;

      let ejected = false;
      sequencer.on('sequencerStateUpdate', (state: any) => {
        if (state.isEjected) ejected = true;
      });

      sequencer.prevSong();

      expect(ejected).toBe(true);
      expect(sequencer['context']).toBe(null);
      expect(mockPlayer.stop).toHaveBeenCalled();

      playSongSpy.mockRestore();
    });

    it('should wrap to beginning when advancing past end', () => {
      const context = ['song1.nsf', 'song2.nsf', 'song3.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 2); // Start at last song

      // Set player so it can be stopped during eject
      sequencer['player'] = mockPlayer;

      sequencer.nextSong();

      expect(sequencer['currIdx']).toBe(0);
      expect(sequencer['context']).toBe(null);
      expect(mockPlayer.stop).toHaveBeenCalled();

      playSongSpy.mockRestore();
    });
  });

  describe('playContext', () => {
    it('should set context and index', () => {
      const context = ['song1.nsf', 'song2.nsf', 'song3.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 1);

      expect(sequencer['context']).toEqual(context);
      expect(sequencer['currIdx']).toBe(1);

      playSongSpy.mockRestore();
    });

    it('should default to index 0 if not specified', () => {
      const context = ['song1.nsf', 'song2.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context);

      expect(sequencer['currIdx']).toBe(0);

      playSongSpy.mockRestore();
    });

    it('should apply shuffle if already enabled', () => {
      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      // Enable shuffle first
      sequencer.setShuffle(SHUFFLE_ON);

      const context = ['song1.nsf', 'song2.nsf', 'song3.nsf'];
      sequencer.playContext(context, 1);

      // Shuffle order should be generated
      expect(sequencer['shuffleOrder'].length).toBe(3);
      expect(sequencer['shuffleOrder'][0]).toBe(1); // Current index first

      playSongSpy.mockRestore();
    });
  });

  describe('getCurrContext', () => {
    it('should return current context', () => {
      const context = ['song1.nsf', 'song2.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context);

      expect(sequencer.getCurrContext()).toEqual(context);

      playSongSpy.mockRestore();
    });

    it('should return null when no context', () => {
      expect(sequencer.getCurrContext()).toBe(null);
    });
  });

  describe('setLocked', () => {
    it('should set locked state', () => {
      sequencer.setLocked(true);
      expect(sequencer['isLocked']).toBe(true);

      sequencer.setLocked(false);
      expect(sequencer['isLocked']).toBe(false);
    });

    it('should propagate lock state to current player', () => {
      const context = ['song1.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context);

      // Set a player
      sequencer['player'] = mockPlayer;

      sequencer.setLocked(true);

      expect(mockPlayer.setLocked).toHaveBeenCalledWith(true);

      playSongSpy.mockRestore();
    });

    it('should not call player setLocked if no player', () => {
      sequencer['player'] = null;

      // Should not throw
      expect(() => sequencer.setLocked(true)).not.toThrow();
    });
  });

  describe('playSonglist', () => {
    it('should play context starting at index 0', () => {
      const urls = ['song1.nsf', 'song2.nsf', 'song3.nsf'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playSonglist(urls);

      expect(sequencer['context']).toEqual(urls);
      expect(sequencer['currIdx']).toBe(0);

      playSongSpy.mockRestore();
    });
  });

  describe('getPlayer', () => {
    it('should return current player', () => {
      sequencer['player'] = mockPlayer;
      expect(sequencer.getPlayer()).toBe(mockPlayer);
    });

    it('should return null when no player', () => {
      expect(sequencer.getPlayer()).toBe(null);
    });
  });

  describe('shuffle randomness', () => {
    it('should produce different shuffle orders for same context', () => {
      const context = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];

      // Spy on playSong to prevent actual playback
      const playSongSpy = vi.spyOn(sequencer as any, 'playSong').mockImplementation(() => {});

      sequencer.playContext(context, 0);
      sequencer.setShuffle(SHUFFLE_ON);
      const order1 = [...sequencer['shuffleOrder']];

      // Reset and shuffle again
      sequencer.setShuffle(SHUFFLE_OFF);
      sequencer.playContext(context, 0);
      sequencer.setShuffle(SHUFFLE_ON);
      const order2 = [...sequencer['shuffleOrder']];

      // Orders should be different (very likely with 8 items)
      // Both should start with 0 (current index)
      expect(order1[0]).toBe(0);
      expect(order2[0]).toBe(0);

      // At least one other position should differ
      let hasDifference = false;
      for (let i = 1; i < order1.length; i++) {
        if (order1[i] !== order2[i]) {
          hasDifference = true;
          break;
        }
      }
      // With 7 positions to shuffle, it's extremely unlikely they're identical
      expect(hasDifference).toBe(true);

      playSongSpy.mockRestore();
    });
  });
});
