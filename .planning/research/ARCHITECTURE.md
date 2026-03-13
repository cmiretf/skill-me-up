# Architecture Research

**Domain:** Static code analysis CLI — pipeline extension for richer semantic extraction
**Researched:** 2026-03-08
**Confidence:** HIGH (based on direct codebase inspection)

## Standard Architecture

### System Overview — Current Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                        CLI Entry                              │
│   bin/cli.js — arg parsing, validation, invokes analyze()    │
└───────────────────────────┬──────────────────────────────────┘
                            │ analyze(projectPath, options)
┌───────────────────────────▼──────────────────────────────────┐
│                     Orchestration                             │
│   src/analyzer/index.js — analyze()                          │
│   Sequences: detectLanguage → scanStructure → per-folder     │
└──┬──────────────────┬──────────────────┬─────────────────────┘
   │                  │                  │
   ▼                  ▼                  ▼
languageDetector  structureAnalyzer  patternDetector
LanguageInfo{}    FolderInfo[]       PatternInfo{}
                                          │
                            ┌─────────────▼──────────────────┐
                            │       Generation Layer          │
                            │   src/generators/mdGenerator.js │
                            │   → agent_<name>_instructions.md│
                            └─────────────────────────────────┘
```

### Data Shape at Each Stage

```
FolderInfo (from structureAnalyzer)
  { path, name, relativePath, codeFiles, allFiles, subdirNames, depth }
        │
        ▼
PatternInfo (from patternDetector — bottleneck)
  { pattern, role, description, agentHint,
    fileAnalysis,       ← name-based file categorization (interfaces, controllers, etc.)
    deepAnalysis[],     ← per-file content analysis (classes, methods, imports, annotations)
    detectedPatterns[], ← architectural pattern labels (REST API, Spring Service, etc.)
    dependencies[],     ← cross-folder import references
    howToAdd[],         ← contextual "How to Add" instructions
    hasInterfaces, hasImplementations }
        │
        ▼ (passed into mdGenerator as-is)
Markdown Sections
  Header → Overview → Structure → Classes & Interfaces → Key Patterns
  → Files by Category → Architecture Note → How to Add → Dependencies
  → Subdirectories → Agent Instructions → Context → Footer
```

### Component Responsibilities

| Component | Responsibility | Extends How |
|-----------|---------------|-------------|
| `bin/cli.js` | Arg parsing, validation, entrypoint | Add new flags here; pass via `options` |
| `src/analyzer/index.js` | Sequence orchestration | Wire new extractors into the `for (folder of folders)` loop |
| `src/analyzer/structureAnalyzer.js` | Directory scanning, `FolderInfo[]`, folder tree | Stable — unlikely to change |
| `src/analyzer/languageDetector.js` | Tech stack detection from manifests | Add language entries to `INDICATORS[]` |
| `src/analyzer/patternDetector.js` | Deep per-file extraction — classes, methods, imports, patterns | Primary extension point for new extractors |
| `src/generators/mdGenerator.js` | Markdown assembly and file writing | Add section builders; call from `buildMarkdown()` |
| `src/config/patterns.js` | Architectural role lookup tables | Add entries to `FOLDER_PATTERNS`, `FILE_PATTERNS` |
| `src/config/ignored.js` | Ignore list and extension whitelist | Add dirs/extensions |

## Recommended Project Structure — After Extension

```
src/
├── analyzer/
│   ├── index.js                    # Orchestrator (minimal changes needed)
│   ├── languageDetector.js         # Stable
│   ├── structureAnalyzer.js        # Stable
│   └── patternDetector.js          # EXTEND: add new extraction functions here
│                                   #   OR split into sub-modules (see Pattern 2)
├── extractors/                     # NEW: dedicated extractor modules (Pattern 2)
│   ├── exampleExtractor.js         # Extracts real usage examples from file content
│   ├── antipatternDetector.js      # Detects antipatterns via heuristics
│   ├── conventionInferrer.js       # Infers naming/structure conventions
│   └── crossFolderContextBuilder.js # Aggregates cross-folder relationships
├── config/
│   ├── ignored.js                  # Stable
│   └── patterns.js                 # Extend with antipattern/convention definitions
└── generators/
    └── mdGenerator.js              # EXTEND: add section builders for new data
```

### Structure Rationale

- **`src/extractors/`:** Introduces without touching the monolithic `patternDetector.js`. Each extractor is a pure function taking file content (string) or `deepAnalysis[]` and returning structured data. Zero internal dependencies.
- **`src/analyzer/patternDetector.js` (inline option):** For smaller additions, add private functions at the bottom of `patternDetector.js` and wire into `detectFolderPattern()` return object. Simpler, but grows the already-1000-line file.
- Both approaches are compatible — the orchestrator only sees the `PatternInfo` shape that comes out of `detectFolderPattern()`.

## Architectural Patterns

### Pattern 1: PatternInfo Shape Extension (Zero-risk incremental)

**What:** Add new fields to the `PatternInfo` object returned by `detectFolderPattern()`. The generator reads what it finds; extra fields are ignored if not wired in yet.

**When to use:** When adding a single extraction capability (e.g., usage examples).

**Trade-offs:** No breaking changes. Old `mdGenerator.js` sections still work. New sections are opt-in. Generator never breaks on missing fields if it checks truthiness before rendering.

**Implementation contract:**

```javascript
// In patternDetector.js — detectFolderPattern() return object
return {
  // --- existing fields (keep as-is) ---
  pattern, role, description, agentHint,
  fileAnalysis, deepAnalysis, detectedPatterns,
  dependencies, howToAdd,
  hasInterfaces, hasImplementations,

  // --- new fields (add without removing anything) ---
  usageExamples,      // string[][] — per-file real code snippets
  antipatterns,       // { file, description, line }[]
  conventions,        // { naming: string, structure: string, style: string }
  crossFolderContext, // { usedBy: string[], uses: string[], description: string }
}
```

```javascript
// In mdGenerator.js — buildMarkdown() sections array (add at end, non-breaking)
if (patternInfo.usageExamples?.length > 0) {
  sections.push(buildUsageExamplesSection(patternInfo.usageExamples))
}
if (patternInfo.antipatterns?.length > 0) {
  sections.push(buildAntipatternsSection(patternInfo.antipatterns))
}
```

### Pattern 2: Dedicated Extractor Modules (Clean separation)

**What:** Move new extraction logic into `src/extractors/` as standalone modules. `patternDetector.js` calls them and merges results. Each extractor exports a single function.

**When to use:** When adding multiple related capabilities (conventions + antipatterns + examples) that would bloat `patternDetector.js` past ~1500 lines.

**Trade-offs:** Cleaner boundaries, easier to test in isolation. Adds 3-4 new files. Orchestration still lives in `patternDetector.js` or `index.js`.

**Example extractor shape:**

```javascript
// src/extractors/exampleExtractor.js
/**
 * @param {Object[]} deepAnalysis - Output of analyzeFileContents()
 * @param {string} folderPath - Absolute path (for re-reading files if needed)
 * @returns {Object[]} - [{ file, methodName, snippet }]
 */
export function extractUsageExamples(deepAnalysis, folderPath) {
  // Pure function: reads content, returns structured data
  // No side effects, no imports beyond Node stdlib
}
```

### Pattern 3: Project-Level Aggregation Pass (Cross-folder context)

**What:** After the per-folder loop in `index.js`, run a second pass that has access to ALL `PatternInfo` objects simultaneously. Use this to build cross-folder context that cannot be known per-folder.

**When to use:** Required for: "which other folders call this one?", "what is the full dependency graph?", project-level conventions derived from all folders.

**Trade-offs:** Requires a second iteration but is still O(n) and single-invocation. The aggregation results are injected back into each `PatternInfo` before generation, OR passed directly to `generateInstructions()`.

**Implementation location:** `src/analyzer/index.js` — add after the per-folder detection loop, before generation.

**Data flow for cross-folder context:**

```
// Phase 1: per-folder extraction (existing loop)
const allPatternInfos = folders.map(folder => detectFolderPattern(folder))

// Phase 2: cross-folder aggregation (new)
const crossContext = buildCrossContext(folders, allPatternInfos)
// crossContext: Map<folderRelPath, { usedBy: string[], uses: string[] }>

// Phase 3: generation with injected context (existing, slightly modified)
for (let i = 0; i < folders.length; i++) {
  const enriched = { ...allPatternInfos[i], crossFolderContext: crossContext.get(folders[i].relativePath) }
  generateInstructions(folders[i], enriched, languageInfo, projectMeta)
}
```

## Data Flow

### Extended Pipeline (Target State)

```
FolderInfo[] (from scanStructure)
    │
    ▼ Phase 1: Per-folder extraction (parallel-safe, order-independent)
    │
    ├── analyzeFileContents()   → deepAnalysis[]
    ├── extractUsageExamples()  → usageExamples[]      [NEW]
    ├── detectAntipatterns()    → antipatterns[]        [NEW]
    ├── inferConventions()      → conventions{}         [NEW]
    ├── detectArchitecturalPatterns()
    ├── extractDependencies()
    └── generateHowToAdd()
    │
    ▼ Phase 2: Cross-folder aggregation (requires all Phase 1 results)
    │
    └── buildCrossContext(allFolders, allPatternInfos) → Map<path, crossContext>  [NEW]
    │
    ▼ Phase 3: Generation
    │
    generateInstructions(folder, enrichedPatternInfo, ...)
    → agent_<name>_instructions.md
```

### Key Data Flows

1. **Usage examples:** `analyzeFileContents()` already reads file content. Pass the per-file `{ content, methods[] }` tuples to `extractUsageExamples()` — no re-reads needed. Look for method body content after the signature (everything between the first `{` and the matching `}`).

2. **Antipatterns:** Run heuristics against `deepAnalysis[]` in the same pass as `detectArchitecturalPatterns()`. No new file reads. Antipatterns are patterns of absence (no interface, massive method list, God class indicators) or bad convention (mixed naming).

3. **Project conventions:** Aggregate across `deepAnalysis[].methods[].name` for a single folder to infer naming style (camelCase, snake_case). Can be done per-folder without cross-folder state.

4. **Cross-folder context:** Depends on the already-extracted `dependencies[]` from each folder. The second pass in `index.js` inverts the dependency map — if folder A depends on folder B, then folder B is "used by" folder A.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| <100 files | Current per-file synchronous reads are fast. No changes needed. |
| 100-500 files | Still synchronous; `patternDetector.js` reads every code file. Monitor wall-clock time. Acceptable under the stated performance constraint. |
| 500+ files | Async parallel reads via `Promise.all` could help, but requires converting `analyzeFileContents()` from sync to async — a larger refactor. Flag for future milestone. |

### Scaling Priorities

1. **First bottleneck:** File I/O in `analyzeFileContents()` — currently `readFileSync` in a loop. If projects exceed ~500 files, convert to async reads in batches. Keep the same return shape.
2. **Second bottleneck:** Regex complexity per file — the per-language analyzers run 5-15 regexes per file. For very large files (>5000 lines), add a line-count early exit.

## Anti-Patterns

### Anti-Pattern 1: Adding Cross-Folder Logic Inside patternDetector.js

**What people do:** Try to look up sibling folders inside `detectFolderPattern()` by reading from disk or accepting the full `folders[]` array as a parameter.

**Why it's wrong:** `detectFolderPattern()` is designed to operate on one folder at a time. Giving it access to all folders creates implicit state, breaks the per-folder isolation, and makes the function impossible to test in isolation. It also breaks the clean pipeline — the analysis stage should not know about generation order.

**Do this instead:** Keep `detectFolderPattern()` per-folder. Add a second aggregation pass in `index.js` that receives the full `allPatternInfos[]` and returns a lookup map. Inject per-folder cross context into `generateInstructions()` as a separate argument or as an additional field on `PatternInfo`.

### Anti-Pattern 2: Extending PatternInfo With Breaking Shape Changes

**What people do:** Rename or remove existing `PatternInfo` fields when adding new ones.

**Why it's wrong:** `mdGenerator.js` destructures specific field names from `patternInfo`. Any rename breaks all existing Markdown sections immediately. There are no type guards — the failure is silent or produces empty output.

**Do this instead:** Only add new fields. Never rename or delete existing ones. Treat `PatternInfo` fields as append-only. If a field name is wrong, deprecate it by keeping it and adding the correct name alongside.

### Anti-Pattern 3: Introducing External Dependencies for Extraction

**What people do:** Add an npm package (e.g., a full AST parser like `@babel/parser` or `tree-sitter`) to get more accurate code analysis.

**Why it's wrong:** Violates the zero-dependency constraint. Also makes the tool much slower to install (`npx skill-me-up` is instant today). The regex-based approach is intentionally good-enough and language-agnostic.

**Do this instead:** Extend the regex-based extractors in each language-specific analyzer function. Accept the precision trade-off. Document extraction limitations in the generated Markdown when uncertain (e.g., "methods detected via signature regex — nested closures may be missing").

### Anti-Pattern 4: Putting Business Logic in mdGenerator.js

**What people do:** Add detection logic (e.g., "is this a God class?") inside a section builder in `mdGenerator.js`.

**Why it's wrong:** `mdGenerator.js` is a renderer. Mixing extraction and rendering makes it impossible to unit-test detection logic without also triggering file writes. It also means the same detection logic cannot be reused across sections.

**Do this instead:** All extraction and detection belongs in `patternDetector.js` (or a new extractor module). `mdGenerator.js` receives already-computed data and formats it. Section builders should be pure formatting functions: input data → output Markdown string.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `index.js` → `patternDetector.js` | Direct function call: `detectFolderPattern(folderInfo)` | Returns `PatternInfo`. No side effects. |
| `index.js` → `mdGenerator.js` | Direct function call: `generateInstructions(folder, patternInfo, lang, meta)` | Side effect: writes file. Return value is the output path. |
| `patternDetector.js` → `src/config/` | ES module import of constants | `FOLDER_PATTERNS`, `FILE_PATTERNS` are read-only. |
| New extractors → `patternDetector.js` | Called inside `detectFolderPattern()`, results merged into return object | Extractors receive `deepAnalysis[]` or raw content — no need for `folderInfo`. |
| Cross-context aggregator → `index.js` | New function in `index.js` after the detection loop | Takes `folders[]` + `allPatternInfos[]`, returns `Map<relativePath, crossContext>`. |

### Suggested Build Order

Build in this order to validate each increment before proceeding:

1. **Conventions inferrer** — operates entirely on already-extracted `deepAnalysis[].methods[].name`. No new file reads. Lowest risk. Validates that the new field → new section → rendered output flow works end-to-end.

2. **Usage examples extractor** — needs method bodies from file content. Extend `analyzeFileContents()` to capture method body snippets (bounded character budget to avoid bloated output). Wire into `PatternInfo.usageExamples` and add a section in `mdGenerator.js`.

3. **Antipattern detector** — heuristics over `deepAnalysis[]`. Implement after conventions because conventions output informs what counts as a violation. Add `PatternInfo.antipatterns`.

4. **Cross-folder context aggregation** — implement last because it requires the orchestrator in `index.js` to be restructured from a single loop into two passes. All other new fields are additive within the existing loop. This structural change should be isolated to minimize regression risk.

## Sources

- Direct inspection of `src/analyzer/patternDetector.js` (~977 lines, 2026-03-08)
- Direct inspection of `src/generators/mdGenerator.js` (~264 lines, 2026-03-08)
- Direct inspection of `src/analyzer/index.js` (orchestration loop, 2026-03-08)
- `.planning/codebase/ARCHITECTURE.md` — existing architecture documentation
- `.planning/PROJECT.md` — constraints and active requirements

---
*Architecture research for: skill-me-up static analysis pipeline extension*
*Researched: 2026-03-08*
