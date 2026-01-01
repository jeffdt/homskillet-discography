#!/bin/bash
# Helper script to create a git worktree with optimized setup
# Usage: ./scripts/create-worktree.sh <todo-id> <slug> <port>
#
# This script:
# 1. Creates a git worktree at ../homskillet-worktrees/{ID}-{slug}/
# 2. Creates and pushes a feature branch
# 3. Symlinks node_modules from main repo (fast, shared dependencies)
# 4. Returns paths and port info for the new worktree

set -e  # Exit on error

# Parse arguments
TODO_ID="$1"
SLUG="$2"
PORT="$3"

if [ -z "$TODO_ID" ] || [ -z "$SLUG" ] || [ -z "$PORT" ]; then
  echo "Usage: $0 <todo-id> <slug> <port>"
  echo "Example: $0 E16 slider-sparks 5016"
  exit 1
fi

# Configuration
MAIN_REPO_PATH="$(pwd)"
WORKTREE_PARENT="/Users/hom/code/homskillet-worktrees"
WORKTREE_NAME="${TODO_ID}-${SLUG}"
WORKTREE_PATH="${WORKTREE_PARENT}/${WORKTREE_NAME}"
BRANCH_NAME="feature/${TODO_ID}-${SLUG}"

echo "Creating worktree for ${TODO_ID}..."

# Ensure parent directory exists
mkdir -p "$WORKTREE_PARENT"

# Create worktree with new branch
echo "→ Creating git worktree at: ${WORKTREE_PATH}"
git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH"

# CD into worktree
cd "$WORKTREE_PATH"

# Symlink node_modules from main repo
echo "→ Symlinking node_modules from main repo..."
ln -s "${MAIN_REPO_PATH}/node_modules" ./node_modules

# Push branch to remote and set upstream
echo "→ Pushing branch to remote..."
git push -u origin "$BRANCH_NAME" 2>/dev/null || echo "  (Push will happen on first commit)"

# Return to main repo
cd "$MAIN_REPO_PATH"

# Output success with details
echo ""
echo "✅ Worktree created successfully!"
echo ""
echo "Details:"
echo "  ID: ${TODO_ID}"
echo "  Branch: ${BRANCH_NAME}"
echo "  Path: ${WORKTREE_PATH}"
echo "  Port: ${PORT}"
echo ""
echo "To work on this:"
echo "  cd ${WORKTREE_PATH}"
echo "  bun start --port ${PORT}"
echo ""
echo "Test at: http://localhost:${PORT}"
