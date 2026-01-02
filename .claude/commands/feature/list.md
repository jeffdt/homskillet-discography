---
description: List all active worktrees with their status and details
allowed-tools: Read, Bash
---

# /feature:list - List Active Worktrees

This command displays all active worktrees tracked in the registry, validates they still exist, and shows their metadata including TODO ID, description, port, and areas.

## Usage

```bash
# List all active worktrees
/feature:list
```

No arguments needed.

## Workflow

### Step 1: Read Worktree Registry

Read `.claude/worktrees.json` to get the list of tracked worktrees.

If the file doesn't exist or is empty:

```
No active worktrees found.

To create a worktree for a TODO item, use:
  /feature:start {TODO_ID}

Example:
  /feature:start E16
```

### Step 2: Get Active Worktrees from Git

Query git for the actual list of worktrees:

```bash
git worktree list --porcelain
```

This returns output like:

```
worktree /Users/hom/code/homskillet-discography
HEAD abc123...
branch refs/heads/main

worktree /Users/hom/code/homskillet-worktrees/E16-slider-sparks
HEAD def456...
branch refs/heads/feature/E16-slider-sparks
```

Parse this to extract all worktree paths.

### Step 3: Validate Each Registry Entry

For each worktree in `.claude/worktrees.json`, check if its path appears in the git worktree list output.

Mark worktrees as:

- **ACTIVE**: Path found in git worktree list
- **STALE**: Path not found (directory deleted, worktree removed manually)

### Step 4: Display Worktree Summary

Format and display the active worktrees:

```
Active Worktrees: (2)

1. E16 - Slider sparks can change color over lifespan through a gradient
   Branch:  feature/E16-slider-sparks
   Path:    /Users/hom/code/homskillet-worktrees/E16-slider-sparks
   Port:    5016
   Areas:   [visualizer]
   Created: 2 hours ago

   To work on this:
     cd /Users/hom/code/homskillet-worktrees/E16-slider-sparks
     bun start --port 5016

   Test at: http://localhost:5016

2. E7 - Add ability to play MP3s for covers and remixes
   Branch:  feature/E7-mp3-support
   Path:    /Users/hom/code/homskillet-worktrees/E7-mp3-support
   Port:    5007
   Areas:   [player]
   Created: 1 day ago

   To work on this:
     cd /Users/hom/code/homskillet-worktrees/E7-mp3-support
     bun start --port 5007

   Test at: http://localhost:5007

To finish a worktree:
  /feature:finish (from within the worktree directory)

To create a new worktree:
  /feature:start
```

### Step 5: Display Stale Worktrees (if any)

If any worktrees in the registry are marked STALE:

```
⚠️  Stale Worktrees: (1)

These worktrees are in the registry but no longer exist on disk:

- E5 - Make time slider wavy/ripply
  Branch: feature/E5-wavy-slider
  Path: /Users/hom/code/homskillet-worktrees/E5-wavy-slider (NOT FOUND)

This can happen if the worktree was removed manually instead of using /feature:finish.

To clean up stale entries:
  1. Manually edit .claude/worktrees.json to remove the entry
  2. Use /feature:finish to properly clean up next time
```

### Step 6: Calculate Time Ago

Convert `createdAt` timestamp to relative time:

```javascript
function timeAgo(timestamp) {
  const now = new Date();
  const created = new Date(timestamp);
  const diffMs = now - created;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

// Examples:
// 30 minutes → "30 minutes ago"
// 2 hours → "2 hours ago"
// 1 day → "1 day ago"
// 5 days → "5 days ago"
```

## Examples

### Example 1: Two Active Worktrees

```
User: /feature:list

Claude: Active Worktrees: (2)

1. E16 - Slider sparks can change color over lifespan through a gradient
   Branch:  feature/E16-slider-sparks
   Path:    /Users/hom/code/homskillet-worktrees/E16-slider-sparks
   Port:    5016
   Areas:   [visualizer]
   Created: 3 hours ago

   To work on this:
     cd /Users/hom/code/homskillet-worktrees/E16-slider-sparks
     bun start --port 5016

   Test at: http://localhost:5016

2. E19 - Add particle explosion effect when slider sparks fade out
   Branch:  feature/E19-particle-explosion
   Path:    /Users/hom/code/homskillet-worktrees/E19-particle-explosion
   Port:    5019
   Areas:   [visualizer]
   Created: 1 hour ago

   To work on this:
     cd /Users/hom/code/homskillet-worktrees/E19-particle-explosion
     bun start --port 5019

   Test at: http://localhost:5019

⚠️  Note: Both worktrees affect [visualizer] area - be mindful of merge conflicts.

To finish a worktree:
  /feature:finish (from within the worktree directory)

To create a new worktree:
  /feature:start
```

### Example 2: No Active Worktrees

```
User: /feature:list

Claude: No active worktrees found.

To create a worktree for a TODO item, use:
  /feature:start {TODO_ID}

Example:
  /feature:start E16

Or use /feature:start without an ID to see available TODO items.
```

### Example 3: One Active, One Stale

```
User: /feature:list

Claude: Active Worktrees: (1)

1. E16 - Slider sparks can change color over lifespan through a gradient
   Branch:  feature/E16-slider-sparks
   Path:    /Users/hom/code/homskillet-worktrees/E16-slider-sparks
   Port:    5016
   Areas:   [visualizer]
   Created: 2 hours ago

   To work on this:
     cd /Users/hom/code/homskillet-worktrees/E16-slider-sparks
     bun start --port 5016

   Test at: http://localhost:5016

⚠️  Stale Worktrees: (1)

- E5 - Make time slider wavy/ripply
  Branch: feature/E5-wavy-slider
  Path: /Users/hom/code/homskillet-worktrees/E5-wavy-slider (NOT FOUND)

The worktree was likely removed manually. To clean up:
1. Manually edit .claude/worktrees.json to remove the stale entry
2. Or recreate the worktree using /feature:start E5
```

## Best Practices

1. **Regular checks**: Run `/feature:list` periodically to see what's active
2. **Before starting new work**: Check for conflicts with active worktrees
3. **Monitor stale entries**: Clean them up to keep registry accurate
4. **Use proper cleanup**: Always use `/feature:finish` instead of manual deletion

## Important Notes

- **Registry is source of truth**: `.claude/worktrees.json` (local file, not in git) tracks all active worktrees
- **Stale detection**: Compares registry against `git worktree list`
- **Port information**: Shows which port to use for testing each worktree
- **Conflict awareness**: Highlights when multiple worktrees touch same areas
- **Time tracking**: Shows how long ago each worktree was created
- **No TODO.md markers**: Worktree tracking is done purely through worktrees.json, not TODO.md

## Additional Features

### Conflict Detection in Listing

If multiple active worktrees share area tags, add a warning:

```
⚠️  Overlap detected:
- E16 and E17 both affect [visualizer] area
- May cause merge conflicts when integrating

Consider finishing one before continuing the other.
```

### Grouping by Area

Optionally group worktrees by their primary area:

```
Active Worktrees by Area:

[visualizer] (2)
- E16: Slider sparks gradient
- E17: Fullscreen rotation

[player] (1)
- E7: MP3 support

[build] (1)
- M5: Bundle size investigation
```

### Quick Stats Summary

At the beginning, show quick stats:

```
📊 Worktree Summary:
- Active: 3
- Stale: 1
- Areas in use: visualizer (2), player (1)
- Oldest: E16 (2 days ago)
- Newest: M5 (30 minutes ago)
```

## Edge Cases

**Empty registry but git shows worktrees:**

```
No worktrees tracked in registry, but git reports active worktrees:
- /Users/hom/code/homskillet-worktrees/some-manual-worktree

These were likely created manually outside of /feature:start.
Would you like me to import them into the registry?
```

**Registry file corrupt/invalid:**

```
Error reading worktree registry (.claude/worktrees.json):
Invalid JSON or missing version field.

The registry may be corrupted. Options:
1. Rebuild registry from git worktree list
2. Reset to empty registry (lose metadata like ports, descriptions)
3. Manually fix the JSON file
```

**Permission issues:**

```
Error: Cannot access worktree path /Users/hom/code/homskillet-worktrees/E16-slider-sparks
Permission denied.

This may indicate a file system or permission problem.
Try: ls -la /Users/hom/code/homskillet-worktrees/
```
