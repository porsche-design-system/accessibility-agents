<!-- a11y-web-audit: start -->
## Web Accessibility Auditing

This repository uses the Claude Code web accessibility audit team. Apply WCAG 2.2 AA guidance to web UI code and prefer semantic HTML before ARIA.

Use the `web-accessibility-wizard` agent or `/audit` for a guided, multi-phase audit. It coordinates specialists for semantics, keyboard and focus behavior, forms, visual design, dynamic content, tables, links, cognitive accessibility, testing, and cross-page scoring.

Before an audit:

1. Check for `.a11y-web-config.json` and previous `ACCESSIBILITY-AUDIT.md` reports.
2. Ask the user to confirm the pages, framework, audit method, thoroughness, and target standard.
3. Treat automated results as evidence to verify, not proof of conformance.

For web UI changes:

- Ensure every interactive control is keyboard operable with a visible focus indicator.
- Use native controls and landmarks before adding ARIA.
- Provide accessible names, form labels, error identification, and status announcements.
- Meet 4.5:1 text contrast and 3:1 non-text UI contrast at WCAG AA.
- Do not convey information by color alone.
- Respect reduced motion, zoom, reflow, and touch-target requirements.
- Keep one page-level H1 and preserve logical heading order.

The canonical audit report is `ACCESSIBILITY-AUDIT.md`. A complete report includes scope, configuration, score and grade, findings with WCAG mappings, severity totals, remediation priorities, next steps, and delta tracking when a prior report exists.

Playwright/MCP behavioral tools are optional and are not installed by the focused installer. When unavailable, document that limitation and provide manual keyboard and screen-reader verification steps.
<!-- a11y-web-audit: end -->
