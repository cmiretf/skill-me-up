---
phase: 02-usage-examples
plan: "01"
subsystem: analyzer
tags: [code-extraction, snippet, markdown, usage-examples]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: analyzeTypeScriptOrJs method objects, detectFolderPattern pipeline, buildConventionsSection pattern
provides:
  - extractExamples() in patternDetector.js returning { methodName, relativePath, lineNumber, lang, snippet }
  - buildUsageExamplesSection() in mdGenerator.js rendering ## Usage Examples section
  - detectFolderPattern() return object now includes 'examples' key
  - buildMarkdown() inserts ## Usage Examples between ## Project Conventions and ## Classes & Interfaces
affects: [03-antipatterns, 04-cross-folder]

# Tech tracking
tech-stack:
  added: []
  patterns: [brace-depth-walker for snippet extraction, dedent for whitespace normalization, group-by-language rendering]

key-files:
  created: []
  modified:
    - src/analyzer/patternDetector.js
    - src/generators/mdGenerator.js

key-decisions:
  - "buildUsageExamplesSection includes ## Usage Examples header in its return value (not in buildMarkdown caller) — required to match test assertions"
  - "extractExamples accepts optional folderRelativePath (defaults to '') to handle 2-argument test calls without crashing"
  - "analyzeTypeScriptOrJs function objects now include isPublic: true — exported functions are by definition public"
  - "buildUsageExamplesSection uses ### methodName (no backticks) to match test expectation of ### doThing substring"
  - "Expression-body arrows (no opening brace on first line) return single-line snippet without crashing"

patterns-established:
  - "Brace-depth walker: increment depth on '{', decrement on '}', stop when bodyStarted && depth === 0"
  - "Snippet truncation: push '  // ... (truncated)' when body exceeds maxLines with depth still > 0"
  - "Dedent: compute minIndent from non-empty lines, slice all lines uniformly"
  - "Section rendering pattern: include section header inside the section builder function, not in buildMarkdown caller"

requirements-completed: [ENRICH-03, OUTPUT-02]

# Metrics
duration: 18min
completed: 2026-03-12
---

# Phase 2 Plan 01: Usage Examples Summary

**extractExamples() + buildUsageExamplesSection() wired end-to-end: brace-depth snippet extraction from public JS/TS methods, rendered as ## Usage Examples section in generated .md files**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-12T19:25:00Z
- **Completed:** 2026-03-12T19:43:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Implemented `extractExamples(deepAnalysis, folderPath, folderRelativePath)` with brace-depth walker, dedent, and truncation (up to 2 public methods, 15-line cap with `  // ... (truncated)`)
- Implemented `buildUsageExamplesSection(examples)` rendering `## Usage Examples` with per-method headers, `See: path:line` pointers, and fenced code blocks grouped by language
- Wired `extractExamples` into `detectFolderPattern()` return object as `examples` key
- Wired `buildUsageExamplesSection` into `buildMarkdown()` between `## Project Conventions` and `## Classes & Interfaces`
- Added `isPublic: true` to function objects created by `analyzeTypeScriptOrJs` so exported functions qualify as public methods

## Task Commits

Note: Per CLAUDE.md, git commits are handled manually by the user.

1. **Task 1: extractExamples() + wire into detectFolderPattern()** - `src/analyzer/patternDetector.js` (feat)
2. **Task 2: buildUsageExamplesSection() + wire into buildMarkdown()** - `src/generators/mdGenerator.js` (feat)

## Files Created/Modified
- `/Users/carlosmiret/Desktop/skill-me-up/src/analyzer/patternDetector.js` - Added `dedent()`, `extractMethodBody()`, `extractExamples()` functions; wired `extractExamples` call into `detectFolderPattern()`; added `isPublic: true` to `analyzeTypeScriptOrJs` function objects; added `extractExamples` to named exports
- `/Users/carlosmiret/Desktop/skill-me-up/src/generators/mdGenerator.js` - Added `LANG_FENCE` constant, `buildUsageExamplesSection()` function, destructured `examples` in `buildMarkdown()`, inserted usage examples block after conventions block, exported `buildUsageExamplesSection`

## Decisions Made
- `buildUsageExamplesSection` includes `## Usage Examples` in its output (not in `buildMarkdown` caller) — tests assert on the section builder's return value directly
- `extractExamples` makes `folderRelativePath` optional (defaults to `''`) to handle 2-argument test calls
- `analyzeTypeScriptOrJs` now sets `isPublic: true` on all detected exported functions — they satisfy the regex `export\s+(?:async\s+)?function`, so they are definitionally public
- Method headers rendered as `### methodName` (no backticks) to satisfy `toContain('### doThing')` test assertion

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added isPublic: true to analyzeTypeScriptOrJs function objects**
- **Found during:** Task 2 (integration test OUTPUT-02 failing — ## Usage Examples absent from generated content)
- **Issue:** `analyzeTypeScriptOrJs` produces method objects without `isPublic` property; `extractExamples` filters `m.isPublic === true`, so no JS/TS methods qualified, producing empty examples array
- **Fix:** Added `isPublic: true` to each object pushed in the exported-function detection loop inside `analyzeTypeScriptOrJs`
- **Files modified:** `src/analyzer/patternDetector.js`
- **Verification:** Integration tests OUTPUT-02-integration and OUTPUT-02-order now GREEN

**2. [Rule 1 - Bug] buildUsageExamplesSection includes ## Usage Examples header in return value**
- **Found during:** Task 2 (OUTPUT-02-1 test assertion mismatch)
- **Issue:** Plan's implementation omits the `## Usage Examples` header from the function's return value (expecting `buildMarkdown` to push it), but test asserts `buildUsageExamplesSection(sampleExamples)` contains `## Usage Examples`
- **Fix:** Added `lines.push('## Usage Examples')` inside `buildUsageExamplesSection`; in `buildMarkdown`, push the returned content directly without a separate header push
- **Files modified:** `src/generators/mdGenerator.js`
- **Verification:** OUTPUT-02-1 passes GREEN

**3. [Rule 1 - Bug] Method header uses no backticks around name**
- **Found during:** Task 2 (OUTPUT-02-2 test expects `### doThing` not `### \`doThing\``)
- **Issue:** Plan specifies ` ### \`${ex.methodName}\`` with backticks, but test `toContain('### doThing')` fails when backticks are present
- **Fix:** Changed to `### ${ex.methodName}` (no backticks)
- **Files modified:** `src/generators/mdGenerator.js`
- **Verification:** OUTPUT-02-2 passes GREEN

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 bugs)
**Impact on plan:** All auto-fixes necessary for tests to pass. No scope creep.

## Issues Encountered
- Test signatures for `extractExamples` use 2 arguments (no `folderRelativePath`), while plan specifies 3-arg signature. Resolved by making 3rd argument optional with default `''`.
- OUTPUT-04 test (dependencies role format) remains intentionally RED — handled by Plan 02.

## Test Results
- **usageExamples.test.js:** 9/9 passed (ENRICH-03: 5/5 GREEN, OUTPUT-02: 4/4 GREEN)
- **integration.test.js:** 2/3 passed (OUTPUT-02 integration: 2/2 GREEN; OUTPUT-04: 1/1 intentionally RED)
- **Phase 1 tests:** All GREEN (unchanged)
- **Total:** 58 passed, 6 intentionally RED (dependencies.test.js + OUTPUT-04)

## Next Phase Readiness
- Plan 02 (extractDependencies role inference / OUTPUT-04) can proceed — pipeline and section ordering are locked in
- All ENRICH-03 and OUTPUT-02 requirements satisfied
- 6 intentionally RED tests remain for Plan 02 to address

---
*Phase: 02-usage-examples*
*Completed: 2026-03-12*
