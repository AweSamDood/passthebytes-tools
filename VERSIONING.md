# Versioning and Deployment Guide

## Overview

This project uses **Semantic Versioning** (SemVer) with automated version bumping based on **Conventional Commits**. The versioning system is integrated with GitHub Actions and works seamlessly with protected branches by creating pull requests for version bumps.

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

The workflow has been designed to work with protected branches by using pull requests:

1. **Push conventional commit to main (or any branch that gets merged to main)**
   ```bash
   git commit -m "feat: add new tool"
   git push origin main
   ```

2. **GitHub Actions workflow automatically:**
   - Detects the conventional commit
   - Calculates the new version based on commit type
   - Creates a new branch `release/vX.Y.Z`
   - Updates the `VERSION` file
   - Creates a pull request to main
   - Attempts to enable auto-merge (if repository settings allow)

3. **After the version bump PR is merged:**
   - Workflow automatically creates git tag (e.g., `v1.2.3`)
   - Builds and pushes versioned Docker images
   - Creates GitHub Release with changelog
   - Deploys to production

4. **Docker images are tagged:**
   - `ghcr.io/awesamdood/passthebytes-tools/backend:v1.2.3`
   - `ghcr.io/awesamdood/passthebytes-tools/backend:latest`
   - `ghcr.io/awesamdood/passthebytes-tools/frontend:v1.2.3`
   - `ghcr.io/awesamdood/passthebytes-tools/frontend:latest`

### Protected Branches

This workflow is designed to work with protected branches:

- Version bumps are done via pull requests, not direct pushes
- The bot creates PRs that can be reviewed before merging
- Auto-merge can be enabled in repository settings to streamline the process
- No special tokens or bypass permissions needed

### Enabling Auto-Merge (Optional)

To enable automatic merging of version bump PRs:

1. Go to **Settings** → **Branches** in your repository
2. Edit the branch protection rule for `main`
3. Enable "Allow auto-merge"
4. Configure required status checks as needed
5. The workflow will automatically enable auto-merge on version bump PRs

**Recommended branch protection settings:**
- ✅ Require pull request reviews before merging (optional for automation)
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Allow auto-merge
- ⚠️ Do NOT require review from code owners for `release/*` branches (if using auto-merge)

**GitHub Actions Bot Permissions:**
The workflow uses the built-in `GITHUB_TOKEN` which has the necessary permissions to:
- Create branches
- Create pull requests  
- Push tags (after PR is merged to main)
- Push to GitHub Container Registry

No additional tokens or secrets are required.

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
