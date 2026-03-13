# Phase 2: Usage Examples - Research

**Researched:** 2026-03-12
**Domain:** Static code analysis, method body extraction (regex + brace-depth), dependency role inference, markdown rendering
**Confidence:** HIGH

## Summary

Phase 2 has two distinct work streams that are independent enough to plan in parallel. The first stream — ENRICH-03 / OUTPUT-02 — adds a "## Usage Examples" section to each generated `.md` file. The second stream — OUTPUT-04 — upgrades the existing "## Dependencies" section from a raw path list to a role-annotated list.

Both streams operate entirely within the established zero-dependency constraint (no AST library, pure regex + brace-depth scanning). All raw data needed already exists in `deepAnalysis` entries: methods have `lineNumber` and `isPublic`/export-based visibility. The main new work is (a) reading the source file a second time at render time to slice out the method body lines, (b) scanning call-sites across the folder's files to label each import, and (c) wiring both into `buildMarkdown()`.

The section-builder pattern used by `buildConventionsSection()` and `buildClassesSection()` is the exact template to follow. No new libraries are needed. The only non-obvious complexity is reliable method-body extraction via brace-depth counting — the pattern is already used in the project conceptually, and the CONTEXT.md explicitly authorizes that approach.

**Primary recommendation:** Implement `extractExamples()` in `patternDetector.js` and `buildUsageExamplesSection()` in `mdGenerator.js`, upgrade `extractDependencies()` to return `{ path, role }` objects, and upgrade the dependencies rendering block in `buildMarkdown()`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Example selection
- Select from **exported/public methods first** — most useful for AI agents learning how to use the folder
- Up to **2 examples per folder** — 1 if only 1 public method exists, 2 if more
- When method body exceeds 15 lines: **cut at line 15 and append `// ... (truncated)`**
- **Omit section entirely** if no extractable public methods in the folder — no placeholder, no empty header (consistent with ## Project Conventions behavior)

#### Snippet presentation
- Format per example: `### methodName` header → `` `See: path/to/file.js:42` `` pointer → fenced code block
- Code block uses **language tag** (e.g. ` ```js `, ` ```java `) for syntax highlighting — language already detected per file
- Section placement: **after ## Project Conventions, before classes/methods section**
- **Full signature + body** in the snippet (not body-only)
- **Dedented** — normalize leading whitespace so snippet starts at column 0
- **Multi-language folders**: group examples by language (consistent with ## Project Conventions behavior)

#### Dependency role inference
- Format: `- \`path/to/dep\` — <one-line role description>` per dependency
- Role inferred by **scanning call sites** in the folder's files: extract which functions/methods are called from each import and surface those names as the role description
- For **Node.js builtin packages**: use a hardcoded label map (e.g., `fs` → "file system reads/writes", `path` → "path manipulation", `os` → "OS info")
- For **unknown packages** where call-site scanning yields nothing: fall back to path-segment label (e.g., `../../utils/helpers` → "utility helpers")
- Always show the dependency — never silently omit; path-segment fallback ensures every dep has a description

### Claude's Discretion
- Exact set of Node.js builtin labels in the hardcode map
- How to surface called function names as a readable description (join with `, ` vs natural language)
- Brace-depth / line-counting approach for extracting method bodies (existing pattern from patternDetector.js)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENRICH-03 | Analyzer extracts real code snippets from the most representative methods of each folder (limited to 15 lines per snippet) | `deepAnalysis[].methods[].lineNumber` already set; need `extractExamples()` in patternDetector.js that reads file content, selects up to 2 public methods, slices lines, dedents, and returns `{ methodName, file, lineNumber, lang, snippet }[]` |
| OUTPUT-02 | Generated `.md` files include a "## Usage Examples" section with real code snippets extracted from the codebase | Need `buildUsageExamplesSection(examples)` in mdGenerator.js; wired into `buildMarkdown()` sections array after conventions block, before classes block |
| OUTPUT-04 | Generated `.md` files include in "## Dependencies" not just the import list but the functional role of each dependency | Need `extractDependencies()` to return `{ path, role }[]` instead of raw strings; need buildMarkdown() dependency rendering block updated to render `dep.role` |
</phase_requirements>

---

## Standard Stack

### Core (no changes)
| Component | Current | Purpose |
|-----------|---------|---------|
| Node.js ESM | `>=18.0.0` | Runtime — `import`/`export` throughout |
| Jest 30 | `^30.2.0` (dev only) | Test runner — `node --experimental-vm-modules` |
| `fs.readFileSync` | Node builtin | File reading — already used in `analyzeFileContents` |
| `path` builtins | Node builtin | `join`, `extname`, `basename` already imported |

No new dependencies needed. Zero-dependency constraint is absolute.

### File Roles

| File | Responsibility |
|------|---------------|
| `src/analyzer/patternDetector.js` | All extraction logic: add `extractExamples()`, upgrade `extractDependencies()` |
| `src/generators/mdGenerator.js` | All rendering: add `buildUsageExamplesSection()`, upgrade dependencies block in `buildMarkdown()` |
| `tests/phase2/usageExamples.test.js` | Unit tests for `extractExamples` and `buildUsageExamplesSection` |
| `tests/phase2/dependencies.test.js` | Unit tests for upgraded `extractDependencies` |
| `tests/phase2/integration.test.js` | Integration test: generated markdown contains expected sections |

---

## Architecture Patterns

### Existing Patterns to Follow Exactly

**Section builder pattern** (from `buildConventionsSection` / `buildClassesSection`):
```javascript
// Source: src/generators/mdGenerator.js
function buildUsageExamplesSection(examples) {
  if (!examples || examples.length === 0) return null
  const lines = []
  // ... build lines array
  return lines.join('\n')
}
```
- Returns `string | null`
- Caller guards with `if (content)` before pushing header + content to `sections[]`
- Silent omit (return null) when no data — same principle as conventions

**Method body extraction via brace-depth** (authorized by CONTEXT.md, established project pattern):
```javascript
// Pattern: read file content, find method start line by lineNumber,
// walk forward counting '{' / '}' until depth reaches 0
function extractMethodBody(content, startLine, maxLines = 15) {
  const lines = content.split('\n')
  const start = startLine - 1  // 0-indexed
  const slice = []
  let depth = 0
  let started = false

  for (let i = start; i < lines.length && slice.length < maxLines; i++) {
    const line = lines[i]
    slice.push(line)
    for (const ch of line) {
      if (ch === '{') { depth++; started = true }
      if (ch === '}') depth--
    }
    if (started && depth === 0) break
  }

  if (slice.length === maxLines && depth > 0) {
    slice.push('  // ... (truncated)')
  }

  return dedent(slice)
}
```

**Dedent helper** (new, simple):
```javascript
function dedent(lines) {
  const nonEmpty = lines.filter(l => l.trim().length > 0)
  if (nonEmpty.length === 0) return lines
  const minIndent = Math.min(...nonEmpty.map(l => l.match(/^(\s*)/)[1].length))
  return lines.map(l => l.slice(minIndent))
}
```

**Multi-language grouping pattern** (from `buildConventionsSection`, which already handles `Array` vs plain object):
- When examples come from multiple languages: group by `lang` field, emit a `#### Language` sub-header per group
- When single language: emit directly without language sub-header

**Call-site scanning for dependency roles** (new, pure regex):
```javascript
// For each import alias, scan the file content for calls: alias.method() or { method } usage
function inferDependencyRole(importPath, importedNames, fileContents, lang) {
  // Check builtin map first
  const BUILTINS = {
    'fs': 'file system reads/writes',
    'path': 'path manipulation',
    'os': 'OS info',
    'http': 'HTTP server/client',
    'https': 'HTTPS server/client',
    'crypto': 'cryptographic operations',
    'util': 'Node.js utilities',
    'events': 'event emitter',
    'stream': 'stream processing',
    'buffer': 'binary data handling',
    'url': 'URL parsing',
    'querystring': 'query string parsing',
    'child_process': 'spawning child processes',
    'cluster': 'multi-process clustering',
    'net': 'TCP/IPC networking',
    'readline': 'line-by-line input',
  }
  const baseName = importPath.split('/').pop().replace(/\.\w+$/, '')
  if (BUILTINS[baseName]) return BUILTINS[baseName]

  // Scan call sites — collect called names
  const calledNames = new Set()
  // ... regex scan fileContents for importedNames usage
  if (calledNames.size > 0) return [...calledNames].slice(0, 3).join(', ')

  // Fallback: path-segment label
  return baseName.replace(/[-_]/g, ' ') + ' utilities'
}
```

### Integration Points (confirmed by code inspection)

1. **`detectFolderPattern()` exit** (line 37–50 of patternDetector.js): add `examples` key to returned object alongside `conventions`.

2. **`extractDependencies()` return type** (line 707): currently returns `[...deps].sort()` (string array). Change to return `[...depsMap].sort()` as `{ path: string, role: string }[]`.

3. **`buildMarkdown()` sections array** (mdGenerator.js line 50–57 conventions block → then line 69 classes block): insert usage examples block between them.

4. **`buildMarkdown()` dependencies block** (lines 132–140): currently `sections.push(\`- \\\`${dep}\\\`\`)`. Upgrade to `sections.push(\`- \\\`${dep.path}\\\` — ${dep.role}\`)`.

5. **`analyzeFileContents()`**: the `deepAnalysis` entries do not currently store raw file content. For body extraction, the file must be read again at extraction time (or the content cached). Given zero-dep constraint and existing pattern of `readFileSync` per file, re-reading at extraction time is simplest and avoids memory growth for large projects.

### Recommended Project Structure (additions only)

```
src/
├── analyzer/
│   └── patternDetector.js   # + extractExamples(), upgraded extractDependencies()
├── generators/
│   └── mdGenerator.js       # + buildUsageExamplesSection(), upgraded dep block
tests/
└── phase2/
    ├── usageExamples.test.js
    ├── dependencies.test.js
    └── integration.test.js
```

### Anti-Patterns to Avoid

- **Storing full file content on deepAnalysis entries**: would increase memory footprint for large projects. Re-read at extraction time instead.
- **Changing `extractDependencies()` return type silently**: the caller in `buildMarkdown()` references `dep` as a string today (line 138: `` `- \`${dep}\`` ``). Both call sites must be updated atomically or tests will fail.
- **Trying to extract method bodies from compiled/minified files**: not a risk for this project (source analysis only), but brace-depth scanning assumes formatted source.
- **Using `eval` or dynamic execution**: violates zero-dep + static-analysis-only rules.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Syntax tree parsing | Custom recursive-descent parser | Brace-depth counting (already authorized, sufficient for 15-line snippets) |
| Package metadata lookup | npm API calls | Hardcoded builtin label map + path-segment fallback |
| Language detection for code fence | Custom detection | `fa.language` already set on every deepAnalysis entry (values: `'JavaScript'`, `'TypeScript'`, `'Java'`, etc.) — map to fence tag |

**Language → fence tag map** (authoritative, from analyzeTypeScriptOrJs and other analyzers):

| `fa.language` | Code fence tag |
|--------------|----------------|
| `JavaScript` | ` ```js ` |
| `TypeScript` | ` ```ts ` |
| `Java` | ` ```java ` |
| `Kotlin` | ` ```kotlin ` |
| `Python` | ` ```python ` |
| `Go` | ` ```go ` |
| `C#` | ` ```csharp ` |
| `PHP` | ` ```php ` |
| `Ruby` | ` ```ruby ` |

---

## Common Pitfalls

### Pitfall 1: extractDependencies return type change breaks existing callers
**What goes wrong:** `extractDependencies()` currently returns `string[]`. After the upgrade it returns `{ path, role }[]`. `buildMarkdown()` line 138 does `` `- \`${dep}\`` `` treating `dep` as a string.
**Why it happens:** Two places touch the same data shape change.
**How to avoid:** Change both `extractDependencies()` and the `buildMarkdown()` dependencies block in the same commit/plan. Add a test that validates the rendered format includes a `—` role separator.
**Warning signs:** Markdown shows `[object Object]` in the dependencies list.

### Pitfall 2: lineNumber off-by-one causing wrong body extraction
**What goes wrong:** `getLineNumber()` returns 1-based line numbers. When slicing `content.split('\n')`, the array is 0-indexed. If the slice offset is wrong by 1, the snippet starts from the line before the signature.
**How to avoid:** `start = method.lineNumber - 1` (convert 1-based to 0-indexed). Verify with a test fixture where you know the exact line of a method.
**Warning signs:** Snippet includes a blank line or the previous method's closing brace at the top.

### Pitfall 3: Brace-depth counting fails for arrow function exports
**What goes wrong:** `export const fn = () => value` has no braces. The brace-depth loop never finds a `{` and returns only the signature line.
**Why it happens:** Arrow functions with expression bodies have no `{}`.
**How to avoid:** For expression-body arrows (no `{` on first line), treat the single signature line as the complete snippet — no truncation needed.
**Warning signs:** Snippet is just the `export const fn = () =>` line with no body.

### Pitfall 4: deepAnalysis entries lack file path for re-reading
**What goes wrong:** `analyzeFileContents(folderPath, files)` builds `deepAnalysis` entries with only `{ file: 'filename.js', ... }` (just the basename), not the absolute path.
**How to avoid:** `extractExamples()` must receive `folderPath` (already on `folderInfo`) to reconstruct the absolute path with `join(folderPath, fa.file)`. This matches the existing pattern in `analyzeFileContents`.

### Pitfall 5: Call-site scanning matches import path substrings
**What goes wrong:** Scanning for calls from `'../utils/logger'` might match any variable named `logger` in the file, including ones imported from a different path.
**How to avoid:** Parse the import statement to extract the local binding name first (`import { readFile } from 'fs'` → binding: `readFile`; `import logger from '../utils/logger'` → binding: `logger`). Then scan for `logger.` or `logger(` patterns. Limit to the first 3 unique names to keep descriptions short.

### Pitfall 6: Section insert position in buildMarkdown
**What goes wrong:** The new "## Usage Examples" section must appear after `## Project Conventions` and before `## Classes & Interfaces`. If inserted in the wrong place, agent-readability suffers.
**How to avoid:** In `buildMarkdown()`, the conventions push is at lines 50–57 and classes push is at lines 69–78. Insert the examples block between them (approximately after line 57). Validate with the integration test checking section order.

---

## Code Examples

### Pattern: Method body extraction with brace-depth

```javascript
// Source: CONTEXT.md authorized approach; consistent with getLineNumber() in patternDetector.js
function extractMethodBody(content, startLineNumber, maxLines = 15) {
  const lines = content.split('\n')
  const startIdx = startLineNumber - 1  // 1-based → 0-indexed
  const slice = []
  let depth = 0
  let bodyStarted = false

  for (let i = startIdx; i < lines.length; i++) {
    if (slice.length >= maxLines) {
      slice.push('  // ... (truncated)')
      break
    }
    const line = lines[i]
    slice.push(line)
    for (const ch of line) {
      if (ch === '{') { depth++; bodyStarted = true }
      if (ch === '}') depth--
    }
    if (bodyStarted && depth === 0) break
  }

  return dedent(slice)
}
```

### Pattern: Dependency role inference from call sites

```javascript
// Source: CONTEXT.md locked decision; new logic in patternDetector.js
const NODE_BUILTINS = {
  fs: 'file system reads/writes',
  path: 'path manipulation',
  os: 'OS info',
  http: 'HTTP server/client',
  https: 'HTTPS requests',
  crypto: 'cryptographic operations',
  util: 'Node.js utilities',
  events: 'event emitter',
  stream: 'stream processing',
  url: 'URL parsing/formatting',
  child_process: 'spawning child processes',
  readline: 'line-by-line input',
  net: 'TCP/IPC networking',
  buffer: 'binary data handling',
  querystring: 'query string parsing',
}

function inferDepRole(importPath, allFileContents) {
  const segment = importPath.split('/').pop().replace(/\.\w+$/, '')
  if (NODE_BUILTINS[segment]) return NODE_BUILTINS[segment]

  // Scan all files in folder for usage of this import
  const calledNames = new Set()
  for (const content of allFileContents) {
    // Match: import { a, b } from 'importPath' or import alias from 'importPath'
    const namedMatch = content.match(
      new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`)
    )
    if (namedMatch) {
      namedMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim()).forEach(n => {
        if (n) calledNames.add(n)
      })
    }
  }

  if (calledNames.size > 0) {
    return [...calledNames].slice(0, 3).join(', ')
  }

  // Fallback: derive from path segment
  return segment.replace(/[-_]/g, ' ')
}
```

### Pattern: buildUsageExamplesSection renderer

```javascript
// Source: mirrors buildConventionsSection pattern in mdGenerator.js
function buildUsageExamplesSection(examples) {
  if (!examples || examples.length === 0) return null

  const lines = []

  // Group by language if mixed
  const byLang = {}
  for (const ex of examples) {
    const lang = ex.lang || 'unknown'
    if (!byLang[lang]) byLang[lang] = []
    byLang[lang].push(ex)
  }

  const langs = Object.keys(byLang)

  for (const lang of langs) {
    if (langs.length > 1) {
      lines.push(`#### ${lang}`)
      lines.push('')
    }
    for (const ex of byLang[lang]) {
      const fenceTag = LANG_FENCE[lang] || ''
      lines.push(`### \`${ex.methodName}\``)
      lines.push(`See: \`${ex.relativePath}:${ex.lineNumber}\``)
      lines.push('')
      lines.push(`\`\`\`${fenceTag}`)
      lines.push(...ex.snippet)
      lines.push('```')
      lines.push('')
    }
  }

  return lines.join('\n')
}
```

### Pattern: Updated dependency rendering in buildMarkdown

```javascript
// Source: mdGenerator.js lines 132-140 (current), upgraded for OUTPUT-04
if (dependencies && dependencies.length > 0) {
  sections.push('## Dependencies')
  sections.push('')
  sections.push('This folder imports from / depends on the following packages or folders:')
  sections.push('')
  for (const dep of dependencies) {
    sections.push(`- \`${dep.path}\` — ${dep.role}`)
  }
  sections.push('')
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw import list in ## Dependencies | Role-annotated import list | Phase 2 | Agents understand *why* a dep is used, not just *that* it exists |
| No usage examples in generated `.md` | Real 15-line snippets with file+line pointers | Phase 2 | Agents can see how public methods look before reading source |

**Not applicable for external library version changes** — this phase adds internal logic only.

---

## Open Questions

1. **JS/TS arrow function body extraction edge cases**
   - What we know: `export const fn = () => value` has no braces; `export const fn = () => { ... }` does
   - What's unclear: Whether multi-line arrow functions without braces (template literals spanning lines) need special handling
   - Recommendation: Treat no-brace arrows as single-line snippets; document this as known limitation. The 15-line cap and `// ... (truncated)` already handle the common case.

2. **Import alias re-mapping for call-site scanning**
   - What we know: `import { readFile as rf } from 'fs'` means calling `rf()`, not `readFile()`
   - What's unclear: How frequently `as`-aliases appear in real codebases
   - Recommendation: Parse both `name as alias` forms and scan for the alias. The regex in the Code Examples section above handles `split(/\s+as\s+/)[0]` (extracts original name). Claude's discretion applies.

3. **`extractDependencies()` currently filters out many imports** (std lib, framework packages)
   - What we know: The current function only includes "cross-folder" refs for JS/TS and skips `java.*`, `javax.*`, `org.springframework.*`
   - What's unclear: OUTPUT-04 says "all imports" should have roles — but the current filter was intentional to avoid listing `lodash`, `express`, etc.
   - Recommendation: For OUTPUT-04, upgrade the function to include external package imports as well (not just cross-folder refs), with the builtin map + call-site + path-segment fallback covering all cases. Rename or create a new `extractAllDependencies()` to avoid breaking the existing filtered behavior if it's needed elsewhere.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 (`jest@^30.2.0`) |
| Config file | `jest.config.js` (root, minimal — `testEnvironment: 'node'`) |
| Quick run command | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/ --testPathPatterns tests/phase2` |
| Full suite command | `node --experimental-vm-modules node_modules/.bin/jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENRICH-03 | `extractExamples()` selects up to 2 public methods, extracts bodies ≤15 lines, dedents, truncates with `// ... (truncated)`, returns `{ methodName, file, lineNumber, lang, snippet }[]` | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/usageExamples.test.js -t "ENRICH-03"` | Wave 0 |
| ENRICH-03 | `extractExamples()` returns `[]` when no public methods exist | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/usageExamples.test.js -t "omits"` | Wave 0 |
| OUTPUT-02 | Generated `.md` contains `## Usage Examples` section with `### methodName`, `See: path:line`, fenced code block | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/usageExamples.test.js -t "OUTPUT-02"` | Wave 0 |
| OUTPUT-02 | Generated `.md` omits `## Usage Examples` entirely when no examples | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/usageExamples.test.js -t "omits section"` | Wave 0 |
| OUTPUT-02 | `## Usage Examples` appears after `## Project Conventions` and before `## Classes & Interfaces` | integration | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/integration.test.js` | Wave 0 |
| OUTPUT-04 | `extractDependencies()` returns `{ path, role }[]` with role populated for known builtins | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/dependencies.test.js -t "builtin"` | Wave 0 |
| OUTPUT-04 | `extractDependencies()` falls back to path-segment label for unknown deps | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/dependencies.test.js -t "fallback"` | Wave 0 |
| OUTPUT-04 | Generated `.md` dependencies section uses `— role` format instead of bare path | integration | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/integration.test.js -t "dependencies"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/`
- **Per wave merge:** `node --experimental-vm-modules node_modules/.bin/jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase2/usageExamples.test.js` — covers ENRICH-03 and OUTPUT-02
- [ ] `tests/phase2/dependencies.test.js` — covers OUTPUT-04
- [ ] `tests/phase2/integration.test.js` — covers section order and combined rendering

*(All three files need to be created in Wave 0 before implementation tasks. No new framework install needed — Jest 30 already installed.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `/Users/carlosmiret/Desktop/skill-me-up/src/analyzer/patternDetector.js` — full read, confirmed method shapes, `getLineNumber` implementation, `extractDependencies` return type, `detectConventions` pattern
- Direct code inspection: `/Users/carlosmiret/Desktop/skill-me-up/src/generators/mdGenerator.js` — full read, confirmed `buildConventionsSection` pattern, dependency rendering block (lines 132–140), section insertion points
- Direct code inspection: `02-CONTEXT.md` — locked decisions confirmed verbatim
- Direct code inspection: `REQUIREMENTS.md` — requirement IDs and descriptions confirmed

### Secondary (MEDIUM confidence)
- `package.json` — Jest 30 version, test command, zero-dep constraint confirmed by devDependencies
- `jest.config.js` — minimal config, no transforms, ESM via `--experimental-vm-modules` confirmed
- Existing test files in `tests/phase1/` — test shape and naming conventions confirmed

### Tertiary (LOW confidence)
- None — all claims verified by direct code inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed by direct code inspection, no new deps needed
- Architecture: HIGH — integration points located by line number in source, patterns established by phase 1 precedent
- Pitfalls: HIGH — identified from direct reading of `extractDependencies` return type and `getLineNumber` 1-based convention

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable codebase, no external deps to track)
