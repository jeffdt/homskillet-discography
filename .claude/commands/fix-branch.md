---
description: "Reset branch to clean state matching origin"
argument-hint: "[branch-name]"
---

I need help getting to a clean branch state.

**Target branch:** $ARGUMENTS (if not provided, default to main or master, whichever exists)

Please:

1. Check the current git status and identify any issues (detached HEAD, diverged commits, etc.)
2. Determine the target branch (use $ARGUMENTS if provided, otherwise default to main/master)
3. Switch to the target branch and reset it to match origin exactly: `git checkout <branch> && git reset --hard origin/<branch>`
4. Confirm the branch is now clean and up to date with origin

This command resets local changes to match the remote - use when you want a clean slate from origin.
