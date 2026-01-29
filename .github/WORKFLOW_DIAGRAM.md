# Workflow Diagram: PR-Based Version Bumping

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Developer Activity                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              git commit -m "feat: new feature"
              git push origin main
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              GitHub Actions: Release Workflow                    │
│                     (Triggered on push)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  check-action   │
                    │  Determines:    │
                    │  What to do?    │
                    └─────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐        ┌─────────┐
    │  bump   │         │ release │        │  skip   │
    └─────────┘         └─────────┘        └─────────┘
          │                   │                   │
          │                   │                   ▼
          │                   │              (No action)
          ▼                   │
┌──────────────────┐          │
│create-version-pr │          │
├──────────────────┤          │
│ 1. Bump VERSION  │          │
│ 2. Create branch │          │
│    release/vX.Y.Z│          │
│ 3. Create PR     │          │
│ 4. Auto-merge    │          │
│    (if enabled)  │          │
└──────────────────┘          │
          │                   │
          ▼                   │
    ╔═══════════╗             │
    ║  PR READY ║             │
    ╚═══════════╝             │
          │                   │
    (Manual review            │
     or auto-merge)           │
          │                   │
          ▼                   │
    ┌─────────┐               │
    │PR MERGED│               │
    └─────────┘               │
          │                   │
          └───────────────────┘
                    │
                    ▼
          ┌─────────────────┐
          │   create-tag    │
          ├─────────────────┤
          │ 1. Create tag   │
          │    vX.Y.Z       │
          │ 2. Push tag     │
          └─────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────────┐    ┌──────────────┐
│build-versioned-  │    │    deploy    │
│     images       │    │              │
├──────────────────┤    ├──────────────┤
│ 1. Build backend │    │ 1. Sync code │
│ 2. Build frontend│    │ 2. Deploy    │
│ 3. Push to GHCR  │    │ 3. Verify    │
└──────────────────┘    └──────────────┘
        │
        ▼
┌──────────────────┐
│  create-release  │
├──────────────────┤
│ 1. Changelog     │
│ 2. GitHub Release│
└──────────────────┘
        │
        ▼
   ✅ COMPLETE
```

## Event-Based Triggers

### Event: Push to main with conventional commit
```
Push Event → check-action → bump → create-version-pr → PR Created
```

### Event: Version bump PR merged
```
PR Merged → check-action → release → Tag → Build → Deploy
```

### Event: Push without conventional commit
```
Push Event → check-action → skip → (No action)
```

### Event: Manual workflow dispatch
```
Manual Trigger → check-action → bump → create-version-pr → PR Created
```

## State Transitions

```
┌──────────┐  feat/fix    ┌──────────┐  PR merged   ┌─────────┐
│          │  commit      │ Version  │              │         │
│   MAIN   ├─────────────▶│ bump PR  ├─────────────▶│ TAGGED  │
│          │              │  ready   │              │         │
└──────────┘              └──────────┘              └────┬────┘
                                                         │
                                                         │ Build
                                                         │ & Deploy
                                                         │
                                                         ▼
                                                    ┌─────────┐
                                                    │         │
                                                    │DEPLOYED │
                                                    │         │
                                                    └─────────┘
```

## Protected Branch Interaction

```
┌────────────────────────────────────────────────────────┐
│               Protected Main Branch                     │
│  ⚠️  No direct pushes allowed                          │
│  ✅  PRs required for all changes                      │
└────────────────────────────────────────────────────────┘
                         ▲
                         │ PR
         ┌───────────────┴───────────────┐
         │                               │
┌────────────────┐              ┌────────────────┐
│  release/vX.Y.Z│              │   feature/xyz  │
│  (Version bump)│              │  (Dev changes) │
└────────────────┘              └────────────────┘
         │                               │
         │ Created by                    │ Created by
         │ GitHub Actions                │ Developer
         ▼                               ▼
  Automatic via                   Regular PR
  workflow trigger                 process
```

## Auto-Merge Flow (Optional)

```
┌─────────────────┐
│Version bump PR  │
│    created      │
└────────┬────────┘
         │
         ├─ Auto-merge enabled
         │  (if configured)
         │
         ▼
┌─────────────────┐
│  CI checks run  │
│  - Linting      │
│  - Tests        │
│  - Security     │
└────────┬────────┘
         │
    ✅ Pass
         │
         ▼
┌─────────────────┐
│ Auto-merge to   │
│      main       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Release flow   │
│   continues     │
└─────────────────┘
```

## Comparison: Before vs After

### Before (Direct Push - Fails with Protection)
```
Commit → Bump VERSION → Push to main ❌ → BLOCKED
```

### After (PR-Based - Works with Protection)
```
Commit → Bump VERSION → Create PR → Merge PR ✅ → Tag → Deploy
```

## Legend

```
┌─────────┐  Regular process box
│         │
└─────────┘

╔═════════╗  Important state
║         ║
╚═════════╝

├─────────┤  Job steps
│         │

───────▶    Flow direction

✅          Success/Enabled
❌          Failure/Blocked
⚠️          Warning/Note
```
