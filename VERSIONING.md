# Versioning and Deployment Guide

## Overview

This project uses **Semantic Versioning** (SemVer) with automated version bumping based on **Conventional Commits**. The versioning system is integrated with GitHub Actions for automated releases and deployments.

## Version Format

Versions follow the SemVer format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., `feat!:` or `BREAKING CHANGE:`)
- **MINOR**: New features (e.g., `feat:`)
- **PATCH**: Bug fixes (e.g., `fix:`)

## Conventional Commits

Use conventional commit messages to trigger automatic version bumps:

### Feature (Minor Version Bump)
```bash
git commit -m "feat: add password strength indicator"
git commit -m "feat(auth): implement OAuth login"
```

### Bug Fix (Patch Version Bump)
```bash
git commit -m "fix: resolve image upload issue"
git commit -m "fix(api): correct error handling in converter"
```

### Breaking Change (Major Version Bump)
```bash
git commit -m "feat!: redesign API endpoints"
# or
git commit -m "feat: new authentication system

BREAKING CHANGE: Previous auth tokens are no longer valid"
```

### Other Commit Types (No Version Bump)
These don't trigger releases but are good practice:
- `chore:` - Maintenance tasks
- `docs:` - Documentation updates
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Test updates

## How It Works

### Automatic Release Workflow

1. **Push to main with conventional commit**
   ```bash
   git commit -m "feat: add new tool"
   git push origin main
   ```

2. **GitHub Actions workflow triggers:**
   - Analyzes commit messages since last tag
   - Determines version bump type (major/minor/patch)
   - Updates `VERSION` file
   - Creates git tag (e.g., `v1.2.3`)
   - Builds and pushes versioned Docker images
   - Creates GitHub Release with changelog
   - Deploys to production

3. **Docker images are tagged:**
   - `ghcr.io/awesamdood/passthebytes-tools/backend:v1.2.3`
   - `ghcr.io/awesamdood/passthebytes-tools/backend:latest`
   - `ghcr.io/awesamdood/passthebytes-tools/frontend:v1.2.3`
   - `ghcr.io/awesamdood/passthebytes-tools/frontend:latest`

## Manual Version Bumping

You can manually trigger a release with a specific version bump:

1. Go to **Actions** tab in GitHub
2. Select **Release and Deploy** workflow
3. Click **Run workflow**
4. Choose version bump type: `auto`, `major`, `minor`, or `patch`
5. Run workflow

## Manual Deployment

To manually deploy a specific version:

1. Go to **Actions** tab in GitHub
2. Select **Manual Deploy to Production** workflow
3. Click **Run workflow**
4. Enter version number (e.g., `1.2.3`) or leave empty for latest
5. Run workflow

## Local Version Management

### Check Current Version
```bash
cat VERSION
```

### Manually Bump Version (Local Testing)
```bash
# Automatic detection based on commits
./.github/scripts/bump-version.sh

# Specific bump type
./.github/scripts/bump-version.sh patch
./.github/scripts/bump-version.sh minor
./.github/scripts/bump-version.sh major
```

## Deployment with Versions

### Production Deployment

The deployment system automatically uses versioned images:

```bash
# Set version (or it reads from VERSION file)
export VERSION=1.2.3

# Deploy
./deployment/deploy.sh production
```

The system will:
1. Try to pull versioned Docker images from registry
2. Fall back to local build if images aren't available
3. Start containers with proper version tags

### Development Deployment

Development uses local builds:
```bash
./deployment/deploy.sh development
```

## Docker Compose Configuration

The `docker-compose.prod.yml` supports versioned images:

```yaml
services:
  backend:
    image: ghcr.io/awesamdood/passthebytes-tools/backend:${VERSION:-latest}
  frontend:
    image: ghcr.io/awesamdood/passthebytes-tools/frontend:${VERSION:-latest}
```

Environment variables:
- `VERSION`: Version tag (default: `latest`)
- `DOCKER_REGISTRY`: Registry URL (default: `ghcr.io`)
- `DOCKER_REPO`: Repository path (default: `awesamdood/passthebytes-tools`)

## Best Practices

1. **Use conventional commits** - Always prefix commits with type
2. **Write clear commit messages** - Describe what changed and why
3. **Test before pushing** - Ensure code works locally
4. **Review releases** - Check GitHub Releases for changelog
5. **Monitor deployments** - Verify health checks pass

## Rollback

To rollback to a previous version:

1. Go to **Actions** → **Manual Deploy to Production**
2. Run workflow with previous version number
3. Or use git to checkout previous tag:
   ```bash
   git checkout v1.2.2
   # Deploy manually
   ```

## Troubleshooting

### Version not bumping
- Ensure commit uses conventional commit format
- Check that commits are pushed to `main` branch
- Verify `VERSION` file exists in repository root

### Images not found
- Check GitHub Container Registry for available versions
- Ensure Docker login credentials are correct
- Build locally if registry images unavailable

### Deployment fails
- Check deployment logs in Actions
- Verify health endpoints are responding
- Review container logs: `docker compose logs`

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions](https://docs.github.com/en/actions)
