---
description: Pick and implement an item from .claude/TODO.md, avoiding conflicts with work-in-progress items
argument-hint: [excluded-items...]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion, TodoWrite, Task
---

# /todo:implement - Implement TODO Items

This command helps you pick and implement items from `.claude/TODO.md` while avoiding conflicts with work being done by other agents.

> **IMPORTANT:** Arguments are items to EXCLUDE (not implement).
> Example: `/todo:implement E12` means "exclude E12, show me other options"

## Usage

```bash
# Show all available TODO items
/todo:implement

# Exclude items E3 and B1 (being worked on by others)
/todo:implement E3 B1

# Exclude multiple items
/todo:implement E5 E15 S1
```

## Workflow

Follow these steps when executing this command:

### Step 1: Read TODO.md

Read `.claude/TODO.md` to see all available items. The TODO uses these categories:

- **BUGS** - Bug fixes (labeled B1, B2, etc.)
- **SIMPLIFICATION** - Removing unnecessary code (labeled S1, S2, etc.)
- **ENHANCEMENT** - New features and styling (labeled E1, E2, etc.)
- **MAINTAINABILITY** - Code quality and tooling (labeled M1, M2, etc.)
- **DEPLOYMENT** - Going live tasks (labeled D1, D2, etc.)

### Step 2: Parse and Confirm Excluded Items

Check `$ARGUMENTS` for excluded TODO item codes (e.g., "E3 B1"). These are items currently being worked on by other agents that should not be selected.

**CRITICAL: Immediately output exclusion confirmation** before proceeding:

If arguments are provided:

```
Excluding from consideration:
- E12: "The currently playing song title should not appear left-aligned..."
  (Being worked on by another agent)
```

If no arguments:

```
No exclusions - considering all available TODO items.
```

This confirmation prevents misinterpreting arguments as items to implement.

### Step 3: Analyze Excluded Items for File Conflicts

For each excluded item, determine which files/components it likely touches using the conflict matrix below. This prevents selecting items that would modify the same files.

#### File Conflict Matrix

| Component Area             | Files/Directories                                                                                                | TODO Keywords                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Visualizer/Spectrogram** | `src/Spectrogram.js`<br>`src/components/Visualizer.tsx`<br>`src/components/TimeSlider.tsx`                       | visualizer, visualization, spectrogram, analyzer, frequency, sparks, slider, wavy, ripple, dynamic slider |
| **Player/Audio**           | `src/players/Player.js`<br>`src/players/GMEPlayer.js`<br>`src/components/PlayerParams.tsx`<br>`src/chip-core.js` | player, audio, playback, tempo, stereo, MP3, music formats, bass boost                                    |
| **Browser/Catalog**        | `src/components/Browse.tsx`<br>`scripts/build-catalog.js`<br>`public/catalog.json`<br>`public/directories.json`  | browser, catalog, albums, directory, metadata, json files, songs list                                     |
| **Settings/UI/Themes**     | `src/components/Settings.tsx`<br>`src/components/App.tsx`<br>`src/index.css`                                     | settings, themes, UI, animations, styling, color palette, CSS                                             |
| **Build/Test/TypeScript**  | Build scripts<br>`*.config.*`<br>Test files<br>`tsconfig.json`                                                   | TypeScript, tests, testing, build, migration, unit tests, Vitest                                          |

**Conflict Detection Logic:**

- If an excluded item contains keywords from a component area, exclude ALL other items with keywords from that same area
- Example: If E5 ("wavy ripple slider") is excluded, also exclude E14 ("spark generators") and E16 ("spark gradients") because all touch Visualizer/Spectrogram components

### Step 4: Filter Available Items

Remove from consideration:

1. All excluded items mentioned in `$ARGUMENTS`
2. Items that would touch the same component areas as excluded items
3. Items marked with `(PLAN)` prefix (these require exploration first, not immediate implementation)
4. Items marked with `(OPTIONAL FUTURE WORK)` unless specifically requested

### Step 5: Categorize Remaining Items

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

### Step 6: Present Choices to User

Use the `AskUserQuestion` tool to present 2-4 diverse options from different categories and component areas.

**Format:**

- Include TODO identifier (e.g., "E7", "S1")
- Show full item description
- Indicate complexity level
- Recommend one option if there's a clear best choice

**Example:**

```
I found these available TODO items that won't conflict with work in progress:

Which would you like me to implement?
```

Options should span different areas (visualizer, player, browser, etc.) to give variety.

### Step 7: Implement the Chosen Item

Once the user selects an item:

1. **Check git history first:**

   ```bash
   git log --all --oneline --grep="E7"
   git log --all --oneline --grep="metadata"
   ```

   Verify the item hasn't already been completed. If it has, remove it from TODO.md and pick another.

2. **Use TodoWrite to plan:**
   Break down the work into subtasks. This helps track progress and ensures nothing is missed.

3. **Explore if needed:**
   For items requiring understanding of existing code, use `Task` with `subagent_type=Explore` to investigate relevant files.

4. **Follow project guidelines:**
   - **CRITICAL:** Always use CSS variables from the color palette in `src/index.css` (never hardcode colors like `#ffffff`)
   - Use `var(--neutral4)` instead of pure white
   - Use `var(--accent)` for interactive elements
   - See CLAUDE.md "Design & Styling Guidelines" section for full palette

5. **Implement changes:**
   - Make focused changes that address only the TODO item
   - Don't over-engineer or add unrequested features
   - Assume the dev server (`bun start`) is already running

6. **Inform user and request verification:**
   After making changes, inform the user that implementation is complete and ask them to verify the changes in their running dev server. Only mark the task as complete after user confirms the changes work correctly.

7. **Update TODO.md:**
   After user verification, **delete the entire item** from TODO.md (don't mark it complete).
   If a section becomes empty, replace with "None!"

## Examples

### Example 1: No Exclusions

**Command:** `/todo:implement`

**Action:**

1. Read TODO.md
2. No exclusions to process
3. Categorize all available items
4. Present 2-4 diverse options (one from visualizer, one from player, one from browser, one from settings)
5. Implement chosen item

### Example 2: With Exclusions

**Command:** `/todo:implement E5 E15`

**Action:**

1. Read TODO.md
2. Parse exclusions: E5 (wavy slider) and E15 (slider sparks alpha fade)
3. Identify E5 and E15 touch Visualizer/Spectrogram area
4. Exclude all visualizer-related items: E4, E5, E14, E15, E16, S1
5. Present options from other areas: E6 (metadata), E7 (MP3 support), E9 (autoplay UX), E10 (animations), E12 (song title layout), M4 (test planning)

### Example 3: Conflict Detection Detail

**Command:** `/todo:implement E4`

**Exclusion Analysis:**

- E4 mentions "visualizer" and "frequency spectrum"
- Maps to Visualizer/Spectrogram area
- Also exclude: S1 (Spectrogram modes), E5 (time slider), E14 (spark generators), E16 (spark gradients)

**Available items:**

- E6, E7, E9, E10, E12 (different component areas)
- M2, M4 (build/test area)

## Best Practices

1. **Prefer variety:** When presenting options, show items from different component areas
2. **Quick wins are valuable:** Don't always pick the easiest item, but simple improvements have high impact
3. **Check git history:** Always verify an item hasn't been completed before starting work
4. **Use TodoWrite:** Break down multi-step items to track progress
5. **Follow conventions:** Respect the project's color palette and coding standards in CLAUDE.md
6. **One item at a time:** Focus on completing one TODO item fully before moving to the next
7. **Wait for user verification:** Don't assume changes work - ask the user to verify in their running dev server

## Important Notes

- **Color palette compliance is critical:** The project uses CSS variables from the Metallic Wing Green palette. Never use hardcoded colors.
- **Remove, don't mark complete:** When done, delete the item from TODO.md entirely
- **PLAN items require exploration:** Items marked `(PLAN)` need investigation before implementation
- **Dev server is always running:** Never try to start `bun start` - the user keeps it running. Ask them to verify changes in their browser.
