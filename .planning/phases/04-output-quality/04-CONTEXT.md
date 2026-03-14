# Phase 4: Output Quality - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Enforce a 300-line budget on generated `.md` files, embed a generation timestamp at the top of each file, and ship regression snapshot tests backed by synthetic fixture projects. No new analysis features. No new CLI commands beyond what's needed for fixture testing.

</domain>

<decisions>
## Implementation Decisions

### Truncation strategy
- **Hard cut at line 300** — slice the output to 300 lines, no section-priority logic
- **Visible truncation note** at the end of the file (last line) when cut is applied:
  `> ⚠️ Output truncated at 300 lines. Run skill-me-up to see full output.`
- **Unit test required**: test that `buildMarkdown` output never exceeds 300 lines when given bloated input — catches regressions when new sections are added later
- Enforcement lives in `mdGenerator.js`

### Timestamp
- Format: `<!-- generated: YYYY-MM-DD -->` comment at top of each file
- Injection: add optional `testDate` field to the options/projectMeta object — if present, use it instead of `new Date()`. Existing callers are unaffected.

### Fixture projects
- **Two synthetic mini-projects** — hand-crafted, small, designed to exercise specific features
- Languages: **JavaScript** and **Python**
- Location: `tests/fixtures/js-project/` and `tests/fixtures/py-project/`
- Fixtures are committed to the repo

### Snapshot tests
- Snapshots live in `tests/fixtures/__snapshots__/` and are **committed to the repo**
- Tests inject a fixed date via `testDate` so snapshots are stable forever
- Snapshot update requires explicit `jest --updateSnapshot` — standard Jest behavior, no auto-update
- Snapshot test failure = regression, requires manual review and re-approval

### Idempotency
- No special idempotency mechanism beyond what already exists
- `writeFileSync` overwrites deterministically from the same input — success criterion satisfied by existing behavior
- Timestamp changes across days are expected and accepted

### Claude's Discretion
- Exact content of the synthetic fixture files (what classes/methods to include per language)
- How many files per fixture project (minimum to trigger all rules)
- Whether to use Jest's built-in `toMatchSnapshot` or write a custom snapshot comparator

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/generators/mdGenerator.js` (422 lines): `generateInstructions` and `buildMarkdown` — truncation logic and timestamp injection go here
- `new Date().toISOString().split('T')[0]` already used in `buildMarkdown` for the header date — timestamp comment uses same pattern
- `writeFileSync` from `'fs'` already imported

### Established Patterns
- Silent omission: sections that produce no content are excluded entirely — truncation note follows the same pattern (only added when cut is applied)
- Named exports for test access: `buildConventionsSection`, `buildUsageExamplesSection`, `buildDontDoSection` all exported — `buildMarkdown` may also need export for the length unit test
- Tests live in `tests/phase{N}/` directories with RED-first scaffold plans (W0) before implementation plans

### Integration Points
- `buildMarkdown` is the single assembly point — truncation happens at the end of this function, after all sections are joined
- `generateInstructions` calls `buildMarkdown` then `writeFileSync` — `testDate` flows in via `projectMeta` or a new options param
- `tests/phase4/` directory will follow the existing phase test layout

</code_context>

<specifics>
## Specific Ideas

- No specific product references
- Keep the truncation note human-readable and visible — it's a signal to agents that the file is incomplete

</specifics>

<deferred>
## Deferred Ideas

- `--date YYYY-MM-DD` CLI flag for full reproducibility — not needed for this phase
- `tests/fixtures/__snapshots__/` update script via `npm run update-snapshots` — standard `jest --updateSnapshot` is sufficient

</deferred>

---

*Phase: 04-output-quality*
*Context gathered: 2026-03-13*
