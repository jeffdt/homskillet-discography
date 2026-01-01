---
description: Start working on a TODO item (with or without isolated worktree)
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion, TodoWrite, Task
---

# /feature:start - Start Working on a Feature

This command helps you select and begin working on a TODO item from `.claude/TODO.md`. It offers two workflows:

1. **Isolated worktree** - Create a separate working directory for parallel development
2. **Direct work** - Work on the current branch (traditional workflow)

This command replaces the deprecated `/todo:implement` with enhanced worktree support.

## Usage

```bash
# Interactive: Shows available TODO items to choose from
/feature:start

# Direct: Start working on a specific TODO by ID
/feature:start E16
```

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

**If user provided ID** (e.g., `/feature:start E16`):

- Verify the ID exists in TODO.md
- Verify it's not marked `(WIP)`, `(WORKTREE:*)`, or excluded due to conflicts
- If valid, use that item
- If invalid/excluded, explain why and show available alternatives

**If no ID provided** (e.g., `/feature:start`):

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

### Step 5: Ask About Worktree Creation

Once a TODO item is selected, ask the user how they want to work on it:

Use `AskUserQuestion` tool:

```
Selected {ID}: {Description}

How do you want to work on this?
1. Create isolated worktree (recommended for parallel work)
2. Work directly on current branch
```

**When to recommend worktrees:**

- User is already working on other items (active WIP/WORKTREE items exist)
- Item is medium/complex (will take time, may want to switch)
- Item affects multiple files (reduces risk)

**When direct work is fine:**

- Quick wins that can be done in one session
- User has no other active work
- Urgent fixes

### Step 6A: If "Create Isolated Worktree" Selected

#### 6A.1: Read Worktree Registry

Read `.claude/worktrees.json` to get list of active worktrees.

#### 6A.2: Conflict Detection

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

#### 6A.3: Calculate Port

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

#### 6A.4: Generate Slug

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

#### 6A.5: Create Worktree

Execute git commands to create the worktree:

```bash
# 1. Ensure parent directory exists
mkdir -p /Users/hom/code/homskillet-worktrees

# 2. Create worktree with new branch in one command
# Pattern: /Users/hom/code/homskillet-worktrees/{ID}-{slug}/
# Branch: feature/{ID}-{slug}
git worktree add -b feature/{ID}-{slug} /Users/hom/code/homskillet-worktrees/{ID}-{slug}

# Example for E16:
# git worktree add -b feature/E16-slider-sparks /Users/hom/code/homskillet-worktrees/E16-slider-sparks

# 3. Push branch to remote and set upstream
cd /Users/hom/code/homskillet-worktrees/{ID}-{slug}
git push -u origin feature/{ID}-{slug}

# 4. Return to main worktree
cd /Users/hom/code/homskillet-discography
```

**Handle errors:**

- If `git worktree add` fails, check if worktree already exists
- If branch already exists, suggest using existing worktree or creating new branch name
- If push fails, continue anyway (user can push later)

#### 6A.6: Update Registry

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

#### 6A.7: Update TODO.md Marker

Add `(WORKTREE:branch-name)` marker to the TODO item in `.claude/TODO.md`:

Before:

```markdown
**E16**: Slider sparks can change color over lifespan through a gradient. [area:visualizer]
```

After:

```markdown
**(WORKTREE:feature/E16-slider-sparks) E16**: Slider sparks can change color over lifespan through a gradient. [area:visualizer]
```

#### 6A.8: Provide User Guidance

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

**End workflow here** - user will CD to worktree and work there.

### Step 6B: If "Work Directly on Current Branch" Selected

This follows the traditional `/todo:implement` workflow:

#### 6B.1: Mark as WIP

Immediately add `(WIP)` marker to TODO.md to prevent conflicts:

Before:

```markdown
**E7**: Add ability to play MP3s [area:player]
```

After:

```markdown
**(WIP) E7**: Add ability to play MP3s [area:player]
```

#### 6B.2: Check Git History

Verify the item hasn't already been completed:

```bash
# Search for TODO ID in commit messages
git log --all --oneline --grep="E7"

# Search for keywords from description
git log --all --oneline --grep="MP3"
```

If evidence of completion found, ask user:

```
Found commits that may have already completed this:
- abc1234 Add MP3 playback support (E7)

Has this TODO been completed? If so, I'll remove it from TODO.md.
```

#### 6B.3: Use TodoWrite to Plan

Break down the work into subtasks using the `TodoWrite` tool:

```
Working on E7: Add ability to play MP3s

Breaking down into subtasks:
1. Research Web Audio API MP3 decoding
2. Add MP3 to supported file formats in config
3. Update GMEPlayer to handle MP3 files
4. Test with sample MP3 file
5. Update catalog to index MP3 files
```

#### 6B.4: Explore if Needed

For items requiring understanding of existing code, use `Task` tool with `subagent_type=Explore`:

```
Launching exploration agent to understand MP3 playback requirements...
```

#### 6B.5: Follow Project Guidelines

Before implementing, remind yourself:

- **CRITICAL:** Always use CSS variables from the color palette in `src/index.css`
- Use `var(--neutral4)` instead of pure white
- Use `var(--accent)` for interactive elements
- See CLAUDE.md "Design & Styling Guidelines" section for full palette
- Assume dev server (`bun start`) is already running - don't try to start it

#### 6B.6: Implement Changes

Make focused changes that address only the TODO item:

- Don't over-engineer or add unrequested features
- Follow existing code patterns
- Keep changes minimal and focused

#### 6B.7: Request User Verification

After making changes:

```
✅ Implementation complete for E7

Changes made:
- Added MP3 decoder to GMEPlayer.js
- Updated config.ts with MP3 format support
- Modified build-catalog.js to index MP3 files

Please verify the changes work correctly in your running dev server at localhost:3000.

Test by:
1. Adding an MP3 file to public/music/
2. Running bun run build-catalog
3. Checking that the MP3 appears and plays

Does everything work as expected? (yes/no)
```

**Wait for user confirmation.** Do not proceed until user verifies.

#### 6B.8: Update TODO.md

After user confirms it works:

1. **Delete the entire TODO item** from TODO.md (not just remove WIP marker)
2. If section becomes empty, replace with "None!"

Before:

```markdown
## ENHANCEMENT (new features & styling)

**(WIP) E7**: Add ability to play MP3s [area:player]

**E9**: Improve autoplay UX [area:browser]

---
```

After:

```markdown
## ENHANCEMENT (new features & styling)

**E9**: Improve autoplay UX [area:browser]

---
```

## Examples

### Example 1: No Items in Progress, Create Worktree

```
User: /feature:start

Claude: No items currently in progress.

Which TODO item would you like to work on?

[Shows 2-4 options via AskUserQuestion]

User: Selects E16

Claude: Selected E16: Slider sparks can change color over lifespan through a gradient

How do you want to work on this?
1. Create isolated worktree (recommended for parallel work)
2. Work directly on current branch

User: Selects 1

Claude: No conflicts detected with active worktrees.

✅ Created worktree for E16

Worktree Details:
- Branch: feature/E16-slider-sparks
- Path: /Users/hom/code/homskillet-worktrees/E16-slider-sparks
- Port: 5016

To work on this feature:
  cd /Users/hom/code/homskillet-worktrees/E16-slider-sparks
  bun start --port 5016

Test your changes at: http://localhost:5016
```

### Example 2: Conflict Warning on Worktree Creation

```
User: /feature:start E17

Claude: Selected E17: Visualizer fullscreen should rotate 90 degrees

How do you want to work on this?
1. Create isolated worktree (recommended for parallel work)
2. Work directly on current branch

User: Selects 1

Claude: ⚠️  WARNING: Potential conflicts detected

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

### Example 3: Direct Work (No Worktree)

```
User: /feature:start M5

Claude: Selected M5: Investigate bundle size warning [area:build]

How do you want to work on this?
1. Create isolated worktree (recommended for parallel work)
2. Work directly on current branch

User: Selects 2

Claude: Marked M5 as (WIP) in TODO.md

Breaking down work:
1. Run bun run build and capture warning
2. Analyze react-virtualized module directive error
3. Research solutions
4. Implement fix
5. Verify warning is resolved

Starting investigation...

[Continues with implementation]
```

## Best Practices

1. **Always mark as WIP/WORKTREE immediately** - Prevents other agents from selecting the same item
2. **Check git history** - Verify item hasn't been completed before starting work
3. **Use TodoWrite for multi-step items** - Break down complex work to track progress
4. **Prefer worktrees for parallel work** - Enables context switching and isolation
5. **Respect conflict warnings** - HIGH severity warnings usually indicate real problems
6. **Follow project conventions** - Use color palette variables, respect patterns
7. **Wait for user verification** - Don't assume changes work without testing
8. **Delete completed items** - Remove from TODO.md entirely, don't just mark [x]

## Important Notes

- **Replaces /todo:implement**: This command supersedes the old `/todo:implement` workflow
- **Single source of truth**: TODO.md tracks state via `(WIP)` and `(WORKTREE:*)` markers
- **Worktree registry**: `.claude/worktrees.json` stores worktree metadata for queries
- **Port management**: Each worktree gets predictable port based on TODO ID
- **Area tags are critical**: Enable automatic conflict detection
- **Dev server**: Assume it's running on main repo at localhost:3000 for direct work
- **Parallel testing**: Worktrees use different ports, allowing simultaneous testing

## Edge Cases

**Item already has WIP marker:**

```
E12 is already marked (WIP) in TODO.md.
Either another agent is working on it, or the marker is stale.
Would you like to:
1. Take over this item (remove stale WIP marker)
2. Select a different item
```

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

Active work:
- (WIP) E12 [area:browser]
- (WORKTREE:feature/E16-slider-sparks) E16 [area:visualizer]

This blocks: E6, E9 (browser conflicts) and E1, E3, E5, E14, E17, B1 (visualizer conflicts)

Available when current work completes: E7, E18 (player), M1, M2, M4, M5 (build)

Would you like to start one of the available items?
```
