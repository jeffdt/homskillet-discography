---
name: github-issues
description: Manage GitHub Issues for task tracking. Use when creating, listing, updating, or closing issues. Handles labels, project boards, and issue state management.
allowed-tools: Bash, Read
---

# GitHub Issues Management

This skill provides GitHub Issues operations for the Homskillet Discography project.

## Label System

**Category Labels:**

- `category:bug` - Bug fixes
- `category:enhancement` - New features and improvements
- `category:maintainability` - Code quality, tests, tooling
- `category:simplification` - Code removal/cleanup
- `category:deployment` - Infrastructure and deployment

**Area Labels:**

- `area:visualizer` - Visualization, spectrogram, animations
- `area:player` - Audio playback and controls
- `area:browser` - Catalog browsing and navigation
- `area:settings` - UI, themes, and preferences
- `area:build` - Tests, tooling, dependencies

**Status Labels:**

- `status:planning` - Not ready to work on (requires exploration/research)
- `status:ready` - Ready to be worked on (default for new issues)
- `status:active` - Currently being worked on (auto-managed by worktree scripts)

**Special Labels:**

- `optional` - Optional future work

## Core Operations

### Listing Issues

Use `gh issue list` with filters to query issues:

```bash
# List all open issues
gh issue list --state open

# Filter by area
gh issue list --label "area:visualizer"

# Filter by category
gh issue list --label "category:bug"

# Filter by status
gh issue list --label "status:ready"

# Exclude worktree-active issues
gh issue list --label "!status:active"

# Combine filters (ready visualizer issues not in a worktree)
gh issue list --label "area:visualizer" --label "status:ready" --label "!status:active"

# Get JSON output for programmatic use
gh issue list --json number,title,labels,state --limit 100
```

### Creating Issues

Use `gh issue create` to create new issues:

```bash
# Create issue with title, body, and labels
gh issue create \
  --title "Issue title here" \
  --body "Description of the issue

## Areas
- visualizer

---
*Created via /feature:record*" \
  --label "category:enhancement,area:visualizer,status:ready"
```

**Label Selection Logic:**

- **Category** - Determined by AI analysis of description (bug, enhancement, maintainability, simplification, deployment)
- **Area** - Determined by keywords in description (visualizer, player, browser, settings, build)
- **Status** - Default to `status:ready` unless marked as PLAN (use `status:planning`)

### Updating Issues

Use `gh issue edit` to update issue labels:

```bash
# Add labels
gh issue edit 45 --add-label "status:active"

# Remove labels
gh issue edit 45 --remove-label "status:active"

# Add comment
gh issue comment 45 --body "Worktree created at .worktrees/45-title"
```

### Closing Issues

Use `gh issue close` to close completed issues:

```bash
# Close with comment
gh issue close 45 --comment "Merged in PR #67"
```

### Filtering for Available Issues

When selecting issues for `/feature:init`, filter out issues with `status:active` label (already being worked on):

```bash
# Get available issues
gh issue list \
  --label "!status:active" \
  --json number,title,labels
```

### Area-Based Conflict Detection

Extract area labels from issues and compare with active worktrees to detect conflicts:

1. Get area labels from issue: `gh issue view {num} --json labels`
2. Parse `area:*` labels from the response
3. Cross-reference with `.worktrees/ directory` active worktree areas
4. Flag conflicts if areas overlap

## Integration with Feature Commands

### /feature:record

- Prompts user for description
- AI detects category from keywords
- AI predicts area tags from keywords
- Creates GitHub issue with appropriate labels
- Returns issue number for reference

### /feature:init

- Lists available issues (excluding status:active, status:wip, status:blocked)
- Detects area conflicts with active worktrees
- On selection, adds `status:active` label
- Adds worktree metadata to issue comments
- Worktree tracked via directory name and GitHub label

### /feature:finish

- On merge: closes issue with comment, removes worktree directory
- On abandon: removes `status:active` label, keeps issue open

### /feature:list

- Fetches GitHub issue metadata for each worktree
- Displays issue number, title, labels, URL

## Additional Resources

For detailed workflow patterns, see [WORKFLOWS.md](WORKFLOWS.md)

For gh CLI command reference, see [CLI-REFERENCE.md](CLI-REFERENCE.md)
