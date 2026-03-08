# Testing Patterns

**Analysis Date:** 2026-03-08

## Test Framework

**Runner:** Not configured — no test framework is installed or configured.

**Config:** No `jest.config.*`, `vitest.config.*`, `mocha.*`, or any test runner config file detected.

**Assertion Library:** None installed.

**Test Scripts:** No `test` script defined in `package.json`. The `scripts` block contains only:
```json
{
  "start": "node bin/cli.js",
  "dev": "node bin/cli.js ."
}
```

**Run Commands:**
```bash
# No test commands available — none defined
```

## Test File Organization

**Location:** No test files exist in the codebase. Search for `*.test.*` and `*.spec.*` returned zero results.

**Naming:** No established pattern — no test files to observe.

**Structure:**
```
skill-me-up/
├── bin/
│   └── cli.js              # No test file
├── src/
│   ├── analyzer/
│   │   ├── index.js        # No test file
│   │   ├── structureAnalyzer.js   # No test file
│   │   ├── languageDetector.js    # No test file
│   │   └── patternDetector.js     # No test file
│   ├── generators/
│   │   └── mdGenerator.js  # No test file
│   └── config/
│       ├── patterns.js     # No test file
│       └── ignored.js      # No test file
```

## Test Structure

**Suite Organization:** Not established. No test files exist to observe patterns.

**Patterns:**
- No setup/teardown patterns observed
- No assertion patterns observed

## Mocking

**Framework:** None configured.

**Patterns:** Not established — no tests use mocking.

**What would need mocking when tests are added:**
- `fs` module methods (`readdirSync`, `readFileSync`, `existsSync`, `writeFileSync`) — all I/O is done directly in source files without abstraction, so these would need to be mocked at the module level (e.g., with `jest.mock('fs')` or `vi.mock('fs')`)
- `process.stdout.write` — used for all terminal output via the `log` helper in `src/analyzer/index.js`
- `process.argv` — used directly in `bin/cli.js` for CLI argument parsing
- `process.exit` — called on errors in `bin/cli.js`

## Fixtures and Factories

**Test Data:** Not established.

**What fixtures would be needed when tests are added:**
- Sample project directory trees on disk (or in-memory mocks) to feed `scanStructure` in `src/analyzer/structureAnalyzer.js`
- Mock `package.json`, `pom.xml`, `pyproject.toml` content strings for `detectLanguage` in `src/analyzer/languageDetector.js`
- Sample source file content strings (Java, Python, TypeScript, Go, etc.) to test the per-language analyzers in `src/analyzer/patternDetector.js`
- `FolderInfo` objects to test `detectFolderPattern` in `src/analyzer/patternDetector.js`
- `FolderInfo` + `patternInfo` + `languageInfo` + `projectMeta` to test `generateInstructions` in `src/generators/mdGenerator.js`

**Location:** No `__tests__`, `test/`, or `fixtures/` directory exists.

## Coverage

**Requirements:** None enforced — no coverage tool configured, no `nyc`, `c8`, or `vitest --coverage` setup.

**Current coverage:** 0% — no tests exist.

## Test Types

**Unit Tests:** Not present. Core functions that would benefit from unit testing:
- `detectLanguage` (`src/analyzer/languageDetector.js`) — pure function with deterministic outputs based on file content strings
- `detectFolderPattern` (`src/analyzer/patternDetector.js`) — pure function given a `folderInfo` object
- `scanStructure` (`src/analyzer/structureAnalyzer.js`) — requires filesystem mocking
- `buildFolderTree` (`src/analyzer/structureAnalyzer.js`) — requires filesystem mocking
- `generateHowToAdd`, `detectArchitecturalPatterns`, `extractDependencies` (`src/analyzer/patternDetector.js`) — internal functions, testable if exported

**Integration Tests:** Not present. Candidate: run `analyze()` against a fixture project directory and assert the generated markdown files match expected snapshots.

**E2E Tests:** Not present. Candidate: spawn `bin/cli.js` as a child process against a real sample project and assert stdout + output files.

## Recommendations for Adding Tests

The codebase structure is well-suited for testing. Key actions required before writing tests:

1. Install a test runner. Recommended: **Vitest** (compatible with ESM `"type": "module"` without extra config):
   ```bash
   npm install --save-dev vitest
   ```

2. Add a test script to `package.json`:
   ```json
   "scripts": {
     "test": "vitest",
     "test:coverage": "vitest --coverage"
   }
   ```

3. Create a `test/` directory mirroring `src/`:
   ```
   test/
   ├── analyzer/
   │   ├── languageDetector.test.js
   │   ├── structureAnalyzer.test.js
   │   └── patternDetector.test.js
   └── generators/
       └── mdGenerator.test.js
   ```

4. The language-specific analyzers in `src/analyzer/patternDetector.js` are private (not exported). They would either need to be exported for unit testing, or tested indirectly through `detectFolderPattern`.

---

*Testing analysis: 2026-03-08*
