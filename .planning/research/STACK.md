# Stack Research

**Domain:** Deep static code analysis for polyglot AI-context documentation generators
**Researched:** 2026-03-08
**Confidence:** HIGH (JS/TS analysis), MEDIUM (polyglot heuristics), LOW (non-JS AST options under zero-dep constraint)

---

## Context: What the Current Stack Already Does

`skill-me-up` is a zero-dependency Node.js ESM CLI. The current `patternDetector.js` already does per-language regex-based extraction of class names, method signatures, annotations/decorators, and imports for 8 languages (Java, Kotlin, TS/JS, Python, Go, C#, PHP, Ruby). The bottleneck is not *what* gets extracted — it is *how deeply* it is extracted and *what meaning is derived* from the raw data:

| Gap | Current approach | What is missing |
|-----|-----------------|-----------------|
| Real code examples | None — only metadata is collected | Extract actual representative function bodies as examples |
| Antipatterns | None | Detect long methods, deep nesting, god classes via line/nesting metrics |
| Project conventions | None | Infer naming style, casing, file naming patterns from corpus |
| Cross-folder context | Import lists only | Synthesize dependency graphs into prose explanations |
| JS/TS richness | Regex against source text | Function body content, JSDoc comments, export shapes |

---

## Recommended Stack

### Core Technologies

The zero-dependencies constraint is absolute and correct. `npx skill-me-up` must work instantly with no install cost and no `node_modules`. This means **no npm packages are added as dependencies**. All analysis must use:

1. Node.js stdlib (`fs`, `path`)
2. Enhanced regex + heuristics over raw source text
3. For JS/TS only: Node.js's bundled internal `acorn` if accessible, or purpose-built structural parsing without a library

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js stdlib (`fs`, `path`) | >= 18 (enforced) | File I/O, path manipulation | Already in use — zero cost |
| Enhanced regex heuristics | N/A | Extract examples, detect antipatterns, infer conventions | No dependency; sufficient for 80% of value gain |
| Line/block metrics | N/A | Antipattern detection (method length, nesting depth) | Countable from raw text without AST |
| JSDoc/comment extraction | N/A | Enrich JS/TS output with human-written documentation | Regex on `/** ... */` blocks is reliable |
| Corpus-wide frequency analysis | N/A | Detect naming conventions, casing style, file patterns | Simple counting across all analyzed files |

### The Zero-Dependency AST Question

**For JS/TS files specifically**, AST parsing would give significantly better extraction fidelity than regex — especially for function bodies, parameter types, and nested structures. The options under the zero-dep constraint are:

| Option | Zero dep? | Verdict |
|--------|-----------|---------|
| `acorn` (npm) | No — adds 559 kB dep | Violates constraint. Do not add as dependency. |
| `meriyah` (npm) | No — adds dep | Violates constraint. |
| Node.js internal `acorn` | Technically yes, but private API | Node.js bundles acorn internally (confirmed: Node.js commit updates `acorn` to 8.12.1 within Node itself). However, accessing it via `require('acorn')` from within node_modules fails because it is not exposed as a public API. The internal copy is not importable by user code. **Not viable.** |
| `node:vm` module | Yes — stdlib | Can `vm.compileFunction` + `SyntaxError` detection but does NOT produce an accessible AST. Not viable for extraction. |
| Hand-rolled structural parser | Yes | For targeted extractions (function body boundaries via brace counting, block detection), a purpose-built non-general tokenizer is viable and has been done successfully in tools like Prettier's older parsing stages. High implementation cost, narrow benefit. |

**Recommendation:** Do not add any AST library. The improvement headroom available through better regex and structural heuristics — without touching AST — is large enough to justify the current milestone without violating the zero-dep principle. If AST parsing is deemed necessary in a future milestone, it should be reconsidered as an **opt-in bundled copy** of `acorn` shipped inside `src/vendor/` (inline the minified source, ~100 KB), not as an npm dependency.

### Supporting Techniques (All Zero-Dependency)

| Technique | Purpose | How to Implement | Confidence |
|-----------|---------|-----------------|------------|
| JSDoc extraction | Extract human-written descriptions for JS/TS functions | Regex: `\/\*\*[\s\S]*?\*\/` immediately before a function/class declaration | HIGH |
| Function body extraction | Grab real code examples | Track `{` depth from method signature; capture first N lines of body | HIGH (works for C-family languages) |
| Line count per method | Detect "long method" antipattern | Count lines from method open brace to close brace | HIGH |
| Nesting depth measurement | Detect "deep nesting" antipattern | Count `{` / `(` / `if/for/while` depth; flag > 3 levels | HIGH |
| Export shape analysis (JS/TS) | Know what a module exposes vs. what is private | Count `export` keywords vs total functions | MEDIUM |
| Cross-file naming frequency | Detect project naming conventions | Collect function/class name corpus; detect camelCase vs PascalCase vs snake_case majority | HIGH |
| File suffix patterns | Infer file role conventions (`.service.ts`, `.controller.java`) | Already done; extend to emit as "project convention" section | HIGH |
| JSDoc `@param` / `@returns` | Extract typed parameter documentation | Regex inside JSDoc block capture groups | HIGH |
| Comment density | Signal code quality / documentation practices | `commentLines / totalLines` ratio per file | MEDIUM |
| TODO/FIXME/HACK comment extraction | Surface known debt | Regex: `\/\/\s*(TODO|FIXME|HACK|XXX):?\s*(.+)` | HIGH |
| Duplicate method name detection | Flag potential antipattern (same method name across many files = shared convention or violation) | String frequency map | MEDIUM |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Node.js >= 18 | Runtime | Already enforced via `engines` in `package.json` |
| npm | Publishing | No change needed |
| AST Explorer (astexplorer.net) | Manual validation during development | Use to verify regex extraction matches real AST nodes; browser tool, not a dependency |

---

## Installation

No new packages to install. The zero-dependency constraint is maintained.

```bash
# No new dependencies.
# All techniques implemented in src/analyzer/patternDetector.js
# and src/generators/mdGenerator.js using Node.js stdlib only.
```

---

## Alternatives Considered

| Our Approach | Alternative | Why Not |
|--------------|-------------|---------|
| Enhanced regex + structural heuristics | `acorn` (npm, 559 kB, zero sub-deps) | Violates core zero-dependency constraint; `npx` install size increases |
| Enhanced regex + structural heuristics | `meriyah` (npm, zero sub-deps, fast) | Same constraint violation; meriyah is faster than acorn but still an npm dep |
| Enhanced regex + structural heuristics | `tree-sitter` / `web-tree-sitter` (WASM) | Massive size (WASM binaries per language); adds binary assets; breaks zero-dep spirit |
| Enhanced regex + structural heuristics | TypeScript Compiler API (`typescript` npm) | 60 MB+ npm package; JS/TS only; completely breaks constraint |
| Enhanced regex + structural heuristics | `@babel/parser` (npm) | Adds dep chain; overkill for metadata extraction |
| Inline vendored `acorn` (future option) | Any npm dep | Acceptable if milestone demands AST: ship `src/vendor/acorn.min.js` as part of the package itself, no `node_modules` needed |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any npm dependency for analysis | Breaks zero-dep constraint; adds install cost; violates core design decision | Better heuristics on raw source text |
| `tree-sitter` WASM for polyglot | WASM binary per language (Java, Python, Go, etc.) would add megabytes; complex initialization; slower than regex for metadata extraction | Language-specific regex analyzers (already in use) |
| `espree` | Built on `acorn` (adds dep chain); ESLint-specific extensions irrelevant here | Inline acorn if ever needed |
| TypeScript Compiler API for TS analysis | 60 MB install, TypeScript-only, enormous dep | Regex on `.ts` files handles 90% of needed extractions |
| LLM calls / AI APIs | Explicitly out of scope per PROJECT.md | Pure static heuristics |
| Generic pattern matchers (`semgrep`, `CodeQL`) | Require binary installs; external processes; not embeddable in a zero-dep npm package | Custom regex patterns per language |
| `node:vm` for JS AST access | `vm.compileFunction` compiles but does NOT expose an AST | Regex-based extraction |

---

## Stack Patterns by Variant

**For JS/TS files (highest richness potential):**
- Extract JSDoc blocks with regex; parse `@param`, `@returns`, `@example` tags
- Extract function body first 10 lines as example snippet
- Detect nesting depth by counting brace/keyword depth tokens
- Detect exports vs private functions ratio
- Because: JS/TS are the tool's own language; regex is reliable and the patterns are well-defined

**For Java/Kotlin files (current strongest support):**
- Current regex already covers annotations, class hierarchy, method signatures
- Extend to: extract method body line count (long method detection), constructor parameter count (god class signal), field count per class
- Because: Spring annotation patterns are deterministic; line-count metrics require only brace counting

**For Python files:**
- Extend to: detect function length (lines until next `def` at same indentation), detect `pass`-only methods (abstract stub antipattern), detect global variable usage
- Because: Python indentation makes block detection simpler via line-prefix analysis

**For Go/C#/PHP/Ruby:**
- Focus on improving what is already extracted rather than adding new structural analysis
- Because: diminishing returns; these languages have lower coverage in typical target codebases

**For unknown/generic files:**
- Extract comment blocks, TODO/FIXME lines, and line counts
- Because: even minimal data is better than none for the generated `.md`

---

## Key Extraction Techniques in Detail

### 1. Real Code Example Extraction (All C-family languages)

The technique: when a method/function declaration is found via regex, track the character offset, then scan forward counting `{` increments and `}` decrements. When depth returns to 0, the body is captured. Take the first 8-12 significant lines (skipping blank lines and pure comments).

**Why this works without AST:** The regex already finds the opening `(` of a method. The only addition is a linear scan forward for brace balancing — O(n) on file length, robust for well-formed code, gracefully degrades (returns partial body) for malformed code.

**What to emit:** A fenced code block in the `.md` under a "Representative Example" section for the 1-2 most interesting methods in the folder (heuristic: the method with the most lines and most parameters = most representative of the folder's complexity).

### 2. Antipattern Detection via Metrics

| Antipattern | Detection Heuristic | Threshold |
|-------------|---------------------|-----------|
| Long method | Line count from signature to closing brace | > 40 lines = warning |
| Deep nesting | Max `{` / `if/for/while/try` depth within a method body | > 3 = warning |
| God class | Number of public methods in a single class | > 20 = warning |
| Excessive parameters | Parameter count in method signature (comma count in `(...)`) | > 5 = warning |
| Empty catch block | `catch` followed immediately by `}` or only a comment | Pattern match |
| Magic numbers | Numeric literals in code not in constant declarations | Regex for bare integers > 1 digit not in assignment to UPPER_CASE name |
| TODO debt | `// TODO`, `// FIXME`, `// HACK` comments | Regex; emit as "Known debt" section |

These are all implementable with pure line/character scanning on the already-read file content. No AST required.

### 3. Convention Detection via Corpus Analysis

Run a second pass across all `deepAnalysis` results (after per-file extraction is done) to compute:

- **Naming style majority:** camelCase / PascalCase / snake_case / SCREAMING_SNAKE from collected identifiers. Simple heuristic: if identifier contains `_` → snake; if first char uppercase → PascalCase; else camelCase.
- **File naming pattern:** kebab-case / camelCase / PascalCase inferred from file name corpus.
- **Test file convention:** detect suffix pattern (`.test.ts`, `.spec.java`, `Test.java`) and emit as a convention.
- **Import style:** relative (`../`) vs. absolute vs. package imports majority.

Emit these as a "Conventions in this project" section in every generated `.md`.

---

## Version Compatibility

| Technology | Node.js >= 18 | Notes |
|------------|---------------|-------|
| All stdlib APIs used (`fs`, `path`) | Yes | Stable since Node.js 10+ |
| ES Modules (`import`/`export`) | Yes | Stable since Node.js 12, enforced via `"type": "module"` |
| Regex named capture groups | Yes | Stable since Node.js 10 (V8 6.3+) |
| `String.prototype.matchAll` | Yes | Available since Node.js 12 |
| Optional chaining `?.` | Yes | Available since Node.js 14 |
| `Array.prototype.at()` | Yes | Available since Node.js 16.6 |

---

## Sources

- [acorn GitHub repository](https://github.com/acornjs/acorn) — zero sub-dependencies confirmed, 87M weekly downloads, current version 8.16.0 (MEDIUM confidence — npm page returned 403, version from WebSearch result)
- [Node.js internal acorn update commit](https://github.com/nodejs/node/commit/38aa9d6ea9) — confirms acorn is bundled internally in Node.js but not exposed as public API (HIGH confidence)
- [Espree npm / ESLint docs](https://www.npmjs.com/package/espree) — confirmed builds on acorn, not zero-dep (HIGH confidence)
- [meriyah GitHub](https://github.com/meriyah/meriyah) — zero sub-deps, ESTree-compliant, faster than acorn; version 6.1.4 (MEDIUM confidence — from Libraries.io, not official npm page)
- [web-tree-sitter npm](https://www.npmjs.com/package/web-tree-sitter) — WASM approach confirmed viable but requires per-language WASM binaries (MEDIUM confidence)
- [Embold antipatterns docs](https://docs.embold.io/anti-patterns/) — brain method / god class / deep nesting detection thresholds via metrics (MEDIUM confidence)
- [Static Analysis vs Hidden Anti-Patterns, IN-COM](https://www.in-com.com/blog/static-analysis-vs-hidden-anti-patterns-what-it-sees-and-what-it-misses/) — confirms line/complexity metrics are the standard detection approach (MEDIUM confidence)
- WebSearch results on acorn 8.16.0 size: 559 kB, zero sub-deps (MEDIUM confidence — from search snippet, not direct npm page access)

---

*Stack research for: deep static code analysis in a zero-dependency Node.js polyglot CLI*
*Researched: 2026-03-08*
