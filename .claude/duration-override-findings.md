# Duration Override System - Technical Findings

## Summary

Verified on 2024-12-07 that song duration can be overridden at the JavaScript layer to extend playback beyond GME's default 2:30 (150000ms).

## How Duration Controls Playback

### The Control Flow

1. **GMEPlayer.getDurationMs()** (src/players/GMEPlayer.js:275) returns the track duration
2. **processAudioInner()** (line 80) checks `if (this.getPositionMs() >= this.getDurationMs())`
3. When position reaches duration, it calls `setFadeout()` which triggers a 4-second fade via GME's C API
4. After fade completes, GME reports `_gme_track_ended() == 1` and playback stops

### Key Finding: No C-Level Time Limit

The GME C library does NOT enforce a time limit. It plays audio continuously until:
- Fadeout is triggered from JavaScript, OR
- The track naturally ends (loop detection)

This means **duration is purely controlled by JavaScript** via the `getDurationMs()` return value.

### Where Duration is Used

| Location | Purpose |
|----------|---------|
| `GMEPlayer.js:80` | Triggers fadeout when position >= duration |
| `App.tsx:448` | Caps seek position in UI |
| `App.tsx:772` | Displays duration in time slider |

## Implementation Approach for Metadata-Driven Duration

### Override Point

Modify `getDurationMs()` to check for metadata override before returning GME's default:

```javascript
getDurationMs() {
  if (this.gmeCtx) {
    // Check for metadata override first
    const metadataOverride = this.getMetadataDuration();
    if (metadataOverride) return metadataOverride;

    return this.metadata.play_length;
  }
  return 0;
}
```

### Data Flow for Metadata Integration

1. **Build time**: `build-catalog.js` reads `metadata.json` files from album folders
2. **Build time**: Merges duration data into `directories.json` per-track entries
3. **Runtime**: When track loads, duration override is available in catalog data
4. **Runtime**: Pass override to player via `loadData()` or a new method

### Considerations

- **Subtunes**: NSF files can have multiple tracks. Metadata should support per-subtune durations:
  ```json
  {
    "song.nsf": {
      "duration": 180000,
      "subtunes": {
        "0": { "duration": 120000 },
        "1": { "duration": 240000 }
      }
    }
  }
  ```

- **Fallback chain**: Subtune override > Track override > GME default (150000ms)

- **Loop detection**: If NSF has silence/loop detection and ends before the override duration, GME will naturally end the track. This is expected behavior.

## Test Code (Currently Active)

```javascript
// src/players/GMEPlayer.js:275-283
getDurationMs() {
  if (this.gmeCtx) {
    const defaultDuration = this.metadata.play_length;
    // Test: extend default 2:30 to 3:00
    if (defaultDuration === 150000) return 180000;
    return defaultDuration;
  }
  return 0;
}
```

**Status**: Test code should be removed when proper metadata system is implemented.

## Related Files

- `src/players/GMEPlayer.js` - Player implementation, override point
- `src/components/App.tsx` - State management, passes duration to UI
- `scripts/build-catalog.js` - Catalog builder, will need to read metadata
- `public/directories.json` - Catalog output, will contain duration overrides
