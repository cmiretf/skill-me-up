# Phase 1: Foundation - Research

**Researched:** 2026-03-09
**Domain:** Static code analysis enrichment — line number tracking and naming convention detection via regex
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Detect all three naming dimensions per folder: **file naming**, **method naming**, and **class naming**
- Also detect **import style** (relative vs absolute paths, explicit `.js` extension vs bare paths)
- For folders with multiple languages, detect and report conventions **per language separately** — don't merge across languages
- Scan **code files only** (matching `CODE_EXTENSIONS`) for file naming detection — exclude assets, configs, generated files
- Format: **bullet list grouped by type**, each bullet showing the detected style and one real example from the actual code
  - Example: `- **Methods**: camelCase (e.g. getUserById)`
- Conventions appear at **folder level** — each generated `.md` shows that folder's own detected conventions
- Section placement: **near the top, after the overview section** — before classes/methods content (agents read conventions first)
- **Silent omission** — if a convention dimension doesn't meet the 5-sample / 60% threshold, don't include that bullet at all
- **Omit section entirely** if no convention dimension in the folder meets threshold — no placeholder, no empty header
- When mixed styles are present but the **dominant style clears 60%**, report the dominant style only — no qualification or minority note
- Store line numbers as plain integers on method/class objects within `PatternInfo`; format and rendering approach left to implementer

### Claude's Discretion
- Line number tracking: store as plain integers on method/class objects within `PatternInfo`; format and rendering approach left to implementer

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENRICH-01 | Analyzer tracks line numbers during extraction of methods and classes (prerequisite for examples and pointers in later phases) | Line tracking via `String.split('\n')` index + regex match offset before regex loop; store as `lineNumber` integer on each method/class object |
| ENRICH-02 | Analyzer detects naming conventions per folder (camelCase vs snake_case vs PascalCase) with minimum 5 samples at 60% coverage before reporting | New `detectConventions(deepAnalysis, codeFiles)` function in `patternDetector.js`; classify each name, tally, apply threshold before reporting |
| OUTPUT-01 | Generated `.md` files include "## Project Conventions" section with naming style, import style, and file naming patterns detected | New `buildConventionsSection(conventions)` in `mdGenerator.js`; slot into `buildMarkdown()` after Overview, before Classes section |
</phase_requirements>

## Summary

Phase 1 adds two new data points to the analysis pipeline: (1) source line numbers on every extracted method and class object, and (2) a per-folder naming convention summary covering method names, class names, file names, and import style. These are prerequisites for Phases 2 and 3 which need line pointers for code snippet extraction and rely on conventions data already being present in `PatternInfo`.

All work stays within the zero-dependency constraint. The codebase already reads file content as a single string in every `analyze*` function; computing line numbers is as cheap as counting newlines before the regex match offset. Convention detection is a pure tallying problem: collect names, classify them against four style patterns (camelCase, PascalCase, snake_case, SCREAMING_SNAKE_CASE), find the dominant style, and apply the 5-sample/60% threshold before surfacing anything.

The two integration points are already identified in the codebase: `analyzeFileContents()` in `patternDetector.js` is the dispatch hub for per-language extraction, and `buildMarkdown()` in `mdGenerator.js` is the ordered sections array. Both can be extended with minimal surface area.

**Primary recommendation:** Add line tracking inside each `analyze*` function by pre-splitting content to a lines array and computing `lineNumber` from the regex match index. Add `detectConventions()` as a new private function in `patternDetector.js` called at the end of `detectFolderPattern()`. Add `buildConventionsSection()` in `mdGenerator.js` and slot it after the Overview block.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins (`fs`, `path`) | >= 18 | File reading, path operations | Already used throughout; zero-dep constraint means no additions |
| JavaScript ES Modules | native | Module system | `"type": "module"` in package.json; all files use named exports |

### Supporting
No new libraries. All work uses existing language primitives.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `String.split('\n')` for line counting | `acorn` or `@babel/parser` AST | ADVANCED-02 deferred to v2 — AST would give exact positions but violates zero-dep |
| Regex-based style classifier | A tokenizer / lexer | No benefit at this scope; four-style taxonomy is complete for the naming dimensions required |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
No structural changes. All new code goes into existing files:

```
src/
├── analyzer/
│   └── patternDetector.js   # Add: detectConventions(), line tracking in analyze* functions
└── generators/
    └── mdGenerator.js       # Add: buildConventionsSection(), wire into buildMarkdown()
```

### Pattern 1: Line Number Tracking in Regex Extractors

**What:** Before each regex loop in an `analyze*` function, split the full content string into a `lines` array. For each regex match, compute the line number by counting newlines in `content.substring(0, match.index)`. Store as `lineNumber` integer on the returned method/class object.

**When to use:** Applied to every language analyzer that extracts methods or classes: `analyzeJava`, `analyzeKotlin`, `analyzeTypeScriptOrJs`, `analyzePython`, `analyzeGo`, `analyzeCSharp`, `analyzePhp`, `analyzeRuby`.

**Example:**
```javascript
// Inside any analyze* function — computing line number from match index
function getLineNumber(content, matchIndex) {
  return content.substring(0, matchIndex).split('\n').length
}

// In a regex while-loop:
while ((match = methodRegex.exec(content)) !== null) {
  methods.push({
    name: match[2],
    params: match[3].trim(),
    returnType: match[4] || '',
    annotation: null,
    lineNumber: getLineNumber(content, match.index),  // NEW field
  })
}
```

Note: `getLineNumber` can be a private helper at the bottom of `patternDetector.js` alongside `extractMatches` and `extractFirst`.

### Pattern 2: Convention Detection via Tallying

**What:** After `analyzeFileContents()` returns, collect all method names, class names, and file names from `deepAnalysis`. Classify each name into a style bucket. Count occurrences. Report the dominant style only when the sample count >= 5 and the dominant proportion >= 60%.

**When to use:** Called once per folder, after deep analysis is complete, before `detectFolderPattern()` returns.

**Style classification logic:**
```javascript
// Classify a single identifier into a naming style
function classifyNameStyle(name) {
  if (/^[A-Z][A-Z0-9_]*$/.test(name)) return 'SCREAMING_SNAKE_CASE'
  if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return 'PascalCase'
  if (/^[a-z][a-zA-Z0-9]*$/.test(name) && name.includes('_') === false) return 'camelCase'
  if (/^[a-z][a-z0-9_]*$/.test(name) && name.includes('_')) return 'snake_case'
  if (/^[a-z][a-z0-9-]*$/.test(name) && name.includes('-')) return 'kebab-case'
  return null  // unclassifiable — single word, mixed, etc.
}

// Apply threshold to a tally map
function dominantStyle(tally, minSamples = 5, minRatio = 0.6) {
  const total = Object.values(tally).reduce((a, b) => a + b, 0)
  if (total < minSamples) return null
  for (const [style, count] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    if (count / total >= minRatio) return style
  }
  return null
}
```

**Import style detection:**
```javascript
// Classify each import path
function classifyImportStyle(importPath) {
  if (importPath.startsWith('.') && importPath.endsWith('.js')) return 'relative-with-extension'
  if (importPath.startsWith('.') && !importPath.endsWith('.js')) return 'relative-bare'
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) return 'absolute-bare'
  return null
}
```

### Pattern 3: buildConventionsSection() in mdGenerator.js

**What:** A new private section builder following the existing shape of `buildClassesSection`, `buildFilesSection`, etc. Renders the conventions object as a bullet list grouped by dimension. Returns `null` (same as `buildClassesSection` does) when there is nothing to show — caller checks for null before pushing to sections.

**When to use:** Called inside `buildMarkdown()` immediately after the Overview block, before the Classes section.

**Example shape:**
```javascript
// conventions object produced by detectConventions():
{
  methods: { style: 'camelCase', example: 'getUserById' },   // null if threshold not met
  classes: { style: 'PascalCase', example: 'UserService' },
  files:   { style: 'camelCase', example: 'userService.js' },
  imports: { style: 'relative-with-extension', example: '../config/patterns.js' },
}

// Rendered output (only non-null dimensions):
## Project Conventions
- **Methods**: camelCase (e.g. `getUserById`)
- **Classes**: PascalCase (e.g. `UserService`)
- **Files**: camelCase (e.g. `userService.js`)
- **Imports**: relative paths with `.js` extension (e.g. `../config/patterns.js`)
```

### Pattern 4: PatternInfo shape extension

**What:** Two new fields added to the `PatternInfo` object returned by `detectFolderPattern()`:
- `conventions` — the result of `detectConventions(deepAnalysis, codeFiles)`, or `null` if no dimensions met threshold
- `lineNumber` — added to each item in `methods` arrays inside `deepAnalysis` entries (not a top-level field)

```javascript
// Updated detectFolderPattern() return object:
return {
  pattern: matched || null,
  role: ...,
  description: ...,
  agentHint: ...,
  fileAnalysis,
  deepAnalysis,           // method objects inside now carry lineNumber
  detectedPatterns,
  dependencies,
  howToAdd,
  hasInterfaces: ...,
  hasImplementations: ...,
  conventions,            // NEW: { methods, classes, files, imports } or null
}
```

### Anti-Patterns to Avoid

- **Counting line numbers with a counter variable instead of match.index:** Using an incrementing counter is fragile if the regex has backtracking or resets. Always derive line number from `match.index` against the original content string.
- **Merging naming styles across languages in a multi-language folder:** The constraint is per-language separation. If a folder has `.java` and `.js` files, run convention detection per language group and report them separately under the same section.
- **Reporting conventions without an example:** The section format requires a real example from actual code. Store the example identifier alongside the style when tallying.
- **Empty `## Project Conventions` header:** If no dimension clears the threshold, omit the section entirely. The `buildConventionsSection()` function must return `null` and the caller must check before pushing.
- **Adding lineNumber to the class-level object instead of to each method entry:** Line numbers belong on individual method and class declaration objects, not on the file-level analysis object. Phase 2 (snippet extraction) needs per-method line pointers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line number computation | Custom byte offset tracker | `content.substring(0, match.index).split('\n').length` | One-liner, always correct for CRLF/LF, no state needed |
| Style classification | Heuristic string distance or ML | Four explicit regex patterns | The four-style taxonomy is closed and exhaustive for the naming dimensions in scope |
| Threshold enforcement | Fuzzy scoring | Hard integer count + ratio check | Requirements specify exact values (5 samples, 60%) — deterministic is correct |

**Key insight:** The entire convention detection problem is a frequency map + threshold check. No special data structures needed. The complexity is in correctly collecting the right names (method names from deep analysis, file basenames without extension, class names), not in the classification logic.

## Common Pitfalls

### Pitfall 1: Regex stateful `lastIndex` not reset between calls
**What goes wrong:** JavaScript regex objects with the `g` flag retain `lastIndex` between `exec()` calls. If a regex is declared at module scope and re-used across files, it will produce incorrect match positions or skip matches entirely.
**Why it happens:** All existing `analyze*` functions declare their regex objects inside the function body (safe). Adding line number support requires using `match.index` — which is only available when the regex is used with `exec()` in a while-loop, not with `matchAll` or `match()`.
**How to avoid:** Keep regex objects inside the function body or reset `lastIndex = 0` before each loop. Use `exec()` in a while-loop (already the existing pattern for method extraction).
**Warning signs:** Method list counts differ from what's visible in the file; first file analyzed returns correct line numbers but subsequent files do not.

### Pitfall 2: `match.index` not available from `.match()` on string
**What goes wrong:** `String.prototype.match()` with a `g` flag returns an array of strings, not match objects with `.index`. Line number computation requires `regex.exec(content)` to get `.index`.
**Why it happens:** Some existing extractors use `extractMatches(content, regex)` which calls `regex.exec()` in a loop — those work fine. But some single-match extractions use `content.match(regex)` — those need migration to `exec()` to support line tracking.
**How to avoid:** For class declarations that need a line number, use `regex.exec(content)` and capture `match.index`. The helper `extractFirst()` can be left as-is for cases where no line number is needed.

### Pitfall 3: File basename includes extension when collecting file naming samples
**What goes wrong:** Reporting `camelCase` based on `userService.js` but classifying `.js` as part of the name — extensions like `.test.js` or `.spec.js` could skew results or fail classification.
**Why it happens:** `basename(file)` includes the extension. Classification should use `basename(file, extname(file))` to get the stem only.
**How to avoid:** Strip extension before classifying file names. For compound extensions like `.test.js`, strip the last extension only (`.js`), leaving `userService.test` — which will be unclassifiable and excluded from the tally. This is correct behavior.

### Pitfall 4: Convention detection runs on non-code files
**What goes wrong:** Convention section includes naming styles detected from config files, `.json`, or generated files which don't follow project conventions.
**Why it happens:** `codeFiles` in `FolderInfo` is already filtered to `CODE_EXTENSIONS` by `structureAnalyzer.js` — so this is actually safe by default. The pitfall is if convention detection looks at `allFiles` instead of `codeFiles`.
**How to avoid:** Always pass `codeFiles` (not `allFiles`) to convention detection. The `CODE_EXTENSIONS` filter is already applied upstream.

### Pitfall 5: Multi-language folder merges styles incorrectly
**What goes wrong:** A folder with both Java (`camelCase` methods) and Python (`snake_case` methods) reports a single blended convention.
**Why it happens:** If detection aggregates all method names regardless of language.
**How to avoid:** In `detectConventions()`, group `deepAnalysis` entries by `entry.language` before tallying. Run threshold check per language. In `buildConventionsSection()`, if multiple languages are present with different detected styles, render them under a language sub-label (e.g., `- **Methods (Java)**: camelCase (e.g. getUserById)`).

### Pitfall 6: TypeScript/JavaScript analyzer doesn't extract class declarations with line numbers
**What goes wrong:** `analyzeTypeScriptOrJs` uses `content.match(...)` (not `exec()`) for class detection, so `match.index` is not available.
**Why it happens:** Class detection in TS/JS is done with a single `content.match()` call. To add a line number, this needs to change to `classRegex.exec(content)`.
**How to avoid:** For each `content.match(regex)` call where a line number is needed, replace with `regex.exec(content)` and store `match.index` separately. Only do this for class and method detection — not for imports or decorators where line numbers are not needed.

## Code Examples

### Computing line number from regex match index
```javascript
// Source: patternDetector.js — new private helper (add alongside extractMatches, extractFirst)
function getLineNumber(content, matchIndex) {
  return content.substring(0, matchIndex).split('\n').length
}
```

### Classifying a naming style with threshold
```javascript
// Source: patternDetector.js — new private function
function detectConventions(deepAnalysis, codeFiles) {
  const methodTally = {}   // { style: count }
  const methodExamples = {} // { style: example_name }
  const classTally = {}
  const classExamples = {}

  for (const fa of deepAnalysis) {
    if (fa.error) continue
    // Method names
    for (const method of (fa.methods || [])) {
      const style = classifyNameStyle(method.name)
      if (!style) continue
      methodTally[style] = (methodTally[style] || 0) + 1
      if (!methodExamples[style]) methodExamples[style] = method.name
    }
    // Class names
    if (fa.className) {
      const style = classifyNameStyle(fa.className)
      if (style) {
        classTally[style] = (classTally[style] || 0) + 1
        if (!classExamples[style]) classExamples[style] = fa.className
      }
    }
  }

  const methodStyle = dominantStyle(methodTally)
  const classStyle = dominantStyle(classTally)

  // File names — use codeFiles array (already CODE_EXTENSIONS filtered)
  const fileTally = {}
  const fileExamples = {}
  for (const filename of (codeFiles || [])) {
    const stem = basename(filename, extname(filename))
    const style = classifyNameStyle(stem)
    if (!style) continue
    fileTally[style] = (fileTally[style] || 0) + 1
    if (!fileExamples[style]) fileExamples[style] = filename
  }
  const fileStyle = dominantStyle(fileTally)

  // Import style — from deepAnalysis imports arrays
  const importTally = {}
  const importExamples = {}
  for (const fa of deepAnalysis) {
    if (fa.error || !fa.imports) continue
    for (const imp of fa.imports) {
      const style = classifyImportStyle(imp)
      if (!style) continue
      importTally[style] = (importTally[style] || 0) + 1
      if (!importExamples[style]) importExamples[style] = imp
    }
  }
  const importStyle = dominantStyle(importTally)

  // Return null if nothing detected
  const result = {}
  if (methodStyle) result.methods = { style: methodStyle, example: methodExamples[methodStyle] }
  if (classStyle)  result.classes = { style: classStyle,  example: classExamples[classStyle] }
  if (fileStyle)   result.files   = { style: fileStyle,   example: fileExamples[fileStyle] }
  if (importStyle) result.imports = { style: importStyle, example: importExamples[importStyle] }

  return Object.keys(result).length > 0 ? result : null
}
```

### buildConventionsSection in mdGenerator.js
```javascript
// Source: mdGenerator.js — new private section builder
function buildConventionsSection(conventions) {
  if (!conventions) return null

  const lines = []
  const IMPORT_LABELS = {
    'relative-with-extension': 'relative paths with `.js` extension',
    'relative-bare': 'relative paths without extension',
    'absolute-bare': 'absolute/package paths',
  }

  if (conventions.methods) {
    lines.push(`- **Methods**: ${conventions.methods.style} (e.g. \`${conventions.methods.example}\`)`)
  }
  if (conventions.classes) {
    lines.push(`- **Classes**: ${conventions.classes.style} (e.g. \`${conventions.classes.example}\`)`)
  }
  if (conventions.files) {
    lines.push(`- **Files**: ${conventions.files.style} (e.g. \`${conventions.files.example}\`)`)
  }
  if (conventions.imports) {
    const label = IMPORT_LABELS[conventions.imports.style] || conventions.imports.style
    lines.push(`- **Imports**: ${label} (e.g. \`${conventions.imports.example}\`)`)
  }

  return lines.length > 0 ? lines.join('\n') : null
}
```

### Insertion point in buildMarkdown()
```javascript
// Source: mdGenerator.js — buildMarkdown() sections array, after the Overview block
// Insert AFTER the existing overview push and BEFORE the directory tree / classes sections:

// ─── Project Conventions (NEW) ────────────────────────────────────────────
if (patternInfo.conventions) {
  const conventionsSection = buildConventionsSection(patternInfo.conventions)
  if (conventionsSection) {
    sections.push('## Project Conventions')
    sections.push(conventionsSection)
    sections.push('')
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No line numbers on extracted items | `lineNumber` integer on each method/class object | Phase 1 (now) | Enables Phase 2 file+line pointers and snippet extraction |
| No naming convention output | `conventions` field in `PatternInfo`, rendered as `## Project Conventions` section | Phase 1 (now) | Agents reading `.md` files see coding conventions without reading source |
| `deepAnalysis` method objects have no location info | Method objects gain `lineNumber: integer` field | Phase 1 (now) | Non-breaking addition — existing consumers that don't read `lineNumber` are unaffected |

**Deprecated/outdated:**
- Nothing deprecated in Phase 1. All changes are additive.

## Open Questions

1. **Multi-language rendering format**
   - What we know: CONTEXT.md says detect per language separately for folders with multiple languages
   - What's unclear: Whether to add a language sub-label on every bullet or only when multiple languages differ
   - Recommendation: Only add language sub-label when two or more languages are detected in the folder AND their styles differ. Single-language folders use the plain bullet format.

2. **`kebab-case` file naming vs `camelCase`**
   - What we know: The project's own files use camelCase (`patternDetector.js`); many JS ecosystems also use kebab-case (`my-module.js`)
   - What's unclear: Whether to include `kebab-case` in the classifier (it wasn't in the named examples in CONTEXT.md but is common in practice)
   - Recommendation: Include `kebab-case` as a valid file naming style. The classifier already handles it (see code examples). If it wins the threshold check in a target project, report it — suppressing it would hide real convention information.

3. **Single-word identifiers**
   - What we know: Names like `analyze`, `scan`, `log` are single words and technically match both camelCase and snake_case patterns
   - What's unclear: Whether to count them toward a style or skip them as unclassifiable
   - Recommendation: Mark single-word identifiers (no case-change or separator) as unclassifiable (`classifyNameStyle` returns `null`). They don't contribute signal. This prevents false positives in small folders with mostly single-word names.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None currently installed |
| Config file | none — see Wave 0 |
| Quick run command | `node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=phase1` (after Wave 0 setup) |
| Full suite command | `node --experimental-vm-modules node_modules/.bin/jest` |

No test framework is currently present in the project. Wave 0 must establish one.

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENRICH-01 | `analyzeJava` returns `lineNumber` integer on each method | unit | `jest tests/phase1/lineTracking.test.js -t "analyzeJava lineNumber"` | Wave 0 |
| ENRICH-01 | `analyzeTypeScriptOrJs` returns `lineNumber` on exported functions | unit | `jest tests/phase1/lineTracking.test.js -t "analyzeTypeScriptOrJs lineNumber"` | Wave 0 |
| ENRICH-01 | `analyzePython` returns `lineNumber` on each method | unit | `jest tests/phase1/lineTracking.test.js -t "analyzePython lineNumber"` | Wave 0 |
| ENRICH-02 | `detectConventions` returns null when fewer than 5 samples | unit | `jest tests/phase1/conventions.test.js -t "below threshold"` | Wave 0 |
| ENRICH-02 | `detectConventions` returns null when dominant style < 60% | unit | `jest tests/phase1/conventions.test.js -t "mixed styles below ratio"` | Wave 0 |
| ENRICH-02 | `detectConventions` returns correct style when threshold met | unit | `jest tests/phase1/conventions.test.js -t "dominant style reported"` | Wave 0 |
| OUTPUT-01 | `buildConventionsSection` renders bullet list from conventions object | unit | `jest tests/phase1/mdGenerator.test.js -t "buildConventionsSection"` | Wave 0 |
| OUTPUT-01 | `buildConventionsSection` returns null when conventions is null | unit | `jest tests/phase1/mdGenerator.test.js -t "null conventions"` | Wave 0 |
| OUTPUT-01 | `buildMarkdown` includes "## Project Conventions" section after overview | integration | `jest tests/phase1/integration.test.js -t "conventions section placement"` | Wave 0 |
| OUTPUT-01 | `buildMarkdown` omits section entirely when no conventions detected | integration | `jest tests/phase1/integration.test.js -t "no conventions omitted"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=phase1`
- **Per wave merge:** `node --experimental-vm-modules node_modules/.bin/jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `package.json` devDependencies — install jest: `npm install --save-dev jest`
- [ ] `jest.config.js` — configure for ESM (`"transform": {}`, `"extensionsToTreatAsEsm": [".js"]`)
- [ ] `tests/phase1/lineTracking.test.js` — covers ENRICH-01 for Java, TS/JS, Python
- [ ] `tests/phase1/conventions.test.js` — covers ENRICH-02 threshold logic
- [ ] `tests/phase1/mdGenerator.test.js` — covers OUTPUT-01 section builder
- [ ] `tests/phase1/integration.test.js` — covers OUTPUT-01 full buildMarkdown pipeline

## Sources

### Primary (HIGH confidence)
- Direct source read: `src/analyzer/patternDetector.js` — full implementation of all `analyze*` functions, exact regex patterns, current method object shape
- Direct source read: `src/generators/mdGenerator.js` — full `buildMarkdown()` section structure, `buildClassesSection` pattern to follow
- Direct source read: `src/config/ignored.js` — `CODE_EXTENSIONS` set, confirmed usable for file name collection
- Direct source read: `.planning/codebase/ARCHITECTURE.md` — data flow, `PatternInfo` shape, integration points
- Direct source read: `.planning/codebase/CONVENTIONS.md` — code style, JSDoc requirements, error handling patterns
- Direct source read: `.planning/phases/01-foundation/01-CONTEXT.md` — locked decisions, threshold values, section format

### Secondary (MEDIUM confidence)
- JavaScript regex `exec()` / `match.index` behavior: standard ECMAScript specification — `lastIndex` is maintained on stateful (`g`-flag) regex objects between `exec()` calls; `match.index` gives byte offset of match start

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire implementation uses existing project code, no new libraries
- Architecture: HIGH — read actual source files, integration points are concrete and named
- Pitfalls: HIGH — derived from direct inspection of regex usage patterns in the existing codebase
- Validation architecture: MEDIUM — test framework choice (jest) is standard but not yet confirmed as preferred; Wave 0 will validate

**Research date:** 2026-03-09
**Valid until:** 2026-06-09 (stable domain — no external dependencies to expire)
