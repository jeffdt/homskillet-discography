---
description: Create a new GitHub Issue with AI-powered category detection and area tagging
allowed-tools: Bash, AskUserQuestion
---

# /feature:record - Create New GitHub Issue

This command helps you create new GitHub Issues for task tracking with automatic category detection and area tag prediction.

## Usage

```bash
# Create a new issue (interactive)
/feature:record
```

No arguments needed. The command prompts you for the issue description and handles the rest automatically.

## Workflow

### Step 1: Prompt for Issue Description

Use `AskUserQuestion` to collect the issue description from the user:

```
What issue would you like to create?

(Provide a clear description of the bug, feature, or task)
```

Accept multi-line descriptions.

### Step 2: AI Analysis for Category Detection

Analyze the issue description to determine the category label using keyword heuristics.

**Category Detection Keywords:**

**category:bug:**

- Keywords: "bug", "fix", "broken", "doesn't work", "error", "crash", "issue", "regression", "gap", "pixel", "alignment", "problem", "incorrect"
- Pattern: Problem statements, negative language about current behavior

**category:enhancement:**

- Keywords: "add", "new", "feature", "improve", "enhance", "ability", "support", "make", "create", "toggle", "configurable", "animation", "implement", "allow"
- Pattern: Additive language, feature requests, improvements

**category:maintainability:**

- Keywords: "refactor", "TypeScript", "test", "unit test", "coverage", "migration", "cleanup", "dependency", "investigate", "analyze", "code quality"
- Pattern: Code quality, tooling, technical debt, infrastructure

**category:simplification:**

- Keywords: "remove", "delete", "strip", "unused", "legacy", "unnecessary", "eliminate", "clean up dead code"
- Pattern: Subtractive language, removing features or code

**category:deployment:**

- Keywords: "deploy", "build", "release", "publish", "GitHub Pages", "CI/CD", "production", "hosting"
- Pattern: Infrastructure and deployment operations

**Detection Algorithm:**

1. Convert description to lowercase
2. Count keyword matches for each category
3. Category with most matches wins
4. If tie, prefer in this order: bug → enhancement → maintainability → simplification → deployment
5. Default to enhancement if no clear match

### Step 3: AI Analysis for Area Tag Prediction

Analyze the issue description against area keywords to predict which component areas it will touch.

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
- Result: `area:player` label (only assign if clear winner, or top 2 if both strong)

### Step 4: Confirm with User

Before creating the GitHub issue, show the user what will be created:

```
Analyzed issue:

Category: category:enhancement
Area tags: area:visualizer
Description: Add particle explosion effect when slider sparks fade out

This will create a GitHub issue with these labels.

Create this issue? (yes/no)
```

If user confirms "yes", proceed. If "no", ask if they want to:

1. Modify the description
2. Manually specify category/areas
3. Cancel

### Step 5: Create GitHub Issue

Use `gh issue create` to create the issue with appropriate labels:

```bash
gh issue create \
  --title "Add particle explosion effect when slider sparks fade out" \
  --body "Add particle explosion effect when slider sparks fade out.

## Areas
- visualizer

---
*Created via /feature:record*" \
  --label "category:enhancement,area:visualizer,status:ready"
```

**Special Cases:**

- If description contains "(PLAN)" or similar research-oriented language, use `status:planning` instead of `status:ready`
- If description contains "(OPTIONAL FUTURE WORK)" or similar, add `optional` label
- If referencing research docs (e.g., E8), include doc path in body

**Capture Issue Number:**

Parse the output from `gh issue create` to extract the created issue number. The command returns the issue URL, which contains the number.

### Step 6: Confirm Completion

After successfully creating the issue:

```
✅ Created issue #47: Add particle explosion effect when slider sparks fade out
   Labels: category:enhancement, area:visualizer, status:ready
   GitHub: https://github.com/jeffdt/homskillet-discography/issues/47

You can now use /feature:init 47 to begin working on this issue.
```

## Examples

### Example 1: Enhancement

```
User: /feature:record

Claude: What issue would you like to create?

User: Add tempo preset buttons (0.5x, 1x, 1.5x, 2x) to the player controls

Claude: Analyzed issue:

Category: category:enhancement (detected keywords: "add", "preset")
Area tags: area:player, area:settings (detected keywords: "tempo", "player", "controls")
Description: Add tempo preset buttons (0.5x, 1x, 1.5x, 2x) to the player controls

This will create a GitHub issue with these labels.

Create this issue? (yes/no)

User: yes

Claude: ✅ Created issue #52: Add tempo preset buttons (0.5x, 1x, 1.5x, 2x) to the player controls
   Labels: category:enhancement, area:player, area:settings, status:ready
   GitHub: https://github.com/jeffdt/homskillet-discography/issues/52

You can now use /feature:init 52 to begin working on this issue.
```

### Example 2: Bug

```
User: /feature:record

Claude: What issue would you like to create?

User: The volume slider doesn't save its position when refreshing the page

Claude: Analyzed issue:

Category: category:bug (detected keywords: "doesn't", problem description)
Area tags: area:player (detected keywords: "volume", "slider")
Description: The volume slider doesn't save its position when refreshing the page

This will create a GitHub issue with these labels.

Create this issue? (yes/no)

User: yes

Claude: ✅ Created issue #53: The volume slider doesn't save its position when refreshing the page
   Labels: category:bug, area:player, status:ready
   GitHub: https://github.com/jeffdt/homskillet-discography/issues/53

You can now use /feature:init 53 to begin working on this issue.
```

### Example 3: Maintainability

```
User: /feature:record

Claude: What issue would you like to create?

User: Add unit tests for the Sequencer class shuffle and repeat logic

Claude: Analyzed issue:

Category: category:maintainability (detected keywords: "unit tests", "test")
Area tags: area:build (detected keywords: "unit tests")
Description: Add unit tests for the Sequencer class shuffle and repeat logic

This will create a GitHub issue with these labels.

Create this issue? (yes/no)

User: yes

Claude: ✅ Created issue #54: Add unit tests for the Sequencer class shuffle and repeat logic
   Labels: category:maintainability, area:build, status:ready
   GitHub: https://github.com/jeffdt/homskillet-discography/issues/54

You can now use /feature:init 54 to begin working on this issue.
```

## Best Practices

1. **Be Descriptive**: Write clear, specific issue descriptions that explain what needs to be done
2. **Trust the AI**: The category and area detection is quite accurate. Override only if clearly wrong
3. **Single Responsibility**: Each issue should focus on one specific task
4. **Reference Screenshots**: If relevant, mention screenshot paths (`.claude/screenshots/`)
5. **Link Related Items**: If the issue depends on another, mention it with #number syntax in the description

## Important Notes

- **No Duplicates**: Consider searching existing issues before creating to avoid duplicates
- **Area Tags Are Key**: Area labels enable conflict detection in `/feature:init` for parallel worktrees
- **Issue Numbers**: GitHub automatically assigns sequential issue numbers
- **Labels Are Data**: Labels are the primary way to categorize and filter issues
- **Status Labels**: New issues default to `status:ready` unless marked as planning work

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
1. Using it as-is (will be the issue title and body)
2. Shortening the title and adding details in the issue body
3. Breaking into multiple issues
```
