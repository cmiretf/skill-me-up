# Phase 3: Antipattern Detection - Research

**Researched:** 2026-03-13
**Domain:** Static code analysis via regex + brace-depth scanning (zero-dependency Node.js)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Frequency threshold**
- Folder-level gate: an antipattern must appear in 3+ distinct files within the same folder before it surfaces in that folder's `.md` — no cross-folder accumulation needed
- Unit: 1 file = 1 occurrence toward the threshold (a file with 5 long methods still counts as 1 file)
- Threshold hardcoded at 3 — not configurable via CLI flag
- Output: show file count only — `"Long methods (>40 lines): found in 4 files"` — no separate instance count

**Language coverage rules**
- Empty catch blocks: adapt per language idiom
  - Java / JS / TS / Kotlin: detect empty `catch (...) {}` blocks
  - Python: detect empty `except:` or `except ...:` blocks (no statements, or only `pass`)
  - Go: silently skip (Go error handling has no catch equivalent)
- God class (>20 public methods): apply only to languages with class syntax
  - Java, Kotlin, TypeScript, JS (class syntax), Python — count public/exported methods per class
  - Go and plain JS modules (no class keyword): skip this rule entirely
- Long methods (>40 lines): apply to all languages — count lines from function/method start to closing brace/indent-return
- Nesting depth (>3 levels): use brace depth only (count `{` depth from function start) — existing brace-depth scanning approach; Python uses same brace-depth heuristic (consistent with zero-dependency constraint, no indent counting)

**Section placement and labeling**
- Placement: after `## Usage Examples`, before `## Structure` — positive examples first, then warnings
- Disclaimer format: blockquote preamble at the top of the section content:
  ```
  > Heuristically detected — review before treating as authoritative.
  ```
- Section header: `## Don't Do` (no annotation in the header itself — disclaimer is in the blockquote)
- Silent omission: if no antipattern clears the 3-file threshold, omit the section entirely — no empty header, consistent with conventions and examples behavior

### Claude's Discretion
- Exact regex patterns for each language's empty catch/except detection
- Internal data structure for accumulating per-folder file counts
- Name and signature of `detectAntipatterns()` function
- How to integrate antipatterns into `PatternInfo` shape (new field vs inline computation)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENRICH-04 | The analyzer detects antipatterns with confidence threshold: methods >40 lines, nesting >3 levels, god class (>20 public methods), empty catch blocks | detectAntipatterns() function runs over deepAnalysis after analyzeFileContents(); per-file flags fed into folder-level frequency counter |
| OUTPUT-03 | Generated `.md` files include a `## Don't Do` section with detected antipatterns and their frequency | buildDontDoSection() renders the antipatterns array; inserted into buildMarkdown() sections array after Usage Examples |
</phase_requirements>

---

## Summary

Phase 3 adds heuristic antipattern detection over the already-available `deepAnalysis` array (the result of `analyzeFileContents()`). Four rules are evaluated per file: long methods (>40 lines), deep nesting (>3 brace-levels), god class (>20 public methods), and empty catch blocks. Results are accumulated at the folder level; a rule only appears in the output when 3 or more distinct files in the folder trigger it.

All detection is implemented as pure regex + brace-depth scanning — consistent with the zero-dependency constraint already established in Phases 1 and 2. The `extractMethodBody()` / brace-depth logic in `patternDetector.js` is the direct template for both the long-method line count and the nesting-depth measurement. No new npm packages are required.

The integration surface is narrow: one new function `detectAntipatterns(deepAnalysis, codeFiles)` added to `patternDetector.js`, one new `antipatterns` field on the `PatternInfo` return object of `detectFolderPattern()`, and one new `buildDontDoSection(antipatterns)` function in `mdGenerator.js` following the exact same pattern as `buildConventionsSection` and `buildUsageExamplesSection`.

**Primary recommendation:** Model `detectAntipatterns()` directly after `detectConventions()` — same inputs (`deepAnalysis`, `codeFiles`), same output contract (return value or `null`), same "silent omission when threshold not met" behavior.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins only | >=18 | regex, string ops, file I/O | Zero-dependency constraint is absolute for this project |

### Supporting
| Technique | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| Brace-depth scanning | existing (patternDetector.js) | Count nesting depth inside method bodies | Already battle-tested by `extractMethodBody()` in ENRICH-03 |
| Named regex groups | ES2018+ | Readable capture of catch/except patterns | Avoids positional confusion in multi-language catch patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex + brace-depth | acorn / babel-parser AST | AST is exact but violates zero-dep constraint; deferred to ADVANCED-02 |
| Inline counting per file | Pre-built static analysis library (eslint API) | ESLint requires Node module resolution, introduces deps, violates constraint |

**Installation:**
No new packages. All detection via existing Node.js primitives.

---

## Architecture Patterns

### Recommended Project Structure

No new directories. New code lives in existing files:

```
src/
├── analyzer/
│   └── patternDetector.js   # + detectAntipatterns() + test export
└── generators/
    └── mdGenerator.js       # + buildDontDoSection() + test export
tests/
└── phase3/                  # New — antipatterns.test.js, integration.test.js
```

### Pattern 1: Per-File Flag Accumulation

**What:** `detectAntipatterns()` iterates over `deepAnalysis` entries. For each file, it sets boolean flags (longMethod, deepNesting, godClass, emptyCatch) based on per-rule scans. It accumulates a `Map<ruleId, Set<filename>>` — file-level deduplication is built in because a filename is added to the Set at most once per rule regardless of how many violations exist in that file.

**When to use:** Whenever threshold logic is file-count-based and per-instance count is explicitly unwanted (as per locked decision: show file count only).

**Example:**
```javascript
// Conceptual shape — exact signatures are Claude's discretion
function detectAntipatterns(deepAnalysis) {
  // Map<ruleId, Set<filename>> for threshold counting
  const fileSets = {
    longMethod:  new Set(),
    deepNesting: new Set(),
    godClass:    new Set(),
    emptyCatch:  new Set(),
  }

  for (const fa of deepAnalysis) {
    if (fa.error) continue
    const content = fa._content  // cached by the function, not stored on fa
    if (!content) continue

    if (hasLongMethod(content, fa.language))  fileSets.longMethod.add(fa.file)
    if (hasDeepNesting(content, fa.language)) fileSets.deepNesting.add(fa.file)
    if (isGodClass(fa))                       fileSets.godClass.add(fa.file)
    if (hasEmptyCatch(content, fa.language))  fileSets.emptyCatch.add(fa.file)
  }

  const THRESHOLD = 3
  const results = []
  if (fileSets.longMethod.size  >= THRESHOLD) results.push({ id: 'longMethod',  label: 'Long methods (>40 lines)',     count: fileSets.longMethod.size  })
  if (fileSets.deepNesting.size >= THRESHOLD) results.push({ id: 'deepNesting', label: 'Deep nesting (>3 levels)',      count: fileSets.deepNesting.size })
  if (fileSets.godClass.size    >= THRESHOLD) results.push({ id: 'godClass',    label: 'God class (>20 public methods)', count: fileSets.godClass.size    })
  if (fileSets.emptyCatch.size  >= THRESHOLD) results.push({ id: 'emptyCatch',  label: 'Empty catch blocks',            count: fileSets.emptyCatch.size  })

  return results.length > 0 ? results : null
}
```

### Pattern 2: File Content Access Strategy

**What:** `deepAnalysis` entries do NOT currently cache `content` — each entry only stores extracted metadata (methods, className, imports, etc.). For the three rules that need content (longMethod, deepNesting, emptyCatch), the content must be read from disk. `detectAntipatterns()` must receive `folderPath` (matching how `extractExamples` does it) or read content inline via `readFileSync(join(folderPath, fa.file))`.

**When to use:** Whenever a new analyzer function needs raw file content. The established pattern from `extractExamples()` is: accept `folderPath` as a parameter, call `readFileSync` defensively inside a try/catch, skip the file on error.

**Established signature model:**
```javascript
// extractExamples(deepAnalysis, folderPath, folderRelativePath) — Phase 2 precedent
// detectAntipatterns(deepAnalysis, folderPath) — Phase 3 proposed
export function detectAntipatterns(deepAnalysis, folderPath) { ... }
```

The god class rule does NOT need content — it uses `fa.methods.length` from the already-extracted metadata. This is a nice optimization.

### Pattern 3: Section Builder (buildDontDoSection)

**What:** Same contract as `buildConventionsSection` and `buildUsageExamplesSection`: accepts data, returns a rendered string (including the `## Don't Do` header) or `null` when data is absent. Caller in `buildMarkdown()` checks for truthiness before pushing to the `sections` array.

**When to use:** Every new output section follows this pattern — build function is responsible for the header line, so `buildMarkdown()` only needs a single truthiness check.

**Placement in `buildMarkdown()` sections array:**
After the `## Usage Examples` block (line ~67 in current `mdGenerator.js`), before the `## Structure` block (the `buildFolderTree` call at line ~70). This aligns with the locked decision: positive examples first, then warnings.

```javascript
// In buildMarkdown() sections array insertion point:
// [existing] Usage Examples block  (~line 60-67)
// [NEW]      Don't Do block
if (antipatterns) {
  const dontDoContent = buildDontDoSection(antipatterns)
  if (dontDoContent) {
    sections.push(dontDoContent)
    sections.push('')
  }
}
// [existing] Structure block (~line 70)
```

### Anti-Patterns to Avoid

- **Reading file content twice:** `detectAntipatterns()` already reads each file once for longMethod/deepNesting/emptyCatch. Do not read again — reuse the `content` variable across all three rules within the same file loop iteration.
- **Counting instances, not files:** The threshold is file-count-based. A `counter++` approach would count method occurrences, not file occurrences. Always use `Set.add(fa.file)` and `Set.size` for threshold comparison.
- **Applying god class rule to Go/plain-JS modules:** The locked decision explicitly skips this rule for Go and for JS files without the `class` keyword. Check `fa.classType !== 'module'` and `fa.classType !== 'script'` and `fa.language !== 'Go'` before evaluating god class.
- **Empty `catch` block false positives:** Comments inside catch blocks (`catch (e) { // TODO }`) must NOT be counted as empty. The regex must require that the catch body contain zero non-whitespace, non-comment characters. A safe approach: after stripping single-line comments (`//.*`), check if the catch body is empty or contains only `pass` (Python).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Brace-depth walking | New walker from scratch | Reuse `extractMethodBody()` logic already in patternDetector.js | The char-by-char `{`/`}` counter with `depth` variable is already correct and tested |
| Long-method line count | Line-by-line parser | Brace-depth walk that counts lines from opening `{` to closing `}` | Same mechanism as nesting depth, just counting lines instead of max depth |
| Public method count for god class | Re-parsing the file | `fa.methods.length` — already extracted by all per-language analyzers | Phase 1 already extracts all public methods; god class is a threshold check on existing data |

**Key insight:** Three of the four rules (longMethod, deepNesting, godClass) are direct consumers of work already done in Phases 1-2. Only emptyCatch requires genuinely new pattern matching.

---

## Common Pitfalls

### Pitfall 1: God Class False Positives on Non-Class Files

**What goes wrong:** JS/TS utility modules export many functions that are not class methods. Counting exported functions as "methods" would flag a utilities file with 25 helper functions as a god class — wrong signal.

**Why it happens:** `analyzeTypeScriptOrJs()` stores exported functions in `fa.methods` with `isPublic: true`, and `fa.classType` is `'module'` or `'script'` — not `'class'`. If god class detection just checks `fa.methods.length > 20`, it catches utility modules.

**How to avoid:** Only apply the god class rule when `fa.classType` is one of `'class'`, `'abstract class'`, `'interface'` (or equivalent per language). For JS/TS specifically: check `content.includes('class ')` or check `fa.classType === 'class' || fa.classType === 'abstract class'`.

**Warning signs:** Test fixture with a flat JS module exporting 25 functions triggers the god class rule — it should not.

### Pitfall 2: Empty Catch With Comment Body

**What goes wrong:** `catch (e) { // TODO: handle this }` is detected as empty by a naive regex that checks for `catch\s*\([^)]*\)\s*\{\s*\}`.

**Why it happens:** The `\s*` between braces only matches whitespace, not comment text. But developers do write comment-only catch bodies.

**How to avoid:** After extracting the catch body, strip single-line comments before checking for emptiness. A reliable pattern:
```javascript
// Strip // comments from catch body before checking emptiness
const bodyStripped = catchBody.replace(/\/\/[^\n]*/g, '').trim()
const isEmpty = bodyStripped === '' || bodyStripped === 'pass'
```

**Warning signs:** If your test fixture has `catch (e) { // TODO }` and your test expects it NOT to be flagged — this is the right check.

### Pitfall 3: Long Method Count Underestimates Due to Arrow Functions

**What goes wrong:** Arrow functions assigned to `const` (e.g., `const fn = (x) => { ... }`) use the same brace-depth walker, but their signature line is before the opening `{`. If the walker starts counting from the `const` assignment line, it may include non-body lines.

**Why it happens:** `extractMethodBody()` already handles this case correctly (it tracks `bodyStarted` only after `foundBrace = true`). Reusing that exact logic avoids this pitfall.

**How to avoid:** Do not write a new line counter from scratch. Extract the same brace-depth + `bodyStarted` flag logic from `extractMethodBody()` — or call `extractMethodBody()` and check `snippet.length > 40`.

**Warning signs:** Long arrow functions in JS/TS consistently get an off-by-N line count vs. what a developer would count manually.

### Pitfall 4: Python Nesting Depth With Brace Heuristic

**What goes wrong:** Python uses indentation, not braces. A brace-depth scan on Python source finds zero braces and incorrectly reports 0 nesting depth for every Python file.

**Why it happens:** The locked decision explicitly accepts this: "Python uses same brace-depth heuristic (consistent with zero-dependency constraint, no indent counting)." This means deep nesting in Python functions will NOT be detected. This is intentional, not a bug.

**How to avoid:** Document the known limitation in code comments and in the output disclaimer. Do NOT add indent-based nesting detection for Python — that would violate the zero-dependency constraint and contradict the locked decision.

**Warning signs:** No Python files ever trigger the deep nesting rule regardless of actual nesting level — this is expected behavior.

### Pitfall 5: `detectFolderPattern()` return object not updated

**What goes wrong:** `detectAntipatterns()` is called in `detectFolderPattern()` but the result is not added to the return object. `buildMarkdown()` destructures `patternInfo` and the `antipatterns` field is `undefined`.

**Why it happens:** Easy to forget the return object update (lines 40-54 of current `patternDetector.js`) and the `buildMarkdown()` destructuring (line ~24-29 of current `mdGenerator.js`).

**How to avoid:** Treat the integration as three touch points: (1) call `detectAntipatterns()` in `detectFolderPattern()`, (2) add `antipatterns` to the return object, (3) destructure `antipatterns` in `buildMarkdown()`.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Brace-Depth Walker (extractMethodBody — direct reuse template)
```javascript
// Source: src/analyzer/patternDetector.js lines 1268-1303
function extractMethodBody(content, startLineNumber, maxLines = 15) {
  const lines = content.split('\n')
  const startIdx = startLineNumber - 1
  const slice = []
  let depth = 0
  let bodyStarted = false
  let foundBrace = false

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    slice.push(line)

    for (const ch of line) {
      if (ch === '{') { depth++; foundBrace = true; bodyStarted = true }
      if (ch === '}') { depth-- }
    }

    if (slice.length === 1 && !foundBrace) {
      return dedent([line]) // expression-body arrow
    }

    if (bodyStarted && depth === 0) break
    if (slice.length >= maxLines) {
      if (depth > 0) slice.push('  // ... (truncated)')
      break
    }
  }

  return dedent(slice)
}
```

**For long-method detection:** Same loop, but instead of returning early at `maxLines`, check `if (slice.length > 40)` before `bodyStarted && depth === 0`. If the body closes at > 40 lines, flag the file.

**For nesting-depth detection:** Track `maxDepth = Math.max(maxDepth, depth)` inside the char loop. After the body closes, check `if (maxDepth > 3)`.

### Existing Section Builder Pattern (direct template for buildDontDoSection)
```javascript
// Source: src/generators/mdGenerator.js lines 337-382
function buildConventionsSection(conventions) {
  if (!conventions || Object.keys(conventions).length === 0) return null
  const lines = []
  // ... push lines ...
  return lines.length > 0 ? lines.join('\n') : null
}

// Export pattern at bottom:
export { buildConventionsSection, buildUsageExamplesSection }
```

**For buildDontDoSection:** Same pattern. Return `null` when `antipatterns` is null or empty array. Add `buildDontDoSection` to the test export line.

### Existing Dynamic Import Test Pattern (direct template for W0 test stubs)
```javascript
// Source: tests/phase2/usageExamples.test.js lines 13-24
let detectAntipatterns
let buildDontDoSection

beforeAll(async () => {
  const patternDetector = await import('../../src/analyzer/patternDetector.js')
  detectAntipatterns = patternDetector.detectAntipatterns // undefined until implemented

  const mdGenerator = await import('../../src/generators/mdGenerator.js')
  buildDontDoSection = mdGenerator.buildDontDoSection // undefined until implemented
})
```

### Empty Catch Regex Patterns (per language)
```javascript
// Java / JS / TS / Kotlin: empty catch body (whitespace only, no comments)
const EMPTY_CATCH_BRACE = /catch\s*\([^)]*\)\s*\{\s*\}/

// Python: empty except (no body, or only pass)
// After stripping comments, body is '' or 'pass'
const EMPTY_EXCEPT = /except[^:]*:\s*\n(\s*(?:pass\s*)?\n|\s*$)/m

// Per-language dispatch:
function hasEmptyCatch(content, language) {
  if (language === 'Go') return false  // skip Go silently
  if (language === 'Python') {
    // Strip inline comments first, then check for empty except
    const stripped = content.replace(/#[^\n]*/g, '')
    return EMPTY_EXCEPT.test(stripped)
  }
  // Java, JS, TS, Kotlin, C#, PHP, Ruby
  const stripped = content.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  return EMPTY_CATCH_BRACE.test(stripped)
}
```

### God Class Check (uses already-extracted metadata)
```javascript
// No file content needed — fa.methods is already populated by per-language analyzers
function isGodClass(fa) {
  const noClassLanguages = ['Go']
  const noClassTypes = ['module', 'script', 'package']
  if (noClassLanguages.includes(fa.language)) return false
  if (noClassTypes.includes(fa.classType)) return false
  return (fa.methods || []).length > 20
}
```

### buildDontDoSection Output Format
```javascript
function buildDontDoSection(antipatterns) {
  if (!antipatterns || antipatterns.length === 0) return null
  const lines = []
  lines.push('## Don\'t Do')
  lines.push('')
  lines.push('> Heuristically detected — review before treating as authoritative.')
  lines.push('')
  for (const ap of antipatterns) {
    lines.push(`- **${ap.label}**: found in ${ap.count} file${ap.count === 1 ? '' : 's'}`)
  }
  return lines.join('\n')
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No antipattern detection | Heuristic regex + brace-depth, folder-level frequency threshold | Phase 3 | Agents reading the `.md` get actionable warnings without false single-occurrence noise |
| AST-based analysis (planned) | Deferred to ADVANCED-02 | Roadmap decision | Allows zero-dep shipping now; exact analysis later via vendored acorn |

**Deprecated/outdated:**
- None — this is net-new capability.

---

## Open Questions

1. **Content caching across analyzer calls**
   - What we know: `deepAnalysis` entries currently store only extracted metadata, not raw content. Both `extractExamples()` and the new `detectAntipatterns()` must read files from disk separately.
   - What's unclear: Whether reading files twice (once for examples, once for antipatterns) is a performance concern on large folders.
   - Recommendation: Accept the double-read for now (consistent with existing pattern). Phase 4 can introduce content caching if profiling shows a real problem.

2. **Python nesting depth is always 0 under brace heuristic**
   - What we know: Locked decision explicitly accepts this limitation.
   - What's unclear: Whether to emit a comment in the disclaimer noting Python nesting cannot be detected.
   - Recommendation: Leave the disclaimer generic (`> Heuristically detected — review before treating as authoritative.`). Do not add language-specific caveats in the output — that increases complexity for little value.

3. **`fa.methods` for god class: JS/TS class methods vs. exported functions**
   - What we know: `analyzeTypeScriptOrJs()` stores exported functions in `fa.methods` with `isPublic: true`, and `fa.classType` is `'module'` or `'script'` for non-class files.
   - What's unclear: A TS file with a `class` AND exported standalone functions — `fa.methods` only contains the standalone functions (the class methods are NOT extracted by `analyzeTypeScriptOrJs()`).
   - Recommendation: For god class, use `fa.methods.length` only when `fa.classType === 'class'` or `'abstract class'`. This is conservative and avoids false positives. True class-method extraction for TS is deferred to v2 language improvements.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest ^30.2.0 |
| Config file | jest.config.js |
| Quick run command | `node --experimental-vm-modules node_modules/.bin/jest tests/phase3/ --testPathPatterns tests/phase3` |
| Full suite command | `node --experimental-vm-modules node_modules/.bin/jest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENRICH-04 | `detectAntipatterns()` returns antipattern array when 3+ files trigger a rule | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase3/antipatterns.test.js -x` | ❌ Wave 0 |
| ENRICH-04 | `detectAntipatterns()` returns null when fewer than 3 files trigger any rule | unit | same | ❌ Wave 0 |
| ENRICH-04 | God class rule skipped for Go and plain JS modules | unit | same | ❌ Wave 0 |
| ENRICH-04 | Empty catch rule: Go files silently skipped | unit | same | ❌ Wave 0 |
| ENRICH-04 | Empty catch rule: comment-only catch body NOT flagged | unit | same | ❌ Wave 0 |
| OUTPUT-03 | Generated `.md` includes `## Don't Do` section when antipatterns present | integration | `node --experimental-vm-modules node_modules/.bin/jest tests/phase3/integration.test.js -x` | ❌ Wave 0 |
| OUTPUT-03 | Section omitted entirely when no rule clears threshold | integration | same | ❌ Wave 0 |
| OUTPUT-03 | Section contains blockquote disclaimer | integration | same | ❌ Wave 0 |
| OUTPUT-03 | Section placed after `## Usage Examples`, before `## Structure` | integration | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --experimental-vm-modules node_modules/.bin/jest tests/phase3/ --testPathPatterns tests/phase3`
- **Per wave merge:** `node --experimental-vm-modules node_modules/.bin/jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase3/antipatterns.test.js` — covers ENRICH-04 unit tests (detectAntipatterns, per-rule logic, threshold, language skips)
- [ ] `tests/phase3/integration.test.js` — covers OUTPUT-03 (full pipeline: fixture files → generateInstructions → assert ## Don't Do section)

*(No new framework install needed — Jest already present and configured)*

---

## Sources

### Primary (HIGH confidence)
- Direct read of `src/analyzer/patternDetector.js` (full file, 1354 lines) — existing analyzer architecture, brace-depth walker, extractMethodBody, extractExamples, detectConventions, all per-language analyzers
- Direct read of `src/generators/mdGenerator.js` (393 lines) — section builder pattern, buildMarkdown sections array, buildConventionsSection, buildUsageExamplesSection, LANG_FENCE map
- Direct read of `.planning/phases/03-antipattern-detection/03-CONTEXT.md` — locked decisions, language coverage rules, section placement, frequency threshold
- Direct read of `tests/phase2/usageExamples.test.js` — dynamic import pattern for not-yet-exported functions
- Direct read of `tests/phase2/integration.test.js` — full pipeline integration test pattern

### Secondary (MEDIUM confidence)
- `package.json` — confirmed Jest ^30.2.0, ESM (type:module), `--experimental-vm-modules` test command
- `.planning/STATE.md` — confirmed [02-W0] ESM dynamic import pattern decision, Phase 2 complete

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero-dep constraint is absolute; all tools are in-codebase already
- Architecture: HIGH — integration points identified by direct code inspection, not assumptions
- Pitfalls: HIGH — derived from reading actual analyzer code and Phase 2 test patterns
- Rule implementation: HIGH — regex patterns derived from locked language-coverage rules; brace-depth logic is direct copy of existing tested code

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (stable internal codebase; no external deps to rotate)
