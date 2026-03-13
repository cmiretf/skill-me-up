# Coding Conventions

**Analysis Date:** 2026-03-08

## Naming Patterns

**Files:**
- `camelCase.js` for all source files: `structureAnalyzer.js`, `languageDetector.js`, `patternDetector.js`, `mdGenerator.js`
- `camelCase.js` for config files: `patterns.js`, `ignored.js`
- `cli.js` for the CLI entry point in `bin/`
- Output files use snake_case with a prefix: `agent_<foldername>_instructions.md`

**Functions:**
- Exported functions use `camelCase`: `analyze`, `scanStructure`, `detectLanguage`, `detectFolderPattern`, `generateInstructions`, `buildFolderTree`
- Internal (non-exported) functions also use `camelCase`: `readProjectMeta`, `log`, `scan`, `analyzeFileContents`, `analyzeJava`, `analyzeKotlin`, `detectArchitecturalPatterns`, `extractDependencies`, `generateHowToAdd`, `extractPublicMethods`, `extractMatches`, `extractFirst`, `truncate`
- Analyzer functions are prefixed with `analyze` + language: `analyzeJava`, `analyzeKotlin`, `analyzeTypeScriptOrJs`, `analyzePython`, `analyzeGo`, `analyzeCSharp`, `analyzePhp`, `analyzeRuby`, `analyzeGeneric`

**Variables:**
- `camelCase` throughout: `projectPath`, `languageInfo`, `projectMeta`, `codeFiles`, `folderPath`, `nameLower`, `deepAnalysis`, `detectedPatterns`, `allAnnotations`, `uniqueAnnotations`
- Destructured variables preserve original `camelCase` names from object properties

**Constants / Config:**
- `UPPER_SNAKE_CASE` for exported constants: `IGNORED_DIRS`, `CODE_EXTENSIONS`, `MIN_CODE_FILES`, `MAX_DEPTH`, `FOLDER_PATTERNS`, `FILE_PATTERNS`
- `UPPER_SNAKE_CASE` for internal module-level constants: `INDICATORS` in `languageDetector.js`

**Objects / Data Structures:**
- Object properties use `camelCase`: `codeFiles`, `allFiles`, `subdirNames`, `relativePath`, `classType`, `className`, `extendsClass`, `implementsInterfaces`, `classAnnotations`, `fieldAnnotations`, `allAnnotations`
- Pattern objects use `id` as a string identifier in `kebab-case`: `'rest-api'`, `'spring-service'`, `'dao-pattern'`, `'interface-impl'`

## Code Style

**Formatting:**
- No formatter config file detected (no `.prettierrc`, `eslint.config.*`, or `biome.json`)
- Consistent 2-space indentation throughout all files
- Single quotes for strings: `'utf8'`, `'path'`, `'fs'`
- No semicolons at end of statements (ASI style)
- Opening braces on the same line as control structures
- Arrow functions used for array methods: `.filter(e => ...)`, `.map(f => f.name)`, `.sort((a, b) => ...)`

**Linting:**
- No linting config detected; conventions are enforced by consistent author style only

**Module System:**
- ESM (`"type": "module"` in `package.json`) — all files use `import`/`export`, never `require` (except one dynamic `createRequire` for reading `package.json` in `printVersion`)
- Named exports only — no default exports in any source file

## Import Organization

**Order:**
1. Node.js built-in modules (`'fs'`, `'path'`, `'module'`)
2. Internal project modules (`'../config/patterns.js'`, `'./structureAnalyzer.js'`)

**Path style:**
- Always use relative paths with explicit `.js` extension: `'../config/patterns.js'`, `'./structureAnalyzer.js'`
- No path aliases

**Examples from `src/analyzer/index.js`:**
```js
import { scanStructure } from './structureAnalyzer.js'
import { detectLanguage } from './languageDetector.js'
import { detectFolderPattern } from './patternDetector.js'
import { generateInstructions } from '../generators/mdGenerator.js'
import { readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
```

## Error Handling

**Strategy:** Defensive `try/catch` blocks swallow errors silently in I/O operations, allowing the program to continue with fallback values.

**Patterns:**
- Empty `catch` blocks with inline comment `/* skip */` for non-critical file read errors:
  ```js
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return { name: pkg.name || basename(projectPath), version: pkg.version || null }
  } catch { /* skip */ }
  ```
- `catch` on `readdirSync` in recursive scan to handle permission errors gracefully:
  ```js
  try {
    entries = readdirSync(currentPath, { withFileTypes: true })
  } catch {
    return
  }
  ```
- Top-level CLI errors use `console.error` + `process.exit(1)`:
  ```js
  analyze(targetPath, { ... }).catch(err => {
    console.error('\n  Unexpected error:', err.message)
    process.exit(1)
  })
  ```
- User-facing validation errors printed to `console.error` before exiting:
  ```js
  console.error(`\n  Error: "${targetPath}" is not a valid directory.\n`)
  process.exit(1)
  ```

## Logging

**Framework:** Native `process.stdout.write` wrapped in a local `log` helper; no external logging library.

**Pattern:**
```js
function log(verbose, msg) {
  if (verbose) process.stdout.write(msg + '\n')
}
```
- All output is gated behind a `verbose` flag passed from CLI options
- Progress messages use emoji prefixes (`🔍`, `✓`, `✅`) for human readability in terminal output

## Comments

**When to Comment:**
- JSDoc blocks on all exported functions, documenting `@param` types and `@returns`
- Section dividers using `// ─── Section Name ───` decorators for large files, especially `patternDetector.js` and `mdGenerator.js`
- Inline `/* skip */` in empty catch blocks to signal intentional silence
- Comments above non-obvious logic (e.g., `// Skip constructors (name equals class name)`)

**JSDoc style:**
```js
/**
 * Main analysis orchestrator.
 * @param {string} projectPath - Absolute path to the project to analyze
 * @param {Object} options
 * @param {number} [options.maxDepth] - Max folder depth to scan
 * @param {boolean} [options.verbose] - Print progress to stdout
 */
export async function analyze(projectPath, options = {}) {
```

## Function Design

**Size:** Functions are kept focused. Large files (`patternDetector.js`) are organized by language-specific sub-functions, each doing one extraction job.

**Parameters:**
- Options objects with destructuring and defaults: `const { maxDepth, verbose = true } = options`
- Internal recursive functions receive accumulator arrays: `scan(rootPath, currentPath, depth, maxDepth, folders)`

**Return Values:**
- Analysis functions return plain objects with a consistent shape across all language analyzers:
  ```js
  return {
    file,
    language,
    packageName,
    imports,
    classType,
    className,
    extendsClass,
    implementsInterfaces,
    classAnnotations,
    methods,
    fieldAnnotations,
    allAnnotations,
  }
  ```
- Functions that may fail return `null`, empty arrays `[]`, or fallback values rather than throwing

## Module Design

**Exports:**
- Named exports only — all public functions explicitly exported with `export function` or `export const`
- Config modules export `const` data objects: `export const IGNORED_DIRS = new Set([...])`

**No barrel files** — each module imports directly from the specific file it needs

**Module responsibilities are strictly separated:**
- `src/config/` — pure data constants, no logic
- `src/analyzer/` — analysis logic, no output
- `src/generators/` — output/rendering logic, no analysis
- `bin/cli.js` — CLI interface, argument parsing only

---

*Convention analysis: 2026-03-08*
