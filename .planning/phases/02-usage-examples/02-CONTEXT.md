# Phase 2: Usage Examples - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract real code snippets from the codebase and add a "## Usage Examples" section to each generated `.md`. Upgrade the "## Dependencies" section to describe what each imported module is actually used for, not just list raw paths. Antipattern detection and output quality gates are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Example selection
- Select from **exported/public methods first** — most useful for AI agents learning how to use the folder
- Up to **2 examples per folder** — 1 if only 1 public method exists, 2 if more
- When method body exceeds 15 lines: **cut at line 15 and append `// ... (truncated)`**
- **Omit section entirely** if no extractable public methods in the folder — no placeholder, no empty header (consistent with ## Project Conventions behavior)

### Snippet presentation
- Format per example: `### methodName` header → `` `See: path/to/file.js:42` `` pointer → fenced code block
- Code block uses **language tag** (e.g. ` ```js `, ` ```java `) for syntax highlighting — language already detected per file
- Section placement: **after ## Project Conventions, before classes/methods section**
- **Full signature + body** in the snippet (not body-only)
- **Dedented** — normalize leading whitespace so snippet starts at column 0
- **Multi-language folders**: group examples by language (consistent with ## Project Conventions behavior)

### Dependency role inference
- Format: `- \`path/to/dep\` — <one-line role description>` per dependency
- Role inferred by **scanning call sites** in the folder's files: extract which functions/methods are called from each import and surface those names as the role description (e.g., `readFileSync, writeFileSync` → "file system reads/writes")
- For **Node.js builtin packages**: use a hardcoded label map (e.g., `fs` → "file system reads/writes", `path` → "path manipulation", `os` → "OS info")
- For **unknown packages** where call-site scanning yields nothing: fall back to path-segment label (e.g., `../../utils/helpers` → "utility helpers")
- Always show the dependency — never silently omit; path-segment fallback ensures every dep has a description

### Claude's Discretion
- Exact set of Node.js builtin labels in the hardcode map
- How to surface called function names as a readable description (join with `, ` vs natural language)
- Brace-depth / line-counting approach for extracting method bodies (existing pattern from patternDetector.js)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `deepAnalysis` array (from `patternDetector.js`): each entry already has `methods[]` with `name`, `lineNumber`, `isPublic`/visibility info — direct input for example extraction
- `dependencies` array (from `extractDependencies()`): already collects import paths per folder — needs upgrade to include role descriptions
- `buildClassesSection()` in `mdGenerator.js`: section builder pattern to follow for `buildUsageExamplesSection()`
- `buildConventionsSection()` in `mdGenerator.js`: language-grouping pattern already implemented — reuse same approach for multi-language example grouping
- `CODE_EXTENSIONS` in `src/config/ignored.js`: used to filter code files — relevant for call-site scanning

### Established Patterns
- Zero-dependency constraint: all extraction via enhanced regex + brace-depth scanning — no AST library
- Analysis logic in `src/analyzer/patternDetector.js`, rendering in `src/generators/mdGenerator.js` — snippet extraction logic goes in patternDetector, rendering in mdGenerator
- Section builder functions return arrays of strings joined by `\n` — follow same shape for new sections
- Silent omission when data doesn't meet threshold (conventions) — apply same principle to examples (omit section if no public methods)

### Integration Points
- `detectFolderPattern()` exit point: needs to populate `examples` array on `PatternInfo` before returning
- `extractDependencies()`: needs to return objects `{ path, role }` instead of raw strings
- `buildMarkdown()` sections array: insert `buildUsageExamplesSection()` after conventions block, before `buildClassesSection()`
- `buildMarkdown()` dependencies block (lines ~132-145): upgrade to render `dep.role` alongside `dep.path`

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

*Phase: 02-usage-examples*
*Context gathered: 2026-03-12*
