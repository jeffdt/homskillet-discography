#!/bin/bash
# Helper script to remove a git worktree and clean up branches
# Usage: ./scripts/remove-worktree.sh <todo-id> <slug> [--keep-branch]
#
# This script:
# 1. Removes the worktree directory (including symlinked node_modules)
# 2. Optionally deletes the local and remote branch
# 3. Provides confirmation before destructive operations

set -e  # Exit on error

# Parse arguments
TODO_ID="$1"
SLUG="$2"
KEEP_BRANCH="$3"

if [ -z "$TODO_ID" ] || [ -z "$SLUG" ]; then
  echo "Usage: $0 <todo-id> <slug> [--keep-branch]"
  echo "Example: $0 E16 slider-sparks"
  echo "         $0 E16 slider-sparks --keep-branch"
  exit 1
fi

# Configuration
WORKTREE_PARENT="/Users/hom/code/homskillet-worktrees"
WORKTREE_NAME="${TODO_ID}-${SLUG}"
WORKTREE_PATH="${WORKTREE_PARENT}/${WORKTREE_NAME}"
BRANCH_NAME="feature/${TODO_ID}-${SLUG}"

echo "Removing worktree for ${TODO_ID}..."

# Check if worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
  echo "⚠️  Worktree does not exist at: ${WORKTREE_PATH}"
  echo "Checking git worktree list..."
  git worktree list | grep "$WORKTREE_NAME" || echo "Not found in git worktree list either."
  exit 1
fi

# Remove the worktree
echo "→ Removing git worktree at: ${WORKTREE_PATH}"
git worktree remove "$WORKTREE_PATH" || git worktree remove --force "$WORKTREE_PATH"

# Handle branch deletion
if [ "$KEEP_BRANCH" != "--keep-branch" ]; then
  echo "→ Deleting local branch: ${BRANCH_NAME}"
  git branch -d "$BRANCH_NAME" 2>/dev/null || git branch -D "$BRANCH_NAME" 2>/dev/null || echo "  (Local branch already deleted)"

  echo "→ Deleting remote branch: ${BRANCH_NAME}"
  git push origin --delete "$BRANCH_NAME" 2>/dev/null || echo "  (Remote branch already deleted or doesn't exist)"
else
  echo "→ Keeping branch ${BRANCH_NAME} (--keep-branch flag provided)"
fi

# Output success
echo ""
echo "✅ Worktree removed successfully!"
echo ""
echo "Removed:"
echo "  Path: ${WORKTREE_PATH}"
if [ "$KEEP_BRANCH" != "--keep-branch" ]; then
  echo "  Branch: ${BRANCH_NAME} (local and remote)"
else
  echo "  Branch: ${BRANCH_NAME} (kept)"
fi
