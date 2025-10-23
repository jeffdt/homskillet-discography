1. ~~(Resume from local init conversation) Update the README with corrected instructions if any of it is now out of date.~~
2. ~~Remove Firebase from codebase. I don't need favorite or login functionality. Don't just comment it out, delete it and remove any text or icons from the frontend.~~
3. We only need to play the filetypes supported by game music emu now. We don't need to support libxmp or Fluidlite anymore. Please remove support for all filetypes other than the ones supported by game music emu. This should include js in our app allows us to recognize and play the other file types, as well as the compiled cores that are used to play them, and the source code that we used to compile them. Furthermore, the build chip core script should remove references to them.
4. ~~Let's remove the winamp theme option. That doesn't fit the vibe I'm going for. Remove the dropdown, kill any code that handles switching and remove any references to the styling.~~
5. Refactor CSS for easy palette swaps. See `.claude/refactor-css-for-palettes.md` for full context and instructions.
6. Let's add the ability to swap color palettes on the entire UI. Some ideas would be Metallic Wing (monochrome with pops of color), Bazaar (sand colors), superfore (pastels), and some other fun ones you come up with.
7. Are there any fonts we can use that look more like an NES game fonts?
8. Is there any reason that we need a separate catalog index server from the file server? Could we collapse them? Should we?
9. Let's get rid of the Search and Local main nav tabs. I don't need a tabbed structure at all right now. We just need to browse.
10. Can this be typescript?
11. (PLAN) Identify the main areas of the application that would benefit from unit tests. I do not need thorough coverage of every part of the app. Just the places that are most testable or have the most critical or brittle functionality. I want maximum bang for my buck. Create a plan for this.
12. Can we add a linter and formatter and make them required, auto-triggered pre-commit steps?