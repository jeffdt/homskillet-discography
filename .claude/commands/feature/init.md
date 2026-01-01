---
description: Initialize an isolated worktree for a TODO item
allowed-tools: Read, Edit, Bash, AskUserQuestion
---

# /feature:init - Initialize Worktree for a Feature

This command scaffolds an isolated git worktree for working on a TODO item from `.claude/TODO.md`. It creates the worktree, symlinks dependencies, and prepares everything for development.

After initialization, use `/feature:implement` to actually implement the feature.

## Usage

```bash
# Interactive: Shows available TODO items to choose from
/feature:init

# Direct: Initialize worktree for a specific TODO by ID
/feature:init E16
```

After initialization, CD to the worktree and run `/feature:implement` to begin work.

## Workflow

### Step 1: Read TODO.md and Detect In-Progress Items

Read `.claude/TODO.md` to see all available items. The TODO uses these categories:

- **BUGS** - Bug fixes (labeled B1, B2, etc.)
- **SIMPLIFICATION** - Removing unnecessary code (labeled S1, S2, etc.)
- **ENHANCEMENT** - New features and styling (labeled E1, E2, etc.)
- **MAINTAINABILITY** - Code quality and tooling (labeled M1, M2, etc.)
- **DEPLOYMENT** - Going live tasks (labeled D1, D2, etc.)

**Detect In-Progress Markers:**
Look for items marked with:

- `(WIP)` prefix - Currently being worked on directly
- `(WORKTREE:branch-name)` prefix - Currently being worked on in a worktree

Example WIP marker:

```markdown
**(WIP) E12**: The currently playing song title should not appear left-aligned...
```

Example WORKTREE marker:

```markdown
**(WORKTREE:feature/E16-sparks-gradient) E16**: Slider sparks can change color over lifespan through a gradient. [area:visualizer]
```

**Output Status:**
If any items are in progress, report them:

```
Found items already in progress:
- (WIP) E12: The currently playing song title should not appear left-aligned
  (Working directly on current branch)
- (WORKTREE:feature/E16-sparks-gradient) E16: Slider sparks can change color over lifespan
  (Working in isolated worktree)

These items will be excluded from selection.
```

If no items in progress:

```
No items currently in progress.
```

### Step 2: Analyze In-Progress Items for File Conflicts

For each item marked `(WIP)` or `(WORKTREE:*)`, determine which component areas it touches by reading its `[area:]` tags.

Then exclude ALL other items with overlapping area tags to prevent merge conflicts.

#### File Conflict Matrix

Items are tagged with area labels that map to component areas:

| Area Tag            | Description                            | Example TODO Keywords                              |
| ------------------- | -------------------------------------- | -------------------------------------------------- |
| `[area:visualizer]` | Visualization, spectrogram, animations | visualizer, sparks, slider, spectrogram, frequency |
| `[area:player]`     | Audio playback and controls            | player, audio, tempo, stereo, MP3, volume          |
| `[area:browser]`    | Catalog browsing and navigation        | browser, catalog, albums, metadata, playlist       |
| `[area:settings]`   | UI, themes, and preferences            | settings, themes, styling, animations, CSS         |
| `[area:build]`      | Tests, tooling, dependencies           | TypeScript, tests, build, migration, dependencies  |

**Conflict Detection Logic:**

- If a `(WIP)` or `(WORKTREE:*)` item has `[area:visualizer]`, exclude ALL other items with `[area:visualizer]`
- Items can have multiple area tags: `[area:visualizer] [area:player]` - exclude items matching ANY tag
- Example: If `(WIP) E5` has `[area:visualizer]`, also exclude E1, E3, E14, E16, E17, B1 (all visualizer items)

### Step 3: Filter Available Items

Remove from consideration:

1. All items marked with `(WIP)` prefix
2. All items marked with `(WORKTREE:*)` prefix
3. Items that share area tags with WIP/WORKTREE items (conflict prevention)
4. Items marked with `(PLAN)` prefix (require exploration first)
5. Items marked with `(OPTIONAL FUTURE WORK)` unless user specifically requests them

### Step 4: Select TODO Item

**If user provided ID** (e.g., `/feature:init E16`):

- Verify the ID exists in TODO.md
- Verify it's not marked `(WIP)`, `(WORKTREE:*)`, or excluded due to conflicts
- If valid, use that item
- If invalid/excluded, explain why and show available alternatives

**If no ID provided** (e.g., `/feature:init`):

- Categorize remaining available items by complexity:
  - **Quick Wins**: Simple, well-defined tasks
  - **Medium**: Feature additions with clear scope
  - **Complex**: Requires planning or exploration
- Present 2-4 diverse options from different areas using `AskUserQuestion`
- Include TODO ID, full description, and area tags
- Recommend one option if there's a clear best choice

Example presentation:

```
Which TODO item would you like to work on?

Options:
1. E7: Add ability to play MP3s [area:player] (Medium - new feature)
2. E9: Improve autoplay UX for shared links [area:browser] (Quick win)
3. M5: Investigate bundle size warning [area:build] (Quick win)
4. E6: Add song metadata storage [area:browser] (Complex - needs design)
```

### Step 5: Read Worktree Registry

Read `.claude/worktrees.json` to get list of active worktrees.

### Step 6: Create Worktree

#### Step 6.1: Conflict Detection

Check if the selected TODO's area tags overlap with any active worktree's areas.

Calculate conflict severity:

```javascript
const overlap = selectedItem.areas.filter((a) => worktree.areas.includes(a));

if (overlap.length === 0) {
  severity = 'NONE';
} else if (overlap.length === selectedItem.areas.length) {
  severity = 'HIGH'; // All areas overlap
} else if (selectedItem.areas.length >= 3) {
  severity = 'LOW'; // 1-2 of 3+ areas overlap
} else {
  severity = 'MEDIUM'; // Partial overlap
}
```

**If conflicts detected, warn user:**

```
⚠️  WARNING: Potential conflicts detected

Current active worktrees:
- E16 (feature/E16-fullscreen-viz) [area:visualizer]

Selected E17 [area:visualizer]
Severity: HIGH (all areas overlap)

Both items touch the same component areas. Working on them in parallel
may cause merge conflicts when integrating.

Continue anyway? (yes/no)
```

Allow user to override the warning. If they say no, return to step 4 to select a different item.

#### Step 6.2: Calculate Port

Generate predictable port from TODO ID:

```javascript
function calculatePort(todoId) {
  // Extract category prefix and number
  // B1 → prefix='B', num=1
  // E16 → prefix='E', num=16
  const match = todoId.match(/^([BEMSD])(\d+)$/);
  const prefix = match[1];
  const num = parseInt(match[2]);

  // Category-based port ranges to avoid conflicts
  const basePort = {
    B: 4000, // Bugs: 4001, 4002, ...
    E: 5000, // Enhancements: 5001, 5002, ..., 5016, ...
    M: 6000, // Maintainability: 6001, 6002, ...
    S: 7000, // Simplification: 7001, 7002, ...
    D: 8000, // Deployment: 8001, 8002, ...
  };

  return basePort[prefix] + num;
}

// Examples:
// E16 → 5016
// B1 → 4001
// M5 → 6005
```

#### Step 6.3: Generate Slug

Create URL-friendly slug from TODO description:

```javascript
function generateSlug(description) {
  // Extract first 3-4 meaningful words
  // Remove special characters
  // Convert to lowercase
  // Join with hyphens

  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .split(/\s+/) // Split on whitespace
    .filter((word) => word.length > 2) // Skip short words (a, an, the, etc.)
    .slice(0, 4) // Take first 4 words
    .join('-'); // Join with hyphens
}

// Examples:
// "Slider sparks can change color over lifespan through a gradient"
// → "slider-sparks-change-color"

// "Add ability to play MP3s for the handful of Ableton covers"
// → "ability-play-mp3s-handful"
```

#### Step 6.4: Create Worktree

Use the helper script to create the worktree with optimized setup:

```bash
# Call the helper script with TODO ID, slug, and port
./scripts/create-worktree.sh {ID} {slug} {port}

# Example for E16:
# ./scripts/create-worktree.sh E16 slider-sparks 5016
```

**What the script does:**

1. Creates git worktree at `/Users/hom/code/homskillet-worktrees/{ID}-{slug}/`
2. Creates feature branch `feature/{ID}-{slug}`
3. **Symlinks `node_modules/` from main repo** (instant setup, no duplicate install)
4. Pushes branch to remote and sets upstream
5. Returns detailed output with paths and port

**Symlink Optimization:**

The script symlinks `node_modules` instead of running `bun install` because:

- **Instant setup** - No 30+ second install time
- **No disk duplication** - Saves ~500MB-1GB per worktree
- **Shared dependencies** - Since dependency changes are rare, sharing is safe
- **Still isolated** - Source code and git history remain independent

If you ever need different dependencies in a worktree, simply delete the symlink and run `bun install`:

```bash
cd /Users/hom/code/homskillet-worktrees/E16-slider-sparks
rm node_modules
bun install
```

**Handle errors:**

- If script fails, check if worktree already exists
- If branch already exists, suggest using existing worktree or creating new branch name
- If push fails, continue anyway (user can push later)
- Script includes error handling with `set -e` for safety

#### Step 6.5: Update Registry

Add entry to `.claude/worktrees.json`:

```json
{
  "id": "E16",
  "branch": "feature/E16-slider-sparks",
  "path": "/Users/hom/code/homskillet-worktrees/E16-slider-sparks",
  "todoDescription": "Slider sparks can change color over lifespan through a gradient",
  "areas": ["visualizer"],
  "port": 5016,
  "baseBranch": "main",
  "createdAt": "2025-12-31T20:30:00Z"
}
```

Use current timestamp for `createdAt`.

#### Step 6.6: Update TODO.md Marker

Add `(WORKTREE:branch-name)` marker to the TODO item in `.claude/TODO.md`:

Before:

```markdown
**E16**: Slider sparks can change color over lifespan through a gradient. [area:visualizer]
```

After:

```markdown
**(WORKTREE:feature/E16-slider-sparks) E16**: Slider sparks can change color over lifespan through a gradient. [area:visualizer]
```

#### Step 6.7: Provide User Guidance

```
✅ Created worktree for E16

Worktree Details:
- Branch: feature/E16-slider-sparks
- Path: /Users/hom/code/homskillet-worktrees/E16-slider-sparks
- Port: 5016

To work on this feature:
  cd /Users/hom/code/homskillet-worktrees/E16-slider-sparks
  bun start --port 5016

Test your changes at: http://localhost:5016

When ready:
- Create PR: /pr:draft (from within the worktree)
- Complete work: /feature:finish

The TODO item has been marked with (WORKTREE:feature/E16-slider-sparks) in TODO.md.
```

**Next step:** CD to the worktree and run `/feature:implement` to begin implementation.

## Examples

### Example 1: No Items in Progress, Create Worktree

```
User: /feature:init

Claude: No items currently in progress.

Which TODO item would you like to work on?

[Shows 2-4 options via AskUserQuestion]

User: Selects E16

Claude: Selected E16: Slider sparks can change color over lifespan through a gradient

No conflicts detected with active worktrees.

✅ Created worktree for E16

Worktree Details:
- Branch: feature/E16-slider-sparks
- Path: /Users/hom/code/homskillet-worktrees/E16-slider-sparks
- Port: 5016

To work on this feature:
  cd /Users/hom/code/homskillet-worktrees/E16-slider-sparks
  /feature:implement

Test your changes at: http://localhost:5016 (after starting dev server)
```

### Example 2: Conflict Warning on Worktree Creation

```
User: /feature:init E17

Claude: Selected E17: Visualizer fullscreen should rotate 90 degrees

⚠️  WARNING: Potential conflicts detected

Current active worktrees:
- E16 (feature/E16-slider-sparks) [area:visualizer]

Selected E17 [area:visualizer]
Severity: HIGH (all areas overlap)

Both items touch the same component areas. Working on them in parallel
may cause merge conflicts when integrating.

Continue anyway? (yes/no)

User: no

Claude: Understood. Let's select a different TODO item.

Which TODO item would you like to work on instead?

[Shows alternatives without visualizer area]
```

## Best Practices

1. **Always mark as WORKTREE immediately** - Prevents other agents from selecting the same item
2. **Check git history** - Verify item hasn't been completed before starting work
3. **Respect conflict warnings** - HIGH severity warnings usually indicate real problems
4. **Use /feature:implement after creation** - This command only scaffolds, implementation happens next
5. **Follow project conventions** - Use color palette variables, respect patterns in implementation
6. **Delete completed items** - Remove from TODO.md entirely after finishing, don't just mark [x]

## Important Notes

- **Scaffolding only**: This command only creates the worktree infrastructure. Use `/feature:implement` for actual work
- **Single source of truth**: TODO.md tracks state via `(WORKTREE:*)` markers
- **Worktree registry**: `.claude/worktrees.json` stores worktree metadata for queries
- **Port management**: Each worktree gets predictable port based on TODO ID
- **Area tags are critical**: Enable automatic conflict detection
- **Parallel testing**: Worktrees use different ports, allowing simultaneous testing
- **Next step**: After initialization, CD to the worktree and run `/feature:implement`

## Edge Cases

**Item already has WORKTREE marker:**

```
E16 is already being worked on in worktree: feature/E16-slider-sparks
Path: /Users/hom/code/homskillet-worktrees/E16-slider-sparks

Would you like to:
1. Continue work in that existing worktree (I'll give you the path)
2. Select a different item
```

**Worktree creation fails:**

```
Failed to create worktree: worktree '/Users/hom/code/homskillet-worktrees/E16-slider-sparks' already exists

This likely means the worktree directory exists but isn't tracked in the registry.

Would you like me to:
1. Clean up the existing directory and recreate
2. Add the existing worktree to the registry
3. Cancel and select a different TODO
```

**No items available:**

```
All TODO items are currently being worked on or excluded due to conflicts.

Active worktrees:
- (WORKTREE:feature/E3-visualizer-peak-decay) E3 [area:visualizer]
- (WORKTREE:feature/E18-player-lock-button) E18 [area:player]

This blocks: E1, E5, E14, E16, E17, B1 (visualizer conflicts)

Available when current work completes: E7 (player), E6, E9 (browser), M1, M2, M4, M5 (build)

Would you like to start one of the available items?
```
