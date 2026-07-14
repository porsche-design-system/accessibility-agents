# Install the GitHub Copilot Web Audit Bundle

The focused installer adds only the GitHub Copilot agents, skills, prompts, and instructions used for guided web accessibility audits. It does not install the repository's document, mobile, desktop, Claude, Codex, Gemini, or MCP packages.

## Requirements

- macOS or Linux
- GitHub Copilot in a current VS Code release
- Node.js 18 or newer
- npm for runtime axe-core scans
- A local checkout of the web product to audit

Automated checks cannot establish WCAG conformance. Include keyboard-only and assistive-technology testing in the audit.

## Install from a Checkout

Run the installer from this repository and target the web product repository:

```bash
bash install-web-audit.sh --target /path/to/web-product --with-config
```

When the web product is the current directory:

```bash
/path/to/accessibility-agents/install-web-audit.sh --with-config
```

Review the changes before committing them. Project installation makes the customizations available to the team and to Copilot Coding Agent.

## Remote Bootstrap

Review the installer before using a remote bootstrap command. During branch testing, the installer defaults to the `porsche-design-system/accessibility-agents` fork and its `main` branch:

```bash
curl -fsSL https://raw.githubusercontent.com/porsche-design-system/accessibility-agents/main/install-web-audit.sh |
  bash -s -- --target /path/to/web-product --with-config --source-ref main
```

Pin a release tag or commit:

```bash
REF=YOUR_TAG_OR_COMMIT
curl -fsSL "https://raw.githubusercontent.com/porsche-design-system/accessibility-agents/$REF/install-web-audit.sh" |
  bash -s -- --target /path/to/web-product --source-ref "$REF"
```

For an internal fork, set `A11Y_WEB_AUDIT_REPOSITORY` to its clone URL. Authentication is handled by the local Git configuration:

```bash
A11Y_WEB_AUDIT_REPOSITORY=git@github.com:example/accessibility-agents.git \
  bash install-web-audit.sh --target /path/to/web-product
```

## Installer Options

- `--target PATH`: target repository; defaults to the current directory.
- `--with-config`: add the moderate `.a11y-web-config.json` profile when the target does not already have one.
- `--dry-run`: show planned changes without writing files.
- `--check`: validate the source bundle, Node/npm readiness, and target completeness.
- `--force`: replace allowlisted bundle files. It never replaces an existing `.a11y-web-config.json`.
- `--yes`: accepted for non-interactive automation.
- `--source-ref REF`: branch, tag, or commit used by remote bootstrap.

Existing target files are skipped unless `--force` is supplied. The focused accessibility block in `.github/copilot-instructions.md` is updated between managed markers while content outside the markers is preserved.

## Installed Scope

[`scripts/web-audit-bundle.json`](../scripts/web-audit-bundle.json) is the canonical allowlist. It currently installs:

- `web-accessibility-wizard` and web accessibility specialists
- web-only analysis, remediation, reporting, CI bridge, and optional Playwright helper agents
- web scanning, scoring, framework, testing, cognitive, design-system, CI, and help-link skills
- web audit prompts
- semantic HTML, ARIA, CSS, testing, terminology, and multi-agent reliability instructions
- a focused managed section in `.github/copilot-instructions.md`
- `.a11y-web-config.json` only when `--with-config` is requested and no config exists

The installer writes:

- `.a11y-web-audit-manifest`
- `.a11y-web-audit-install-summary.json`

These names are separate from the full installer's files, so both installers can be used in the same repository.

## Run an Audit

1. Start the web product locally.
2. Open its repository in VS Code.
3. Open Copilot Chat and invoke `@web-accessibility-wizard`.
4. Complete Phase 0 and provide the local URL, framework, pages, audit method, thoroughness, and target standard.
5. Select a deep-dive audit when you want code review across every web specialist.
6. Review the generated `ACCESSIBILITY-AUDIT.md`.

Phase 9 can run axe-core through `npx @axe-core/cli`. The focused installer does not install Playwright, Chromium, or an MCP server. Phase 10 behavioral scans run only when compatible tools already exist; otherwise the report must record the limitation and include manual testing steps.

## Update

Preview an update:

```bash
bash install-web-audit.sh --target /path/to/web-product --dry-run --force
```

Apply it:

```bash
bash install-web-audit.sh --target /path/to/web-product --force
```

`--force` replaces allowlisted agent resources, so review or preserve local customizations first. Without `--force`, existing files remain unchanged.

## Uninstall

The manifest contains paths installed by this bundle. Before removal, review it and preserve any files subsequently customized by the product team.

Remove ordinary paths listed in `.a11y-web-audit-manifest`, except the `managed:` entry. Remove only the block between these markers from `.github/copilot-instructions.md`:

```text
<!-- a11y-web-audit: start -->
<!-- a11y-web-audit: end -->
```

Then remove `.a11y-web-audit-manifest` and `.a11y-web-audit-install-summary.json`. Remove `.a11y-web-config.json` only if the team has not adapted it for the product.

## Distribution Alternatives

### Commit a Curated Subset

Copy the paths in `scripts/web-audit-bundle.json` into the product repository without running an installer. This is transparent and works well for one repository, but updates and instruction merging are manual.

### Maintain an Internal Trimmed Fork

An internal fork can pin upstream revisions and add organization-specific rules. This is a strong option for several private repositories, but the fork owner must manage upstream merges and releases.

### GitHub Skills CLI

`gh skill install` and `gh skill setup` are the intended broader distribution path. This repository does not yet enforce role-based file filtering in its setup utility, so it cannot currently provide the same deterministic web-only Copilot subset.

### GitHub Action

The repository's action can add repeatable CI scanning and SARIF output. It complements the guided Copilot audit but does not install or replace the wizard and specialist agents.

### MCP or VS Code Package

A future web-only MCP package could provide Playwright behavioral scans without document tooling. The current MCP server statically includes broader document capabilities, so it is deliberately excluded from this installer.

For current Copilot project use, the focused installer is the recommended option because its allowlist is reviewable, deterministic, compatible with private repositories, and immediately discoverable from `.github`.
