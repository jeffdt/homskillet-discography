---
description: Complete work on a worktree (merge, create PR, or abandon)
allowed-tools: Bash, AskUserQuestion, Skill
---

# /feature:finish - Complete Worktree Work

This command helps you finish work on a worktree by creating a PR, merging to main, or abandoning the changes. It handles all cleanup including removing the worktree and updating the GitHub Issue.

## Usage

```bash
# From within a worktree directory
/feature:finish

# Or specify which worktree to finish by issue number (if not currently in one)
/feature:finish 45
```

## Workflow

### Step 1: Detect Current Worktree

Determine which worktree is being finished.

**Option A: Auto-detect from current directory**

Use `git worktree list --porcelain` to find which worktree contains the current working directory:

```bash
git worktree list --porcelain
```

Parse output to find worktree matching `$(pwd)`.

**Option B: User specifies issue number**

If user provides an issue number (e.g., `/feature:finish 45`), look for that worktree in `.worktrees/{number}-*` directory pattern.

```bash
# Find worktree directory for issue #45
ls -d .worktrees/45-* 2>/dev/null
```

**If not in a worktree:**

```
You are currently in the main repository, not a worktree.

Active worktrees:
1. #45 - Slider sparks gradient (feature/45-slider-sparks)
2. #52 - MP3 support (feature/52-mp3-support)

Which worktree would you like to finish? (1, 2, or cancel)
```

### Step 2: Verify Clean State

Check for uncommitted changes:

```bash
cd .worktrees/E16-slider-sparks
git status --short
```

**If uncommitted changes found:**

```
⚠️  Uncommitted changes detected:

M  src/components/TimeSlider.tsx
M  src/Spectrogram.js
?? src/SliderParticles.tsx

You have uncommitted changes in this worktree.

Options:
1. Commit changes now (I'll help you create a commit)
2. Stash changes for later
3. Cancel finish (you finish committing manually)

What would you like to do?
```

**If user chooses "Commit changes now":**
Use the `/gc` command to create a commit with proper message format.

**If user chooses "Stash":**

```bash
git stash push -m "WIP: Stashing before finishing worktree"
```

Warn that stashed changes will be lost when worktree is removed.

### Step 3: Check Push Status

Verify if the branch has been pushed to remote:

```bash
git status
```

Look for:

- "Your branch is ahead of 'origin/feature/E16-slider-sparks' by N commits"
- "Your branch is up to date with 'origin/feature/E16-slider-sparks'"
- "Your branch and 'origin/feature/E16-slider-sparks' have diverged"

**If not pushed or ahead of remote:**

```
This branch has unpushed commits.

Would you like to push now? (yes/no)
```

If yes:

```bash
git push
```

### Step 4: Present Completion Options

Ask user how they want to complete the work:

```
How would you like to finish E16?

1. Create Pull Request (recommended)
   - Opens draft PR for review before merging
   - Keeps worktree active until PR is merged
   - You can continue making changes

2. Merge to main directly
   - Merges branch to main immediately
   - Deletes worktree and cleans up
   - Use for small/trivial changes

3. Abandon work
   - Deletes worktree without merging
   - Removes worktree:active label (issue returns to available)
   - Optionally deletes the branch

What would you like to do?
```

### Step 5A: Create Pull Request

If user selects "Create Pull Request":

```bash
# Ensure we're in the worktree directory
cd .worktrees/E16-slider-sparks

# Use the /pr:draft command
/pr:draft
```

The `/pr:draft` command will:

- Auto-populate PR title from TODO description
- Create PR body with summary
- Add "Generated with Claude Code" footer
- Return the PR URL

**After PR is created:**

```
✅ Pull Request created successfully

PR: https://github.com/jeffdt/homskillet-discography/pull/64

The worktree will remain active so you can continue making changes.

When the PR is merged:
1. GitHub will automatically delete the remote branch
2. Run /feature:finish again to clean up the local worktree

Or manually clean up now:
  /feature:finish E16 --force-cleanup
```

**End workflow here** - worktree stays active for further work.

### Step 5B: Merge to Main Directly

If user selects "Merge to main directly":

#### 5B.1: Confirm Action

```
⚠️  You're about to merge feature/E16-slider-sparks directly to main.

This will:
- Merge all commits to the main branch
- Push to origin/main
- Delete the remote branch
- Remove the worktree
- Close the GitHub Issue

This action cannot be undone. Continue? (yes/no)
```

#### 5B.2: Switch to Main Worktree

```bash
cd /Users/hom/code/homskillet-discography  # or just 'cd' to return to main repo
```

#### 5B.3: Ensure Main is Up to Date

```bash
git checkout main
git pull origin main
```

#### 5B.4: Merge Feature Branch

```bash
git merge feature/E16-slider-sparks --no-ff
```

The `--no-ff` flag creates a merge commit even if fast-forward is possible, preserving the feature branch history.

**If merge conflicts:**

```
⚠️  Merge conflicts detected!

Files with conflicts:
- src/components/TimeSlider.tsx
- src/Spectrogram.js

Options:
1. Abort merge and return to worktree to fix conflicts
2. Resolve conflicts now (I'll help)
3. Cancel finish operation

What would you like to do?
```

Most cases: recommend option 1 (abort and fix in worktree).

#### 5B.5: Push to Remote

```bash
git push origin main
```

#### 5B.6: Delete Remote Branch

```bash
git push origin --delete feature/E16-slider-sparks
```

#### 5B.7: Remove Worktree

```bash
git worktree remove .worktrees/E16-slider-sparks
```

**If worktree removal fails:**

```bash
# Force removal if needed
git worktree remove --force .worktrees/E16-slider-sparks
```

#### 5B.8: Delete Local Branch

```bash
git branch -d feature/45-slider-sparks
```

#### 5B.9: Close GitHub Issue

Close the issue:

```bash
# Close the issue
gh issue close {issue_number} --comment "Merged to main"

# Note: worktree:active label is automatically removed when issue is closed
```

Example:

```bash
gh issue close 45 --comment "Merged to main"
```

### Step 5C: Abandon Work

If user selects "Abandon work":

#### 5C.1: Confirm Action

```
⚠️  You're about to abandon E16 without merging.

This will:
- Delete the worktree and all uncommitted changes
- Optionally delete the branch (local and remote)
- Remove worktree:active label (issue returns to available pool)

All work in this worktree will be lost. Continue? (yes/no)
```

#### 5C.2: Ask About Branch Deletion

```
Do you want to delete the branch too?

Branch: feature/E16-slider-sparks

1. Delete both local and remote branch (clean slate)
2. Keep branch (you can resume work later)
3. Cancel abandon operation

What would you like to do?
```

If option 1:

```bash
# Delete local branch
git branch -D feature/E16-slider-sparks

# Delete remote branch
git push origin --delete feature/E16-slider-sparks
```

If option 2: Keep branch, only remove worktree.

#### 5C.3: Remove Worktree

```bash
git worktree remove .worktrees/45-slider-sparks
```

or force:

```bash
git worktree remove --force .worktrees/45-slider-sparks
```

#### 5C.4: Update GitHub Issue

Remove the `worktree:active` label and add abandon comment:

```bash
# Remove worktree:active label
gh issue edit {issue_number} --remove-label "worktree:active"

# Add comment explaining abandonment
gh issue comment {issue_number} --body "Work abandoned. Issue returned to backlog."
```

Example:

```bash
gh issue edit 45 --remove-label "worktree:active"
gh issue comment 45 --body "Work abandoned. Issue returned to backlog."
```

The issue remains open and available for future work.

### Step 6: Provide Completion Summary

**For merged:**

```
✅ Successfully finished issue #45!

Summary:
- ✓ Merged feature/45-slider-sparks to main
- ✓ Pushed to origin/main
- ✓ Deleted remote branch feature/45-slider-sparks
- ✓ Removed worktree from .worktrees/45-slider-sparks
- ✓ Closed GitHub Issue #45

You are now in: /Users/hom/code/homskillet-discography (main branch)

To start new work:
  /feature:init
```

**For abandoned:**

```
Abandoned #45

Summary:
- ✓ Removed worktree from .worktrees/45-slider-sparks
- ✓ Deleted branch feature/45-slider-sparks (local and remote)
- ✓ Removed worktree:active label from issue

Issue #45 is now available again for future work.

To start different work:
  /feature:init
```

**For PR created:**

```
✅ Pull Request created for #45

PR: https://github.com/jeffdt/homskillet-discography/pull/64

The worktree is still active at:
  .worktrees/45-slider-sparks

You can continue making changes and pushing updates to the PR.

When the PR is merged on GitHub:
1. Return to main worktree: cd /Users/hom/code/homskillet-discography
2. Pull latest: git pull origin main
3. Clean up: /feature:finish 45
```

## Examples

### Example 1: Create PR

```
User: cd .worktrees/E16-slider-sparks
User: /feature:finish

Claude: Detected worktree: E16 (feature/E16-slider-sparks)

Clean working tree - no uncommitted changes.

Branch is up to date with origin.

How would you like to finish E16?

1. Create Pull Request (recommended)
2. Merge to main directly
3. Abandon work

User: Selects 1

Claude: Creating pull request...

✅ Pull Request created successfully

PR: https://github.com/jeffdt/homskillet-discography/pull/64

Title: [E16] Slider sparks can change color over lifespan through a gradient

The worktree remains active. You can continue making changes.
```

### Example 2: Direct Merge

```
User: /feature:finish E7

Claude: Selected worktree: E7 (feature/E7-mp3-support)

Clean working tree - no uncommitted changes.

How would you like to finish E7?

1. Create Pull Request (recommended)
2. Merge to main directly
3. Abandon work

User: Selects 2

Claude: ⚠️  You're about to merge feature/E7-mp3-support directly to main.

This will merge all commits, delete the worktree, and close the issue.

Continue? (yes/no)

User: yes

Claude: Merging to main...
Pushing to origin/main...
Deleting remote branch...
Removing worktree...

✅ Successfully finished E7!

All changes merged to main.
You are now in: /Users/hom/code/homskillet-discography
```

### Example 3: Abandon with Uncommitted Changes

```
User: /feature:finish

Claude: Detected worktree: E16 (feature/E16-slider-sparks)

⚠️  Uncommitted changes detected:

M  src/components/TimeSlider.tsx
?? src/SliderParticles.tsx

Options:
1. Commit changes now
2. Stash changes
3. Cancel finish

User: Selects 3 (cancel)

Claude: Finish cancelled.

Please commit or stash your changes, then run /feature:finish again.
```

### Example 4: Abandon Work

```
User: /feature:finish E16

Claude: How would you like to finish E16?

1. Create Pull Request (recommended)
2. Merge to main directly
3. Abandon work

User: Selects 3

Claude: ⚠️  You're about to abandon E16 without merging.

All work will be lost. Continue? (yes/no)

User: yes

Claude: Do you want to delete the branch too?

1. Delete both local and remote branch
2. Keep branch (resume later)
3. Cancel

User: Selects 1

Claude: Removing worktree...
Deleting branch...

Abandoned E16.

Issue is now available again.
```

## Best Practices

1. **Always commit before finishing** - Prevents loss of work
2. **Use PR for non-trivial changes** - Enables review and testing
3. **Direct merge for quick fixes** - Small, well-tested changes only
4. **Clean up promptly** - Don't leave stale worktrees around
5. **Verify tests pass** - Before merging or creating PR
6. **Document in PR** - Explain changes, testing done, etc.

## Important Notes

- **Destructive operations** - Merge and abandon cannot be undone
- **PR workflow recommended** - Safer, enables review
- **Clean state required** - Must commit or stash before finishing
- **Worktree tracking** - Tracked via `.worktrees/` directory + `worktree:active` GitHub label
- **Branch cleanup** - Remote branches deleted automatically
- **GitHub Issue state** - Closed on merge, label removed on abandon

## Edge Cases

**Not in a worktree:**

```
You are not currently in a worktree.

Current directory: /Users/hom/code/homskillet-discography (main branch)

Use /feature:finish 45 to finish a specific worktree.
Or cd to a worktree first.
```

**Merge conflicts:**

```
⚠️  Merge conflicts when merging to main!

Conflicts in:
- src/Spectrogram.js

Aborting merge. Options:
1. Return to worktree and rebase on latest main
2. Manually resolve conflicts in main worktree
3. Cancel and create PR instead (let GitHub handle conflicts)

Recommended: Option 3 (create PR)
```

**PR already exists:**

```
A pull request already exists for this branch:
PR #64: https://github.com/jeffdt/homskillet-discography/pull/64

Options:
1. Keep worktree active (continue working on PR)
2. Clean up worktree (if PR is done)
3. Cancel

What would you like to do?
```

**Worktree directory without GitHub label:**

```
Warning: This worktree directory exists but the GitHub Issue doesn't have the worktree:active label.
The label may have been removed manually.

I can still clean it up. Would you like to proceed? (yes/no)
```
