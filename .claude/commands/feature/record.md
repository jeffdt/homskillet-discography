---
description: Add a new TODO item with AI-powered category detection and area tagging
allowed-tools: Read, Edit, AskUserQuestion
---

# /feature:record - Record New TODO Item

This command helps you add new TODO items to `.claude/TODO.md` with automatic category detection, area tag prediction, and sequential ID generation.

## Usage

```bash
# Add a new TODO item (interactive)
/feature:record
```

No arguments needed. The command prompts you for the TODO description and handles the rest automatically.

## Workflow

### Step 1: Prompt for TODO Description

Use `AskUserQuestion` to collect the TODO description from the user:

```
What TODO item would you like to add?

(Provide a clear description of the bug, feature, or task)
```

Accept multi-line descriptions.

### Step 2: AI Analysis for Category Detection

Read the TODO description and analyze it to determine the category using keyword heuristics.

**Category Detection Keywords:**

**BUGS (B##):**

- Keywords: "bug", "fix", "broken", "doesn't work", "error", "crash", "issue", "regression", "gap", "pixel", "alignment", "problem", "incorrect"
- Pattern: Problem statements, negative language about current behavior

**ENHANCEMENT (E##):**

- Keywords: "add", "new", "feature", "improve", "enhance", "ability", "support", "make", "create", "toggle", "configurable", "animation", "implement", "allow"
- Pattern: Additive language, feature requests, improvements

**MAINTAINABILITY (M##):**

- Keywords: "refactor", "TypeScript", "test", "unit test", "coverage", "migration", "cleanup", "dependency", "investigate", "analyze", "code quality"
- Pattern: Code quality, tooling, technical debt, infrastructure

**SIMPLIFICATION (S##):**

- Keywords: "remove", "delete", "strip", "unused", "legacy", "unnecessary", "eliminate", "clean up dead code"
- Pattern: Subtractive language, removing features or code

**DEPLOYMENT (D##):**

- Keywords: "deploy", "build", "release", "publish", "GitHub Pages", "CI/CD", "production", "hosting"
- Pattern: Infrastructure and deployment operations

**Detection Algorithm:**

1. Convert description to lowercase
2. Count keyword matches for each category
3. Category with most matches wins
4. If tie, prefer in this order: BUGS → ENHANCEMENT → MAINTAINABILITY → SIMPLIFICATION → DEPLOYMENT
5. Default to ENHANCEMENT if no clear match

### Step 3: AI Analysis for Area Tag Prediction

Analyze the TODO description against area keywords to predict which component areas it will touch.

**Area Keywords (from existing conflict matrix):**

| Area         | Keywords                                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visualizer` | visualizer, visualization, spectrogram, analyzer, frequency, sparks, slider, wavy, ripple, dynamic slider, spectrum, bars, oscilloscope, peak, decay, gradient, color, fullscreen, canvas |
| `player`     | player, audio, playback, tempo, stereo, MP3, music formats, bass boost, NSF, NSFE, lock, continuous play, timer, volume                                                                   |
| `browser`    | browser, catalog, albums, directory, metadata, json files, songs list, shuffle, playlist, navigation, autoplay, links                                                                     |
| `settings`   | settings, themes, UI, animations, styling, color palette, CSS, layout, header, footer, preferences                                                                                        |
| `build`      | TypeScript, tests, testing, build, migration, unit tests, Vitest, Emscripten, WebAssembly, dependencies, SQLite, webpack, vite                                                            |

**Prediction Algorithm:**

1. Convert description to lowercase
2. For each area, count keyword matches
3. Sort areas by match count (descending)
4. Assign top 1-3 areas with score above threshold (at least 1 match)
5. If no matches, prompt user to specify area

**Example:**

- Description: "Add tempo preset buttons to player controls"
- Matches: `player` (3 keywords: "tempo", "preset", "player"), `settings` (1 keyword: "controls")
- Result: `[area:player]` (only assign if clear winner, or top 2 if both strong)

### Step 4: Generate Next Sequential ID

Read `.claude/TODO.md` to find the highest ID for the detected category.

**ID Generation Logic:**

```javascript
// Extract category prefix
const prefixes = {
  BUGS: 'B',
  ENHANCEMENT: 'E',
  MAINTAINABILITY: 'M',
  SIMPLIFICATION: 'S',
  DEPLOYMENT: 'D',
};

const prefix = prefixes[category];

// Parse TODO.md to find highest ID for this category
// Search for pattern: **{PREFIX}{NUMBER}**:
// Example: **E18**: or **B1**: or **M5**:

const regex = new RegExp(`\\*\\*${prefix}(\\d+)\\*\\*`, 'g');
const matches = [...todoContent.matchAll(regex)];
const maxNum = Math.max(0, ...matches.map((m) => parseInt(m[1])));

// Generate next ID
const nextId = `${prefix}${maxNum + 1}`;
```

**Current highest IDs (as of last check):**

- B1 → next is B2
- E18 → next is E19
- M5 → next is M6
- S# (all complete) → next is S1
- D# (all complete) → next is D1

### Step 5: Confirm with User

Before writing to TODO.md, show the user what will be added:

```
Analyzed TODO item:

Category: ENHANCEMENT
ID: E19
Area tags: [area:visualizer]
Description: Add particle explosion effect when slider sparks fade out

This will be added to the ENHANCEMENT section of TODO.md.

Add this item? (yes/no)
```

If user confirms "yes", proceed. If "no", ask if they want to:

1. Modify the description
2. Manually specify category/areas
3. Cancel

### Step 6: Add to TODO.md

Find the appropriate section in `.claude/TODO.md` based on the category:

- `## BUGS` for B## items
- `## ENHANCEMENT (new features & styling)` for E## items
- `## MAINTAINABILITY (code quality & tooling)` for M## items
- `## SIMPLIFICATION (stripping down to essentials)` for S## items
- `## DEPLOYMENT (going live)` for D## items

**Format:**

```markdown
**{ID}**: {description} [area:{tag1}] [area:{tag2}]
```

**Insertion Logic:**

1. Find the section header (e.g., `## ENHANCEMENT`)
2. If section contains "None!", replace "None!" with the new item
3. Otherwise, append to the end of the section (before the `---` separator)
4. Maintain blank line spacing

**Example Insertion:**

Before:

```markdown
## ENHANCEMENT (new features & styling)

**E18**: Add a player button to "lock" the current song. [area:player]

---
```

After:

```markdown
## ENHANCEMENT (new features & styling)

**E18**: Add a player button to "lock" the current song. [area:player]

**E19**: Add particle explosion effect when slider sparks fade out. [area:visualizer]

---
```

### Step 7: Confirm Completion

After successfully adding the item:

```
✅ Added E19 to TODO.md

You can now use `/feature:start E19` to begin working on this item.
```

## Examples

### Example 1: Enhancement

```
User: /feature:record

Claude: What TODO item would you like to add?

User: Add tempo preset buttons (0.5x, 1x, 1.5x, 2x) to the player controls

Claude: Analyzed TODO item:

Category: ENHANCEMENT (detected keywords: "add", "preset")
ID: E19
Area tags: [area:player] [area:settings] (detected keywords: "tempo", "player", "controls")
Description: Add tempo preset buttons (0.5x, 1x, 1.5x, 2x) to the player controls

This will be added to the ENHANCEMENT section of TODO.md.

Add this item? (yes/no)

User: yes

Claude: ✅ Added E19 to TODO.md

You can now use `/feature:start E19` to begin working on this item.
```

### Example 2: Bug

```
User: /feature:record

Claude: What TODO item would you like to add?

User: The volume slider doesn't save its position when refreshing the page

Claude: Analyzed TODO item:

Category: BUGS (detected keywords: "doesn't", "bug-like description")
ID: B2
Area tags: [area:player] (detected keywords: "volume", "slider")
Description: The volume slider doesn't save its position when refreshing the page

This will be added to the BUGS section of TODO.md.

Add this item? (yes/no)

User: yes

Claude: ✅ Added B2 to TODO.md

You can now use `/feature:start B2` to begin working on this item.
```

### Example 3: Maintainability

```
User: /feature:record

Claude: What TODO item would you like to add?

User: Add unit tests for the Sequencer class shuffle and repeat logic

Claude: Analyzed TODO item:

Category: MAINTAINABILITY (detected keywords: "unit tests", "test")
ID: M6
Area tags: [area:build] (detected keywords: "unit tests")
Description: Add unit tests for the Sequencer class shuffle and repeat logic

This will be added to the MAINTAINABILITY section of TODO.md.

Add this item? (yes/no)

User: yes

Claude: ✅ Added M6 to TODO.md

You can now use `/feature:start M6` to begin working on this item.
```

## Best Practices

1. **Be Descriptive**: Write clear, specific TODO descriptions that explain what needs to be done
2. **Trust the AI**: The category and area detection is quite accurate. Override only if clearly wrong
3. **Single Responsibility**: Each TODO should focus on one specific task
4. **Reference Screenshots**: If relevant, mention screenshot paths (`.claude/screenshots/`)
5. **Link Related Items**: If the TODO depends on another, mention it in the description

## Important Notes

- **No Duplicates**: Before creating, the command should ideally check if a similar TODO already exists (optional enhancement)
- **Area Tags Are Key**: Area tags enable conflict detection in `/feature:start` for parallel worktrees
- **ID Sequence**: IDs are sequential within each category (B1, B2... E1, E2... M1, M2...)
- **Format Consistency**: Always use `**ID**: Description [area:tag]` format
- **Empty Sections**: If adding to an empty section with "None!", replace the "None!" text

## Edge Cases

**No Clear Category Match:**
If keyword analysis is ambiguous, ask user:

```
The category for this TODO is unclear. Please specify:
1. Bug (B##) - Fix something broken
2. Enhancement (E##) - Add new feature or improve existing
3. Maintainability (M##) - Code quality, tests, refactoring
4. Simplification (S##) - Remove unnecessary code
5. Deployment (D##) - Infrastructure and deployment
```

**No Area Matches:**
If no area keywords match, ask user:

```
I couldn't automatically detect which component area this affects.
Please specify (choose 1-3):
- visualizer (visualization, spectrogram, animations)
- player (audio playback, controls)
- browser (catalog, navigation, playlists)
- settings (UI, themes, preferences)
- build (tests, tooling, dependencies)
```

**Long Descriptions:**
If description is very long (>200 chars), suggest:

```
This description is quite long. Consider:
1. Using it as-is (will wrap in TODO.md)
2. Shortening the summary and adding details in a follow-up
3. Breaking into multiple TODO items
```
