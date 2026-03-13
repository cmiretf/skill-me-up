---
phase: 03-antipattern-detection
plan: "02"
subsystem: analysis
tags: [antipatterns, markdown-generation, heuristics, tdd]

# Dependency graph
requires:
  - phase: 03-01
    provides: detectAntipatterns() function in patternDetector.js (ENRICH-04)
provides:
  - antipatterns field on patternInfo object returned by detectFolderPattern()
  - buildDontDoSection(antipatterns) function in mdGenerator.js with named export
  - "## Don't Do" section rendered in generated .md files when 3+ files trigger a rule
affects: [04-cross-folder-context]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: RED-GREEN cycle — failing integration stubs existed before implementation"
    - "Section builder: buildDontDoSection includes header in return value (same contract as buildUsageExamplesSection)"
    - "Truthiness guard: antipatterns block in buildMarkdown uses if (antipatterns) { ... } consistent with conventions/examples pattern"

key-files:
  created: []
  modified:
    - src/analyzer/patternDetector.js
    - src/generators/mdGenerator.js

key-decisions:
  - "buildDontDoSection includes ## Don't Do header in return value — not in buildMarkdown, consistent with buildUsageExamplesSection contract"
  - "antipatterns field added as last field in detectFolderPattern() return object — additive, no breaking changes"
  - "Section omitted entirely (not rendered as empty) when antipatterns is null or [] — null check guards both cases"

patterns-established:
  - "Section builders return null for empty input, caller checks before pushing — established by buildConventionsSection, reinforced here"
  - "Named export added at bottom of mdGenerator.js for test access — additive export pattern consistent across all builder functions"

requirements-completed: [ENRICH-04, OUTPUT-03]

# Metrics
duration: 15min
completed: 2026-03-13
---

# Phase 3 Plan 02: Antipattern Detection — Integration Summary

**detectAntipatterns() wired into detectFolderPattern() pipeline; buildDontDoSection() renders "## Don't Do" section in generated .md files with heuristic blockquote disclaimer and per-rule bullet list**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-13T17:10:00Z
- **Completed:** 2026-03-13T17:25:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Wired detectAntipatterns() into detectFolderPattern() so patternInfo.antipatterns is populated on every call
- Implemented buildDontDoSection() with locked output format (header, blockquote disclaimer, per-rule bullet lines)
- Wired buildDontDoSection() into buildMarkdown() after Usage Examples, before Structure
- Added buildDontDoSection to named exports for test access
- All 12 phase3 tests now GREEN (was 7 passing, 5 failing before this plan)
- Full suite: 76/76 tests pass, no regressions in phase1 or phase2

## Task Commits

No commits — user handles all commits manually per CLAUDE.md.

1. **Task 1: Wire detectAntipatterns into detectFolderPattern() and add antipatterns to return object** — src/analyzer/patternDetector.js
2. **Task 2: Implement buildDontDoSection and wire into buildMarkdown** — src/generators/mdGenerator.js

## Files Created/Modified

- `/Users/carlosmiret/Desktop/skill-me-up/src/analyzer/patternDetector.js` — Added `const antipatterns = detectAntipatterns(deepAnalysis, folderInfo.path)` call and `antipatterns` field in return object
- `/Users/carlosmiret/Desktop/skill-me-up/src/generators/mdGenerator.js` — Added `antipatterns` to buildMarkdown destructuring, added Don't Do block in sections array, added buildDontDoSection function, updated named export line

## Decisions Made

- buildDontDoSection includes its own `## Don't Do` header (same contract as buildUsageExamplesSection which includes `## Usage Examples`) — caller does not add header separately
- antipatterns is the last field in the return object — purely additive, all callers that spread or destructure specific fields are unaffected
- Section is completely omitted (not rendered empty) when detectAntipatterns returns null or [] — truthiness check `if (antipatterns)` plus `if (dontDoContent)` double-guards

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Both tasks were straightforward wiring of already-designed interfaces.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 3 (Antipattern Detection) is now complete: ENRICH-04 and OUTPUT-03 both satisfied
- 76/76 tests pass across all phases
- Ready for Phase 4 (cross-folder context) whenever planned

---
*Phase: 03-antipattern-detection*
*Completed: 2026-03-13*
