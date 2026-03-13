# Phase 3: Antipattern Detection - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Detect code smells heuristically from existing extracted analysis and surface them in a "## Don't Do" section in each generated `.md`. Covers exactly 4 antipatterns: methods >40 lines, nesting >3 levels, god class (>20 public methods), empty catch blocks. No new CLI flags, no configurable rules, no output format changes beyond the new section.

</domain>

<decisions>
## Implementation Decisions

### Frequency threshold
- **Folder-level gate**: an antipattern must appear in 3+ distinct files within the same folder before it surfaces in that folder's `.md` — no cross-folder accumulation needed
- **Unit**: 1 file = 1 occurrence toward the threshold (a file with 5 long methods still counts as 1 file)
- **Threshold hardcoded at 3** — not configurable via CLI flag
- **Output**: show file count only — `"Long methods (>40 lines): found in 4 files"` — no separate instance count

### Language coverage rules
- **Empty catch blocks**: adapt per language idiom
  - Java / JS / TS / Kotlin: detect empty `catch (...) {}` blocks
  - Python: detect empty `except:` or `except ...:` blocks (no statements, or only `pass`)
  - Go: silently skip (Go error handling has no catch equivalent)
- **God class (>20 public methods)**: apply only to languages with class syntax
  - Java, Kotlin, TypeScript, JS (class syntax), Python — count public/exported methods per class
  - Go and plain JS modules (no class keyword): skip this rule entirely
- **Long methods (>40 lines)**: apply to all languages — count lines from function/method start to closing brace/indent-return
- **Nesting depth (>3 levels)**: use brace depth only (count `{` depth from function start) — existing brace-depth scanning approach; Python uses same brace-depth heuristic (consistent with zero-dependency constraint, no indent counting)

### Section placement & labeling
- **Placement**: after `## Usage Examples`, before `## Structure` — positive examples first, then warnings
- **Disclaimer format**: blockquote preamble at the top of the section content:
  ```
  > Heuristically detected — review before treating as authoritative.
  ```
- **Section header**: `## Don't Do` (no annotation in the header itself — disclaimer is in the blockquote)
- **Silent omission**: if no antipattern clears the 3-file threshold, omit the section entirely — no empty header, consistent with conventions and examples behavior

### Claude's Discretion
- Exact regex patterns for each language's empty catch/except detection
- Internal data structure for accumulating per-folder file counts
- Name and signature of `detectAntipatterns()` function
- How to integrate antipatterns into `PatternInfo` shape (new field vs inline computation)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `analyzeTypeScriptOrJs`, `analyzeJava`, `analyzeKotlin`, `analyzePython`, `analyzeGo` in `patternDetector.js`: existing per-language dispatch — antipattern detection hooks in here or receives their output
- Brace-depth scanning already implemented for `extractExamples()` (method body extraction) — reuse same approach for nesting depth measurement
- `buildUsageExamplesSection()` and `buildConventionsSection()` in `mdGenerator.js`: section builder pattern to follow for `buildDontDoSection()`
- `detectFolderPattern()` return object: needs new `antipatterns` field alongside `examples`, `conventions`, `dependencies`

### Established Patterns
- Zero-dependency constraint: all detection via enhanced regex + brace-depth scanning — no AST library
- Analysis in `src/analyzer/patternDetector.js`, rendering in `src/generators/mdGenerator.js`
- Section builders return a string (joined lines) or empty string — caller checks for truthiness before pushing to sections array
- Silent omission when threshold not met (conventions, examples) — same principle applies here
- Named exports at bottom of `patternDetector.js` for test access — add `detectAntipatterns` there

### Integration Points
- `detectFolderPattern()` exit point: call `detectAntipatterns(deepAnalysis, folderInfo.codeFiles)` and attach result to `PatternInfo`
- `buildMarkdown()` sections array in `mdGenerator.js` (line ~60-67): insert `buildDontDoSection()` call after `buildUsageExamplesSection()` block
- `buildMarkdown()` destructuring (line ~24-29): add `antipatterns` to destructured `patternInfo` fields

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-antipattern-detection*
*Context gathered: 2026-03-13*
