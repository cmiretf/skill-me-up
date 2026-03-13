---
phase: 02-usage-examples
plan: W0
subsystem: testing
tags: [jest, esm, tdd, wave-0, test-scaffold]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "patternDetector.js with detectConventions, classifyNameStyle, dominantStyle exports; buildConventionsSection in mdGenerator.js"
provides:
  - "17 failing RED test stubs across 3 files in tests/phase2/"
  - "ENRICH-03 behavior spec (extractExamples shape, deduplication, dedenting, truncation)"
  - "OUTPUT-02 behavior spec (buildUsageExamplesSection rendering, null guards)"
  - "OUTPUT-04 behavior spec (extractDependencies role inference for builtins, call sites, fallback)"
  - "Integration assertions for section order and dep role format in generated markdown"
affects:
  - 02-usage-examples plan 01 (extractExamples + buildUsageExamplesSection implementation)
  - 02-usage-examples plan 02 (extractDependencies upgrade to {path, role}[])

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic import() in test files to safely load not-yet-exported ESM named exports without link-time SyntaxError"
    - "Guard clause pattern: if (typeof fn !== 'function') { expect(fn).toBe('a function'); return } — ensures assertion failure not TypeError"

key-files:
  created:
    - tests/phase2/usageExamples.test.js
    - tests/phase2/dependencies.test.js
    - tests/phase2/integration.test.js
  modified: []

key-decisions:
  - "Use dynamic import() instead of static named imports for not-yet-exported functions — ESM static named imports throw SyntaxError at link time; dynamic import resolves to undefined without crashing the suite"
  - "Guard clause pattern chosen over try/catch — cleaner per-test guards that produce clear assertion failure messages"
  - "Integration test uses generateInstructions() + readFileSync on output file — buildMarkdown is private; this tests the real pipeline end-to-end"

patterns-established:
  - "Wave 0 scaffold: all phase 2 test stubs use dynamic import with undefined guard — GREEN means function is implemented and exported"
  - "Describe block labeling: 'ENRICH-03: ...' / 'OUTPUT-02: ...' — supports jest -t filter by requirement ID"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-03-12
---

# Phase 2 Plan W0: Usage Examples Wave 0 Scaffold Summary

**Three RED test scaffolds (17 tests total) defining extractExamples, buildUsageExamplesSection, and extractDependencies role-inference behavior before any implementation exists**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-12T19:05:00Z
- **Completed:** 2026-03-12T19:20:00Z
- **Tasks:** 3
- **Files modified:** 3 created

## Accomplishments

- Created tests/phase2/usageExamples.test.js with 9 failing tests covering ENRICH-03 (extractExamples shape, cap, empty, dedent, truncation) and OUTPUT-02 (section header, rendering, null guards)
- Created tests/phase2/dependencies.test.js with 5 failing tests covering OUTPUT-04 role inference for Node builtins (fs, path), call-site symbols, fallback path segments, and full shape validation
- Created tests/phase2/integration.test.js with 3 failing tests covering section ordering (Conventions < Examples < Classes) and dependency role format (" — " separator) in the generated markdown pipeline

## Test Case Counts

| File | Tests | Requirements |
|------|-------|-------------|
| tests/phase2/usageExamples.test.js | 9 | ENRICH-03, OUTPUT-02 |
| tests/phase2/dependencies.test.js | 5 | OUTPUT-04 |
| tests/phase2/integration.test.js | 3 | OUTPUT-02, OUTPUT-04 |
| **Total** | **17** | |

## Files Created/Modified

- `/Users/carlosmiret/Desktop/skill-me-up/tests/phase2/usageExamples.test.js` — ENRICH-03 + OUTPUT-02 stubs using dynamic import pattern
- `/Users/carlosmiret/Desktop/skill-me-up/tests/phase2/dependencies.test.js` — OUTPUT-04 stubs for role inference on extractDependencies
- `/Users/carlosmiret/Desktop/skill-me-up/tests/phase2/integration.test.js` — Pipeline integration stubs asserting on generated markdown content

## Decisions Made

- **Dynamic import() pattern:** Static ESM named imports throw `SyntaxError: The requested module does not provide an export named 'X'` at link time when the export doesn't exist. Switched to `dynamic import()` in `beforeAll` so functions resolve to `undefined` without crashing the test suite. The guard clause `if (typeof fn !== 'function') { expect(fn).toBe('a function') }` produces a clear assertion failure (not TypeError).
- **Integration test reads generated file:** `buildMarkdown` is not exported (private). Using `generateInstructions()` + `readFileSync` tests the full real pipeline rather than mocking internals.
- **Describe blocks labeled with requirement IDs:** Enables `jest -t "ENRICH-03"` to filter by requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Changed static named imports to dynamic import() for not-yet-exported functions**

- **Found during:** Task 1 (usageExamples.test.js verification)
- **Issue:** The plan stated "ESM named import fails silently as undefined" — this is incorrect. ESM static named imports throw `SyntaxError: does not provide an export named 'extractExamples'` at module link time, crashing the entire test suite before any test runs.
- **Fix:** Replaced `import { extractExamples } from '...'` with `const patternDetector = await import('...')` in `beforeAll`, assigning `extractExamples = patternDetector.extractExamples`. Added guard clauses in each test body to produce assertion failures when the function is `undefined`.
- **Files modified:** tests/phase2/usageExamples.test.js, tests/phase2/dependencies.test.js
- **Verification:** All 17 tests now fail RED with assertion errors, zero "SyntaxError" or "TypeError: not a function" in output.

---

**Total deviations:** 1 auto-fixed (Rule 1 — incorrect plan assumption about ESM import behavior)
**Impact on plan:** Fix is necessary for Nyquist compliance — the test scaffold must load without crash. No scope changes.

## Issues Encountered

The plan's claim that "ESM named import fails silently as undefined" is incorrect for strict ESM. This is a documentation gap to note for future wave 0 plans.

## Next Phase Readiness

- Wave 0 scaffold complete: 17 RED tests provide GREEN targets for Plans 01 and 02
- Plan 01 must implement `extractExamples` (patternDetector.js) and `buildUsageExamplesSection` (mdGenerator.js) to turn ENRICH-03 + OUTPUT-02 tests GREEN
- Plan 02 must export and upgrade `extractDependencies` to return `{ path, role }[]` to turn OUTPUT-04 tests GREEN
- Phase 1 suite remains fully GREEN (47/47 passing)

## Self-Check

- tests/phase2/usageExamples.test.js: EXISTS, 9 tests, all FAIL RED
- tests/phase2/dependencies.test.js: EXISTS, 5 tests, all FAIL RED
- tests/phase2/integration.test.js: EXISTS, 3 tests, all FAIL RED
- Phase 1 tests: 47/47 PASS

## Self-Check: PASSED

---
*Phase: 02-usage-examples*
*Completed: 2026-03-12*
