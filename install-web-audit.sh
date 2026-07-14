#!/bin/bash
# Install the focused GitHub Copilot web accessibility audit bundle.
#
# Usage:
#   bash install-web-audit.sh [--target PATH] [--with-config] [--force]
#   bash install-web-audit.sh --dry-run
#   bash install-web-audit.sh --check
#   curl -fsSL URL/install-web-audit.sh | bash -s -- --target PATH

set -euo pipefail

TARGET_DIR="$(pwd)"
DRY_RUN=false
CHECK_MODE=false
FORCE=false
WITH_CONFIG=false
ASSUME_YES=false
SOURCE_REF="${A11Y_WEB_AUDIT_REF:-issue/4560}"
SOURCE_REPOSITORY="${A11Y_WEB_AUDIT_REPOSITORY:-https://github.com/porsche-design-system/accessibility-agents.git}"
DOWNLOADED=false
TMPDIR_DL=""

usage() {
  printf '%s\n' \
    "GitHub Copilot web accessibility audit installer" \
    "" \
    "Options:" \
    "  --target PATH       Target repository (default: current directory)" \
    "  --with-config       Add the moderate .a11y-web-config.json when absent" \
    "  --force             Replace allowlisted files managed by this bundle" \
    "  --dry-run           Preview changes without writing files" \
    "  --check             Validate source, prerequisites, and target install" \
    "  --yes               Reserved for non-interactive automation" \
    "  --source-ref REF    Branch, tag, or commit used by remote bootstrap" \
    "  --help              Show this help"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --target)
      [ "$#" -ge 2 ] || { echo "Error: --target requires a path."; exit 2; }
      TARGET_DIR="$2"
      shift 2
      ;;
    --target=*) TARGET_DIR="${1#*=}"; shift ;;
    --with-config) WITH_CONFIG=true; shift ;;
    --force) FORCE=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --check) CHECK_MODE=true; shift ;;
    --yes) ASSUME_YES=true; shift ;;
    --source-ref)
      [ "$#" -ge 2 ] || { echo "Error: --source-ref requires a value."; exit 2; }
      SOURCE_REF="$2"
      shift 2
      ;;
    --source-ref=*) SOURCE_REF="${1#*=}"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Error: unknown option: $1"; usage; exit 2 ;;
  esac
done

OS_NAME="${A11Y_WEB_AUDIT_UNAME:-$(uname -s)}"
case "$OS_NAME" in
  Darwin|Linux) ;;
  *)
    echo "Error: install-web-audit.sh supports macOS and Linux only."
    exit 2
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"
if [ ! -f "$SCRIPT_DIR/scripts/web-audit-bundle.json" ]; then
  command -v git >/dev/null 2>&1 || {
    echo "Error: git is required when running the installer remotely."
    exit 1
  }
  TMPDIR_DL="$(mktemp -d)"
  DOWNLOADED=true
  trap 'rm -rf "$TMPDIR_DL"' EXIT
  echo "Downloading the web audit bundle at ${SOURCE_REF}..."
  git clone --quiet --filter=blob:none "$SOURCE_REPOSITORY" "$TMPDIR_DL/accessibility-agents"
  git -C "$TMPDIR_DL/accessibility-agents" checkout --quiet "$SOURCE_REF"
  SCRIPT_DIR="$TMPDIR_DL/accessibility-agents"
fi

. "$SCRIPT_DIR/scripts/installer-common.sh"

command -v node >/dev/null 2>&1 || {
  echo "Error: Node.js 18 or newer is required for bundle validation and axe-core."
  exit 1
}

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Error: Node.js 18 or newer is required; found $(node --version)."
  exit 1
fi

TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd)" || {
  echo "Error: target directory does not exist: $TARGET_DIR"
  exit 1
}

VALIDATOR="$SCRIPT_DIR/scripts/validate-web-audit-bundle.js"
MANIFEST_SOURCE="$SCRIPT_DIR/scripts/web-audit-bundle.json"
INSTRUCTION_SOURCE="$SCRIPT_DIR/templates/copilot-instructions-web-audit.md"
CONFIG_SOURCE="$SCRIPT_DIR/templates/a11y-web-config-moderate.json"
INSTALL_MANIFEST="$TARGET_DIR/.a11y-web-audit-manifest"
SUMMARY_FILE="$TARGET_DIR/.a11y-web-audit-install-summary.json"

node "$VALIDATOR"

if [ "$CHECK_MODE" = true ]; then
  echo "Source bundle: valid"
  echo "Node.js: $(node --version)"
  if command -v npm >/dev/null 2>&1; then
    echo "npm: $(npm --version)"
    echo "Runtime scan: available through npx @axe-core/cli"
  else
    echo "npm: unavailable"
    echo "Runtime scan: unavailable until npm is installed"
  fi

  MISSING=0
  while IFS=$'\t' read -r category relative_path; do
    [ -n "$relative_path" ] || continue
    if [ ! -f "$TARGET_DIR/$relative_path" ]; then
      MISSING=$((MISSING + 1))
    fi
  done < <(node "$VALIDATOR" --list)
  if [ "$MISSING" -eq 0 ]; then
    echo "Target bundle: complete"
    exit 0
  fi
  echo "Target bundle: incomplete ($MISSING allowlisted files missing)"
  exit 1
fi

if [ "$DRY_RUN" = true ]; then
  echo "Dry run for: $TARGET_DIR"
fi

INSTALLED=0
REPLACED=0
SKIPPED=0
MANIFEST_ENTRIES=()
if [ -f "$INSTALL_MANIFEST" ]; then
  while IFS= read -r entry || [ -n "$entry" ]; do
    [ -n "$entry" ] && MANIFEST_ENTRIES+=("$entry")
  done < "$INSTALL_MANIFEST"
fi

add_manifest_entry() {
  local candidate="$1"
  local existing
  for existing in ${MANIFEST_ENTRIES[@]+"${MANIFEST_ENTRIES[@]}"}; do
    [ "$existing" = "$candidate" ] && return
  done
  MANIFEST_ENTRIES+=("$candidate")
}

install_file() {
  local relative_path="$1"
  local destination="$TARGET_DIR/$relative_path"

  if [ -e "$destination" ] && [ "$FORCE" != true ]; then
    echo "skip  $relative_path"
    SKIPPED=$((SKIPPED + 1))
    return
  fi

  if [ "$DRY_RUN" = true ]; then
    if [ -e "$destination" ]; then
      echo "would replace  $relative_path"
    else
      echo "would install  $relative_path"
    fi
    return
  fi

  mkdir -p "$(dirname "$destination")"
  if [ -e "$destination" ]; then
    REPLACED=$((REPLACED + 1))
  else
    INSTALLED=$((INSTALLED + 1))
  fi

  node "$VALIDATOR" --render "$relative_path" > "$destination"
  add_manifest_entry "$relative_path"
  echo "install  $relative_path"
}

while IFS=$'\t' read -r category relative_path; do
  [ -n "$relative_path" ] || continue
  install_file "$relative_path"
done < <(node "$VALIDATOR" --list)

merge_instructions() {
  local destination="$TARGET_DIR/.github/copilot-instructions.md"
  if [ "$DRY_RUN" = true ]; then
    echo "would merge  .github/copilot-instructions.md"
    return
  fi

  mkdir -p "$(dirname "$destination")"
  local temporary
  temporary="$(mktemp)"
  if [ -f "$destination" ]; then
    awk '
      /<!-- a11y-web-audit: start -->/ { skip=1; next }
      /<!-- a11y-web-audit: end -->/ { skip=0; next }
      !skip { print }
    ' "$destination" > "$temporary"
  fi
  if [ -s "$temporary" ]; then
    printf '\n' >> "$temporary"
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    printf '%s\n' "$line" >> "$temporary"
  done < "$INSTRUCTION_SOURCE"
  mv "$temporary" "$destination"
  add_manifest_entry "managed:.github/copilot-instructions.md"
  echo "merge  .github/copilot-instructions.md"
}

merge_instructions

if [ "$WITH_CONFIG" = true ]; then
  if [ -e "$TARGET_DIR/.a11y-web-config.json" ]; then
    echo "skip  .a11y-web-config.json (existing project configuration)"
    SKIPPED=$((SKIPPED + 1))
  elif [ "$DRY_RUN" = true ]; then
    echo "would install  .a11y-web-config.json"
  else
    cp "$CONFIG_SOURCE" "$TARGET_DIR/.a11y-web-config.json"
    add_manifest_entry ".a11y-web-config.json"
    INSTALLED=$((INSTALLED + 1))
    echo "install  .a11y-web-config.json"
  fi
fi

if [ "$DRY_RUN" = true ]; then
  echo "Dry run complete; no files were written."
  exit 0
fi

printf '%s\n' "${MANIFEST_ENTRIES[@]}" > "$INSTALL_MANIFEST"

NOTES="Playwright and MCP runtimes are not installed. Behavioral scans use pre-existing tools when available."
SUMMARY_JSON="{\"schemaVersion\":\"1.0\",\"operation\":\"install-web-audit\",\"scope\":\"project\",\"targetDir\":\"$(json_escape "$TARGET_DIR")\",\"bundleVersion\":\"$(json_escape "$(node -p "require('$MANIFEST_SOURCE').bundleVersion")")\",\"installed\":$INSTALLED,\"replaced\":$REPLACED,\"skipped\":$SKIPPED,\"withConfig\":$(json_bool "$WITH_CONFIG"),\"forced\":$(json_bool "$FORCE"),\"manifestPath\":\"$(json_escape "$INSTALL_MANIFEST")\",\"note\":\"$(json_escape "$NOTES")\"}"
write_summary_file "$SUMMARY_FILE" "$SUMMARY_JSON"

echo ""
echo "Web accessibility audit bundle installed."
echo "Target: $TARGET_DIR"
echo "Installed: $INSTALLED; replaced: $REPLACED; skipped: $SKIPPED"
echo "Start in Copilot Chat with @web-accessibility-wizard."
echo "Playwright/MCP was not installed; the wizard will report when behavioral tools are unavailable."

[ "$DOWNLOADED" = false ] || true
