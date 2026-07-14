#!/bin/bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALLER="$REPO_ROOT/install-web-audit.sh"
VALIDATOR="$REPO_ROOT/scripts/validate-web-audit-bundle.js"
FIXTURE_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/a11y web installer.XXXXXX")"
TARGET="$FIXTURE_ROOT/target repository"
DRY_TARGET="$FIXTURE_ROOT/dry run repository"

cleanup() {
  rm -rf "$FIXTURE_ROOT"
}
trap cleanup EXIT

mkdir -p "$TARGET/.github" "$DRY_TARGET"
printf '%s\n' "# Team instructions" > "$TARGET/.github/copilot-instructions.md"
printf '%s\n' "full-installer-owned-file" > "$TARGET/.a11y-agent-manifest"
printf '%s\n' "team customization" > "$TARGET/.github/agents-placeholder"

bash -n "$INSTALLER"
node "$VALIDATOR"

bash "$INSTALLER" --target "$DRY_TARGET" --dry-run --with-config
if [ -e "$DRY_TARGET/.github" ] || [ -e "$DRY_TARGET/.a11y-web-audit-manifest" ]; then
  echo "ERROR: dry run wrote files."
  exit 1
fi

bash "$INSTALLER" --target "$TARGET" --with-config --yes
node "$VALIDATOR" --installed-root "$TARGET"
bash "$INSTALLER" --target "$TARGET" --check

test -f "$TARGET/.github/agents/web-accessibility-wizard.agent.md"
test -f "$TARGET/.github/skills/web-scanning/SKILL.md"
test -f "$TARGET/.github/prompts/web-accessibility-wizard.prompt.md"
test -f "$TARGET/.github/instructions/web-accessibility-baseline.instructions.md"
test -f "$TARGET/.a11y-web-config.json"
test -f "$TARGET/.a11y-agent-manifest"
test ! -e "$TARGET/mcp-server"
test ! -e "$TARGET/.claude"
test ! -e "$TARGET/.codex"
test ! -e "$TARGET/.gemini"

rg -q "^# Team instructions$" "$TARGET/.github/copilot-instructions.md"
test "$(rg -c "a11y-web-audit: start" "$TARGET/.github/copilot-instructions.md")" -eq 1
if rg -q "^[[:space:]]+agent: document-accessibility-wizard$" "$TARGET/.github/agents/web-accessibility-wizard.agent.md"; then
  echo "ERROR: web-only wizard retains a document-agent dependency."
  exit 1
fi
if rg -q "WEB-ACCESSIBILITY-AUDIT\\.md" "$TARGET/.github"; then
  echo "ERROR: installed customizations use the non-canonical report filename."
  exit 1
fi

before_manifest="$(cksum "$TARGET/.a11y-web-audit-manifest")"
bash "$INSTALLER" --target "$TARGET" --with-config --yes
after_manifest="$(cksum "$TARGET/.a11y-web-audit-manifest")"
test "$before_manifest" = "$after_manifest"
test "$(rg -c "a11y-web-audit: start" "$TARGET/.github/copilot-instructions.md")" -eq 1

printf '%s\n' "local change" > "$TARGET/.github/agents/aria-specialist.agent.md"
bash "$INSTALLER" --target "$TARGET" --yes
rg -q "^local change$" "$TARGET/.github/agents/aria-specialist.agent.md"
bash "$INSTALLER" --target "$TARGET" --force --yes
if rg -q "^local change$" "$TARGET/.github/agents/aria-specialist.agent.md"; then
  echo "ERROR: --force did not replace an allowlisted file."
  exit 1
fi

if A11Y_WEB_AUDIT_UNAME=Windows_NT bash "$INSTALLER" --target "$TARGET" >/dev/null 2>&1; then
  echo "ERROR: unsupported OS check did not fail."
  exit 1
fi

INSTALLED_FILES=()
while IFS= read -r file; do
  INSTALLED_FILES+=("$file")
done < <(rg --files "$TARGET/.github/agents" "$TARGET/.github/skills")
node "$REPO_ROOT/scripts/validate-agents.js" \
  --quiet \
  --skip-url-checks \
  --files \
  "${INSTALLED_FILES[@]}"

if rg --files "$TARGET" | rg -q '(^|/)(document|office|pdf|powerpoint|word|excel|mobile|desktop|markdown|epub|mcp-server)(-|/)'; then
  echo "ERROR: a non-web resource was installed."
  exit 1
fi

echo "Web audit installer smoke test passed."
