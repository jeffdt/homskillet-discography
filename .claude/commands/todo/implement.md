---
description: Pick and implement an item from .claude/TODO.md, avoiding conflicts with work-in-progress items (DEPRECATED - use /feature:start instead)
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion, TodoWrite, Task, Skill
---

# /todo:implement - Implement TODO Items

⚠️ **DEPRECATED**: This command is deprecated in favor of `/feature:start`.

`/feature:start` provides all the functionality of `/todo:implement` plus:

- **Isolated worktrees** for parallel feature development
- **Conflict detection** between parallel work
- **Port management** for testing multiple features simultaneously
- **Registry tracking** of active work

**Migration:**

- Instead of `/todo:implement`, use `/feature:start`
- Existing workflow is preserved - choose "Work directly on current branch" option
- New worktree workflow available via "Create isolated worktree" option

**This command will be removed in a future version. Please switch to `/feature:start`.**

---

## Redirect to /feature:start

For now, this command redirects to `/feature:start` with the traditional workflow.

When you run `/todo:implement`, you'll be automatically redirected to `/feature:start`, which will offer you the choice between:

1. Create isolated worktree (new workflow)
2. Work directly on current branch (traditional /todo:implement behavior)

To use the new command directly:

```bash
/feature:start
```

---

## Original Documentation (for reference)

This command helps you pick and implement items from `.claude/TODO.md` while avoiding conflicts with work being done by other agents.

Items currently being worked on are marked with `(WIP)` prefix in TODO.md itself, making the file the single source of truth for what's in progress.

## Usage

```bash
# Show all available TODO items and implement one
/todo:implement
```

No arguments needed - the command automatically detects in-progress items by reading TODO.md.

## Workflow

Follow these steps when executing this command:

### Step 1: Read TODO.md and Detect In-Progress Items

Read `.claude/TODO.md` to see all available items. The TODO uses these categories:

- **BUGS** - Bug fixes (labeled B1, B2, etc.)
- **SIMPLIFICATION** - Removing unnecessary code (labeled S1, S2, etc.)
- **ENHANCEMENT** - New features and styling (labeled E1, E2, etc.)
- **MAINTAINABILITY** - Code quality and tooling (labeled M1, M2, etc.)
- **DEPLOYMENT** - Going live tasks (labeled D1, D2, etc.)

**Detect WIP markers:** Look for items marked with `(WIP)` prefix. These are currently being worked on by other agents and must be excluded.

Example WIP marker format:

```markdown
- **(WIP) E12**: The currently playing song title should not appear left-aligned...
```

**Output WIP status:** If any WIP items are found, report them:

```
Found items already in progress:
- (WIP) E12: The currently playing song title should not appear left-aligned...
  (Will exclude from selection)
```

If no WIP items found:

```
No items currently in progress.
```

### Step 2: Analyze WIP Items for File Conflicts

For each WIP item, determine which files/components it likely touches using the conflict matrix below. This prevents selecting items that would modify the same files.

#### File Conflict Matrix

| Component Area             | Files/Directories                                                                                                | TODO Keywords                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Visualizer/Spectrogram** | `src/Spectrogram.js`<br>`src/components/Visualizer.tsx`<br>`src/components/TimeSlider.tsx`                       | visualizer, visualization, spectrogram, analyzer, frequency, sparks, slider, wavy, ripple, dynamic slider |
| **Player/Audio**           | `src/players/Player.js`<br>`src/players/GMEPlayer.js`<br>`src/components/PlayerParams.tsx`<br>`src/chip-core.js` | player, audio, playback, tempo, stereo, MP3, music formats, bass boost                                    |
| **Browser/Catalog**        | `src/components/Browse.tsx`<br>`scripts/build-catalog.js`<br>`public/catalog.json`<br>`public/directories.json`  | browser, catalog, albums, directory, metadata, json files, songs list                                     |
| **Settings/UI/Themes**     | `src/components/Settings.tsx`<br>`src/components/App.tsx`<br>`src/index.css`                                     | settings, themes, UI, animations, styling, color palette, CSS                                             |
| **Build/Test/TypeScript**  | Build scripts<br>`*.config.*`<br>Test files<br>`tsconfig.json`                                                   | TypeScript, tests, testing, build, migration, unit tests, Vitest                                          |

**Conflict Detection Logic:**

- If a WIP item contains keywords from a component area, exclude ALL other items with keywords from that same area
- Example: If `(WIP) E5` ("wavy ripple slider") is in progress, also exclude E14 ("spark generators") and E16 ("spark gradients") because all touch Visualizer/Spectrogram components

### Step 3: Filter Available Items

Remove from consideration:

1. All items marked with `(WIP)` prefix
2. Items that would touch the same component areas as WIP items
3. Items marked with `(PLAN)` prefix (these require exploration first, not immediate implementation)
4. Items marked with `(OPTIONAL FUTURE WORK)` unless specifically requested

### Step 4: Categorize Remaining Items

Group available items by complexity:

**Quick Wins** (Simple, well-defined):

- Removals of unused code (S-prefixed items)
- Simple UI layout changes
- Single-file modifications
- Clear requirements with no ambiguity

**Medium Complexity** (Feature additions):

- New features with clear scope
- Multi-file changes
- Requires some exploration but path is clear

**Complex** (Requires planning):

- Items with multiple valid approaches
- Significant architectural changes
- Cross-cutting concerns
- Unclear requirements

### Step 5: Present Choices to User

Use the `AskUserQuestion` tool to present 2-4 diverse options from different categories and component areas.

**Format:**

- Include TODO identifier (e.g., "E7", "S1")
- Show full item description
- Indicate complexity level
- Recommend one option if there's a clear best choice

**Example:**

```
I found these available TODO items:

Which would you like me to implement?
```

Options should span different areas (visualizer, player, browser, etc.) to give variety.

### Step 6: Mark Item as WIP and Implement

Once the user selects an item:

1. **Immediately mark as WIP in TODO.md:**

   Change:

   ```markdown
   - **E7**: Add support for MP3 playback
   ```

   To:

   ```markdown
   - **(WIP) E7**: Add support for MP3 playback
   ```

   This prevents other agents from selecting this item.

2. **Check git history:**

   ```bash
   git log --all --oneline --grep="E7"
   git log --all --oneline --grep="MP3"
   ```

   Verify the item hasn't already been completed. If it has, remove it from TODO.md and pick another.

3. **Use TodoWrite to plan:**
   Break down the work into subtasks. This helps track progress and ensures nothing is missed.

4. **Explore if needed:**
   For items requiring understanding of existing code, use `Task` with `subagent_type=Explore` to investigate relevant files.

5. **Follow project guidelines:**
   - **CRITICAL:** Always use CSS variables from the color palette in `src/index.css` (never hardcode colors like `#ffffff`)
   - Use `var(--neutral4)` instead of pure white
   - Use `var(--accent)` for interactive elements
   - See CLAUDE.md "Design & Styling Guidelines" section for full palette

6. **Implement changes:**
   - Make focused changes that address only the TODO item
   - Don't over-engineer or add unrequested features
   - Assume the dev server (`bun start`) is already running

7. **Inform user and request verification:**
   After making changes, inform the user that implementation is complete and ask them to verify the changes in their running dev server. Only proceed after user confirms the changes work correctly.

8. **Update TODO.md:**
   After user verification, **delete the entire item** from TODO.md (don't just remove the WIP marker).
   If a section becomes empty, replace with "None!"

## Examples

### Example 1: No Items in Progress

**Command:** `/todo:implement`

**Action:**

1. Read TODO.md
2. No WIP items found
3. Categorize all available items
4. Present 2-4 diverse options (one from visualizer, one from player, one from browser, one from settings)
5. User selects E7
6. Mark E7 as `(WIP) E7` in TODO.md
7. Implement chosen item
8. After verification, delete E7 from TODO.md

### Example 2: One Item Already in Progress

**Command:** `/todo:implement`

**TODO.md state:**

```markdown
- **(WIP) E5**: Make time slider wavy/ripply to match dynamic visualizer aesthetic
```

**Action:**

1. Read TODO.md
2. Found WIP item: E5 (wavy slider)
3. E5 touches Visualizer/Spectrogram area
4. Exclude all visualizer-related items: E4, E14, E15, E16, S1
5. Present options from other areas: E6 (metadata), E7 (MP3 support), E9 (autoplay UX), E10 (animations), E12 (song title layout)
6. User selects E12
7. Mark E12 as `(WIP) E12` in TODO.md
8. Implement E12
9. After verification, delete E12 from TODO.md

### Example 3: Multiple Component Areas Blocked

**Command:** `/todo:implement`

**TODO.md state:**

```markdown
- **(WIP) E4**: Add more visualizer modes (frequency spectrum bars, oscilloscope, etc.)
- **(WIP) E7**: Add support for MP3 playback using Web Audio API
```

**Exclusion Analysis:**

- E4 touches Visualizer/Spectrogram area - exclude: S1, E5, E14, E15, E16
- E7 touches Player/Audio area - exclude: E8, E11

**Available items:**

- E6, E9, E10, E12 (Browser, Settings, UI areas)
- M2, M4 (Build/Test area)

## Best Practices

1. **Always mark as WIP immediately:** As soon as user selects an item, mark it `(WIP)` before doing anything else
2. **Prefer variety:** When presenting options, show items from different component areas
3. **Quick wins are valuable:** Don't always pick the easiest item, but simple improvements have high impact
4. **Check git history:** Always verify an item hasn't been completed before starting work
5. **Use TodoWrite:** Break down multi-step items to track progress
6. **Follow conventions:** Respect the project's color palette and coding standards in CLAUDE.md
7. **One item at a time:** Focus on completing one TODO item fully before moving to the next
8. **Wait for user verification:** Don't assume changes work - ask the user to verify in their running dev server
9. **Remove completely when done:** Delete the entire item from TODO.md (not just the WIP marker)

## Important Notes

- **Single source of truth:** TODO.md itself tracks what's in progress via `(WIP)` markers
- **No arguments needed:** The command is simply `/todo:implement` - no exclusion lists to maintain
- **Persistent state:** WIP markers survive across sessions and agent restarts
- **Color palette compliance is critical:** The project uses CSS variables from the Metallic Wing Green palette. Never use hardcoded colors.
- **PLAN items require exploration:** Items marked `(PLAN)` need investigation before implementation
- **Dev server is always running:** Never try to start `bun start` - the user keeps it running. Ask them to verify changes in their browser.

## Handling Edge Cases

**If you find a stale WIP marker:** If an item is marked `(WIP)` but you have evidence (git history, file contents) that it's been completed, remove it from TODO.md entirely.

**If you abandon an item:** If you start work but cannot complete it (blocked, unclear requirements, etc.), remove the `(WIP)` marker so another agent can attempt it.

**If TODO.md has merge conflicts:** Resolve them before proceeding. The WIP markers make merge conflicts less likely since agents won't work on the same items.
