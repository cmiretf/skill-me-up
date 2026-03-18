---
phase: 04-output-quality
plan: W0
type: execute
wave: 0
depends_on: []
files_modified:
  - tests/phase4/mdGenerator.test.js
  - tests/phase4/snapshot.test.js
  - tests/fixtures/js-project/utils/helpers.js
  - tests/fixtures/py-project/utils/helpers.py
autonomous: true
requirements: [QUALITY-01, QUALITY-02, QUALITY-03]

must_haves:
  truths:
    - "RED test stubs exist for truncation, timestamp, and snapshot behaviors"
    - "Fixture projects exist on disk with enough content to trigger analysis"
  artifacts:
    - path: "tests/phase4/mdGenerator.test.js"
      provides: "RED stubs for QUALITY-01 and QUALITY-02"
    - path: "tests/phase4/snapshot.test.js"
      provides: "RED stub for QUALITY-03"
    - path: "tests/fixtures/js-project/utils/helpers.js"
      provides: "Synthetic JS fixture with camelCase functions"
    - path: "tests/fixtures/py-project/utils/helpers.py"
      provides: "Synthetic Python fixture with snake_case functions"
  key_links: []
---

<objective>
Create RED test stubs for all Phase 4 behaviors and synthetic fixture projects for snapshot testing.

Purpose: Establish the test contract before implementation (phases 1-3 pattern). Fixture projects must exist before snapshot tests can run.
Output: 2 test files with RED stubs, 2 synthetic fixture source files.
</objective>

<execution_context>
@/Users/carlosmiret/.claude/get-shit-done/workflows/execute-plan.md
@/Users/carlosmiret/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-output-quality/04-CONTEXT.md
@.planning/phases/04-output-quality/04-RESEARCH.md
@.planning/phases/04-output-quality/04-VALIDATION.md

<interfaces>
<!-- Key exports the executor needs from existing code -->

From src/generators/mdGenerator.js:
```javascript
export function generateInstructions(folderInfo, patternInfo, languageInfo, projectMeta) { ... }
// buildMarkdown is currently private — NOT yet exported (Plan 01 will export it)
export { buildConventionsSection, buildUsageExamplesSection, buildDontDoSection }
```

From src/analyzer/patternDetector.js:
```javascript
export function detectFolderPattern(folderInfo) { ... }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create RED test stubs for QUALITY-01 and QUALITY-02</name>
  <files>tests/phase4/mdGenerator.test.js</files>
  <action>
Create `tests/phase4/mdGenerator.test.js` with dynamic import pattern (same as phases 2-3) for `buildMarkdown` which is not yet exported.

Use `beforeAll` with dynamic `import()`:
```javascript
let buildMarkdown
beforeAll(async () => {
  const m = await import('../../src/generators/mdGenerator.js')
  buildMarkdown = m.buildMarkdown // undefined until Plan 01 exports it
})
```

Guard clause pattern per test: `if (buildMarkdown === undefined) { expect(buildMarkdown).toBeDefined(); return }`

Create these describe/test blocks:

**describe('QUALITY-01: 300-line truncation')**
1. `test('QUALITY-01-1: buildMarkdown output does not exceed 300 lines for normal input')` — Create a folderInfo with ~10 codeFiles, minimal patternInfo (role, description, agentHint, fileAnalysis as empty array, no conventions/examples/antipatterns), call buildMarkdown, assert `output.split('\n').length <= 300`.
2. `test('QUALITY-01-2: truncation note appears when output exceeds 300 lines')` — Create bloated patternInfo with a very long description string (400+ lines of text joined by newlines), call buildMarkdown, assert output contains `'Output truncated at 300 lines'`. Assert the line count is exactly 301 (300 content + 1 truncation note).

**describe('QUALITY-02: generation timestamp')**
3. `test('QUALITY-02-1: output starts with generated timestamp comment')` — Call buildMarkdown with minimal valid args, assert first line matches `/^<!-- generated: \d{4}-\d{2}-\d{2} -->$/`.
4. `test('QUALITY-02-2: testDate in projectMeta overrides new Date()')` — Call buildMarkdown with `projectMeta: { name: 'test', testDate: '2026-01-01' }`, assert first line is exactly `'<!-- generated: 2026-01-01 -->'`.

For all tests, use minimal valid arguments:
- folderInfo: `{ name: 'test', relativePath: 'test', codeFiles: ['a.js'], subdirNames: [], depth: 1, path: '/tmp/test' }`
- patternInfo: `{ role: 'utility', description: 'Test folder', agentHint: '', fileAnalysis: [], hasInterfaces: false, hasImplementations: false, deepAnalysis: {}, detectedPatterns: [], dependencies: [], howToAdd: '', conventions: null, examples: null, antipatterns: null }`
- languageInfo: `{ lang: 'JavaScript', framework: 'None' }`
- projectMeta: `{ name: 'test-project' }`

All 4 tests should be RED (fail with "expect(received).toBeDefined()" because buildMarkdown is not exported yet).
  </action>
  <verify>
    <automated>cd /Users/carlosmiret/Desktop/skill-me-up && node --experimental-vm-modules node_modules/.bin/jest --testPathPatterns "phase4/mdGenerator" 2>&1 | tail -20</automated>
  </verify>
  <done>4 test stubs exist, all RED (failing because buildMarkdown is undefined). No SyntaxErrors — dynamic import pattern prevents link-time crashes.</done>
</task>

<task type="auto">
  <name>Task 2: Create fixture projects and RED snapshot test stub</name>
  <files>tests/fixtures/js-project/utils/helpers.js, tests/fixtures/py-project/utils/helpers.py, tests/phase4/snapshot.test.js</files>
  <action>
**Step A: Create `tests/fixtures/js-project/utils/helpers.js`**

Hand-craft a JavaScript file with 5-7 short functions (all under 20 lines each) using camelCase naming. Include:
- 2-3 exported functions with JSDoc comments
- 1-2 helper functions (not exported)
- Mix of arrow functions and function declarations
- At least one function that imports from a relative path (e.g., `import { config } from '../config.js'`)
- Keep total file under 60 lines
- Do NOT include: methods > 40 lines, nesting > 3 levels, classes with > 20 methods, empty catch blocks (these would trigger antipattern detection and destabilize snapshots)

**Step B: Create `tests/fixtures/py-project/utils/helpers.py`**

Hand-craft a Python file with 4-6 short functions using snake_case naming. Include:
- 3-4 def functions with docstrings
- 1 class with 2-3 methods (under 10 methods total)
- At least one import statement
- Keep total file under 50 lines
- Same antipattern avoidance rules as above

**Step C: Create `tests/phase4/snapshot.test.js`**

Use static imports for `generateInstructions` (already exported) and `detectFolderPattern` (already exported). Use `readFileSync`, `readdirSync`, `mkdtempSync`, `writeFileSync`, `cpSync` from `fs` and `join`, `resolve` from `path`.

Create these tests:

**describe('QUALITY-03: snapshot regression')**

For each fixture (js-project, py-project):
1. In `beforeAll`: Copy the fixture to a tmpDir (so generated files don't pollute the committed fixtures). Use `cpSync(fixtureSrc, tmpDest, { recursive: true })`.
2. Build `folderInfo` from the copied fixture's `utils/` directory.
3. Call `detectFolderPattern(folderInfo)` to get patternInfo.
4. Call `generateInstructions(folderInfo, patternInfo, languageInfo, { name: 'fixture-project', testDate: '2026-01-01' })`.
5. Read the generated file with `readFileSync`.
6. `expect(content).toMatchSnapshot()`.
7. In `afterAll`: Clean up tmpDir with `rmSync(tmpDir, { recursive: true, force: true })`.

Two tests:
- `test('QUALITY-03-1: js-project snapshot is stable')`
- `test('QUALITY-03-2: py-project snapshot is stable')`

These tests will be RED initially because no snapshots exist yet — they will turn GREEN when `--updateSnapshot` is run after Plan 01 implements timestamp + truncation.

Note: The snapshot test file location means Jest will auto-place snapshots in `tests/phase4/__snapshots__/snapshot.test.js.snap` (Jest default). This is acceptable per RESEARCH.md.
  </action>
  <verify>
    <automated>cd /Users/carlosmiret/Desktop/skill-me-up && node --experimental-vm-modules node_modules/.bin/jest --testPathPatterns "phase4/snapshot" 2>&1 | tail -20</automated>
  </verify>
  <done>2 fixture files exist on disk. Snapshot test file exists with 2 tests. Tests run without SyntaxError (may fail with snapshot mismatch or write new snapshots on first run — both acceptable for Wave 0).</done>
</task>

</tasks>

<verification>
All phase4 tests run without SyntaxErrors:
```bash
node --experimental-vm-modules node_modules/.bin/jest --testPathPatterns "phase4" 2>&1 | tail -30
```
mdGenerator tests are RED (buildMarkdown undefined). Snapshot tests either write initial snapshots or fail with mismatch.
</verification>

<success_criteria>
- tests/phase4/mdGenerator.test.js exists with 4 RED stubs
- tests/phase4/snapshot.test.js exists with 2 snapshot tests
- tests/fixtures/js-project/utils/helpers.js exists (5-7 short JS functions)
- tests/fixtures/py-project/utils/helpers.py exists (4-6 short Python functions)
- No SyntaxErrors in test execution
- Full suite (phases 1-3, 5) still passes: `node --experimental-vm-modules node_modules/.bin/jest`
</success_criteria>

<output>
After completion, create `.planning/phases/04-output-quality/04-W0-SUMMARY.md`
</output>
