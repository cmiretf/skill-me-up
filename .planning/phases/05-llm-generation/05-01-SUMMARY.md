---
phase: 05-llm-generation
plan: "01"
subsystem: cli
tags: [cli, flags, validation, github-models, llm]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: bin/cli.js arg parsing and analyze() call pattern
provides:
  - "--llm and --llm-model CLI flag parsing with pre-flight validation"
  - "GITHUB_TOKEN and --llm-model presence checks before any network call"
  - "LLM options (llm, llmModel) passed through to analyze()"
affects: [05-02, 05-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-flight validation in CLI before delegating to analyze() — fail fast with clear error messages"
    - "TDD: RED tests written first, then GREEN implementation added"

key-files:
  created:
    - tests/phase5/cli.test.js
  modified:
    - bin/cli.js

key-decisions:
  - "GITHUB_TOKEN check runs before --llm-model check — token is system-level, model is user-choice; checking token first provides a more actionable error"
  - "Model list hardcoded in CLI error message — avoids network call just to show available models"
  - "analyze() receives llm and llmModel as options — no LLM call in cli.js itself, wiring happens in Plan 03"

patterns-established:
  - "LLM validation: GITHUB_TOKEN checked first, then --llm-model presence, each with specific error messages"
  - "New CLI flags slot into existing for-loop with else-if branches after --quiet"

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-03-13
---

# Phase 5 Plan 01: LLM CLI Flag Parsing and Validation Summary

**`--llm` and `--llm-model` flags added to bin/cli.js with GITHUB_TOKEN and model-name pre-flight validation, passing options to analyze() without triggering any network calls**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-13T23:02:00Z
- **Completed:** 2026-03-13T23:10:31Z
- **Tasks:** 1 (TDD: RED + GREEN phases)
- **Files modified:** 1 (bin/cli.js); 1 created (tests/phase5/cli.test.js)

## Accomplishments

- LLM-B1 test GREEN: `--llm` without `--llm-model` exits 1 and prints list of 6 available model names to stderr
- LLM-B2 test GREEN: `--llm --llm-model openai/gpt-4o` without `GITHUB_TOKEN` exits 1 and mentions `GITHUB_TOKEN` in stderr
- All 76 existing phase1/phase2/phase3 tests still pass — zero regressions
- `--help` updated to document `--llm` and `--llm-model` flags

## Task Commits

No commits made — user handles all commits manually per CLAUDE.md.

## Files Created/Modified

- `bin/cli.js` — Added `--llm` and `--llm-model` flag parsing, GITHUB_TOKEN + model presence validation, updated `analyze()` call to pass `llm` and `llmModel` options, updated `printHelp()` to document new flags
- `tests/phase5/cli.test.js` — Pre-existing test file with LLM-B1 and LLM-B2 tests (created in Wave 0); tests used as-is for TDD RED/GREEN verification

## Decisions Made

- GITHUB_TOKEN is checked before `--llm-model` — if the token is missing, the model name is irrelevant; checking token first produces the most actionable error sequence
- Model list is hardcoded in the error message (not fetched from API) — consistent with zero-dependency constraint and avoids a network call just to show help text
- No imports of `llmGenerator.js` in cli.js — wiring to actual LLM call happens in Plan 03 via `analyzer/index.js`

## Deviations from Plan

None - plan executed exactly as written. The test file (tests/phase5/cli.test.js) already existed from Wave 0; no new test file needed to be created.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this plan. GITHUB_TOKEN is required at runtime when using `--llm` flag (documented in CLI error messages).

## Next Phase Readiness

- `bin/cli.js` now passes `llm` and `llmModel` to `analyze()` — Plan 02 can add `src/generators/llmGenerator.js`, Plan 03 can wire it into `analyze()`
- Pre-flight validation is complete — no further CLI changes needed for LLM mode

---
*Phase: 05-llm-generation*
*Completed: 2026-03-13*
