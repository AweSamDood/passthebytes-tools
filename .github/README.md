# .github Directory Documentation

This directory contains GitHub-specific configuration and documentation for the PassTheBytes Tools project.

## 📋 Documentation Guide

### Quick References
- **[QUICK_START.md](QUICK_START.md)** - Start here! Quick reference for developers and admins
- **[WORKFLOW_DIAGRAM.md](WORKFLOW_DIAGRAM.md)** - Visual diagrams of the release workflow

### Detailed Guides
- **[RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md)** - Comprehensive guide to the automated release workflow
- **[../VERSIONING.md](../VERSIONING.md)** - Complete versioning and deployment documentation

### Implementation Details
- **[../IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)** - Summary of the PR-based version bumping implementation
- **[../SECURITY_SUMMARY.md](../SECURITY_SUMMARY.md)** - Security analysis and best practices

## 🔧 Configuration Files

### Workflows
- **[workflows/release.yml](workflows/release.yml)** - Automated release and deployment workflow
- **[workflows/ci.yml](workflows/ci.yml)** - Continuous integration pipeline
- **[workflows/deploy.yml](workflows/deploy.yml)** - Manual deployment workflow

### Scripts
- **[scripts/bump-version.sh](scripts/bump-version.sh)** - Version bumping script

## 📚 Reading Order

**For new contributors:**
1. Start with [QUICK_START.md](QUICK_START.md)
2. Read [../VERSIONING.md](../VERSIONING.md) for versioning details
3. Check [WORKFLOW_DIAGRAM.md](WORKFLOW_DIAGRAM.md) for visual understanding

**For understanding the workflow:**
1. Read [RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md)
2. Review [WORKFLOW_DIAGRAM.md](WORKFLOW_DIAGRAM.md)
3. Check [workflows/release.yml](workflows/release.yml) for implementation

**For troubleshooting:**
1. Check [QUICK_START.md](QUICK_START.md) → Common Issues
2. Review [RELEASE_WORKFLOW.md](RELEASE_WORKFLOW.md) → Troubleshooting
3. Check GitHub Actions logs

## 🎯 Key Features

### Automated Version Bumping
- Uses conventional commits to determine version bumps
- Creates pull requests for version changes
- Works with protected branches
- Supports optional auto-merge

### Continuous Integration
- Automated testing and linting
- Security scanning
- Docker image building
- Integration tests

### Continuous Deployment
- Automated deployment on version bump PR merge
- Health checks and verification
- Rollback capability
- Deployment logging

## 🔗 External Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

## 📞 Support

If you encounter issues:
1. Check the documentation files listed above
2. Review GitHub Actions workflow logs
3. Check the repository Issues
4. Refer to TROUBLESHOOTING sections in guides

## 🔄 Workflow Overview

```
Developer commits → Workflow detects → Version bump PR created
                                              ↓
                                        PR merged
                                              ↓
                                    Tag created → Images built
                                              ↓
                                    Release published → Deployed
```

See [WORKFLOW_DIAGRAM.md](WORKFLOW_DIAGRAM.md) for detailed visual diagrams.
