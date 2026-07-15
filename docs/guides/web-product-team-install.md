# Web Product Team Install Guide

This guide is the canonical path for **web product teams** that need GitHub Copilot accessibility agents **committed into each product repository** so every developer and Copilot Coding Agent share the same customizations.

This repository is maintained at [porsche-design-system/accessibility-agents](https://github.com/porsche-design-system/accessibility-agents). Examples below use that fork. Upstream development lives at [Community-Access/accessibility-agents](https://github.com/Community-Access/accessibility-agents).

For the full 80-agent suite (document, mobile, desktop, GitHub workflow, and more), use [`gh skill install`](../INSTALLATION-GUIDE-5.0.md) or the legacy [`install.sh`](../../install.sh) one-liner instead.

## Choose your install path

| Goal | Recommended path |
|------|------------------|
| Web-only agents in a product repo (team + Coding Agent) | Focused web audit bundle (this guide) |
| Full agent suite, global or project | `gh skill install` + `gh skill setup` |
| Full suite without `gh` CLI | `install.sh` / `install.ps1` |

## Requirements

- macOS or Linux
- GitHub Copilot in a current VS Code release
- Node.js 18 or newer (bundle validation and axe-core runtime scans)
- npm for Phase 9 axe-core scans during audits
- Git access to the accessibility-agents source (public or internal fork)

Automated checks cannot establish WCAG conformance. Include keyboard-only and assistive-technology testing in every audit.

## Recommended workflow

1. Preview changes with `--dry-run`.
2. Install into the product repository.
3. Open a PR and review the diff.
4. Merge so the team and Copilot Coding Agent inherit `.github/` customizations.
5. Pin bundle updates to a release tag (see [Version pinning](#version-pinning)).

## Option 1: Bash installer (primary)

### From a local checkout

```bash
git clone git@github.com:porsche-design-system/accessibility-agents.git
cd accessibility-agents
bash install-web-audit.sh --target /path/to/web-product --with-config --dry-run
bash install-web-audit.sh --target /path/to/web-product --with-config
```

When the web product is the current directory:

```bash
bash /path/to/accessibility-agents/install-web-audit.sh --with-config
```

### Security-conscious teams (no curl pipe)

Prefer cloning the repository and running the script from disk instead of piping a remote script into `bash`:

```bash
git clone git@github.com:porsche-design-system/accessibility-agents.git
cd accessibility-agents
bash install-web-audit.sh --target /path/to/web-product --with-config
```

### Remote bootstrap (review script first)

```bash
REF=web-audit-bundle/1.0.0
curl -fsSL "https://raw.githubusercontent.com/porsche-design-system/accessibility-agents/$REF/install-web-audit.sh" |
  bash -s -- --target /path/to/web-product --with-config --source-ref "$REF"
```

To install from a different fork, set `A11Y_WEB_AUDIT_REPOSITORY` to its clone URL. Authentication uses your local Git configuration.

## Option 2: GitHub Skills CLI with web-audit bundle

After installing the skill repository, use setup with the web-audit bundle to run the same allowlisted install into the current Git project:

```bash
gh skill install porsche-design-system/accessibility-agents
cd /path/to/web-product
gh skill setup porsche-design-system/accessibility-agents --scope project --bundle web-audit --with-config --yes
```

Equivalent role alias:

```bash
gh skill setup porsche-design-system/accessibility-agents --scope project --role web-auditor --with-config --yes
```

Standalone Go binary (development or CI):

```bash
go-cli/bin/a11y-agents-setup --scope project --bundle web-audit --with-config --yes --source-root /path/to/accessibility-agents
```

The bundle installer requires macOS or Linux, Node.js 18+, and a Git repository as the install target. It writes the same files and manifest as `install-web-audit.sh`.

## What gets installed

The allowlist in [`scripts/web-audit-bundle.json`](../../scripts/web-audit-bundle.json) controls scope. It includes:

- `@web-accessibility-wizard` and web accessibility specialists
- Web scanning, scoring, framework, testing, and CI bridge skills
- Web audit prompts and focused workspace instructions
- A managed block in `.github/copilot-instructions.md` (existing content outside markers is preserved)
- Optional `.a11y-web-config.json` when `--with-config` is used and no config exists

Tracking files:

- `.a11y-web-audit-manifest`
- `.a11y-web-audit-install-summary.json`

These are separate from the full installer manifest, so both installers can coexist in one repository.

## Run an audit

1. Start the web product locally.
2. Open its repository in VS Code.
3. Open Copilot Chat and invoke `@web-accessibility-wizard`.
4. Complete Phase 0 (URL, framework, pages, method, thoroughness, standard).
5. Review the generated `ACCESSIBILITY-AUDIT.md`.

Phase 9 can run axe-core through `npx @axe-core/cli`. Playwright, Chromium, and MCP are not installed by this bundle.

## Version pinning

Bundle releases use annotated Git tags in the form `web-audit-bundle/VERSION`, where `VERSION` matches `bundleVersion` in `web-audit-bundle.json`.

| Task | Command |
|------|---------|
| Install a pinned release | `bash install-web-audit.sh --target PATH --source-ref web-audit-bundle/1.0.0` |
| Check installed bundle | Read `bundleVersion` in `.a11y-web-audit-install-summary.json` |
| Validate target completeness | `bash install-web-audit.sh --target PATH --check` |
| Preview an update | `bash install-web-audit.sh --target PATH --dry-run --force --source-ref web-audit-bundle/1.0.0` |
| Apply an update | `bash install-web-audit.sh --target PATH --force --source-ref web-audit-bundle/1.0.0` |

Maintainers create a new bundle release tag from the repository root:

```bash
bash scripts/tag-web-audit-bundle.sh
```

See [Web audit bundle releases](web-audit-bundle-releases.md) for maintainer workflow details.

## Update and uninstall

Preview and apply updates with `--force` (replaces allowlisted bundle files only):

```bash
bash install-web-audit.sh --target /path/to/web-product --dry-run --force
bash install-web-audit.sh --target /path/to/web-product --force
```

Uninstall steps are documented in [Install the GitHub Copilot Web Audit Bundle](../INSTALL-WEB-AUDIT.md#uninstall).

## Automate updates with GitHub Actions

Product teams can open update PRs with the composite action [`.github/actions/install-web-audit-bundle`](../../.github/actions/install-web-audit-bundle/action.yml). Example workflow: [`.github/workflows/web-audit-bundle-update-pr.yml`](../../.github/workflows/web-audit-bundle-update-pr.yml).

## Related documentation

- [Install the GitHub Copilot Web Audit Bundle](../INSTALL-WEB-AUDIT.md) — installer flags and limitations
- [5.0 Installation Guide](../INSTALLATION-GUIDE-5.0.md) — full `gh skill` path
- [Getting Started](../getting-started.md) — all platforms
