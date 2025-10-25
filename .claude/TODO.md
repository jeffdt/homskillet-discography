# Homskillet Discography - TODO List

## BUGS

**B1**: The folder that displays at the bottom when you're playing a song links to the wrong location. i.e. `https://jeffdt.github.io/homskillet-discography/browse/homskillet-discography/music/Bazaar`

---

## SIMPLIFICATION (stripping down to essentials)

**All simplifications are complete!**

---

## ENHANCEMENT (new features & styling)

**E0**: Open settings pane and visualizer by default. You should not be able to turn the settings off either. Remove the Settings UI tab element and simplify any code related to toggling it. I want settings always visible.

**E1**: Refactor CSS for easy palette swaps. See `.claude/refactor-css-for-palettes.md` for full context and instructions.

**E2**: Add the ability to swap color palettes on the entire UI. Some ideas would be Metallic Wing (monochrome with pops of color), Bazaar (sand colors), superfore (pastels), and some other fun ones you come up with.

**E3**: Are there any fonts we can use that look more like NES game fonts?

**E4**: (PLAN) Explore more options for visualizers. I want to know how the current visualizer works, and if there are other web-friendly visualizers. I really like the frequency spectrum aspect of the current one because it does a great job shining a light on the technical work in the songs, so other cool frequency spectrum visualizers would be sweet. However, I also loved WinAmp's Milkdrop and would love trippy options if there are any open source options for that. Bonus points if I can somehow separate out visualizers per NSF channel to show all the intricacies of the music.

**E6**: Add ability to store metadata for songs and albums. Should include things like my personal comments on the song or album, and per-song presets for the player settings (tempo, stereo width).

**E7**: Add ability to play MP3s for the handful of Ableton covers or remixes I made.

**E8**: Swap the icon out to something custom from one of our games.

**E9**: Improve UX when songs are loaded via `?play=` link. Currently, when you paste a song link (e.g., `/?play=%2FBazaar%2Ftectonictechniques.nsf`), the song loads but doesn't autoplay due to browser autoplay policies - it waits for user interaction to resume the AudioContext. This is correct behavior, but the UI doesn't indicate that the user needs to click to start audio. Consider:
- Showing a visual indicator (toast, overlay, or button state) that audio is waiting for interaction
- Auto-showing the "Click to enable audio" message when a song is queued but AudioContext is suspended
- Displaying the paused state more prominently when audio is ready but suspended

---

## MAINTAINABILITY (code quality & tooling)

**M2**: ✅ **COMPLETE** - TypeScript migration of UI layer finished (Pass 6). All React components, utilities, and core infrastructure migrated (~85% of codebase). See `.claude/typescript-incremental-migration.md` for progress tracker.

**M2.1**: (OPTIONAL FUTURE WORK) Complete TypeScript migration of remaining player implementations:
- Player.js → Player.ts (base class - state machine logic)
- GMEPlayer.js → GMEPlayer.ts (main player - audio processing)
- Spectrogram.js → Spectrogram.ts (visualization math)
- Leave chip-core.js as JS (Emscripten-generated, gets replaced on build)
- Leave ChipWorkletProcessor.js as JS (web worker)
- This would provide 100% TypeScript coverage of hand-written source code
- Can be done incrementally when touching these files for features

**M3**: Add a linter and formatter and make them required, auto-triggered pre-commit steps.

**M4**: (PLAN) Identify the main areas of the application that would benefit from unit tests. I do not need thorough coverage of every part of the app. Just the places that are most testable or have the most critical or brittle functionality. I want maximum bang for my buck. Create a plan for this.

**M5**: You said "the project uses webpack 4, so we need an older version of ts-loader". Should we upgrade webpack?

**M6**:: Is src/gm-patch-map.ts used?

---

## DEPLOYMENT (going live)

**D1**: Put on custom domain (jeffdt.com, purchased through namesilo). Configured in namesilo and github, but currently gets this error when visiting:
> XHRGET
> http://jeffdt.com/browse?path=/
> [HTTP/1.1 404 Not Found 15ms]
> 
> Uncaught (in promise) SyntaxError: JSON.parse: unexpected character at line 1 column 1 of the JSON data