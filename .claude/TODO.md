# Homskillet Discography - TODO List

Elements can be referred to by their key, like B1 or E2. When an item is complete, delete it entirely rather than marking it complete.

When all elements in a section are complete, simply replace the list of tasks with "None!"

## BUGS

**B1**: The randomize button is broken. It gets the error: VM564:1 Uncaught (in promise) SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON.

---

## SIMPLIFICATION (stripping down to essentials)

**S1**: Eliminate "Mode" settings for visualizer, hardcode to constant Q. Eliminate Weighting, hardcode to A-weighting. Eliminate speed, hardcode to medium. The only option should be palette.

**S2.1**: The time slider should not show decimal precision. It's too much. Just show seconds.

**S2.2**: The file size doesn't need decimal precision either. Just show KB.

**S3**: The currently playing song title should not appear left-aligned in a separate div from the timer. It should appear above the timer, center aligned.

---

## ENHANCEMENT (new features & styling)

**E1**: In the player settings, switch from floats to percentages (speed, bass, stereo width).

**E2**: Add the ability to swap between multiple color palettes on the entire UI.

**E3**: Clicking the currently playing song title above the player should also take you directly to that file in the browser. It should open whatever dir it's located in and everything. It shouldn't interrupt the song, just navigate to that dir and make sure the file is visible on screen.

**E4**: (PLAN) Explore more options for visualizers. I want to know how the current visualizer works, and if there are other web-friendly visualizers. I really like the frequency spectrum aspect of the current one because it does a great job shining a light on the technical work in the songs, so other cool frequency spectrum visualizers would be sweet. However, I also loved WinAmp's Milkdrop and would love trippy options if there are any open source options for that. Bonus points if I can somehow separate out visualizers per NSF channel to show all the intricacies of the music.

**E5**: Let's make the time slider more dynamic. Can it be wavy and ripple down the line?

**E6**: Add ability for me to store metadata for songs and albums. I assume this would be json files that live alongside the songs but i am open to other ideas. Should include things like my personal comments on the song or album, per-song presets for the player settings (tempo, stereo width), and custom play durations. See `.claude/duration-override-findings.md` for technical details on how duration override works.

**E7**: Add ability to play MP3s for the handful of Ableton covers or remixes I made.

**E8**: Swap the icon out to something custom from one of our games.

**E9**: Improve UX when songs are loaded via `?play=` link. Currently, when you paste a song link (e.g., `/?play=%2FBazaar%2Ftectonictechniques.nsf`), the song loads but doesn't autoplay due to browser autoplay policies - it waits for user interaction to resume the AudioContext. This is correct behavior, but the UI doesn't indicate that the user needs to click to start audio. Consider:
- Showing a visual indicator (toast, overlay, or button state) that audio is waiting for interaction
- Auto-showing the "Click to enable audio" message when a song is queued but AudioContext is suspended
- Displaying the paused state more prominently when audio is ready but suspended

**E10**: Let's make the site feel more dynamic with animations. When you click an album, make the title flash twice, then the contents should expand out to the right and unfold.

**E11**: Mobile fonts/buttons need to be bigger.

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

**D1**
