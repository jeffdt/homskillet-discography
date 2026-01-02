---
description: Initialize an isolated worktree for a GitHub Issue
allowed-tools: Bash, AskUserQuestion
---

# /feature:init - Initialize Worktree for a Feature

This command scaffolds an isolated git worktree for working on a GitHub Issue. It creates the worktree, symlinks dependencies, updates the issue labels, and prepares everything for development.

## Usage

```bash
# Interactive: Shows available issues to choose from
/feature:init

# Direct: Initialize worktree for a specific issue by number
/feature:init 47
```

After initialization, CD to the worktree to begin work.

## Workflow

### Step 1: Query GitHub Issues

Query all open GitHub Issues and filter for available ones:

```bash
gh issue list \
  --state open \
  --label "!worktree:active" \
  --label "!status:wip" \
  --label "!status:blocked" \
  --json number,title,labels \
  --limit 100
```

**Label Filtering:**

- Exclude issues with `worktree:active` label (already have a worktree)
- Exclude issues with `status:wip` label (being worked on directly)
- Exclude issues with `status:blocked` label (blocked by dependencies)

**Parse Issue Data:**
For each issue, extract:

- Issue number
- Title
- Category label (category:\*)
- Area labels (area:\*)

**Output Status:**

```
Found N available issues
Active worktrees: M
Available to work on: N
```

### Step 2: Load Active Worktrees and Detect Conflicts

Read `.claude/worktrees.json` to get active worktrees.

For each active worktree, get its issue number and area tags.

Cross-reference with available issues to detect area conflicts.

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

- If a `(WIP)` item has `[area:visualizer]`, exclude ALL other items with `[area:visualizer]`
- If an active worktree (from worktrees.json) has `[area:visualizer]`, exclude ALL other items with `[area:visualizer]`
- Items can have multiple area tags: `[area:visualizer] [area:player]` - exclude items matching ANY tag
- Example: If `(WIP) E5` has `[area:visualizer]`, also exclude E1, E3, E14, E16, E17, B1 (all visualizer items)

### Step 3: Filter Available Items

Remove from consideration:

1. All items marked with `(WIP)` prefix
2. All items whose TODO IDs match active worktrees in worktrees.json
3. Items that share area tags with WIP items or active worktrees (conflict prevention)
4. Items marked with `(PLAN)` prefix (require exploration first)
5. Items marked with `(OPTIONAL FUTURE WORK)` unless user specifically requests them

### Step 4: Select Issue

**If user provided issue number** (e.g., `/feature:init 47`):

- Verify the issue exists and is open
- Verify it doesn't have `worktree:active`, `status:wip`, or `status:blocked` labels
- Verify it's not excluded due to area conflicts
- If valid, use that issue
- If invalid/excluded, explain why and show available alternatives

**If no issue number provided** (e.g., `/feature:init`):

- Categorize available issues by category label:
  - category:bug
  - category:enhancement
  - category:maintainability
  - category:simplification
- Present 2-4 diverse options from different areas using `AskUserQuestion`
- Include issue number, title, and area labels
- Recommend one option if there's a clear best choice

Example presentation:

```
Which issue would you like to work on?

Options:
1. #52: Add tempo preset buttons to player controls (category:enhancement, area:player)
2. #53: Volume slider doesn't save position on refresh (category:bug, area:player)
3. #54: Add unit tests for Sequencer class (category:maintainability, area:build)
4. #55: Add song metadata storage (category:enhancement, area:browser)
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

Generate predictable port from issue number:

```javascript
function calculatePort(issueNumber) {
  // Use issue number directly with 5000 base
  // Issue #45 → 5045
  // Issue #123 → 5123
  return 5000 + issueNumber;
}

// Examples:
// #45 → 5045
// #52 → 5052
// #123 → 5123
```

#### Step 6.3: Generate Slug

Create URL-friendly slug from issue number and title:

```javascript
function generateSlug(issueNumber, title) {
  // Include issue number + first 3-4 meaningful words
  // Remove special characters
  // Convert to lowercase
  // Join with hyphens

  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .split(/\s+/) // Split on whitespace
    .filter((word) => word.length > 2) // Skip short words
    .slice(0, 3); // Take first 3 words

  return `${issueNumber}-${words.join('-')}`;
}

// Examples:
// #45, "Slider sparks can change color over lifespan through a gradient"
// → "45-slider-sparks-change"

// #52, "Add tempo preset buttons to player controls"
// → "52-tempo-preset-buttons"
```

#### Step 6.4: Create Worktree

Use the helper script to create the worktree with optimized setup:

```bash
# Call the helper script with issue number, slug, and port
./scripts/create-worktree.sh {issue_number} {slug} {port}

# Example for issue #45:
# ./scripts/create-worktree.sh 45 45-slider-sparks 5045
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

#### Step 6.5: Update GitHub Issue

Add `worktree:active` label to the issue and add a comment:

```bash
# Add worktree:active label
gh issue edit {issue_number} --add-label "worktree:active"

# Add comment with worktree details
gh issue comment {issue_number} --body "Worktree created:
- Path: /Users/hom/code/homskillet-worktrees/{slug}
- Port: {port}
- Branch: feature/{slug}"
```

Example for issue #45:

```bash
gh issue edit 45 --add-label "worktree:active"
gh issue comment 45 --body "Worktree created:
- Path: /Users/hom/code/homskillet-worktrees/45-slider-sparks
- Port: 5045
- Branch: feature/45-slider-sparks"
```

#### Step 6.6: Update Registry

Add entry to `.claude/worktrees.json`:

```json
{
  "githubIssue": 45,
  "branch": "feature/45-slider-sparks",
  "slug": "45-slider-sparks",
  "path": "/Users/hom/code/homskillet-worktrees/45-slider-sparks",
  "todoDescription": "Slider sparks can change color over lifespan through a gradient",
  "areas": ["visualizer"],
  "port": 5045,
  "baseBranch": "main",
  "createdAt": "2026-01-02T20:30:00Z"
}
```

**Note:** Use `githubIssue` field instead of old `id` field. The `todoDescription` field contains the issue title.

Use current timestamp for `createdAt`.

#### Step 6.7: Provide User Guidance

```
✅ Created worktree for issue #45

Worktree Details:
- Issue: #45 - Slider sparks can change color over lifespan through a gradient
- Branch: feature/45-slider-sparks
- Path: /Users/hom/code/homskillet-worktrees/45-slider-sparks
- Port: 5045
- GitHub: https://github.com/jeffdt/homskillet-discography/issues/45

To work on this feature:
  cd /Users/hom/code/homskillet-worktrees/45-slider-sparks
  bun start --port 5045

Test your changes at: http://localhost:5045

When ready:
- Create PR: /pr:draft (from within the worktree)
- Complete work: /feature:finish

The worktree has been registered in .claude/worktrees.json and the issue labeled with worktree:active.
```

## Examples

### Example 1: Interactive Selection, Create Worktree

```
User: /feature:init

Claude: Found 12 available issues
Active worktrees: 0
Available to work on: 12

Which issue would you like to work on?

[Shows 2-4 options via AskUserQuestion]

User: Selects #45

Claude: Selected #45: Slider sparks can change color over lifespan through a gradient

No conflicts detected with active worktrees.

✅ Created worktree for issue #45

Worktree Details:
- Issue: #45 - Slider sparks can change color over lifespan through a gradient
- Branch: feature/45-slider-sparks
- Path: /Users/hom/code/homskillet-worktrees/45-slider-sparks
- Port: 5045
- GitHub: https://github.com/jeffdt/homskillet-discography/issues/45

To work on this feature:
  cd /Users/hom/code/homskillet-worktrees/45-slider-sparks
  bun start --port 5045

Test your changes at: http://localhost:5045
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

1. **Always register worktree immediately** - Prevents other agents from selecting the same item
2. **Check git history** - Verify item hasn't been completed before starting work
3. **Respect conflict warnings** - HIGH severity warnings usually indicate real problems
4. **Use /feature:implement after creation** - This command only scaffolds, implementation happens next
5. **Follow project conventions** - Use color palette variables, respect patterns in implementation
6. **Delete completed items** - Remove from TODO.md entirely after finishing, don't just mark [x]

## Important Notes

- **Scaffolding only**: This command only creates the worktree infrastructure. Use `/feature:implement` for actual work
- **Worktree tracking**: `.claude/worktrees.json` (local file, not in git) is the source of truth for active worktrees
- **TODO.md only tracks WIP**: Only `(WIP)` markers appear in TODO.md for items being worked on directly
- **Port management**: Each worktree gets predictable port based on TODO ID
- **Area tags are critical**: Enable automatic conflict detection
- **Parallel testing**: Worktrees use different ports, allowing simultaneous testing
- **Next step**: After initialization, CD to the worktree and run `/feature:implement`

## Edge Cases

**Item already has active worktree:**

```
E16 is already being worked on in an active worktree:
Branch: feature/E16-slider-sparks
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

Active worktrees (from worktrees.json):
- E3 [area:visualizer] - feature/E3-visualizer-peak-decay
- E18 [area:player] - feature/E18-player-lock-button

This blocks: E1, E5, E14, E16, E17, B1 (visualizer conflicts)

Available when current work completes: E7 (player), E6, E9 (browser), M1, M2, M4, M5 (build)

Would you like to start one of the available items?
```
