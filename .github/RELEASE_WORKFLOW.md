# Release Workflow Guide

## Overview

This document explains how the automated release workflow works with protected branches.

## Workflow Triggers

The `release.yml` workflow is triggered by:

1. **Push to main/master** - When commits are pushed directly or merged via PR
2. **Pull request closed** - When a PR is merged to main/master
3. **Manual dispatch** - Via the Actions tab in GitHub

## Workflow Behavior

### Scenario 1: Conventional Commit Pushed to Main

**Trigger:** Push with commit message like `feat: add new feature`

**What happens:**
1. Workflow detects conventional commit (feat, fix, etc.)
2. Calculates new version using bump-version.sh script
3. Creates a new branch `release/vX.Y.Z`
4. Commits VERSION file update to that branch
5. Creates a pull request to main
6. Attempts to enable auto-merge (if repository allows)

**Result:** A PR is created and waiting for merge

### Scenario 2: Version Bump PR Merged

**Trigger:** Merging a PR from branch `release/vX.Y.Z`

**What happens:**
1. Workflow detects this is a version bump PR (branch name pattern)
2. Creates and pushes git tag `vX.Y.Z`
3. Builds and pushes versioned Docker images
4. Creates GitHub Release with changelog
5. Deploys to production

**Result:** Full release and deployment completed

### Scenario 3: Version Bump Commit Pushed Directly

**Trigger:** Commit message starts with `chore: bump version to`

**What happens:**
1. Workflow detects this is a version bump commit
2. Skips processing to avoid loops

**Result:** No action taken (prevents infinite loops)

### Scenario 4: Non-Conventional Commit

**Trigger:** Push with commit like `docs: update README`

**What happens:**
1. Workflow checks commit message
2. Does not match conventional commit pattern
3. Skips processing

**Result:** No action taken

### Scenario 5: Manual Workflow Dispatch

**Trigger:** Running workflow manually from Actions tab

**What happens:**
1. Creates version bump PR based on selected bump type (major/minor/patch/auto)
2. Same flow as Scenario 1

**Result:** A PR is created

## Protected Branch Compatibility

This workflow is designed to work with protected branches by:

- ✅ Creating PRs instead of direct pushes
- ✅ Using standard GitHub Actions bot token
- ✅ No special bypass permissions needed
- ✅ Can leverage auto-merge feature when configured
- ✅ Allows for review before version bump if needed

## Auto-Merge Setup (Optional)

To enable automatic merging of version bump PRs:

1. Go to **Settings** → **Branches**
2. Edit branch protection rule for `main`
3. Enable "Allow auto-merge"
4. Configure required checks (CI must pass)
5. Version bump PRs will auto-merge after checks pass

## Job Dependencies

```
check-action (determines what to do)
    ├─> create-version-pr (if action=bump)
    └─> create-tag (if action=release)
            ├─> build-versioned-images
            │       └─> create-release
            └─> deploy
```

## Permissions Required

The workflow requires these permissions:
- `contents: write` - For creating tags
- `packages: write` - For pushing Docker images
- `pull-requests: write` - For creating PRs

## Troubleshooting

### PR not created
- Check if conventional commit format is correct
- Verify workflow has `pull-requests: write` permission
- Check workflow logs for errors

### Auto-merge not enabled
- Verify repository settings allow auto-merge
- Check branch protection rules
- Ensure required checks are configured

### Tag not created after PR merge
- Verify PR was from `release/vX.Y.Z` branch
- Check workflow logs for the merged PR event
- Ensure VERSION file was updated in the PR

### Deployment fails
- Check self-hosted runner is online
- Verify PROJECT_PATH secret is set correctly
- Review deployment logs

## Testing the Workflow

To test without triggering a full release:

1. Create a feature branch
2. Make changes with conventional commit
3. Create PR to main
4. Merge PR
5. Workflow will create version bump PR
6. Review the version bump PR (don't merge yet)
7. Close the PR to cancel if testing

## Example Flow

```bash
# Developer makes a change
git checkout -b feature/new-tool
git commit -m "feat: add QR code generator"
git push origin feature/new-tool

# Create and merge PR to main
# (via GitHub UI)

# Automatic workflow:
# 1. Detects "feat:" commit in main
# 2. Bumps version 1.0.0 -> 1.1.0
# 3. Creates PR from release/v1.1.0

# After version bump PR is merged:
# 4. Creates tag v1.1.0
# 5. Builds Docker images
# 6. Creates GitHub Release
# 7. Deploys to production
```
