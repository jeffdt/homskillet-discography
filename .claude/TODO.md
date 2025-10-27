# Homskillet Discography - TODO List

Elements can be referred to by their key, like B1 or E2. When an item is complete, delete it entirely rather than marking it complete.

When all elements in a section are complete, simply replace the list of tasks with "None!"

## BUGS

**B1.1**: The game music emu setting checkboxes create a weird yellow box to the right of the text. For example, it looks like `[X] NOISE █` where the block is yellow. Every channel shows this whether the box is checked or not.

**B1.2**: The text for the nsf channels cuts off, like "TRIANGL" and "SAW WAV"

**B1.3**: 

---

## SIMPLIFICATION (stripping down to essentials)

None!

---

## ENHANCEMENT (new features & styling)

**E1**: Clicking a song title should copy a link to your clipboard for that track.

**E2.1**: Swap in a new color theme. It should be mostly monochrome with pops of color for contrast and emphasis. Select all of your colors from the list of colors in `.claude/color-palettes.md`. Limit your selection to the ones in `Grayscales` and `Greens`. One example might be a black background, light gray text text

**E2.2**: Add the ability to swap between multiple color palettes on the entire UI. For the

**E4**: (PLAN) Explore more options for visualizers. I want to know how the current visualizer works, and if there are other web-friendly visualizers. I really like the frequency spectrum aspect of the current one because it does a great job shining a light on the technical work in the songs, so other cool frequency spectrum visualizers would be sweet. However, I also loved WinAmp's Milkdrop and would love trippy options if there are any open source options for that. Bonus points if I can somehow separate out visualizers per NSF channel to show all the intricacies of the music.

**E6**: Add ability for me to store metadata for songs and albums. I assume this would be json files that live alongside the songs but i am open to other ideas. Should include things like my personal comments on the song or album, and per-song presets for the player settings (tempo, stereo width).

**E7**: Add ability to play MP3s for the handful of Ableton covers or remixes I made.

**E8**: Swap the icon out to something custom from one of our games.

**E9**: Improve UX when songs are loaded via `?play=` link. Currently, when you paste a song link (e.g., `/?play=%2FBazaar%2Ftectonictechniques.nsf`), the song loads but doesn't autoplay due to browser autoplay policies - it waits for user interaction to resume the AudioContext. This is correct behavior, but the UI doesn't indicate that the user needs to click to start audio. Consider:
- Showing a visual indicator (toast, overlay, or button state) that audio is waiting for interaction
- Auto-showing the "Click to enable audio" message when a song is queued but AudioContext is suspended
- Displaying the paused state more prominently when audio is ready but suspended

**E10**: Let's make the site feel more dynamic with animations. When you click an album, make the title flash twice, then the contents should expand out to the right and unfold.

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

None!
