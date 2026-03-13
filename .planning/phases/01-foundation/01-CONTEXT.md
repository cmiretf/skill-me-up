# Phase 1: Foundation - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Add line number tracking to extracted methods and classes, and add naming convention detection per folder. The phase delivers two new data points in `PatternInfo` (line numbers on methods/classes, detected conventions) and one new section in generated `.md` files ("## Project Conventions"). Creating examples, antipatterns, and output quality gates are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Convention detection scope
- Detect all three naming dimensions per folder: **file naming**, **method naming**, and **class naming**
- Also detect **import style** (relative vs absolute paths, explicit `.js` extension vs bare paths)
- For folders with multiple languages, detect and report conventions **per language separately** — don't merge across languages
- Scan **code files only** (matching `CODE_EXTENSIONS`) for file naming detection — exclude assets, configs, generated files

### Conventions section layout
- Format: **bullet list grouped by type**, each bullet showing the detected style and one real example from the actual code
  - Example: `- **Methods**: camelCase (e.g. getUserById)`
- Conventions appear at **folder level** — each generated `.md` shows that folder's own detected conventions
- Section placement: **near the top, after the overview section** — before classes/methods content (agents read conventions first)

### Threshold behavior
- **Silent omission** — if a convention dimension doesn't meet the 5-sample / 60% threshold, don't include that bullet at all
- **Omit section entirely** if no convention dimension in the folder meets threshold — no placeholder, no empty header
- When mixed styles are present but the **dominant style clears 60%**, report the dominant style only — no qualification or minority note

### Line number tracking
- Claude's Discretion — store as plain integers on method/class objects within `PatternInfo`; format and rendering approach left to implementer

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CODE_EXTENSIONS` set in `src/config/ignored.js`: already filters code files — reuse directly for file naming detection
- `analyzeFileContents()` switch block in `src/analyzer/patternDetector.js`: existing per-language dispatch point — add line tracking here
- Section builder pattern in `src/generators/mdGenerator.js`: `buildClassesSection`, `buildFilesSection`, etc. — add `buildConventionsSection()` following the same shape
- `buildMarkdown()` in `mdGenerator.js`: ordered sections array — insert conventions section near top, after overview

### Established Patterns
- All extraction uses enhanced regex + brace-depth scanning (zero-dependency constraint — no AST library)
- Language-specific analysis functions are named `analyze<Language>` and return a consistent plain object shape
- Module boundaries are strict: analysis logic in `src/analyzer/`, rendering logic in `src/generators/` — convention detection goes in `patternDetector.js`, rendering goes in `mdGenerator.js`
- Empty catch blocks with `/* skip */` comment for non-critical file reads — follow this for convention detection failures
- JSDoc on all exported functions; section dividers (`// ─── Section Name ───`) for large files

### Integration Points
- `PatternInfo` shape (`patternDetector.js → mdGenerator.js`): needs two new fields — `lineNumbers` on method/class entries, `conventions` object with detected per-dimension results
- `detectFolderPattern()` is the exit point from detection — conventions and line numbers must be populated before it returns
- `buildMarkdown()` receives `patternInfo` — `buildConventionsSection(patternInfo.conventions)` can be slotted in after the header/overview block

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

*Phase: 01-foundation*
*Context gathered: 2026-03-09*
