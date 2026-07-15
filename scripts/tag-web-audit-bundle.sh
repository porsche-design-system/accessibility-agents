#!/bin/bash
# Create an annotated Git tag for the web audit bundle release.
#
# Usage:
#   bash scripts/tag-web-audit-bundle.sh [--dry-run] [--message "Release notes"]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MANIFEST="$REPO_ROOT/scripts/web-audit-bundle.json"
DRY_RUN=false
TAG_MESSAGE=""

usage() {
  printf '%s\n' \
    "Create web-audit-bundle/VERSION tag from scripts/web-audit-bundle.json" \
    "" \
    "Options:" \
    "  --dry-run    Show the tag that would be created" \
    "  --message M  Annotated tag message (default: bundle description + version)" \
    "  --help       Show this help"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --message)
      [ "$#" -ge 2 ] || { echo "Error: --message requires a value."; exit 2; }
      TAG_MESSAGE="$2"
      shift 2
      ;;
    --message=*) TAG_MESSAGE="${1#*=}"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Error: unknown option: $1"; usage; exit 2 ;;
  esac
done

command -v node >/dev/null 2>&1 || {
  echo "Error: Node.js is required to read bundleVersion."
  exit 1
}

if [ ! -f "$MANIFEST" ]; then
  echo "Error: manifest not found: $MANIFEST"
  exit 1
fi

BUNDLE_VERSION="$(node -p "require('$MANIFEST').bundleVersion")"
DESCRIPTION="$(node -p "require('$MANIFEST').description || 'GitHub Copilot web accessibility audit bundle.'")"
TAG_NAME="web-audit-bundle/$BUNDLE_VERSION"

if [ -z "$TAG_MESSAGE" ]; then
  TAG_MESSAGE="$DESCRIPTION (bundleVersion $BUNDLE_VERSION)"
fi

if git -C "$REPO_ROOT" rev-parse -q --verify "refs/tags/$TAG_NAME" >/dev/null; then
  echo "Error: tag already exists: $TAG_NAME"
  exit 1
fi

echo "Bundle version: $BUNDLE_VERSION"
echo "Tag name:       $TAG_NAME"
echo "Message:        $TAG_MESSAGE"

if [ "$DRY_RUN" = true ]; then
  echo "Dry run complete; no tag was created."
  exit 0
fi

git -C "$REPO_ROOT" tag -a "$TAG_NAME" -m "$TAG_MESSAGE"
echo "Created tag $TAG_NAME"
echo "Push with: git push origin $TAG_NAME"
