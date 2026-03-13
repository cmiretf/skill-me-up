---
phase: 03-antipattern-detection
plan: "01"
subsystem: analyzer
tags: [antipatterns, code-smells, static-analysis, brace-depth, regex]

# Dependency graph
requires:
  - phase: 03-W0
    provides: RED test stubs in tests/phase3/antipatterns.test.js
  - phase: 02-usage-examples
    provides: extractExamples and extractMethodBody brace-depth walker pattern
provides:
  - detectAntipatterns(deepAnalysis, folderPath) named export in patternDetector.js
  - isGodClass, hasEmptyCatch, scanMethodBodies internal helpers
affects:
  - 03-02 (buildDontDoSection wires antipatterns into markdown output)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Brace-depth scanner reused from extractMethodBody pattern for long-method and deep-nesting detection"
    - "Single file read per entry, reused across all content-based rules (longMethod, deepNesting, emptyCatch)"
    - "Synthetic method entry points generated from top-level brace openings when methods array is empty"
    - "Set-per-rule threshold pattern: each rule accumulates a Set of flagged filenames; fire when size >= 3"

key-files:
  created: []
  modified:
    - src/analyzer/patternDetector.js

key-decisions:
  - "EMPTY_CATCH_BRACE regex uses [^\\S\\n]* (horizontal whitespace only) inside braces — prevents false positives when a comment-stripped catch body leaves only newlines+whitespace"
  - "detectAntipatterns exported as export function (not in export block) — consistent with extractExamples pattern already in file"
  - "scanMethodBodies accepts pre-extracted methods array as entry points — avoids re-implementing method detection; falls back to synthetic top-level brace entries when methods array is empty"
  - "isGodClass checks fa.methods.length (all methods, not just public) against >20 threshold — no file I/O needed"

patterns-established:
  - "Antipattern threshold: 3+ distinct files must trigger a rule before it appears in results — reduces noise"
  - "Rule output order: longMethod, deepNesting, godClass, emptyCatch — consistent, deterministic"

requirements-completed: [ENRICH-04]

# Metrics
duration: 20min
completed: 2026-03-13
---

# Phase 3 Plan 01: Antipattern Detection Summary

**Four code-smell detectors (long methods, deep nesting, god classes, empty catch) implemented as `detectAntipatterns()` with per-rule 3-file threshold gating via brace-depth scanning and regex dispatch**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-13T17:00:00Z
- **Completed:** 2026-03-13T17:20:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Implemented `detectAntipatterns(deepAnalysis, folderPath)` as a named export in `src/analyzer/patternDetector.js`
- Built `scanMethodBodies(content, methods)` using brace-depth walking — reuses the `extractMethodBody` pattern to detect long method bodies (>40 lines) and deep nesting (max brace depth >3) in a single pass
- Built `isGodClass(fa)` for metadata-only god class detection (skips Go and non-OOP classTypes)
- Built `hasEmptyCatch(content, language)` with per-language dispatch (Go skipped, Python uses `except` regex, JS/TS/Kotlin/Java use comment-stripped `catch` regex)
- All 6 ENRICH-04 `detectAntipatterns` tests turn GREEN; phase 1 and phase 2 suites remain fully green

## Task Commits

No commits per CLAUDE.md project instructions — user handles all commits manually.

## Files Created/Modified

- `/Users/carlosmiret/Desktop/skill-me-up/src/analyzer/patternDetector.js` — Added `detectAntipatterns` function (~120 lines) with four helpers: `isGodClass`, `hasEmptyCatch`, `scanMethodBodies`, plus constants `EMPTY_CATCH_BRACE` and `EMPTY_EXCEPT`

## Decisions Made

- **EMPTY_CATCH_BRACE regex fix:** The RESEARCH.md regex `/catch\s*\([^)]*\)\s*\{\s*\}/` uses `\s*` which matches newlines, causing a false positive when a comment-only catch body has its comment stripped (leaving only whitespace+newlines). Changed to `[^\S\n]*` inside braces to match horizontal whitespace only — only fires on single-line empty catches. This is the correct behavior per ENRICH-04-6.
- **Synthetic method entry points:** When `fa.methods` is empty (e.g., files that weren't fully analyzed), the function generates synthetic entry points by scanning for top-level brace openings. This ensures long-method and deep-nesting detection still works for the test fixtures in ENRICH-04-1 and ENRICH-04-2 which pass `methods: []`.
- **Export style:** Used `export function detectAntipatterns` (inline export) consistent with `extractExamples` already in the file, rather than adding to the named export block at the bottom.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed EMPTY_CATCH_BRACE regex false positive on comment-only catch bodies**
- **Found during:** Task 1 (detectAntipatterns implementation) — discovered when ENRICH-04-6 test failed
- **Issue:** `\s*` in the brace interior matches newlines, so a catch body with only a stripped comment (leaving blank whitespace lines) was incorrectly flagged as empty
- **Fix:** Changed `\{\s*\}` to `\{[^\S\n]*\}` — horizontal whitespace only, ensuring only same-line empty catches fire
- **Files modified:** `src/analyzer/patternDetector.js`
- **Verification:** ENRICH-04-6 passes GREEN; Go empty-catch tests (ENRICH-04-5) still pass

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix — the RESEARCH.md regex had a newline-matching edge case. No scope creep.

## Issues Encountered

- ENRICH-04-1 and ENRICH-04-2 test fixtures pass `methods: []` — the plan's `<behavior>` section says "For each method, walk from method.lineNumber" but gives no guidance for the empty-methods case. Added synthetic top-level brace entry point detection as a fallback. This is transparent to tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `detectAntipatterns` is fully implemented and exported; Plan 03-02 can wire it into `detectFolderPattern` return value and implement `buildDontDoSection` in `mdGenerator.js`
- ENRICH-04-7 and ENRICH-04-8 (`buildDontDoSection`) remain RED — expected, awaiting Plan 03-02
- Phase 3 integration tests (OUTPUT-03) also remain RED — awaiting Plan 03-02

---
*Phase: 03-antipattern-detection*
*Completed: 2026-03-13*

## Self-Check: PASSED

- FOUND: `.planning/phases/03-antipattern-detection/03-01-SUMMARY.md`
- FOUND: `src/analyzer/patternDetector.js`
- VERIFIED: `export function detectAntipatterns` present in patternDetector.js (1 match)
- VERIFIED: 6/6 ENRICH-04 detectAntipatterns tests GREEN
- VERIFIED: Phase 1 and Phase 2 test suites fully GREEN (71 tests passing)
