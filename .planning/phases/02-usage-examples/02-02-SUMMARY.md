---
phase: 02-usage-examples
plan: "02"
subsystem: analyzer
tags: [dependency-inference, role-annotation, patternDetector, mdGenerator, node-builtins]

# Dependency graph
requires:
  - phase: 02-usage-examples
    provides: "02-01: extractExamples() and buildUsageExamplesSection() implemented"
  - phase: 01-foundation
    provides: "detectFolderPattern() and buildMarkdown() pipeline established"
provides:
  - "extractDependencies() upgraded to return { path, role }[] instead of string[]"
  - "inferDepRole() helper with NODE_BUILTINS map, call-site scan, and path-segment fallback"
  - "buildMarkdown() dependencies block renders '- `dep.path` — dep.role' format"
  - "extractDependencies exported as named export for test access"
affects:
  - phase-03-antipatterns
  - future phases consuming dependency data

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-tier content resolution: fa.content first (fixture/cache), readFileSync fallback"
    - "Call-site scan via regex on named import bindings to extract used symbol names"
    - "Segment-based fallback for unknown deps (last path segment, hyphens/underscores -> spaces)"
    - "NODE_BUILTINS map for hardcoded human-readable labels for Node.js standard library modules"

key-files:
  created: []
  modified:
    - src/analyzer/patternDetector.js
    - src/generators/mdGenerator.js

key-decisions:
  - "JS/TS dep collection extended to include non-relative imports (builtins, npm packages) as full import strings, not just folder segments — required for builtin role lookup and call-site scan to work"
  - "Relative imports for JS/TS now stored as full import path (e.g. '../utils/logger') rather than extracted folder segment — enables inferDepRole to match via imp.endsWith('/segment')"
  - "extractDependencies exported as named export (additive change) for test access via dynamic import"

patterns-established:
  - "Dep shape: { path: string, role: string }[] — path is the raw import string, role is always non-empty"
  - "inferDepRole priority: NODE_BUILTINS lookup > named-import call-site scan > path-segment fallback"
  - "buildMarkdown dep rendering: '- `dep.path` — dep.role' with em-dash separator"

requirements-completed: [OUTPUT-04]

# Metrics
duration: 15min
completed: 2026-03-12
---

# Phase 2 Plan 02: Role-Annotated Dependencies Summary

**extractDependencies() upgraded from string[] to { path, role }[] with NODE_BUILTINS map, named-import call-site scanning, and path-segment fallback; buildMarkdown() renders '- `dep.path` — role' format**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-12T19:40:00Z
- **Completed:** 2026-03-12T19:55:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `NODE_BUILTINS` constant mapping 15 Node.js standard library modules to human-readable role labels
- Implemented `inferDepRole(depPath, allDeepAnalysis, folderPath)` with three-tier resolution: builtins lookup, named-import call-site scan (using `fa.content` first, `readFileSync` fallback), then path-segment derivation
- Extended JS/TS dep collection in `extractDependencies` to capture both non-relative imports (builtins, npm packages) and full relative import paths (instead of folder-segment extraction)
- Updated `buildMarkdown()` dep rendering block to use `dep.path` and `dep.role` — eliminates `[object Object]` in generated files
- Exported `extractDependencies` as named export for direct test access

## Files Created/Modified

- `/Users/carlosmiret/Desktop/skill-me-up/src/analyzer/patternDetector.js` - Added NODE_BUILTINS constant, inferDepRole() helper, upgraded extractDependencies() return type to { path, role }[], extended JS/TS dep collection, added named export
- `/Users/carlosmiret/Desktop/skill-me-up/src/generators/mdGenerator.js` - Updated dep rendering loop to use dep.path and dep.role with em-dash separator

## Content Resolution Strategy

`inferDepRole` uses a two-tier content approach:
1. **`fa.content` first** — present in test fixtures and potentially cached runtime entries; no filesystem access needed
2. **`readFileSync(join(folderPath, fa.file), 'utf8')` fallback** — runtime resolution when content absent; wrapped in try/catch, skips file on error

This ensures tests work with synthetic fixtures while production scans read real files.

## Decisions Made

- JS/TS dep collection now stores the full import string (both relative and non-relative) instead of extracting a folder segment. This was necessary because: (a) builtins like `fs` are non-relative and were being skipped entirely, and (b) the call-site scan uses `imp.endsWith('/' + segment)` to match imports to dep paths, which requires the full path.
- `extractDependencies` is exported (additive named export) so the test suite can import it directly via dynamic import — consistent with the existing pattern used for other test exports at the bottom of the file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extended JS/TS dep collection logic to capture non-relative imports and full relative paths**
- **Found during:** Task 1 (upgrade extractDependencies)
- **Issue:** Plan stated "no other changes to the discovery/filtering logic" but the existing logic for JS/TS only added folder-segment extracts from relative imports, skipping builtins/npm packages entirely. Tests expected `d.path === 'fs'` (a non-relative import) which could never be in the set. Call-site scan also depended on dep paths being full import strings.
- **Fix:** Extended the JS/TS branch to add all imports (relative and non-relative) as full import strings to the deps set. Non-relative imports (builtins, npm packages) use the import name directly; relative imports use the full path string.
- **Files modified:** src/analyzer/patternDetector.js
- **Verification:** All 5 OUTPUT-04 unit tests pass GREEN; integration test for dep format passes GREEN
- **Committed in:** n/a (no commits per project CLAUDE.md)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in discovery logic for new return type)
**Impact on plan:** Fix was necessary for correctness. The plan's "no changes to discovery logic" assumption was inconsistent with the test expectations. Extended discovery is a superset of the old behavior — it now captures more dependencies (previously JS non-relative imports were silently dropped).

## Known Limitations

- JS/TS dep list now includes ALL imports (not just cross-folder relative ones). This means npm packages like `express`, `lodash` etc. will appear in the Dependencies section. Previously only relative cross-folder imports were listed. This is arguably better behavior (more information for AI agents) but represents a behavioral change for JS/TS projects.
- Call-site scan uses a simple named-import regex (`import { A, B } from 'pkg'`) and does not detect default imports, namespace imports (`import * as X`), or dynamic `import()` calls. Default imports get the path-segment fallback role.

## Issues Encountered

None — both changes were straightforward once the dep collection extension was identified as necessary.

## Next Phase Readiness

- OUTPUT-04 requirement complete: dependency roles available in all generated .md files
- Phase 2 tests: 17/17 passing; Full suite: 64/64 passing
- Phase 3 (antipattern detection) can proceed; no dependency on this plan's changes

---
*Phase: 02-usage-examples*
*Completed: 2026-03-12*
