# Agent Teams Configuration

This file defines the web accessibility audit team for Claude Code in this repository.

## Directory Structure

```
.claude/
├── agents/          -- Registered orchestrators (web audit only)
│   ├── accessibility-lead.md
│   └── web-accessibility-wizard.md
├── specialists/     -- On-demand specialists loaded via Read + Task
│   └── <web audit specialists>
├── skills/          -- Web audit skill knowledge modules
└── commands/        -- Slash commands for direct specialist access
```

Orchestrators load specialists on demand: `Read(".claude/specialists/<name>.md")`, extract the body (content after closing `---`), then dispatch via `Task(description="...", prompt="<body>\n\n<task>")`.

## Team: Web Accessibility Audit

**Lead:** `web-accessibility-wizard`

**Members:**

- `accessibility-lead` - Coordinates specialists, runs final review
- `aria-specialist` - ARIA roles, states, properties
- `modal-specialist` - Dialogs, drawers, overlays
- `contrast-master` - Color contrast, visual design
- `keyboard-navigator` - Tab order, focus management
- `live-region-controller` - Dynamic content, toasts, loading
- `forms-specialist` - Forms, inputs, validation
- `alt-text-headings` - Images, alt text, headings, landmarks
- `tables-data-specialist` - Data tables, grids
- `link-checker` - Link text quality
- `testing-coach` - Testing guidance
- `cognitive-accessibility` - WCAG 2.2 cognitive SC, COGA guidance, plain language analysis
- `design-system-auditor` - Color token contrast, focus ring tokens, spacing tokens
- `text-quality-reviewer` - Non-visual text quality review
- `wcag-guide` - WCAG 2.2 criteria explanations, conformance levels

**Hidden Helpers:**

- `cross-page-analyzer` - Cross-page pattern detection, severity scoring, remediation tracking
- `web-issue-fixer` - Automated and guided accessibility fix application
- `web-csv-reporter` - Exports web audit findings to CSV with Deque University help links
- `scanner-bridge` - Bridges GitHub Accessibility Scanner CI data into the agent ecosystem
- `lighthouse-bridge` - Bridges Lighthouse CI accessibility audit data into the agent ecosystem
- `playwright-scanner` - Behavioral accessibility scanning via Playwright
- `playwright-verifier` - Post-fix verification via Playwright

**Workflow:**

1. `web-accessibility-wizard` receives the user request and runs Phase 0 (discovery)
2. Phase 0 Step 0: Auto-detects CI scanners (GitHub Scanner, Lighthouse) and dispatches `scanner-bridge` and `lighthouse-bridge` to fetch findings
3. Parallel specialist scanning groups execute based on content
4. `cross-page-analyzer` detects cross-page patterns, computes severity scores, and tracks remediation
5. `web-issue-fixer` applies auto-fixable corrections and presents human-judgment items
6. `web-accessibility-wizard` compiles the final report with scorecard and follow-up options
7. `testing-coach` provides manual testing instructions for issues that require human verification

**Handoffs:**

- After audit, user can ask for interactive fix mode to apply corrections from the report
- Remediation tracking is available by comparing audit reports across runs
- Multi-page comparison audits scan multiple pages and detect cross-cutting patterns
