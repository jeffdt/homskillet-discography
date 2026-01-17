---
description: List all active worktrees with their status and details
allowed-tools: Bash
---

# /feature:list - List Active Worktrees

This command displays all active worktrees by scanning the `.worktrees/` directory, fetching metadata from GitHub Issues, and showing their status and details.

## Usage

```bash
# List all active worktrees
/feature:list
```

No arguments needed.

## Workflow

### Step 1: Scan Worktrees Directory

List all directories in `.worktrees/`:

```bash
ls -1 .worktrees/ 2>/dev/null
```

If no worktrees directory exists or it's empty:

```
No active worktrees found.

To create a worktree for an issue, use:
  /feature:init {issue_number}

Example:
  /feature:init 45
```

### Step 2: Parse Issue Numbers

For each directory found, parse the issue number from the directory name:

```javascript
function parseIssueNumber(dirname) {
  // Examples:
  // "45-slider-sparks" → 45
  // "96-reorganize-worktrees" → 96
  // "123-add-feature" → 123

  const match = dirname.match(/^(\d+)-/);
  return match ? parseInt(match[1]) : null;
}
```

### Step 3: Get Git Worktree Info

Query git for worktree details:

```bash
git worktree list --porcelain
```

This returns output like:

```
worktree /Users/hom/code/homskillet-discography
HEAD abc123...
branch refs/heads/main

worktree .worktrees/96-reorganize-worktrees
HEAD def456...
branch refs/heads/feature/96-reorganize-worktrees
```

For each worktree directory, extract:

- Full path
- Branch name
- Current commit

### Step 4: Fetch GitHub Issue Metadata

For each issue number, fetch the GitHub Issue metadata:

```bash
gh issue view {issue_number} --json number,title,state,labels,updatedAt,url
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

### Step 5: Calculate Port

Calculate port from issue number:

```javascript
function calculatePort(issueNumber) {
  return 5000 + issueNumber;
}

// Examples:
// Issue #45 → Port 5045
// Issue #96 → Port 5096
// Issue #123 → Port 5123
```

### Step 6: Display Worktree Summary

Format and display the active worktrees with GitHub Issue metadata:

```
Active Worktrees: (2)

1. Issue #45 - Slider sparks can change color over lifespan through a gradient
   Branch:  feature/45-slider-sparks
   Path:    .worktrees/45-slider-sparks
   Port:    5045
   Areas:   visualizer
   GitHub:  https://github.com/jeffdt/homskillet-discography/issues/45
   Labels:  category:enhancement, area:visualizer, status:active
   State:   open
   Updated: 2 hours ago

   To work on this:
     cd .worktrees/45-slider-sparks
     bun start --port 5045

   Test at: http://localhost:5045

2. Issue #52 - Add ability to play MP3s for covers and remixes
   Branch:  feature/52-mp3-support
   Path:    .worktrees/52-mp3-support
   Port:    5052
   Areas:   player
   GitHub:  https://github.com/jeffdt/homskillet-discography/issues/52
   Labels:  category:enhancement, area:player, status:active
   State:   open
   Updated: 1 day ago

   To work on this:
     cd .worktrees/52-mp3-support
     bun start --port 5052

   Test at: http://localhost:5052

To finish a worktree:
  /feature:finish (from within the worktree directory)

To create a new worktree:
  /feature:init
```

### Step 7: Display Warnings

**Orphaned directories** (couldn't parse issue number):

```
⚠️  Warning: Found directories that don't match expected pattern:
- .worktrees/old-manual-worktree (couldn't parse issue number)

These may have been created manually. Use git worktree list to investigate.
```

**Missing GitHub label** (directory exists but issue doesn't have status:active label):

```
⚠️  Note: Issue #45 worktree exists but doesn't have status:active label
Consider adding it: gh issue edit 45 --add-label "status:active"
```

## Examples

### Example 1: Two Active Worktrees

```
User: /feature:list

Claude: Active Worktrees: (2)

1. Issue #45 - Slider sparks can change color over lifespan through a gradient
   Branch:  feature/45-slider-sparks
   Path:    .worktrees/45-slider-sparks
   Port:    5045
   Areas:   visualizer
   GitHub:  https://github.com/jeffdt/homskillet-discography/issues/45
   Labels:  category:enhancement, area:visualizer, status:active
   Updated: 2 hours ago

   To work on this:
     cd .worktrees/45-slider-sparks
     bun start --port 5045

   Test at: http://localhost:5045

2. Issue #47 - Add particle explosion effect when slider sparks fade out
   Branch:  feature/47-particle-explosion
   Path:    .worktrees/47-particle-explosion
   Port:    5047
   Areas:   visualizer
   GitHub:  https://github.com/jeffdt/homskillet-discography/issues/47
   Labels:  category:enhancement, area:visualizer, status:active
   Updated: 30 minutes ago

   To work on this:
     cd .worktrees/47-particle-explosion
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

### Example 3: One Active Worktree

```
User: /feature:list

Claude: Active Worktrees: (1)

1. Issue #96 - Reorganize worktrees as subdirectories
   Branch:  feature/96-reorganize-worktrees
   Path:    .worktrees/96-reorganize-worktrees
   Port:    5096
   Areas:   build
   GitHub:  https://github.com/jeffdt/homskillet-discography/issues/96
   Labels:  category:maintainability, area:build, status:active
   Updated: 10 minutes ago

   To work on this:
     cd .worktrees/96-reorganize-worktrees
     bun start --port 5096

   Test at: http://localhost:5096

To finish a worktree:
  /feature:finish (from within the worktree directory)

To create a new worktree:
  /feature:init
```

## Best Practices

1. **Regular checks**: Run `/feature:list` periodically to see what's active
2. **Before starting new work**: Check for conflicts with active worktrees
3. **Use proper cleanup**: Always use `/feature:finish` instead of manual deletion
4. **Monitor labels**: Ensure worktrees have the `status:active` label on their issues

## Important Notes

- **Source of truth**: The `.worktrees/` directory is the source of truth for active worktrees
- **Issue number extraction**: Worktree directories must be named `{number}-{slug}` format
- **Port calculation**: Port is automatically calculated as 5000 + issue number
- **Conflict awareness**: Highlights when multiple worktrees touch same areas
- **GitHub integration**: Fetches live metadata from GitHub Issues

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
- #96: Reorganize worktrees
```

### Quick Stats Summary

At the beginning, show quick stats:

```
📊 Worktree Summary:
- Active: 3
- Areas in use: visualizer (2), player (1)
- Ports in use: 5045, 5047, 5052
```

## Edge Cases

**Directory without valid issue number:**

```
⚠️  Warning: Found worktree directory that doesn't match expected pattern:
- .worktrees/my-custom-worktree

This may have been created manually. To integrate it:
1. Rename to follow {issue-number}-{slug} pattern
2. Or remove it with: git worktree remove .worktrees/my-custom-worktree
```

**Git worktree exists but directory is missing:**

```
⚠️  Stale git worktree detected:
Git reports worktree at .worktrees/45-slider-sparks but directory doesn't exist.

To clean up:
  git worktree prune
```

**Permission issues:**

```
Error: Cannot access .worktrees/ directory
Permission denied.

This may indicate a file system or permission problem.
Try: ls -la .worktrees/
```

**Issue not found on GitHub:**

```
⚠️  Warning: Worktree for issue #45 exists but issue not found on GitHub
- Path: .worktrees/45-slider-sparks
- The issue may have been deleted or you may not have access

Consider removing the worktree: git worktree remove .worktrees/45-slider-sparks
```
