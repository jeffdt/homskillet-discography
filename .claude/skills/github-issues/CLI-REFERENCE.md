# GitHub CLI Reference for Issues

Quick reference guide for `gh issue` commands used in the Homskillet Discography project.

## Installation and Setup

```bash
# Install gh CLI (if not already installed)
brew install gh

# Authenticate
gh auth login

# Verify authentication
gh auth status
```

## Creating Issues

### Basic Create

```bash
gh issue create \
  --title "Issue title" \
  --body "Issue description"
```

### Create with Labels

```bash
gh issue create \
  --title "Add visualizer feature" \
  --body "Description here" \
  --label "category:enhancement,area:visualizer,status:ready"
```

### Create with Multiline Body

```bash
gh issue create \
  --title "Fix player bug" \
  --body "Bug description

## Areas
- player

---
*Created via /feature:record*" \
  --label "category:bug,area:player,status:ready"
```

### Create and Capture Issue Number

```bash
ISSUE_NUM=$(gh issue create \
  --title "Title" \
  --body "Body" \
  --label "category:enhancement" \
  --json number \
  --jq '.number')

echo "Created issue #$ISSUE_NUM"
```

## Listing Issues

### List All Open Issues

```bash
gh issue list
```

### Filter by State

```bash
gh issue list --state open
gh issue list --state closed
gh issue list --state all
```

### Filter by Labels

```bash
# Single label
gh issue list --label "area:visualizer"

# Multiple labels (AND condition)
gh issue list --label "area:visualizer" --label "category:enhancement"

# Exclude label (NOT condition)
gh issue list --label "!worktree:active"

# Combine include and exclude
gh issue list --label "area:visualizer" --label "!worktree:active" --label "!status:wip"
```

### Limit Results

```bash
gh issue list --limit 50
gh issue list --limit 100
```

### JSON Output

```bash
# Get specific fields
gh issue list --json number,title,labels,state

# Get all fields
gh issue list --json number,title,body,labels,state,createdAt,updatedAt,author

# Parse with jq
gh issue list --json number,title,labels | jq '.[] | select(.number == 45)'
```

## Viewing Issues

### View Single Issue

```bash
gh issue view 45
```

### View with JSON Output

```bash
gh issue view 45 --json number,title,body,labels,state,comments

# Extract specific field
gh issue view 45 --json labels --jq '.labels[].name'

# Check if issue has specific label
gh issue view 45 --json labels --jq '.labels[].name' | grep "worktree:active"
```

## Editing Issues

### Add Labels

```bash
gh issue edit 45 --add-label "worktree:active"
gh issue edit 45 --add-label "status:wip"

# Multiple labels
gh issue edit 45 --add-label "worktree:active,status:wip"
```

### Remove Labels

```bash
gh issue edit 45 --remove-label "worktree:active"
gh issue edit 45 --remove-label "status:wip"

# Multiple labels
gh issue edit 45 --remove-label "worktree:active,status:wip"
```

### Update Title

```bash
gh issue edit 45 --title "New title"
```

### Update Body

```bash
gh issue edit 45 --body "New description"
```

## Commenting on Issues

### Add Comment

```bash
gh issue comment 45 --body "This is a comment"
```

### Multiline Comment

```bash
gh issue comment 45 --body "Worktree created:
- Path: /Users/hom/code/homskillet-worktrees/45-title
- Port: 5045
- Branch: feature/45-title"
```

### View Comments

```bash
gh issue view 45 --json comments --jq '.comments[] | {author: .author.login, body: .body}'
```

## Closing and Reopening Issues

### Close Issue

```bash
gh issue close 45
```

### Close with Comment

```bash
gh issue close 45 --comment "Merged in PR #67"
```

### Reopen Issue

```bash
gh issue reopen 45
```

## Searching Issues

### Search by Text

```bash
gh issue list --search "visualizer"
gh issue list --search "in:title visualizer"
gh issue list --search "in:body audio"
```

### Complex Search

```bash
# Open bugs in visualizer area
gh issue list --search "is:open label:category:bug label:area:visualizer"

# Issues updated in last 7 days
gh issue list --search "is:open updated:>$(date -v-7d +%Y-%m-%d)"
```

## Useful One-Liners

### Get All Open Issue Numbers

```bash
gh issue list --state open --json number --jq '.[].number'
```

### Count Issues by Label

```bash
gh issue list --label "area:visualizer" --json number --jq 'length'
```

### Get Available Issues (not in worktree)

```bash
gh issue list \
  --label "!worktree:active" \
  --label "!status:wip" \
  --label "!status:blocked" \
  --json number,title,labels
```

### Extract Area Labels from Issue

```bash
gh issue view 45 --json labels --jq '.labels[] | select(.name | startswith("area:")) | .name'
```

### Extract Category Label from Issue

```bash
gh issue view 45 --json labels --jq '.labels[] | select(.name | startswith("category:")) | .name'
```

### Check if Issue Has Label

```bash
if gh issue view 45 --json labels --jq '.labels[].name' | grep -q "worktree:active"; then
  echo "Issue has worktree:active label"
fi
```

## Batch Operations

### Close Multiple Issues

```bash
for issue in 45 46 47; do
  gh issue close $issue --comment "Batch close"
done
```

### Add Label to Multiple Issues

```bash
for issue in 45 46 47; do
  gh issue edit $issue --add-label "status:ready"
done
```

### Create Issues from File

```bash
while IFS='|' read -r title body labels; do
  gh issue create --title "$title" --body "$body" --label "$labels"
done < issues.txt
```

## Error Handling

### Check if Issue Exists

```bash
if gh issue view 45 &>/dev/null; then
  echo "Issue exists"
else
  echo "Issue not found"
fi
```

### Handle API Rate Limits

```bash
# Check rate limit status
gh api rate_limit

# If rate limited, wait
gh api rate_limit --jq '.resources.core | "Remaining: \(.remaining)/\(.limit), Resets at: \(.reset | strftime("%Y-%m-%d %H:%M:%S"))"'
```

## Formatting Output

### Custom Table Format

```bash
gh issue list --json number,title,labels,updatedAt \
  --template '{{range .}}{{printf "#%d" .number}} | {{.title}} | {{range .labels}}{{.name}} {{end}}
{{end}}'
```

### Markdown Format

```bash
gh issue list --json number,title,labels \
  --jq '.[] | "- [#\(.number)](\(.url)) \(.title) - Labels: \(.labels | map(.name) | join(", "))"'
```

## Tips and Best Practices

1. **Use `--json` for Programmatic Access**: Easier to parse than text output
2. **Cache Results**: For repeated queries, cache `gh issue list` output to reduce API calls
3. **Label Naming Convention**: Use `prefix:value` format (e.g., `area:visualizer`) for easy filtering
4. **Batch Operations**: Use loops for bulk changes, but be mindful of rate limits
5. **Error Checking**: Always check return codes when scripting with gh CLI
6. **JSON Queries**: Use `jq` for complex JSON filtering and transformation

## Common Patterns

### Get Issue Number by Title (Approximate Match)

```bash
gh issue list --search "in:title slider sparks" --json number --jq '.[0].number'
```

### Get All Issues with Multiple Area Labels

```bash
gh issue list --json number,title,labels --jq '
  .[] | select(.labels | map(.name) |
    [.[] | select(startswith("area:"))] | length > 1
  )
'
```

### List Issues by Category

```bash
for category in bug enhancement maintainability simplification deployment; do
  echo "## ${category^^}"
  gh issue list --label "category:$category" --json number,title --jq '.[] | "- #\(.number): \(.title)"'
done
```
