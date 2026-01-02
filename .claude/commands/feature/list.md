---
description: List all active worktrees with their status and details
allowed-tools: Bash
---

# /feature:list - List Active Worktrees

This command displays all active worktrees tracked in the registry, validates they still exist, and shows their metadata including GitHub Issue number, description, port, areas, and GitHub Issue status.

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

To create a worktree for an issue, use:
  /feature:init {issue_number}

Example:
  /feature:init 45
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

### Step 4: Fetch GitHub Issue Metadata

For each active worktree, fetch the GitHub Issue metadata:

```bash
gh issue view {githubIssue} --json number,title,state,labels,updatedAt,url
```

Extract:

- Issue number
- Title
- State (open/closed)
- Labels (especially category and area labels)
- Last updated timestamp
- GitHub URL

Example:

```bash
gh issue view 45 --json number,title,state,labels,updatedAt,url
```

### Step 5: Display Worktree Summary

Format and display the active worktrees with GitHub Issue metadata:

```
Active Worktrees: (2)

1. Issue #45 - Slider sparks can change color over lifespan through a gradient
   Branch:  feature/45-slider-sparks
   Path:    /Users/hom/code/homskillet-worktrees/45-slider-sparks
   Port:    5045
   Areas:   visualizer
   GitHub:  https://github.com/jeffdt/homskillet-discography/issues/45
   Labels:  category:enhancement, area:visualizer, worktree:active
   State:   open
   Updated: 2 hours ago
   Created: 3 hours ago

   To work on this:
     cd /Users/hom/code/homskillet-worktrees/45-slider-sparks
     bun start --port 5045

   Test at: http://localhost:5045

2. Issue #52 - Add ability to play MP3s for covers and remixes
   Branch:  feature/52-mp3-support
   Path:    /Users/hom/code/homskillet-worktrees/52-mp3-support
   Port:    5052
   Areas:   player
   GitHub:  https://github.com/jeffdt/homskillet-discography/issues/52
   Labels:  category:enhancement, area:player, worktree:active
   State:   open
   Updated: 1 day ago
   Created: 1 day ago

   To work on this:
     cd /Users/hom/code/homskillet-worktrees/52-mp3-support
     bun start --port 5052

   Test at: http://localhost:5052

To finish a worktree:
  /feature:finish (from within the worktree directory)

To create a new worktree:
  /feature:init
```

### Step 6: Display Stale Worktrees (if any)

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

### Step 7: Calculate Time Ago

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

1. Issue #45 - Slider sparks can change color over lifespan through a gradient
   Branch:  feature/45-slider-sparks
   Path:    /Users/hom/code/homskillet-worktrees/45-slider-sparks
   Port:    5045
   Areas:   visualizer
   GitHub:  https://github.com/jeffdt/homskillet-discography/issues/45
   Labels:  category:enhancement, area:visualizer, worktree:active
   Updated: 2 hours ago
   Created: 3 hours ago

   To work on this:
     cd /Users/hom/code/homskillet-worktrees/45-slider-sparks
     bun start --port 5045

   Test at: http://localhost:5045

2. Issue #47 - Add particle explosion effect when slider sparks fade out
   Branch:  feature/47-particle-explosion
   Path:    /Users/hom/code/homskillet-worktrees/47-particle-explosion
   Port:    5047
   Areas:   visualizer
   GitHub:  https://github.com/jeffdt/homskillet-discography/issues/47
   Labels:  category:enhancement, area:visualizer, worktree:active
   Updated: 30 minutes ago
   Created: 1 hour ago

   To work on this:
     cd /Users/hom/code/homskillet-worktrees/47-particle-explosion
     bun start --port 5047

   Test at: http://localhost:5047

⚠️  Note: Both worktrees affect visualizer area - be mindful of merge conflicts.

To finish a worktree:
  /feature:finish (from within the worktree directory)

To create a new worktree:
  /feature:init
```

### Example 2: No Active Worktrees

```
User: /feature:list

Claude: No active worktrees found.

To create a worktree for an issue, use:
  /feature:init {issue_number}

Example:
  /feature:init 45

Or use /feature:init without an issue number to see available issues.
```

### Example 3: One Active, One Stale

```
User: /feature:list

Claude: Active Worktrees: (1)

1. Issue #45 - Slider sparks can change color over lifespan through a gradient
   Branch:  feature/45-slider-sparks
   Path:    /Users/hom/code/homskillet-worktrees/45-slider-sparks
   Port:    5045
   Areas:   visualizer
   GitHub:  https://github.com/jeffdt/homskillet-discography/issues/45
   Labels:  category:enhancement, area:visualizer, worktree:active
   Created: 2 hours ago

   To work on this:
     cd /Users/hom/code/homskillet-worktrees/45-slider-sparks
     bun start --port 5045

   Test at: http://localhost:5045

⚠️  Stale Worktrees: (1)

- Issue #43 - Make time slider wavy/ripply
  Branch: feature/43-wavy-slider
  Path: /Users/hom/code/homskillet-worktrees/43-wavy-slider (NOT FOUND)

The worktree was likely removed manually. To clean up:
1. Manually edit .claude/worktrees.json to remove the stale entry
2. Or recreate the worktree using /feature:init 43
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
- #45 and #47 both affect visualizer area
- May cause merge conflicts when integrating

Consider finishing one before continuing the other.
```

### Grouping by Area

Optionally group worktrees by their primary area:

```
Active Worktrees by Area:

[visualizer] (2)
- #45: Slider sparks gradient
- #47: Fullscreen rotation

[player] (1)
- #52: MP3 support

[build] (1)
- #54: Bundle size investigation
```

### Quick Stats Summary

At the beginning, show quick stats:

```
📊 Worktree Summary:
- Active: 3
- Stale: 1
- Areas in use: visualizer (2), player (1)
- Oldest: #45 (2 days ago)
- Newest: #54 (30 minutes ago)
```

## Edge Cases

**Empty registry but git shows worktrees:**

```
No worktrees tracked in registry, but git reports active worktrees:
- /Users/hom/code/homskillet-worktrees/some-manual-worktree

These were likely created manually outside of /feature:init.
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
