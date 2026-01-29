# Quick Start Guide: Automated Version Bumping

## TL;DR - What Changed?

Version bumps now use **pull requests** instead of direct pushes to work with protected branches.

## For Developers

### Nothing Changes For You! 
Just keep using conventional commits:
```bash
git commit -m "feat: add new feature"  # Minor version bump
git commit -m "fix: bug fix"           # Patch version bump
```

### What Happens Behind The Scenes
1. Your commit triggers a workflow
2. A PR is automatically created with version bump
3. PR gets merged (auto or manual)
4. Release happens automatically

## For Repository Administrators

### Required Setup: NONE ✅
The workflow works out-of-the-box with protected branches.

### Optional Setup: Auto-Merge
Enable automatic merging of version bump PRs:

1. **Settings** → **Branches** → **Edit protection rule for main**
2. ✅ Check "Allow auto-merge"
3. ✅ Set required status checks (CI must pass)
4. **Save**

That's it! Version bump PRs will now merge automatically after CI passes.

## Quick Reference

### Conventional Commit Types
| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | Minor (1.0.0 → 1.1.0) | `feat: add QR generator` |
| `fix:` | Patch (1.0.0 → 1.0.1) | `fix: resolve upload bug` |
| `feat!:` | Major (1.0.0 → 2.0.0) | `feat!: new API structure` |
| `docs:` | None | `docs: update README` |
| `chore:` | None | `chore: cleanup code` |

### Workflow States
| State | What It Means |
|-------|---------------|
| PR created (release/vX.Y.Z) | Version bump ready for review/merge |
| Tag created (vX.Y.Z) | Release in progress |
| GitHub Release published | Deployment complete |

## Common Scenarios

### "I want to make a release"
```bash
# Option 1: Use conventional commits (recommended)
git commit -m "feat: my new feature"
git push

# Option 2: Manual trigger
# Go to Actions → Release and Deploy → Run workflow
```

### "I want to review version bumps before release"
1. Don't enable auto-merge
2. Review and merge version bump PRs manually
3. Release happens after you merge

### "I want fully automated releases"
1. Enable auto-merge in branch protection
2. Ensure CI checks are configured
3. Everything happens automatically

### "Something went wrong"
- Check the Actions tab for workflow runs
- Review the workflow logs
- Check the troubleshooting section in RELEASE_WORKFLOW.md

## Branch Protection Best Practices

### Recommended Settings
```
✅ Require pull request reviews: Optional (for automation)
✅ Require status checks to pass: Yes (CI, tests, etc.)
✅ Require branches to be up to date: Yes
✅ Allow auto-merge: Yes (for full automation)
⚠️ Do NOT require approvals for release/* branches (if using auto-merge)
```

### Why These Settings?
- **Status checks**: Ensure code quality before release
- **Up-to-date branches**: Prevent merge conflicts
- **Auto-merge**: Enable hands-free releases
- **No approvals for release/***: Bot can't approve its own PRs

## Files to Know About

| File | Purpose |
|------|---------|
| `.github/workflows/release.yml` | Main workflow file |
| `.github/RELEASE_WORKFLOW.md` | Detailed workflow guide |
| `.github/WORKFLOW_DIAGRAM.md` | Visual flow diagrams |
| `VERSIONING.md` | Complete versioning docs |
| `VERSION` | Current version (auto-updated) |

## Support

### Getting Help
1. Check **RELEASE_WORKFLOW.md** for detailed scenarios
2. Review **WORKFLOW_DIAGRAM.md** for visual guides
3. Check workflow logs in Actions tab
4. Review this guide for quick answers

### Common Issues

**PR not created?**
- Verify commit uses conventional format
- Check Actions tab for errors

**Auto-merge not working?**
- Verify "Allow auto-merge" is enabled
- Check that required checks are passing
- Ensure no required reviewers for release/* branches

**Tag not created?**
- Verify PR was merged from release/vX.Y.Z branch
- Check Actions tab for workflow run

## Version History

You can always see:
- **Tags**: All version tags in the repository
- **Releases**: GitHub Releases page with changelogs
- **PRs**: All version bump PRs (labeled "release")

## Next Steps

1. ✅ Keep using conventional commits
2. ✅ Monitor first version bump PR
3. ✅ (Optional) Enable auto-merge
4. ✅ (Optional) Configure CI checks
5. ✅ Enjoy automated releases!

---

**Need more details?** Check out:
- `VERSIONING.md` - Complete versioning documentation
- `.github/RELEASE_WORKFLOW.md` - Workflow scenarios and troubleshooting
- `.github/WORKFLOW_DIAGRAM.md` - Visual workflow diagrams
