#!/bin/bash
# Helper script to initialize a worktree for a GitHub issue
# Usage: ./scripts/init-feature.sh [issue-number]
#
# This script:
# 1. Fetches the issue details from GitHub (including custom slug field)
# 2. Creates a worktree using the slug from the issue
# 3. Updates the issue with worktree:active label
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
  echo ""
  echo "Available issues (not currently in worktrees):"
  echo ""

  # Get all open issues without worktree:active label
  local issues
  issues=$(gh issue list \
    --state open \
    --label "!worktree:active" \
    --limit 20 \
    --json number,title,labels \
    --jq '.[] | "\(.number)|\(.title)|\(.labels | map(.name) | join(","))"' 2>/dev/null)

  if [ -z "$issues" ]; then
    echo "  No available issues found."
    echo ""
    return
  fi

  local count=0
  while IFS='|' read -r num title labels; do
    count=$((count + 1))
    echo "  $count. #$num - $title"

    # Show relevant labels
    if [[ "$labels" == *"category:"* ]] || [[ "$labels" == *"area:"* ]]; then
      echo "     Labels: $labels"
    fi
    echo ""
  done <<< "$issues"

  echo "Usage: $0 <issue-number>"
  echo "Example: $0 73"
  echo ""
}

# Main script logic
main() {
  local issue_number="$1"

  # Step 1: Determine issue number
  if [ -z "$issue_number" ]; then
    echo "No issue number provided."
    list_available_issues
    exit 1
  fi

  # Validate issue number is numeric
  if ! [[ "$issue_number" =~ ^[0-9]+$ ]]; then
    echo "Error: Issue number must be numeric (got: $issue_number)"
    exit 1
  fi

  echo ""
  echo "Initializing worktree for issue #${issue_number}..."
  echo ""

  # Step 2: Check if issue exists and fetch metadata
  echo "→ Fetching issue details from GitHub..."

  local issue_data
  if ! issue_data=$(gh issue view "$issue_number" --json title,state,labels,fields 2>/dev/null); then
    echo "Error: Could not fetch issue #${issue_number}"
    echo "Make sure the issue exists and you have access to it."
    list_available_issues
    exit 1
  fi

  local title
  title=$(echo "$issue_data" | jq -r '.title')

  local state
  state=$(echo "$issue_data" | jq -r '.state')

  if [ "$state" = "CLOSED" ]; then
    echo "Error: Issue #${issue_number} is already closed"
    echo "Title: $title"
    exit 1
  fi

  echo "  Issue: $title"

  # Step 3: Check if already has worktree:active label
  local has_worktree_label
  has_worktree_label=$(echo "$issue_data" | jq -r '.labels[] | select(.name=="worktree:active") | .name' || echo "")

  if [ -n "$has_worktree_label" ]; then
    echo ""
    echo "Error: Issue #${issue_number} already has an active worktree"
    echo ""
    echo "Existing worktrees:"
    find "$WORKTREE_PARENT" -maxdepth 1 -type d -name "${issue_number}-*" 2>/dev/null || true
    echo ""
    exit 1
  fi

  # Step 4: Get slug from custom field or generate from title
  local slug
  slug=$(echo "$issue_data" | jq -r '.fields[] | select(.name=="worktree_slug") | .value' 2>/dev/null || echo "")

  if [ -z "$slug" ] || [ "$slug" = "null" ]; then
    echo "  ⚠️  No slug found in custom field, generating from title..."
    slug=$(generate_slug_from_title "$title")
    echo "  Generated slug: $slug"
  else
    echo "  Slug: $slug"
  fi

  # Step 5: Calculate port
  local port
  port=$((5000 + issue_number))
  echo "  Port: $port"

  # Step 6: Check if worktree already exists
  if [ -d "${WORKTREE_PARENT}/${issue_number}-${slug}" ]; then
    echo ""
    echo "Error: Worktree already exists at ${WORKTREE_PARENT}/${issue_number}-${slug}"
    echo "Remove it first with: git worktree remove ${WORKTREE_PARENT}/${issue_number}-${slug}"
    exit 1
  fi

  # Step 7: Call create-worktree.sh
  echo ""
  echo "→ Creating worktree..."

  if ! "${MAIN_REPO_PATH}/scripts/create-worktree.sh" "$issue_number" "$slug" "$port"; then
    echo ""
    echo "Error: Failed to create worktree"
    exit 1
  fi

  # Step 8: Update GitHub issue
  echo ""
  echo "→ Updating GitHub issue..."

  if gh issue edit "$issue_number" --add-label "worktree:active" 2>/dev/null; then
    echo "  ✓ Added worktree:active label"
  else
    echo "  ⚠️  Warning: Could not add label (may need to add manually)"
  fi

  local worktree_path="${WORKTREE_PARENT}/${issue_number}-${slug}"
  local comment="Worktree created:
- Path: \`.worktrees/${issue_number}-${slug}\`
- Port: ${port}
- Branch: \`feature/${issue_number}-${slug}\`"

  if gh issue comment "$issue_number" --body "$comment" 2>/dev/null; then
    echo "  ✓ Added comment to issue"
  fi

  # Step 9: Success summary
  echo ""
  echo -e "${GREEN}✅ Worktree created successfully!${NC}"
  echo ""
  echo "Worktree Details:"
  echo "  Issue: #${issue_number} - ${title}"
  echo "  Branch: feature/${issue_number}-${slug}"
  echo "  Path: ${worktree_path}"
  echo "  Port: ${port}"
  echo "  GitHub: https://github.com/jeffdt/homskillet-discography/issues/${issue_number}"
  echo ""
  echo "To work on this feature:"
  echo -e "  ${GREEN}cd ${worktree_path}${NC}"
  echo -e "  ${GREEN}bun start --port ${port}${NC}"
  echo ""
  echo "Test your changes at: http://localhost:${port}"
  echo ""
  echo "When ready:"
  echo "  - Create PR: /pr:draft (from within the worktree)"
  echo "  - Complete work: ./scripts/finish-feature.sh ${issue_number}"
  echo ""
}

# Run main function
main "$@"
