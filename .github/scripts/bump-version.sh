#!/bin/bash

# Version bumping script based on conventional commits
# Usage: ./bump-version.sh [major|minor|patch]

set -e

VERSION_FILE="VERSION"

# Read current version
if [ ! -f "$VERSION_FILE" ]; then
    echo "1.0.0" > "$VERSION_FILE"
fi

CURRENT_VERSION=$(cat "$VERSION_FILE" | xargs)
echo "Current version: $CURRENT_VERSION"

# Validate version format
if ! echo "$CURRENT_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo "Error: Invalid version format in VERSION file. Expected MAJOR.MINOR.PATCH"
    exit 1
fi

# Parse version
IFS='.' read -r -a version_parts <<< "$CURRENT_VERSION"
MAJOR="${version_parts[0]}"
MINOR="${version_parts[1]}"
PATCH="${version_parts[2]}"

# Determine bump type from commit messages if not specified
BUMP_TYPE="${1:-}"

if [ -z "$BUMP_TYPE" ]; then
    # Get commits since last tag (or all commits if no tags)
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    
    if [ -z "$LAST_TAG" ]; then
        # No tags, check all commits
        COMMITS=$(git log --pretty=format:"%s")
    else
        # Get commits since last tag
        COMMITS=$(git log "${LAST_TAG}..HEAD" --pretty=format:"%s")
    fi
    
    # Check for breaking changes (BREAKING CHANGE in commit body or ! after type)
    if echo "$COMMITS" | grep -qE "^[a-z]+(\(.+\))?!:"; then
        BUMP_TYPE="major"
    elif git log "${LAST_TAG:+${LAST_TAG}..HEAD}" --pretty=format:"%b" | grep -q "BREAKING CHANGE:"; then
        BUMP_TYPE="major"
    # Check for features
    elif echo "$COMMITS" | grep -qE "^feat(\(.+\))?:"; then
        BUMP_TYPE="minor"
    # Check for fixes
    elif echo "$COMMITS" | grep -qE "^fix(\(.+\))?:"; then
        BUMP_TYPE="patch"
    else
        # Default to patch for other commits
        BUMP_TYPE="patch"
    fi
fi

# Bump version based on type
case "$BUMP_TYPE" in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
    *)
        echo "Invalid bump type: $BUMP_TYPE"
        echo "Usage: $0 [major|minor|patch]"
        exit 1
        ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
echo "New version: $NEW_VERSION (${BUMP_TYPE} bump)"

# Update VERSION file (ensure no trailing whitespace)
echo -n "$NEW_VERSION" > "$VERSION_FILE"

# Output for GitHub Actions
if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "version=$NEW_VERSION" >> "$GITHUB_OUTPUT"
    echo "bump_type=$BUMP_TYPE" >> "$GITHUB_OUTPUT"
fi

echo "✅ Version bumped from $CURRENT_VERSION to $NEW_VERSION"
