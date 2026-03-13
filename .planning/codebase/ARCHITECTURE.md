# Architecture

**Analysis Date:** 2026-03-08

## Pattern Overview

**Overall:** Pipeline / Sequential Processing

**Key Characteristics:**
- Single-responsibility modules: each file has one clearly scoped job
- Pure functional style throughout — no classes, no stateful singletons
- One-directional data flow: CLI → Analyzer → Generator → File output
- No external dependencies (stdlib only: `fs`, `path`)

## Layers

**CLI Entry Layer:**
- Purpose: Parse command-line arguments and invoke the analyzer
- Location: `bin/cli.js`
- Contains: Argument parsing, flag handling, validation, help/version output
- Depends on: `src/analyzer/index.js`
- Used by: End users and npm scripts

**Orchestration Layer:**
- Purpose: Coordinate the full analysis pipeline for a given project path
- Location: `src/analyzer/index.js`
- Contains: `analyze()` function, `readProjectMeta()` helper, `log()` helper
- Depends on: All three analyzer modules and the generator
- Used by: `bin/cli.js`

**Analysis Layer:**
- Purpose: Inspect the target project's filesystem, language, and folder patterns
- Location: `src/analyzer/`
- Contains:
  - `structureAnalyzer.js` — recursive directory scanning, folder tree builder
  - `languageDetector.js` — detects language/framework from manifest files or file extensions
  - `patternDetector.js` — deep per-folder analysis: classes, methods, imports, architectural patterns
- Depends on: `src/config/ignored.js`, `src/config/patterns.js`
- Used by: `src/analyzer/index.js`

**Configuration Layer:**
- Purpose: Central constants consumed by the analysis layer
- Location: `src/config/`
- Contains:
  - `ignored.js` — `IGNORED_DIRS`, `CODE_EXTENSIONS`, `MAX_DEPTH`, `MIN_CODE_FILES`
  - `patterns.js` — `FOLDER_PATTERNS` (14 architectural roles), `FILE_PATTERNS` (16 file suffixes)
- Depends on: nothing
- Used by: `structureAnalyzer.js`, `patternDetector.js`

**Generation Layer:**
- Purpose: Render collected metadata into Markdown and write output files
- Location: `src/generators/mdGenerator.js`
- Contains: `generateInstructions()`, `buildMarkdown()`, section builders (`buildClassesSection`, `buildFilesSection`, etc.)
- Depends on: `src/analyzer/structureAnalyzer.js` (for `buildFolderTree`)
- Used by: `src/analyzer/index.js`

## Data Flow

**Full Analysis Pipeline:**

1. `bin/cli.js` parses args (`targetPath`, `maxDepth`, `verbose`) and calls `analyze(targetPath, options)`
2. `analyze()` in `src/analyzer/index.js` calls `detectLanguage(projectPath)` → returns `{ lang, framework, runtime }`
3. `analyze()` calls `readProjectMeta(projectPath)` → reads `package.json` / `pom.xml` / `pyproject.toml` → returns `{ name, version }`
4. `analyze()` calls `scanStructure(projectPath, maxDepth)` → returns `FolderInfo[]` (path, name, relativePath, codeFiles, allFiles, subdirNames, depth)
5. For each `FolderInfo`, `analyze()` calls `detectFolderPattern(folder)` → returns enriched `patternInfo` including deep file content analysis, detected architectural patterns, cross-folder dependencies, and "how to add" instructions
6. `generateInstructions(folder, patternInfo, languageInfo, projectMeta)` renders a Markdown string and writes `agent_<folderName>_instructions.md` directly into the analyzed folder using `writeFileSync`

**Output:**
- One `.md` file written per relevant folder found in the target project
- Files are overwritten on re-run (no duplicates)

**State Management:**
- No persistent state. All data flows through function arguments and return values within a single `analyze()` invocation.

## Key Abstractions

**FolderInfo:**
- Purpose: Describes one relevant folder found during scanning
- Shape: `{ path, name, relativePath, codeFiles, allFiles, subdirNames, depth }`
- Created by: `src/analyzer/structureAnalyzer.js` → `scanStructure()`

**LanguageInfo:**
- Purpose: Represents the detected tech stack of the target project
- Shape: `{ lang, framework, runtime }`
- Created by: `src/analyzer/languageDetector.js` → `detectLanguage()`

**PatternInfo:**
- Purpose: Full analysis result for a single folder — role, deep file metadata, detected patterns, dependencies, how-to instructions
- Shape: `{ pattern, role, description, agentHint, fileAnalysis, deepAnalysis, detectedPatterns, dependencies, howToAdd, hasInterfaces, hasImplementations }`
- Created by: `src/analyzer/patternDetector.js` → `detectFolderPattern()`

**FOLDER_PATTERNS:**
- Purpose: Lookup table mapping folder name keywords to architectural roles (controller, service, dao, model, etc.)
- Location: `src/config/patterns.js`
- Used by: `src/analyzer/patternDetector.js`

**FILE_PATTERNS:**
- Purpose: File suffix → role mapping (e.g. `ServiceImpl` → "Service implementation")
- Location: `src/config/patterns.js`
- Used by: `src/analyzer/patternDetector.js`

## Entry Points

**CLI:**
- Location: `bin/cli.js`
- Triggers: `npx skill-me-up [path] [options]` or `npm start`
- Responsibilities: Argument parsing, input validation, invoking `analyze()`, surface errors to stderr

**Programmatic API:**
- Location: `src/analyzer/index.js` (exported as `main` in `package.json`)
- Triggers: `import { analyze } from 'skill-me-up'`
- Responsibilities: Orchestrates the full pipeline, returns `{ generated, skipped }`

## Error Handling

**Strategy:** Defensive — errors inside sub-steps are silently caught and skipped; fatal errors (invalid path) exit with code 1

**Patterns:**
- All file reads in `languageDetector.js`, `patternDetector.js`, `structureAnalyzer.js` are wrapped in `try/catch` with empty catch blocks (silent skip)
- `analyze()` in `index.js` returns early with empty arrays when no folders are found
- `bin/cli.js` catches the top-level promise rejection and writes to `stderr`, then exits with code 1
- `patternDetector.js` records `{ file, error: 'Could not read file' }` entries in deep analysis results rather than throwing

## Cross-Cutting Concerns

**Logging:** Controlled by `verbose` flag. A single `log(verbose, msg)` helper in `src/analyzer/index.js` wraps `process.stdout.write`. Sub-modules do not log independently.

**Validation:** Performed only at CLI boundary (`bin/cli.js`): checks path exists and is a directory. Internal modules assume valid inputs.

**Authentication:** Not applicable — local filesystem tool only.

---

*Architecture analysis: 2026-03-08*
