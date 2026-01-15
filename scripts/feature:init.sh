#!/bin/bash
# Helper script to initialize a worktree for a GitHub issue
#
# Usage:
#   ./scripts/feature:init.sh [issue-number]
#   ./scripts/feature:init.sh              # Interactive mode - shows available issues
#
# Using with eval (automatically cd and start Claude):
#   eval $(./scripts/feature:init.sh 77)
#
# The eval pattern works because:
# - All user-facing messages go to stderr (>&2)
# - Commands for eval go to stdout (cd and claude commands)
# - eval executes the stdout commands in your current shell
#
# Quick aliases (add to ~/.bashrc or ~/.zshrc):
#   alias fstart='eval $(./scripts/feature:init.sh)'
#   alias fs='eval $(./scripts/feature:init.sh)'
#
# Or use git aliases (add to .git/config under [alias]):
#   start = !eval $(./scripts/feature:init.sh "$@")
#
# This script:
# 1. Fetches the issue details from GitHub (including custom slug field)
# 2. Creates a worktree using the slug from the issue
# 3. Updates the issue with status:active label
# 4. Provides instructions for starting work

set -e  # Exit on error

# Configuration
MAIN_REPO_PATH="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
WORKTREE_PARENT="${MAIN_REPO_PATH}/.worktrees"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to generate slug from title (fallback if custom field not set)
generate_slug_from_title() {
  local title="$1"

  # Convert to lowercase, remove special chars, split on whitespace
  local slug
  slug=$(echo "$title" | \
    tr '[:upper:]' '[:lower:]' | \
    sed 's/[^a-z0-9 -]//g' | \
    tr -s ' ' | \
    awk '{for(i=1;i<=3 && i<=NF;i++) printf "%s%s", (i>1?"-":""), $i}')

  echo "$slug"
}

# Function to list available issues
list_available_issues() {
  echo "" >&2
  echo "Available issues (not currently in worktrees):" >&2
  echo "" >&2

  # Get all open issues without status:active label
  local issues
  issues=$(gh issue list \
    --search "is:open -label:status:active" \
    --limit 20 \
    --json number,title,labels \
    --jq '.[] | "\(.number)|\(.title)|\(.labels | map(.name) | join(","))"' 2>/dev/null)

  if [ -z "$issues" ]; then
    echo "  No available issues found." >&2
    echo "" >&2
    return
  fi

  local count=0
  while IFS='|' read -r num title labels; do
    count=$((count + 1))
    echo "  $count. #$num - $title" >&2

    # Show relevant labels
    if [[ "$labels" == *"category:"* ]] || [[ "$labels" == *"area:"* ]]; then
      echo "     Labels: $labels" >&2
    fi
    echo "" >&2
  done <<< "$issues"

  echo "Usage: $0 <issue-number>" >&2
  echo "Example: $0 73" >&2
  echo "" >&2
}

# Main script logic
main() {
  local issue_number="$1"

  # Step 1: Determine issue number
  if [ -z "$issue_number" ]; then
    echo "No issue number provided." >&2
    list_available_issues
    exit 1
  fi

  # Validate issue number is numeric
  if ! [[ "$issue_number" =~ ^[0-9]+$ ]]; then
    echo "Error: Issue number must be numeric (got: $issue_number)" >&2
    exit 1
  fi

  echo "" >&2
  echo "Initializing worktree for issue #${issue_number}..." >&2
  echo "" >&2

  # Step 2: Check if issue exists and fetch metadata
  echo "→ Fetching issue details from GitHub..." >&2

  local issue_data
  if ! issue_data=$(gh issue view "$issue_number" --json title,state,labels,body 2>/dev/null); then
    echo "Error: Could not fetch issue #${issue_number}" >&2
    echo "Make sure the issue exists and you have access to it." >&2
    list_available_issues
    exit 1
  fi

  local title
  title=$(echo "$issue_data" | jq -r '.title')

  local body
  body=$(echo "$issue_data" | jq -r '.body // ""')

  local state
  state=$(echo "$issue_data" | jq -r '.state')

  if [ "$state" = "CLOSED" ]; then
    echo "Error: Issue #${issue_number} is already closed" >&2
    echo "Title: $title" >&2
    exit 1
  fi

  echo "  Issue: $title" >&2

  # Step 3: Check if already has status:active label
  local has_active_label
  has_active_label=$(echo "$issue_data" | jq -r '.labels[] | select(.name=="status:active") | .name' || echo "")

  if [ -n "$has_active_label" ]; then
    echo "" >&2
    echo "Error: Issue #${issue_number} is already in progress" >&2
    echo "" >&2
    echo "Existing worktrees:" >&2
    find "$WORKTREE_PARENT" -maxdepth 1 -type d -name "${issue_number}-*" 2>/dev/null || true >&2
    echo "" >&2
    exit 1
  fi

  # Step 4: Get slug from issue body or generate from title
  local slug
  # Extract slug from "## Worktree Slug" section in body
  slug=$(echo "$body" | grep -A 1 "## Worktree Slug" | tail -1 | sed 's/^[[:space:]]*`\(.*\)`[[:space:]]*$/\1/' | tr -d '\n' || echo "")

  if [ -z "$slug" ] || [ "$slug" = "null" ] || [[ "$slug" == *"Worktree Slug"* ]]; then
    echo "  ⚠️  No slug found in issue body, generating from title..." >&2
    slug=$(generate_slug_from_title "$title")
    echo "  Generated slug: $slug" >&2
  else
    echo "  Slug: $slug" >&2
  fi

  # Step 5: Calculate port
  local port
  port=$((5000 + issue_number))
  echo "  Port: $port" >&2

  # Step 6: Check if worktree already exists
  if [ -d "${WORKTREE_PARENT}/${issue_number}-${slug}" ]; then
    echo "" >&2
    echo "Error: Worktree already exists at ${WORKTREE_PARENT}/${issue_number}-${slug}" >&2
    echo "Remove it first with: git worktree remove ${WORKTREE_PARENT}/${issue_number}-${slug}" >&2
    exit 1
  fi

  # Step 7: Call create-worktree.sh
  echo "" >&2
  echo "→ Creating worktree..." >&2

  if ! "${MAIN_REPO_PATH}/scripts/create-worktree.sh" "$issue_number" "$slug" "$port"; then
    echo "" >&2
    echo "Error: Failed to create worktree" >&2
    exit 1
  fi

  # Step 8: Update GitHub issue
  echo "" >&2
  echo "→ Updating GitHub issue..." >&2

  # Add status:active and remove status:ready if present
  if gh issue edit "$issue_number" --add-label "status:active" --remove-label "status:ready" 2>/dev/null; then
    echo "  ✓ Added status:active label" >&2
  else
    echo "  ⚠️  Warning: Could not add label (may need to add manually)" >&2
  fi

  local worktree_path="${WORKTREE_PARENT}/${issue_number}-${slug}"
  local comment="Worktree created:
- Path: \`.worktrees/${issue_number}-${slug}\`
- Port: ${port}
- Branch: \`feature/${issue_number}-${slug}\`"

  if gh issue comment "$issue_number" --body "$comment" 2>/dev/null; then
    echo "  ✓ Added comment to issue" >&2
  fi

  # Step 9: Success summary
  echo "" >&2
  echo -e "${GREEN}✅ Worktree created successfully!${NC}" >&2
  echo "" >&2
  echo "Worktree Details:" >&2
  echo "  Issue: #${issue_number} - ${title}" >&2
  echo "  Branch: feature/${issue_number}-${slug}" >&2
  echo "  Path: ${worktree_path}" >&2
  echo "  Port: ${port}" >&2
  echo "  GitHub: https://github.com/jeffdt/homskillet-discography/issues/${issue_number}" >&2
  echo "" >&2
  echo "To work on this feature:" >&2
  echo -e "  ${GREEN}cd ${worktree_path}${NC}" >&2
  echo -e "  ${GREEN}claude${NC} (will auto-start if using eval)" >&2
  echo "" >&2
  echo "Usage:" >&2
  echo "  Normal: cd ${worktree_path} && claude" >&2
  echo "  With eval: eval \$(./scripts/feature:init.sh ${issue_number})" >&2
  echo "" >&2

  # Output commands for eval (to stdout)
  echo "cd '${worktree_path}'"
  echo "claude 'Start implementing issue #${issue_number}: ${title}'"
}

# Run main function
main "$@"
