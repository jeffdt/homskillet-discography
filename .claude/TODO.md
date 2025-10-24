# Homskillet Discography - TODO List

## SIMPLIFICATION (stripping down to essentials)

**S1**: Remove SPC filter/echo options from settings UI since we only need NSF files.

---

## ENHANCEMENT (new features & styling)

**E1**: Refactor CSS for easy palette swaps. See `.claude/refactor-css-for-palettes.md` for full context and instructions.

**E2**: Add the ability to swap color palettes on the entire UI. Some ideas would be Metallic Wing (monochrome with pops of color), Bazaar (sand colors), superfore (pastels), and some other fun ones you come up with.

**E3**: Are there any fonts we can use that look more like NES game fonts?

**E4**: (PLAN) Explore more options for visualizers. I want to know how the current visualizer works, and if there are other web-friendly visualizers. I really like the frequency spectrum aspect of the current one because it does a great job shining a light on the technical work in the songs, so other cool frequency spectrum visualizers would be sweet. However, I also loved WinAmp's Milkdrop and would love trippy options if there are any open source options for that. Bonus points if I can somehow separate out visualizers per NSF channel to show all the intricacies of the music.

**E6**: Add ability to store metadata for songs and albums. Should include things like my personal comments on the song or album, and per-song presets for the player settings (tempo, stereo width).

**E7**: Add ability to play MP3s for the handful of Ableton covers or remixes I made.

**E8**: Swap the icon out to something custom from one of our games.
---

## MAINTAINABILITY (code quality & tooling)

**M2**: Migrate codebase to TypeScript. See `.claude/typescript-migration-assessment.md` for full analysis and `.claude/typescript-incremental-migration.md` for UI-first chunked approach. **Status:** First pass complete - TypeScript infrastructure set up and 3 utility files migrated (promisify-xhr, gm-patch-map, RequestCache). Using incremental migration with Babel. **Next:** Continue with UI components or other utility files. Primary challenges: Emscripten wrapper typing (can skip), EventEmitter pattern, App.js state management.

**M3**: Add a linter and formatter and make them required, auto-triggered pre-commit steps.

**M4**: (PLAN) Identify the main areas of the application that would benefit from unit tests. I do not need thorough coverage of every part of the app. Just the places that are most testable or have the most critical or brittle functionality. I want maximum bang for my buck. Create a plan for this.

**M5**: You said "the project uses webpack 4, so we need an older version of ts-loader". Should we upgrade webpack?

---

## DEPLOYMENT (going live)

**D1**: Put on custom domain (jeffdt.com, purchased through namesilo)