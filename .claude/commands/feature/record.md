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

# Create a new issue with context provided as arguments
/feature:record The visualizer should not render on mobile unless the tab is open
```

The command can be invoked with or without arguments:

- **Without arguments**: Prompts you for context interactively
- **With arguments**: Uses the provided text as context to craft the issue

In both cases, the command intelligently crafts a proper GitHub issue title and body from your input.

## Workflow

### Step 1: Collect Context from User

**IMPORTANT:** The user's input is CONTEXT, not a literal title or description. You must intelligently craft the issue title and body based on this context.

**If arguments were provided** with the command invocation, use those as the context and skip to Step 2.

**If no arguments were provided**, use `AskUserQuestion` to collect context about the issue:

```
What issue would you like to create?

(Describe the bug, feature, or task - I'll craft an appropriate GitHub issue from your input)
```

Accept multi-line input. The user may include:

- Problem descriptions
- Feature requests
- Implementation details
- Context that helps you understand the issue but shouldn't appear verbatim in the GitHub issue

### Step 2: Craft Issue Title and Body

**Before categorization, synthesize a proper GitHub issue from the user's context:**

**Title Crafting:**

- Create a concise, clear title (5-12 words typically)
- Use imperative mood for enhancements ("Add X", "Implement Y", "Create Z")
- Use descriptive mood for bugs ("X doesn't work", "Y causes Z")
- Focus on the WHAT, not implementation details
- Should be scannable in issue lists

**Body Crafting:**

- Expand on the title with context and details
- For multi-part issues, use numbered lists
- Include technical rationale when relevant
- Omit user's meta-commentary (e.g., "this is just for context", "by the way")
- Structure for clarity (use headings, lists, emphasis)
- Keep it concise but complete

**Example Transformations:**

User context: "On mobile, the visualizer should not attempt to render unless the visualizer tab is open. Also, player sparks should default to Off."

Crafted title: "Mobile optimizations: conditional visualizer rendering and sparks default"

Crafted body:

```markdown
Two mobile-focused improvements:

1. **Conditional visualizer rendering**: Only render the visualizer when the visualizer tab is actively open on mobile devices. This improves performance by avoiding unnecessary rendering work when the visualizer isn't visible.

2. **Sparks default setting**: Change the default value for player sparks to Off to reduce resource usage on mobile devices.

Both changes aim to improve mobile performance and reduce battery consumption.
```

### Step 3: AI Analysis for Category Detection

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

### Step 4: AI Analysis for Area Tag Prediction

Analyze the crafted issue title and body against area keywords to predict which component areas it will touch.

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

### Step 5: Confirm with User

Before creating the GitHub issue, show the user the crafted title, body, and detected labels, then use the `AskUserQuestion` tool to confirm:

**Display the crafted issue:**

```
Crafted GitHub issue:

Title: Mobile optimizations: conditional visualizer rendering and sparks default

Body:
Two mobile-focused improvements:

1. **Conditional visualizer rendering**: Only render the visualizer when the visualizer tab is actively open on mobile devices...

2. **Sparks default setting**: Change the default value for player sparks to Off...

Category: category:enhancement
Area tags: area:visualizer, area:settings
```

**Then use AskUserQuestion:**

```javascript
AskUserQuestion({
  questions: [
    {
      question: 'Create this GitHub issue?',
      header: 'Confirm',
      multiSelect: false,
      options: [
        {
          label: 'Yes',
          description: 'Create the issue with the title, body, and labels shown above',
        },
        {
          label: 'Cancel',
          description: "Don't create this issue",
        },
      ],
    },
  ],
});
```

**Handle the response:**

- **"Yes"**: Proceed to Step 5.5 (generate slug) and Step 6 (create issue)
- **"Cancel"**: Abort issue creation and inform user
- **"Other" (freeform text)**: User can provide revisions to title, body, or labels. Apply their changes and show confirmation again

### Step 5.5: Generate Worktree Slug

Before creating the issue, generate a URL-friendly slug for the worktree/branch name:

```javascript
function generateSlug(title) {
  // Extract first 3-4 meaningful words from title
  // Convert to lowercase, remove special chars
  // Join with hyphens

  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .split(/\s+/) // Split on whitespace
    .filter((word) => word.length > 2) // Skip short words (a, an, to, etc)
    .slice(0, 3); // Take first 3 words

  return words.join('-');
}
```

**Examples:**

- "Add tempo preset buttons to player controls" → `"tempo-preset-buttons"`
- "Fix visualizer decay pixelated effect" → `"fix-visualizer-decay"`
- "Remove unused MP3 player code" → `"remove-unused-mp3"`

This slug will be stored in the GitHub issue's custom field and used by `init-feature.sh` to create consistent worktree names.

### Step 6: Create GitHub Issue

Use `gh issue create` to create the issue with appropriate labels and the generated slug:

```bash
gh issue create \
  --title "Add particle explosion effect when slider sparks fade out" \
  --body "Add particle explosion effect when slider sparks fade out.

## Areas
- visualizer

---
*Created via /feature:record*" \
  --label "category:enhancement,area:visualizer,status:ready" \
  --field worktree_slug="particle-explosion-effect"
```

**Important:** The `--field worktree_slug="{slug}"` parameter stores the generated slug in the GitHub custom field. This enables the shell scripts to create consistent worktree names.

**Special Cases:**

- If description contains "(PLAN)" or similar research-oriented language, use `status:planning` instead of `status:ready`
- If description contains "(OPTIONAL FUTURE WORK)" or similar, add `optional` label
- If referencing research docs (e.g., E8), include doc path in body

**Capture Issue Number:**

Parse the output from `gh issue create` to extract the created issue number. The command returns the issue URL, which contains the number.

### Step 7: Confirm Completion

After successfully creating the issue:

```
✅ Created issue #47: Add particle explosion effect when slider sparks fade out
   Labels: category:enhancement, area:visualizer, status:ready
   Slug: particle-explosion-effect
   GitHub: https://github.com/jeffdt/homskillet-discography/issues/47

To start working on this issue:
  ./scripts/init-feature.sh 47
```

## Examples

### Example 1: Enhancement

```
User: /feature:record

Claude: What issue would you like to create?

User: Add tempo preset buttons (0.5x, 1x, 1.5x, 2x) to the player controls

Claude: Crafted GitHub issue:

Title: Add tempo preset buttons to player controls

Body:
Add quick-access preset buttons for common tempo adjustments (0.5x, 1x, 1.5x, 2x) to the player controls. This will allow users to quickly switch between standard playback speeds without manually adjusting the tempo slider.

Category: category:enhancement
Area tags: area:player, area:settings

[Uses AskUserQuestion tool with "Yes" and "Cancel" options]

User: [Selects "Yes"]

Claude: ✅ Created issue #52: Add tempo preset buttons to player controls
   Labels: category:enhancement, area:player, area:settings, status:ready
   Slug: tempo-preset-buttons
   GitHub: https://github.com/jeffdt/homskillet-discography/issues/52

To start working on this issue:
  ./scripts/init-feature.sh 52
```

### Example 2: Bug

```
User: /feature:record

Claude: What issue would you like to create?

User: The volume slider doesn't save its position when refreshing the page

Claude: Crafted GitHub issue:

Title: Volume slider position not persisted across page refreshes

Body:
The volume slider resets to its default value when the page is refreshed, losing the user's volume preference. Volume settings should be persisted to localStorage and restored on page load.

Category: category:bug
Area tags: area:player, area:settings

[Uses AskUserQuestion tool with "Yes" and "Cancel" options]

User: [Selects "Yes"]

Claude: ✅ Created issue #53: Volume slider position not persisted across page refreshes
   Labels: category:bug, area:player, area:settings, status:ready
   Slug: volume-slider-position
   GitHub: https://github.com/jeffdt/homskillet-discography/issues/53

To start working on this issue:
  ./scripts/init-feature.sh 53
```

### Example 3: Maintainability

```
User: /feature:record

Claude: What issue would you like to create?

User: Add unit tests for the Sequencer class shuffle and repeat logic

Claude: Crafted GitHub issue:

Title: Add unit tests for Sequencer shuffle and repeat logic

Body:
Add comprehensive unit test coverage for the Sequencer class, focusing on:
- Shuffle algorithm (proper randomization, no immediate repeats)
- Repeat modes (none, one, all)
- Edge cases (single-item playlist, empty playlist)

Currently the Sequencer class has no test coverage, making refactoring risky.

Category: category:maintainability
Area tags: area:build

[Uses AskUserQuestion tool with "Yes" and "Cancel" options]

User: [Selects "Yes"]

Claude: ✅ Created issue #54: Add unit tests for Sequencer shuffle and repeat logic
   Labels: category:maintainability, area:build, status:ready
   Slug: unit-tests-sequencer
   GitHub: https://github.com/jeffdt/homskillet-discography/issues/54

To start working on this issue:
  ./scripts/init-feature.sh 54
```

### Example 4: Context Filtering

```
User: /feature:record

Claude: What issue would you like to create?

User: The sparks look really cool but they're causing performance issues on my phone. I think they should be off by default, especially for mobile. This is just cosmetic so not urgent but would be nice to have.

Claude: Crafted GitHub issue:

Title: Set player sparks default to Off for better mobile performance

Body:
Change the default value for player sparks to Off to improve performance on mobile devices. While the sparks effect is visually appealing, it can cause performance issues on lower-powered devices.

This is a cosmetic optimization and not urgent.

Category: category:enhancement
Area tags: area:visualizer, area:settings

[Uses AskUserQuestion tool with "Yes" and "Cancel" options]

User: [Selects "Yes"]

Claude: ✅ Created issue #55: Set player sparks default to Off for better mobile performance
   Labels: category:enhancement, area:visualizer, area:settings, status:ready
   Slug: player-sparks-default
   GitHub: https://github.com/jeffdt/homskillet-discography/issues/55

To start working on this issue:
  ./scripts/init-feature.sh 55
```

Note: The crafted issue extracts the core request (change default to Off for mobile performance) while omitting meta-commentary like "I think" and personal context like "on my phone".

## Best Practices

1. **Provide Context, Not Verbatim Text**: The user's input is context to help craft the issue. You should synthesize, clarify, and structure their input into a well-formed GitHub issue.
2. **Focus on User Intent**: Extract the core intent from the user's input and craft a title/body that communicates it clearly.
3. **Trust the AI Crafting**: The command will transform raw input into proper issue format. Override only if the crafted version misses important context.
4. **Single Responsibility**: Each issue should focus on one specific task. If user provides multiple unrelated items, consider suggesting separate issues.
5. **Reference Screenshots**: If relevant, mention screenshot paths (`.claude/screenshots/`)
6. **Link Related Items**: If the issue depends on another, mention it with #number syntax in the description

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
