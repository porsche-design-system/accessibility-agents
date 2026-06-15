---
name: web-accessibility
description: Web accessibility router for HTML, JSX, CSS, ARIA, keyboard, forms, contrast, modals, live regions, headings, links, tables, mobile web, and WCAG review.
---

# Web Accessibility Router

Use this skill for web UI accessibility work in Codex.

## Workflow

1. For broad or ambiguous web accessibility work, start with `accessibility-lead`.
2. Read `codex-plugin/references/specialists/index.json` when available and use it to select the relevant specialist references and Codex subagents.
3. Identify the task domain: semantics, ARIA, keyboard, forms, contrast, overlays, live updates, headings, links, tables, mobile web, or full audit.
4. Check installed Accessibility Agents extensions before finalizing dispatch. Look for extension manifests under `.a11y-agents/extensions/`, `~/.a11y-agents/extensions/`, and this plugin's `extensions/` directory.
5. If the user asks for parallel work or subagents, spawn `accessibility-lead` plus the relevant Codex custom subagents and wait for their summaries.
6. Load specialist reference files only when needed. Prefer concise findings with file references, impacted users, WCAG mapping, and fix priority.
7. Label extension findings with the extension name.

## Default Subagent Dispatch

- Broad audit: `accessibility-lead`, `aria-specialist`, `keyboard-navigator`, `contrast-master`, `forms-specialist`, `modal-specialist`, `live-region-controller`
- New or changed UI: `accessibility-lead`, then the narrow specialists that match changed behavior
- PR review: `pr-review` plus any web specialists matching the diff

Do not expose all specialists as top-level skills. Keep the router surface small and load deep instructions lazily.
