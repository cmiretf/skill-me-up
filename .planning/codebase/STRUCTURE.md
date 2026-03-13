# Codebase Structure

**Analysis Date:** 2026-03-08

## Directory Layout

```
skill-me-up/
├── bin/                   # CLI entry point (executable)
│   └── cli.js             # npx skill-me-up command
├── src/                   # All application source code
│   ├── analyzer/          # Core analysis pipeline modules
│   │   ├── index.js       # Orchestrator — main analyze() function
│   │   ├── languageDetector.js   # Detects lang/framework of target project
│   │   ├── patternDetector.js    # Deep folder & file content analysis
│   │   └── structureAnalyzer.js  # Recursive directory scanning & tree builder
│   ├── config/            # Static constants and lookup tables
│   │   ├── ignored.js     # IGNORED_DIRS, CODE_EXTENSIONS, MAX_DEPTH
│   │   └── patterns.js    # FOLDER_PATTERNS, FILE_PATTERNS
│   └── generators/        # Output rendering
│       └── mdGenerator.js # Builds and writes agent_*_instructions.md files
├── .planning/             # GSD planning workspace (not shipped)
│   └── codebase/          # Codebase analysis documents
├── .claude/               # Claude local settings
├── .gitignore             # Ignores settings.local.json
├── package.json           # Package manifest, bin entry, engine requirements
└── README.md              # User-facing documentation
```

## Directory Purposes

**`bin/`:**
- Purpose: Executable CLI entry point registered via `package.json` `"bin"` field
- Contains: One file — `cli.js` — handles all arg parsing and invokes `analyze()`
- Key files: `bin/cli.js`

**`src/analyzer/`:**
- Purpose: The core analysis pipeline — scanning, detection, deep inspection
- Contains: Four `.js` modules, each with a single exported function
- Key files: `src/analyzer/index.js` (orchestrator), `src/analyzer/patternDetector.js` (largest/most complex at ~1000 lines)

**`src/config/`:**
- Purpose: Shared constants — no logic, only exported `Set`s, arrays, and primitives
- Contains: Two configuration files
- Key files: `src/config/ignored.js`, `src/config/patterns.js`

**`src/generators/`:**
- Purpose: Markdown rendering and file writing
- Contains: One file — `mdGenerator.js`
- Key files: `src/generators/mdGenerator.js`

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents for planning and execution context
- Generated: Yes (by GSD map-codebase)
- Committed: No (not in `.gitignore` but not part of shipped `"files"` array in package.json)

## Key File Locations

**Entry Points:**
- `bin/cli.js`: CLI command — parses args, validates path, calls `analyze()`
- `src/analyzer/index.js`: Programmatic API entry point (`export async function analyze`)

**Configuration:**
- `package.json`: Package metadata, `"bin"`, `"main"`, `"files"`, `"engines"` (Node >= 18)
- `src/config/ignored.js`: Directory ignore list and code extension whitelist
- `src/config/patterns.js`: Architectural role definitions for folder and file pattern matching

**Core Logic:**
- `src/analyzer/languageDetector.js`: Project language/framework detection via manifest file inspection
- `src/analyzer/structureAnalyzer.js`: Directory traversal returning `FolderInfo[]`; also exports `buildFolderTree()`
- `src/analyzer/patternDetector.js`: Deep per-folder analysis — reads file contents, extracts classes/methods/imports, detects patterns
- `src/generators/mdGenerator.js`: Assembles Markdown sections and writes output files with `writeFileSync`

**Testing:**
- Not applicable — no test files or test framework present

## Naming Conventions

**Files:**
- camelCase for all source files: `languageDetector.js`, `patternDetector.js`, `structureAnalyzer.js`, `mdGenerator.js`
- CLI executable uses lowercase: `cli.js`
- Config files use lowercase: `ignored.js`, `patterns.js`

**Exported Functions:**
- camelCase verbs: `analyze`, `detectLanguage`, `detectFolderPattern`, `scanStructure`, `buildFolderTree`, `generateInstructions`

**Generated Output Files:**
- Snake_case with prefix: `agent_<foldername>_instructions.md` — written into analyzed target project folders

**Constants:**
- SCREAMING_SNAKE_CASE for exported config constants: `IGNORED_DIRS`, `CODE_EXTENSIONS`, `MAX_DEPTH`, `FOLDER_PATTERNS`, `FILE_PATTERNS`

**Directories:**
- Lowercase, singular or plural noun: `analyzer`, `config`, `generators`

## Where to Add New Code

**New language/framework detector:**
- Add a new entry object to the `INDICATORS` array in `src/analyzer/languageDetector.js`
- Shape: `{ file: 'manifest-filename', detect: (content, projectPath) => ({ lang, framework, runtime }) }`

**New folder pattern / architectural role:**
- Add an entry to `FOLDER_PATTERNS` in `src/config/patterns.js`
- Shape: `{ id, keywords: string[], role, description, agentHint }`

**New file suffix pattern:**
- Add an entry to `FILE_PATTERNS` in `src/config/patterns.js`
- Shape: `{ suffix, role, note }`

**New ignored directory or code extension:**
- Edit `IGNORED_DIRS` or `CODE_EXTENSIONS` sets in `src/config/ignored.js`

**New Markdown section in generated output:**
- Add a section builder function in `src/generators/mdGenerator.js`
- Call it within `buildMarkdown()` where appropriate in the sections array

**New analysis capability (e.g. a new language parser):**
- Add a private function inside `src/analyzer/patternDetector.js`
- Wire it into `analyzeFileContents()` via the `switch(ext)` block

**New top-level CLI flag:**
- Parse it in `bin/cli.js` and pass through `options` to `analyze()` in `src/analyzer/index.js`

## Special Directories

**`bin/`:**
- Purpose: Executable entry point registered with npm
- Generated: No
- Committed: Yes — included in `"files"` array in `package.json`

**`src/`:**
- Purpose: All application source
- Generated: No
- Committed: Yes — included in `"files"` array in `package.json`

**`.planning/`:**
- Purpose: GSD planning workspace
- Generated: Yes (partially)
- Committed: Yes (directory present in repo, contents not explicitly gitignored)

---

*Structure analysis: 2026-03-08*
