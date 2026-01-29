# Version Bump Examples

This file demonstrates how different commit messages trigger version bumps.

## Starting Version: 1.0.0

### Example 1: Bug Fix (Patch Bump)
```bash
git commit -m "fix: resolve memory leak in file upload"
# Result: 1.0.0 -> 1.0.1
```

### Example 2: New Feature (Minor Bump)
```bash
git commit -m "feat: add image rotation tool"
# Result: 1.0.1 -> 1.1.0
```

### Example 3: Another Feature
```bash
git commit -m "feat(ui): improve mobile responsiveness"
# Result: 1.1.0 -> 1.2.0
```

### Example 4: Breaking Change (Major Bump)
```bash
git commit -m "feat!: redesign API with new endpoints"
# Result: 1.2.0 -> 2.0.0
```

### Example 5: Non-Triggering Commits
```bash
git commit -m "chore: update dependencies"
git commit -m "docs: update README"
git commit -m "style: format code"
# Result: No version bump, no release created
```

## How to Test Locally

```bash
# Reset to a known version
echo "1.0.0" > VERSION

# Make a commit with conventional commit format
git add .
git commit -m "feat: add new feature"

# Run version bump script
bash .github/scripts/bump-version.sh

# Check new version
cat VERSION
# Expected: 1.1.0
```

## Workflow Behavior

1. **Automatic (on push to main)**:
   - Commit analyzed for conventional commit pattern
   - Version automatically bumped based on commit type
   - Git tag created (e.g., v1.1.0)
   - Docker images built and tagged
   - GitHub Release created with changelog
   - Deployment to production

2. **Manual (via GitHub Actions UI)**:
   - Choose version bump type manually
   - Rest of process same as automatic

3. **Skip Release** (commits without conventional format):
   - Regular CI/CD runs
   - No version bump
   - No release created
   - No automatic deployment
