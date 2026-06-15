# Codex Subagents

Accessibility Agents v6 includes a native Codex plugin and Codex custom subagent layer installed by the universal installer.

This guide explains what gets installed, why the plugin exists, and how users should ask Codex to use the Accessibility Agents team.

## Upstream Codex References

- [OpenAI Codex: Subagents](https://developers.openai.com/codex/subagents/)
- [OpenAI Codex: Agent Skills](https://developers.openai.com/codex/skills.md)
- [OpenAI Codex: Plugins](https://developers.openai.com/codex/plugins.md)
- [OpenAI Codex: Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md.md)

## Why Codex Uses a Plugin

Accessibility Agents has many specialists. If all specialists are installed as top-level Codex skills, Codex can hit skill-description context limits and shorten the visible skill descriptions.

The v6 plugin avoids that by using:

- a small router skill surface
- native Codex custom subagents
- lazy-loaded specialist references
- extension manifests for built-in and custom extension packs

This means Codex can see the Accessibility Agents entry points without loading every specialist instruction into the first turn.

## What Gets Installed

When you select Codex support, the universal installer installs:

- the Accessibility Agents Codex plugin
- router skills for web, documents, GitHub workflows, developer tools, and markdown
- all built-in Codex custom subagents
- lazy specialist reference files
- built-in extension manifests
- install manifest entries for repair and uninstall

The old direct Codex skill pack remains in the repository as a fallback source, but the v6 installer prefers the plugin path.

## Router Skills

Codex should see these small router skills:

- `web-accessibility`
- `document-accessibility`
- `github-workflows`
- `developer-tools`
- `markdown-accessibility`

Use these when you want a broad accessibility task. The router decides which specialists and extensions are relevant.

## Lead Subagents

Use lead agents when the task spans multiple specialists:

- `accessibility-lead` for web accessibility coordination
- `document-accessibility-wizard` for Office, PDF, EPUB, and document remediation
- `github-hub` or `nexus` for GitHub workflow coordination
- `developer-hub` for Python, wxPython, NVDA, desktop APIs, tools, and CI
- `markdown-a11y-assistant` for markdown documentation accessibility

The lead should gather specialist findings and produce the final severity-ordered summary.

## Specialist Subagents

The plugin includes the full Accessibility Agents specialist set as Codex subagents, including specialists for:

- ARIA
- keyboard navigation
- contrast
- forms
- modals
- live regions
- headings and alt text
- data tables
- links
- text quality
- i18n and RTL
- media
- mobile
- email
- web components
- cognitive accessibility
- data visualization
- performance accessibility
- Playwright scanning and verification
- web issue fixing
- Word
- Excel
- PowerPoint
- PDF
- EPUB
- Office remediation
- PDF remediation
- document inventory and reports
- markdown scanning, fixing, reporting, and assistance
- GitHub PRs, issues, projects, Actions, releases, security, notifications, repositories, teams, and wiki workflows
- Python
- wxPython
- NVDA add-ons
- desktop accessibility APIs
- desktop accessibility testing
- accessibility tool building
- CI accessibility
- compliance mapping
- WCAG education
- WCAG AAA
- WCAG 3 preview
- screen reader education
- accessibility statements
- regression detection

This list is intentionally broad. The point of the router layer is that Codex does not need to load every one of those specialists for every task.

## How to Ask Codex to Use Subagents

Codex does not need to spawn subagents for every small request. Use subagents when a task benefits from independent specialist review.

Good requests:

```text
Review this branch for accessibility issues. Use accessibility-lead, then dispatch Codex subagents for ARIA, keyboard, forms, contrast, and modals. Wait for all findings and summarize by severity with file references.
```

```text
Audit this documentation set. Use markdown-a11y-assistant and include markdown-scanner, markdown-fixer, and any matching installed extensions.
```

```text
Review this wxPython app with developer-hub. Include wxpython-specialist, desktop-a11y-specialist, desktop-a11y-testing-coach, and nvda-addon-specialist where relevant.
```

```text
Audit these Office and PDF files with document-accessibility-wizard. Include document, remediation, and reporting specialists, then separate PDF/UA, Office, and extension-specific findings.
```

## Extension Awareness

Subagents and routers check Accessibility Agents extensions.

Extensions can contribute:

- company standards
- design-system rules
- regional compliance checks
- framework-specific specialists
- document or markdown policies
- scanner mappings
- private remediation guidance

Matching extension agents should be included beside core agents and labeled by extension name in findings.

See [Accessibility Agents Extensions](accessibility-agent-extensions.md) for the extension format.

## Reporting Expectations

For broad audits, ask Codex to report:

- severity
- affected files
- evidence
- applicable public standard
- extension name when an extension contributed the finding
- whether the finding is a public-standard failure or company-specific policy issue
- recommended fix
- whether the fix should be applied automatically or reviewed first

Example:

```text
Report findings by severity. Label WCAG findings separately from extension policy findings. Include file paths and line numbers when available.
```

## Installation Notes

Run the universal installer:

```bash
./install.sh
```

On Windows:

```powershell
.\install.ps1
```

Select Codex support when prompted.

Start a new Codex session after installing or updating subagent files. Codex reads agent and skill files at session start.

## Troubleshooting

If Codex does not seem to see the plugin:

1. Re-run the universal installer and select Codex support.
2. Start a new Codex session.
3. Confirm the router skills were installed.
4. Confirm `.codex/agents/` or the global Codex agent directory contains Accessibility Agents TOML files.
5. Confirm built-in extension manifests were installed.
6. Ask Codex to use a router skill or a named lead agent.

If Codex reports shortened skill descriptions, the old direct skill pack may still be installed. Re-run the v6 installer so Codex uses the plugin path and small router surface.

## Maintainer Validation

Before claiming Codex support works:

```bash
node scripts/validate-codex-plugin.js
bash -n install.sh
```

Also run the general agent validators:

```bash
node scripts/validate-agents.js --strict --validate-wcag --validate-urls --skip-url-checks
node scripts/check-skill-description-quality.js
```

Run PowerShell and Go checks when those tools are available.
