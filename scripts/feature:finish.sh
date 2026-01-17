#!/bin/bash
# Helper script to finish a feature by closing GitHub issue and cleaning up worktree
# Usage: ./scripts/finish-feature.sh [issue-number] [--abandon]
#
# Normal usage (work completed and merged):
#   ./scripts/finish-feature.sh [issue-number]
#   - Closes the GitHub issue with "Completed and merged" comment
#   - Removes worktree and deletes branches
#
# Abandon usage (work not completed, return to backlog):
#   ./scripts/finish-feature.sh [issue-number] --abandon
#   - Keeps issue open, returns to status:ready
#   - Adds "Work abandoned" comment
#   - Removes worktree and deletes branches

set -e  # Exit on error

# Configuration
# Get the main worktree (repo root), not the current worktree if we're in one
MAIN_REPO_PATH="$(git worktree list --porcelain 2>/dev/null | grep '^worktree' | head -1 | cut -d' ' -f2 || pwd)"
WORKTREE_PARENT="${MAIN_REPO_PATH}/.worktrees"
ABANDON_MODE=false

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to auto-detect issue number from current directory
auto_detect_issue_number() {
  local current_dir
  current_dir=$(pwd)

  # Check if we're inside a worktree directory
  if [[ "$current_dir" == *"/.worktrees/"* ]]; then
    # Extract issue number from path like .worktrees/73-visualizer-decay/...
    local worktree_name
    worktree_name=$(echo "$current_dir" | sed -n 's|.*/.worktrees/\([^/]*\).*|\1|p')

    # Extract number prefix (everything before first hyphen)
    local issue_num
    issue_num=$(echo "$worktree_name" | cut -d'-' -f1)

    if [[ "$issue_num" =~ ^[0-9]+$ ]]; then
      echo "$issue_num"
      return 0
    fi
  fi

  return 1
}

# Function to list active worktrees
list_available_worktrees() {
  echo "" >&2
  echo "Active worktrees:" >&2
  echo "" >&2

  local count=0
  if [ -d "$WORKTREE_PARENT" ]; then
    for dir in "$WORKTREE_PARENT"/*; do
      if [ -d "$dir" ]; then
        local dirname
        dirname=$(basename "$dir")
        local issue_num
        issue_num=$(echo "$dirname" | cut -d'-' -f1)

        # Get issue title from GitHub
        local title
        title=$(gh issue view "$issue_num" --json title --jq '.title' 2>/dev/null || echo "Unknown")

        count=$((count + 1))
        echo "  $count. #$issue_num - $title"
        echo "     Path: $dir"
        echo ""
      fi
    done
  fi

  if [ "$count" -eq 0 ]; then
    echo "  No active worktrees found."
    echo ""
  fi
}

# Main script logic
main() {
  local issue_number=""

  # Parse arguments
  for arg in "$@"; do
    if [ "$arg" = "--abandon" ]; then
      ABANDON_MODE=true
    elif [ -z "$issue_number" ]; then
      issue_number="$arg"
    fi
  done

  # Step 1: Determine issue number
  if [ -z "$issue_number" ]; then
    # Try to auto-detect from current directory
    if issue_number=$(auto_detect_issue_number); then
      echo "→ Auto-detected issue #$issue_number from current directory"
    else
      echo "No issue number provided and couldn't auto-detect from current directory."
      list_available_worktrees
      echo "Usage: $0 <issue-number> [--abandon]"
      echo "Example: $0 73"
      echo "         $0 73 --abandon"
      exit 1
    fi
  fi

  # Validate issue number is numeric
  if ! [[ "$issue_number" =~ ^[0-9]+$ ]]; then
    echo "Error: Issue number must be numeric (got: $issue_number)"
    exit 1
  fi

  echo "" >&2
  if [ "$ABANDON_MODE" = true ]; then
    echo "Abandoning issue #${issue_number}..."
  else
    echo "Finishing issue #${issue_number}..."
  fi
  echo "" >&2

  # Step 2: Find worktree directory
  local worktree_dir
  worktree_dir=$(find "$WORKTREE_PARENT" -maxdepth 1 -type d -name "${issue_number}-*" 2>/dev/null | head -1)

  if [ -z "$worktree_dir" ]; then
    echo "Error: No worktree found for issue #${issue_number}"
    echo ""
    list_available_worktrees
    exit 1
  fi

  local worktree_name
  worktree_name=$(basename "$worktree_dir")

  echo "→ Found worktree: $worktree_name" >&2

  # Step 3: Get branch name
  local branch_name
  branch_name=$(git -C "$worktree_dir" branch --show-current 2>/dev/null || echo "")

  if [ -z "$branch_name" ]; then
    echo "⚠️  Warning: Could not determine branch name"
    branch_name="feature/${worktree_name}"
  fi

  echo "→ Branch: $branch_name" >&2

  # Step 4: Check if currently in worktree being finished
  local current_dir
  current_dir=$(pwd)
  if [[ "$current_dir" == "$worktree_dir"* ]]; then
    echo "→ Currently in worktree being finished, switching to main repo..."
    cd "$MAIN_REPO_PATH"
  fi

  # Step 5: Check for uncommitted changes (warn but don't block)
  local status
  status=$(git -C "$worktree_dir" status --porcelain 2>/dev/null || echo "")
  if [ -n "$status" ]; then
    echo ""
    echo "⚠️  Warning: Worktree has uncommitted changes"
    echo "These changes will be lost when the worktree is removed."
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Cancelled."
      exit 1
    fi
  fi

  # Step 6: Update GitHub issue
  if [ "$ABANDON_MODE" = true ]; then
    echo "→ Updating GitHub issue #${issue_number} (abandoning work)..."
    # Remove status:active and add status:ready back
    if gh issue edit "$issue_number" --remove-label "status:active" --add-label "status:ready" &>/dev/null; then
      echo "  ✓ Returned issue to status:ready"
    else
      echo "  ⚠️  Warning: Could not update issue labels"
    fi

    if gh issue comment "$issue_number" --body "Work abandoned. Issue returned to backlog." &>/dev/null; then
      echo "  ✓ Added comment to issue"
    else
      echo "  ⚠️  Warning: Could not add comment to issue"
    fi
  else
    echo "→ Closing GitHub issue #${issue_number}..."
    if gh issue close "$issue_number" --comment "Completed and merged to main." &>/dev/null; then
      echo "  ✓ Issue closed"
    else
      # Check if already closed
      local state
      state=$(gh issue view "$issue_number" --json state --jq '.state' 2>/dev/null || echo "UNKNOWN")
      if [ "$state" = "CLOSED" ]; then
        echo "  ✓ Issue already closed"
      else
        echo "  ⚠️  Warning: Could not close issue (may need to close manually)"
      fi
    fi
  fi

  # Step 7: Remove worktree
  echo "→ Removing worktree..." >&2
  if git worktree remove --force "$worktree_dir" 2>/dev/null; then
    echo "  ✓ Worktree removed"
  else
    echo "  ⚠️  Warning: Could not remove worktree automatically"
    echo "  Try manually: git worktree remove --force $worktree_dir"
  fi

  # Step 8: Delete local branch
  echo "→ Deleting local branch..." >&2
  if git branch -D "$branch_name" 2>/dev/null; then
    echo "  ✓ Local branch deleted"
  else
    echo "  ℹ️  Local branch already deleted or doesn't exist"
  fi

  # Step 9: Delete remote branch (if exists)
  echo "→ Deleting remote branch..." >&2
  if git push origin --delete "$branch_name" 2>/dev/null; then
    echo "  ✓ Remote branch deleted"
  else
    echo "  ℹ️  Remote branch already deleted (likely auto-deleted by PR merge)"
  fi

  # Step 10: Success summary
  echo "" >&2
  if [ "$ABANDON_MODE" = true ]; then
    echo -e "${GREEN}✅ Successfully abandoned issue #${issue_number}!${NC}" >&2
    echo "" >&2
    echo "Summary:" >&2
    echo "  ✓ Returned Issue #${issue_number} to status:ready" >&2
    echo "  ✓ Issue remains open in backlog" >&2
    echo "  ✓ Removed worktree from ${worktree_dir}" >&2
    echo "  ✓ Deleted branch ${branch_name}" >&2
  else
    echo -e "${GREEN}✅ Successfully finished issue #${issue_number}!${NC}" >&2
    echo "" >&2
    echo "Summary:" >&2
    echo "  ✓ Closed GitHub Issue #${issue_number}" >&2
    echo "  ✓ Removed worktree from ${worktree_dir}" >&2
    echo "  ✓ Deleted branch ${branch_name}" >&2
  fi
  echo "" >&2

  # Output cd command for eval (to stdout)
  echo "cd '${MAIN_REPO_PATH}'"
}

# Run main function
main "$@"
