# Deployment and Versioning System - Implementation Summary

## Overview

This implementation adds a complete versioning and deployment system to the PassTheBytes Tools project using conventional commits and semantic versioning.

## What Was Implemented

### 1. Version Management
- **VERSION file**: Stores current version (semantic versioning: MAJOR.MINOR.PATCH)
- **bump-version.sh**: Script that automatically bumps version based on conventional commits
  - `feat:` → minor bump (1.0.0 → 1.1.0)
  - `fix:` → patch bump (1.0.0 → 1.0.1)
  - `feat!:` or `BREAKING CHANGE:` → major bump (1.0.0 → 2.0.0)

### 2. GitHub Actions Workflows

#### Release Workflow (`.github/workflows/release.yml`)
Triggers on push to main with conventional commits:
1. ✅ Detects conventional commit types
2. 📦 Bumps version automatically
3. 🏷️ Creates git tag (e.g., v1.2.3)
4. 🐳 Builds and pushes versioned Docker images
5. 📋 Creates GitHub Release with changelog
6. 🚀 Deploys to production

#### Manual Deploy Workflow (`.github/workflows/deploy.yml`)
Updated for manual deployments:
- Trigger manually via GitHub Actions UI
- Can deploy specific version or latest
- Useful for rollbacks or targeted deployments

### 3. Docker Integration

#### Updated `docker-compose.prod.yml`
```yaml
services:
  backend:
    image: ghcr.io/awesamdood/passthebytes-tools/backend:${VERSION:-latest}
  frontend:
    image: ghcr.io/awesamdood/passthebytes-tools/frontend:${VERSION:-latest}
```

Benefits:
- Pull versioned images from registry
- Fall back to local build if not available
- Support for custom registries via env vars

#### Updated `deployment/deploy.sh`
- Reads version from VERSION file
- Attempts to pull versioned images first
- Falls back to building if images unavailable
- Supports both versioned and latest deployments

### 4. Documentation

#### VERSIONING.md
Complete guide covering:
- How conventional commits work
- Version bump examples
- Workflow behavior
- Manual operations
- Rollback procedures
- Troubleshooting

#### VERSION_EXAMPLES.md
Quick reference with practical examples

#### Updated README.md
Added link to versioning documentation

## Workflow Diagrams

### Automatic Release Flow
```
Developer commits with "feat:" or "fix:"
        ↓
Push to main branch
        ↓
Release workflow triggers
        ↓
├─ Analyze commits → Determine bump type
├─ Bump VERSION file → Create git tag
├─ Build Docker images → Tag with version
├─ Push to GitHub Container Registry
├─ Create GitHub Release → Generate changelog
└─ Deploy to production → Health checks
```

### Version Tagging
```
Commit: "feat: add new tool"
        ↓
Current version: 1.0.0
        ↓
Bump type: minor (feat)
        ↓
New version: 1.1.0
        ↓
Git tag: v1.1.0
        ↓
Docker images:
├─ ghcr.io/.../backend:v1.1.0
├─ ghcr.io/.../backend:latest
├─ ghcr.io/.../frontend:v1.1.0
└─ ghcr.io/.../frontend:latest
```

## Environment Variables

New optional variables in `.env`:
```bash
VERSION=1.0.0                                    # Override version
DOCKER_REGISTRY=ghcr.io                          # Container registry
DOCKER_REPO=awesamdood/passthebytes-tools        # Repository path
```

## Usage Examples

### Automatic Release
```bash
# Make changes
git add .
git commit -m "feat: add PDF compression tool"
git push origin main

# Workflow automatically:
# - Bumps version: 1.0.0 → 1.1.0
# - Creates tag: v1.1.0
# - Builds images: backend:v1.1.0, frontend:v1.1.0
# - Creates GitHub Release
# - Deploys to production
```

### Manual Deployment
```bash
# Via GitHub Actions UI:
1. Go to Actions → Manual Deploy to Production
2. Click "Run workflow"
3. Enter version (e.g., "1.0.5") or leave empty for latest
4. Click "Run workflow"
```

### Local Testing
```bash
# Test version bump
echo "1.0.0" > VERSION
bash .github/scripts/bump-version.sh
cat VERSION  # Shows: 1.0.1

# Test with specific bump
bash .github/scripts/bump-version.sh minor
cat VERSION  # Shows: 1.1.0
```

### Rollback
```bash
# Deploy previous version
1. Actions → Manual Deploy to Production
2. Enter previous version: "1.0.4"
3. Run workflow
```

## Files Changed/Added

### Added Files
- `VERSION` - Version tracking file
- `.github/scripts/bump-version.sh` - Version bumping script
- `.github/workflows/release.yml` - Automated release workflow
- `VERSIONING.md` - Complete versioning guide
- `.github/VERSION_EXAMPLES.md` - Quick examples

### Modified Files
- `.github/workflows/deploy.yml` - Updated for versioned deployments
- `docker-compose.prod.yml` - Added image tags with version support
- `deployment/deploy.sh` - Added version handling and image pulling
- `README.md` - Added versioning reference
- `.env.example` - Added versioning variables

## Benefits

1. **Automated Versioning**: No manual version updates needed
2. **Clear History**: Every version has a git tag and GitHub release
3. **Reproducible Deployments**: Can deploy any version via tags
4. **Easy Rollbacks**: Deploy previous versions with one click
5. **Conventional Commits**: Enforces structured commit messages
6. **Docker Registry**: Versioned images available for any deployment
7. **Changelog Generation**: Automatic release notes from commits

## Next Steps

After merging this PR:

1. **First Release**:
   - Merge PR to main
   - Workflow will create v1.0.0 release
   - Docker images will be tagged and pushed

2. **Future Releases**:
   - Use conventional commits for all changes
   - Automatic versioning on every push to main

3. **Monitoring**:
   - Check GitHub Releases for changelogs
   - Review deployment logs in Actions
   - Monitor version tags in Container Registry

## Testing Recommendations

Before merging:
1. ✅ Verify workflow YAML syntax (done - yamllint passed)
2. ✅ Test version bump script locally (done)
3. ⏳ Check workflow runs after merge
4. ⏳ Verify Docker images are pushed correctly
5. ⏳ Test manual deployment with specific version

## Security Considerations

- GitHub token automatically provided for releases
- Container registry credentials from GitHub secrets
- No secrets stored in code
- Version history tracked in git
- Rollback capability for security patches

## Compatibility

- Works with existing CI/CD pipeline
- Backward compatible with manual deployments
- No breaking changes to current deployment process
- Existing workflows (ci.yml) unchanged
