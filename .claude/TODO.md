# Homskillet Discography - TODO List

Elements can be referred to by their key, like B1 or E2. When an item is complete, delete it entirely rather than marking it complete.

When all elements in a section are complete, simply replace the list of tasks with "None!"

## BUGS

**B1**: There is a 1px gap between the analyzer and spectrogram when you fullscreen the visualizer. See ./.claude/screenshots/viz-pixels.png. Can we fix it so they're flush/seamless? [area:visualizer]

**B2**: File browser `..` button behaves inconsistently (sometimes doesn't navigate, sometimes goes back twice to new tab screen). Investigate root cause and fix the navigation logic. If root cause can't be identified, fall back to making `..` button link directly to root path (acceptable since we never nest directories). [area:browser]

---

## SIMPLIFICATION (stripping down to essentials)

None!

---

## ENHANCEMENT (new features & styling)

**E1**: When I play arps.nsf, there is a very cool effect in the visualizer's analyzer component. We have a decay effect when a frequency peak drops, and for some reason, the very tall peaks created by the triangle in that song create a really cool pixelated effect that I don't see in other frequencies or in many other songs. See ./.claude/screenshots/viz-pixels.png. I would love if the decay ALWAYS had that pixelated effect for all frequencies as it fits the aesthetic of the site well. Is that possible? [area:visualizer]

**E2**: Music settings should be shareable via URL parameters. Should we also make the current song update the path? So rather than using ?play=arps.nsf, we could do /RandomJams/arps.nsf?
**(WORKTREE:feature/E3-visualizer-peak-decay) E3**: Visualizer peak decay should be configurable via settings. [area:visualizer]

**E4**: (PLAN) Explore more options for visualizers. I want to know how the current visualizer works, and if there are other web-friendly visualizers. I really like the frequency spectrum aspect of the current one because it does a great job shining a light on the technical work in the songs, so other cool frequency spectrum visualizers would be sweet. However, I also loved WinAmp's Milkdrop and would love trippy options if there are any open source options for that. Bonus points if I can somehow separate out visualizers per NSF channel to show all the intricacies of the music. [area:visualizer] [area:player]

**E5**: Let's make the time slider more dynamic. Can it be wavy and ripple down the line? [area:visualizer]

**E6**: Add ability for me to store metadata for songs and albums. I assume this would be json files that live alongside the songs but i am open to other ideas. Should include things like my personal comments on the song or album, and per-song presets for the player settings (tempo, stereo width). [area:browser]

**E7**: Add ability to play MP3s for the handful of Ableton covers or remixes I made. [area:player]

**E9**: Improve UX when songs are loaded via `?play=` link. Currently, when you paste a song link (e.g., `/?play=%2FBazaar%2Ftectonictechniques.nsf`), the song loads but doesn't autoplay due to browser autoplay policies - it waits for user interaction to resume the AudioContext. This is correct behavior, but the UI doesn't indicate that the user needs to click to start audio. Consider:

- Showing a visual indicator (toast, overlay, or button state) that audio is waiting for interaction
- Auto-showing the "Click to enable audio" message when a song is queued but AudioContext is suspended
- Displaying the paused state more prominently when audio is ready but suspended

[area:browser]

**E10**: Let's make the site feel more dynamic with animations. When you click an album, make the title flash twice, then the contents should expand out to the right and unfold.

_Implementation note: Attempted using React Router's history.push() state to pass `shouldAnimate: true` from DirectoryLink to Browse, but the Browse component re-renders from parent state changes before the navigation with state completes, causing `shouldAnimate` to always be `false`. A working solution would likely require a React context or global state (e.g., Zustand) to coordinate animation state across navigation, rather than relying on router state._

[area:browser] [area:settings]

**E14**: Multiple spark generators with their own parameter sets (i.e. blue sparks shooting infrequently, green sparks shooting constantly) [area:visualizer]

**E16**: Slider sparks can change color over lifespan through a gradient. [area:visualizer]

**E17**: Visualizer fullscreen should rotate 90 degrees when entering fullscreen mode. [area:visualizer]

**E18**: Add a lock button to player area to lock in the current song. This should remove the timer check and play the song continuously until the user manually stops it or advances to the next song. [area:player]

---

## MAINTAINABILITY (code quality & tooling)

**M1**: Why do we need SQLite? Do we use localstorage for storing user preferences? If so, can we eliminate SQLite as a dependency? [area:build]

**M2**: (OPTIONAL FUTURE WORK) Complete TypeScript migration of remaining player implementations:

- Player.js → Player.ts (base class - state machine logic)
- GMEPlayer.js → GMEPlayer.ts (main player - audio processing)
- Spectrogram.js → Spectrogram.ts (visualization math)
- Leave chip-core.js as JS (Emscripten-generated, gets replaced on build)
- Leave ChipWorkletProcessor.js as JS (web worker)
- This would provide 100% TypeScript coverage of hand-written source code
- Can be done incrementally when touching these files for features

[area:build]

**M4**: (PLAN) Identify the main areas of the application that would benefit from unit tests. I do not need thorough coverage of every part of the app. Just the places that are most testable, most critical, or most brittle. I want maximum bang for my buck. Create a plan for this. [area:build]

**M5**: Help me investigate this build warning about bundle size and the react-virtualized module directive error. [area:build]

---

## DEPLOYMENT (going live)

None!
