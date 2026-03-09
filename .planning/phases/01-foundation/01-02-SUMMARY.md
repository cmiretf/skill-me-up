---
phase: 01-foundation
plan: 02
subsystem: analyzer
tags: [line-tracking, regex, tdd, patternDetector, getLineNumber]

# Dependency graph
requires:
  - phase: 01-01
    provides: jest test scaffold and stub test files under tests/phase1/
provides:
  - getLineNumber helper function (1-based, index-derived) in patternDetector.js
  - lineNumber integer field on all method objects from all 8 language analyzers
  - Named exports for analyzeJava, analyzeKotlin, analyzeTypeScriptOrJs, analyzePython, analyzeGo for testing
affects: [02-enrichment, snippet-extraction, file-line-pointers]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD red-green, regex exec loop with match.index, additive exports for testability]

key-files:
  created: [tests/phase1/lineTracking.test.js]
  modified: [src/analyzer/patternDetector.js]

key-decisions:
  - "getLineNumber uses content.substring(0, matchIndex).split('\\n').length — no counter variable, always derived from match.index"
  - "analyzeTypeScriptOrJs refactored to push full objects in while-loop (not bare strings) to capture fn.index"
  - "Named exports added at bottom of patternDetector.js for test access; existing consumers unchanged (additive only)"

patterns-established:
  - "Line number derivation: always use getLineNumber(content, match.index) — never a counter variable"
  - "Test exports: append named exports at bottom of module behind a clear comment banner"

requirements-completed: [ENRICH-01]

# Metrics
duration: 10min
completed: 2026-03-09
---

# Phase 1 Plan 02: Line Number Tracking Summary

**getLineNumber helper wired into all 8 language analyzers in patternDetector.js, with every method object gaining a 1-based lineNumber integer field derived from match.index**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-09T19:50:00Z
- **Completed:** 2026-03-09T20:00:00Z
- **Tasks:** 1 (TDD: red + green)
- **Files modified:** 2

## Accomplishments
- Added `getLineNumber(content, matchIndex)` private helper using `substring + split('\n').length` for 1-based computation
- Wired `lineNumber: getLineNumber(content, match.index)` into all 8 language analyzers: Java (via extractPublicMethods), Kotlin, TypeScript/JS, Python, Go, C#, PHP, Ruby
- Refactored `analyzeTypeScriptOrJs` to push full method objects directly in the while-loop (previously pushed bare strings then mapped), enabling `fn.index` capture
- Exported test-only named exports (getLineNumber, analyzeJava, analyzeKotlin, analyzeTypeScriptOrJs, analyzePython, analyzeGo) as additive exports
- All 16 lineTracking.test.js assertions green; full phase1 suite passes (16 passed, 20 todo)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getLineNumber helper and wire lineNumber into all analyze* functions** - `845d9b5` (feat)

**Plan metadata:** _(docs commit follows)_

_Note: TDD task — test file written first (RED), implementation second (GREEN)_

## Files Created/Modified
- `src/analyzer/patternDetector.js` - Added getLineNumber helper, lineNumber field to all 8 analyzers, refactored TS/JS analyzer, added named test exports
- `tests/phase1/lineTracking.test.js` - Replaced .todo() stubs with 16 real assertions covering all 5 priority analyze* functions + getLineNumber

## Decisions Made
- `getLineNumber` uses `content.substring(0, matchIndex).split('\n').length` — no counter variable, always derived from match.index (as required by plan)
- `analyzeTypeScriptOrJs` must push objects directly in the while-loop (not via `.map()`) to capture `fn.index` — this is the only analyzer requiring structural change
- Named exports appended at bottom of patternDetector.js behind a comment banner — additive only, no breaking changes to existing consumers of `detectFolderPattern`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — all 8 analyzers already used `regex.exec()` loops with `match.index` available; the only structural change was the TypeScript/JS analyzer as anticipated by the plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 can now extract per-method code snippets using `lineNumber` as the file pointer
- All method objects across Java, Kotlin, TypeScript, JavaScript, Python, Go, C#, PHP, Ruby carry `lineNumber: integer`
- Existing CLI output unchanged — additive change only, smoke test confirmed

---
*Phase: 01-foundation*
*Completed: 2026-03-09*

## Self-Check: PASSED
- src/analyzer/patternDetector.js: FOUND
- tests/phase1/lineTracking.test.js: FOUND
- .planning/phases/01-foundation/01-02-SUMMARY.md: FOUND
- Commit 845d9b5: FOUND
