# GitHub Issues Workflows

This document describes detailed workflow patterns for managing GitHub Issues in the Homskillet Discography project.

## Workflow 1: Creating New Issues (/feature:record)

### Steps

1. **Prompt User for Description**
   - Ask user to describe the task/bug/feature
   - Get full description with context

2. **AI Category Detection**
   - Analyze description for keywords
   - Map to category label:
     - **bug** - Keywords: fix, bug, broken, error, issue, incorrect, wrong
     - **enhancement** - Keywords: add, new, feature, improve, enhance, implement
     - **maintainability** - Keywords: refactor, test, clean, quality, tooling, dependency
     - **simplification** - Keywords: remove, delete, simplify, strip, eliminate
     - **deployment** - Keywords: deploy, infrastructure, CI/CD, hosting, build pipeline

3. **AI Area Tag Prediction**
   - Analyze description for area keywords:
     - **visualizer** - Keywords: visualizer, visualization, animation, canvas, spectrogram, analyzer, graphics
     - **player** - Keywords: player, audio, playback, sound, music, tempo, volume, NSF
     - **browser** - Keywords: browser, catalog, directory, navigation, file, folder, list
     - **settings** - Keywords: settings, preferences, UI, theme, controls, configuration
     - **build** - Keywords: build, test, bundler, webpack, typescript, dependencies

4. **User Confirmation**
   - Show detected category and area(s)
   - Allow user to confirm or modify

5. **Create GitHub Issue**

   ```bash
   gh issue create \
     --title "{description}" \
     --body "{full_description}

   ## Areas
   - {area1}
   - {area2}

   ---
   *Created via /feature:record*" \
     --label "category:{category},area:{area1},area:{area2},status:ready"
   ```

6. **Display Result**
   - Show created issue number
   - Show GitHub URL
   - Remind user they can use `/feature:init {number}` to start work

### Special Cases

- **Items marked (PLAN)**: Add `status:planning` label instead of `status:ready`
- **Items marked (OPTIONAL FUTURE WORK)**: Add `optional` label
- **Items with existing research docs**: Reference doc path in body

---

## Workflow 2: Querying Available Issues (/feature:init)

### Steps

1. **Query Open Issues**

   ```bash
   gh issue list \
     --state open \
     --label "!worktree:active" \
     --label "!status:wip" \
     --label "!status:blocked" \
     --json number,title,labels \
     --limit 100
   ```

2. **Parse Issue Data**
   - Extract issue number
   - Extract title
   - Extract area labels (filter for `area:*` prefix)

3. **Load Active Worktrees**
   - Scan `.worktrees/` directory
   - Extract area tags from each active worktree's issue

4. **Detect Conflicts**
   For each available issue:
   - Compare issue's area labels with each active worktree's areas
   - Calculate conflict level:
     - **NONE**: No overlapping areas
     - **LOW**: One overlapping area, but different categories
     - **MEDIUM**: One overlapping area, same category
     - **HIGH**: Multiple overlapping areas

5. **Filter and Present Options**
   - Show available issues grouped by category
   - Mark conflicts with warnings
   - Let user select issue number

6. **Create Worktree**
   - Generate slug: `{issue_number}-{first-few-words-of-title}`
   - Generate port: Based on issue number (e.g., issue #45 → port 5045)
   - Create worktree via `scripts/create-worktree.sh`

7. **Update Issue State**

   ```bash
   # Add worktree:active label
   gh issue edit {number} --add-label "worktree:active"

   # Add comment with worktree metadata
   gh issue comment {number} --body "Worktree created:
   - Path: .worktrees/{slug}
   - Port: {port}
   - Branch: feature/{slug}"
   ```

8. **Update Worktree Registry**
   Create worktree directory:
   ```json
   {
     "githubIssue": 45,
     "branch": "feature/45-slider-sparks",
     "slug": "45-slider-sparks",
     "path": ".worktrees/45-slider-sparks",
     "todoDescription": "Slider sparks can change color over lifespan through a gradient",
     "areas": ["visualizer"],
     "port": 5045,
     "baseBranch": "main",
     "createdAt": "2026-01-02T20:00:00Z"
   }
   ```

---

## Workflow 3: Completing Work (/feature:finish)

### Path A: Merge to Main

1. **Verify Clean State**
   - Check for uncommitted changes
   - Check if pushed to remote

2. **Merge to Main**
   - Switch to main
   - Merge feature branch
   - Push to remote

3. **Clean Up**

   ```bash
   ./scripts/finish-feature.sh {number}
   ```

   This will:
   - Close the GitHub issue with "Completed and merged to main" comment
   - Remove the worktree directory
   - Delete local and remote branches

### Path B: Create Pull Request

1. **Push Changes**
   - Ensure all changes committed and pushed

2. **Create PR** (via `/pr:draft` skill)
   - Generate PR title and description
   - Create draft PR

3. **Update Issue**

   ```bash
   # Link PR to issue
   gh issue comment {number} --body "Pull request created: #{pr_number}"
   ```

4. **Keep worktree:active Label**
   - Leave label until PR is merged
   - When PR merges, close issue and clean up

### Path C: Abandon Work

Use the `--abandon` flag when you want to clean up a worktree but keep the issue open for future work:

```bash
./scripts/finish-feature.sh {number} --abandon
```

This will:

1. Remove the `worktree:active` label from the issue
2. Add a comment: "Work abandoned. Issue returned to backlog."
3. Remove the worktree directory
4. Delete local and remote branches
5. Keep the issue open with `status:ready` for future work

The issue remains available in the backlog and can be started again later with `./scripts/init-feature.sh {number}`

---

## Workflow 4: Listing Active Worktrees (/feature:list)

### Steps

1. **Read Worktree Registry**
   - Load `.worktrees/ directory`

2. **Validate Against Git**

   ```bash
   git worktree list --porcelain
   ```

   - Cross-reference registry with actual worktrees
   - Mark stale entries

3. **Fetch GitHub Issue Data**
   For each worktree:

   ```bash
   gh issue view {githubIssue} --json number,title,state,labels,updatedAt
   ```

4. **Display Formatted List**

   ```
   Active Worktrees: (2)

   1. Issue #45 - Slider sparks gradient
      Branch:  feature/45-slider-sparks
      Path:    .worktrees/45-slider-sparks
      Port:    5045
      Areas:   visualizer
      GitHub:  https://github.com/jeffdt/homskillet-discography/issues/45
      Labels:  category:enhancement, area:visualizer, worktree:active
      Updated: 2 hours ago

   2. Issue #47 - Create new settings pane structure
      ...
   ```

---

## Conflict Detection Algorithm

### Purpose

Prevent parallel work on overlapping areas that could cause merge conflicts.

### Algorithm

```javascript
function detectConflicts(candidateIssue, activeWorktrees) {
  const candidateAreas = extractAreas(candidateIssue.labels);

  for (const worktree of activeWorktrees) {
    const worktreeAreas = worktree.areas;
    const overlap = candidateAreas.filter((area) => worktreeAreas.includes(area));

    if (overlap.length === 0) {
      continue; // No conflict
    }

    if (overlap.length >= 2) {
      return 'HIGH'; // Multiple overlapping areas
    }

    // One overlapping area - check categories
    const candidateCategory = extractCategory(candidateIssue.labels);
    const worktreeCategory = extractCategory(worktree.githubIssue.labels);

    if (candidateCategory === worktreeCategory) {
      return 'MEDIUM'; // Same area, same category
    } else {
      return 'LOW'; // Same area, different category
    }
  }

  return 'NONE';
}

function extractAreas(labels) {
  return labels
    .filter((label) => label.startsWith('area:'))
    .map((label) => label.replace('area:', ''));
}

function extractCategory(labels) {
  const categoryLabel = labels.find((label) => label.startsWith('category:'));
  return categoryLabel ? categoryLabel.replace('category:', '') : null;
}
```

### Conflict Warnings

- **HIGH**: ⚠️ **High conflict risk** - Multiple overlapping areas with active worktree #{num}
- **MEDIUM**: ⚠️ **Medium conflict risk** - {area} area overlap with active worktree #{num}
- **LOW**: ⚠️ **Low conflict risk** - {area} area overlap (different category) with worktree #{num}
- **NONE**: ✅ No conflicts detected

---

## Migration Workflow (One-Time)

### Migrating TODO.md Items to GitHub Issues

1. **Backup TODO.md**

   ```bash
   cp .claude/TODO.md .claude/TODO.md.backup
   ```

2. **Parse TODO.md**
   - Extract all items with ID, description, area tags
   - Map category prefix (B/E/M/S/D) to category label

3. **Create Issues in Bulk**
   For each item:

   ```bash
   gh issue create \
     --title "{description}" \
     --body "{description}

   ## Areas
   - {area1}
   - {area2}

   ---
   *Migrated from TODO.md*" \
     --label "category:{category},area:{area1},area:{area2},status:ready"
   ```

4. **Handle Special Cases**
   - Items with `(PLAN)`: Add `status:planning` label
   - Items with `(OPTIONAL FUTURE WORK)`: Add `optional` label
   - Items with `(RESEARCHED)`: Reference research doc in body

5. **Verify Migration**

   ```bash
   gh issue list --limit 50
   ```

   - Verify all 24 items created
   - Verify labels applied correctly

6. **Deprecate TODO.md**
   - Replace with deprecation notice
   - Keep backup at `.claude/TODO.md.backup`
