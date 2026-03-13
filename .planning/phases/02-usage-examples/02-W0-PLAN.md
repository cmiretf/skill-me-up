---
phase: 02-usage-examples
plan: W0
type: tdd
wave: 1
depends_on: []
files_modified:
  - tests/phase2/usageExamples.test.js
  - tests/phase2/dependencies.test.js
  - tests/phase2/integration.test.js
autonomous: true
requirements:
  - ENRICH-03
  - OUTPUT-02
  - OUTPUT-04

must_haves:
  truths:
    - "All three phase 2 test files exist with failing stubs that fail for the right reason (import works, assertion fails)"
    - "Running the phase 2 test suite produces RED output — not missing module errors"
    - "Every requirement behavior in this phase has at least one test case in a stub file"
  artifacts:
    - path: "tests/phase2/usageExamples.test.js"
      provides: "Failing stubs for extractExamples() and buildUsageExamplesSection()"
      exports: ["ENRICH-03 tests", "OUTPUT-02 tests"]
    - path: "tests/phase2/dependencies.test.js"
      provides: "Failing stubs for upgraded extractDependencies()"
      exports: ["OUTPUT-04 tests"]
    - path: "tests/phase2/integration.test.js"
      provides: "Failing integration stubs for section order and dep role rendering"
      exports: ["OUTPUT-02 integration", "OUTPUT-04 integration"]
  key_links:
    - from: "tests/phase2/usageExamples.test.js"
      to: "src/analyzer/patternDetector.js"
      via: "named import extractExamples"
      pattern: "import.*extractExamples.*patternDetector"
    - from: "tests/phase2/usageExamples.test.js"
      to: "src/generators/mdGenerator.js"
      via: "named import buildUsageExamplesSection"
      pattern: "import.*buildUsageExamplesSection.*mdGenerator"
    - from: "tests/phase2/dependencies.test.js"
      to: "src/analyzer/patternDetector.js"
      via: "named import extractDependencies (or inferDepRole)"
      pattern: "import.*patternDetector"
---

<objective>
Create the Wave 0 test scaffold for Phase 2 — three failing test files that define expected
behavior before any implementation exists.

Purpose: Nyquist compliance — all implementation tasks in waves 2 and 3 need GREEN test targets
to verify against. Tests must fail NOW (import-level stubs are fine, but assertion bodies must be
present and fail correctly), not error on missing module.
Output: Three new test files in tests/phase2/, all failing, full suite still loads without crash.
</objective>

<execution_context>
@/Users/carlosmiret/.claude/get-shit-done/workflows/execute-plan.md
@/Users/carlosmiret/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-usage-examples/02-CONTEXT.md
@.planning/phases/02-usage-examples/02-RESEARCH.md

<interfaces>
<!-- Key exports the test stubs will import against. Extracted from codebase. -->
<!-- These functions do NOT yet exist — stubs will import them and fail RED. -->

From src/analyzer/patternDetector.js (existing exports):
```javascript
export function detectFolderPattern(folderInfo) { ... }
// Currently NOT exported — will be added by Plan 01:
//   extractExamples(deepAnalysis, folderPath) -> { methodName, relativePath, lineNumber, lang, snippet }[]
// Currently exported but returns string[]:
//   extractDependencies(deepAnalysis, relativePath) -> string[]
// After Plan 02 upgrade returns: { path: string, role: string }[]
```

From src/generators/mdGenerator.js (existing exports):
```javascript
export function generateInstructions(folderInfo, patternInfo, languageInfo, projectMeta)
export { buildConventionsSection }
// Will be added by Plan 01:
//   buildUsageExamplesSection(examples) -> string | null
```

Phase 1 test shape to follow (tests/phase1/conventions.test.js):
```javascript
import { functionName } from '../../src/analyzer/patternDetector.js'
describe('functionName', () => {
  test('description', () => {
    expect(functionName(input)).toBe(expected)
  })
})
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create usageExamples.test.js with ENRICH-03 and OUTPUT-02 stubs</name>
  <files>tests/phase2/usageExamples.test.js</files>
  <behavior>
    - ENRICH-03-1: extractExamples() returns array of {methodName, relativePath, lineNumber, lang, snippet} for a deepAnalysis with public methods
    - ENRICH-03-2: extractExamples() returns at most 2 examples per folder (selects first 2 public methods)
    - ENRICH-03-3: extractExamples() returns [] when no public methods exist
    - ENRICH-03-4: snippet is dedented (first non-empty line starts at column 0)
    - ENRICH-03-5: snippet longer than 15 lines ends with '  // ... (truncated)'
    - OUTPUT-02-1: buildUsageExamplesSection(examples) returns string containing '## Usage Examples' marker when examples provided
    - OUTPUT-02-2: buildUsageExamplesSection(examples) contains ### methodName header, See: path:lineNumber pointer, and fenced code block
    - OUTPUT-02-3: buildUsageExamplesSection([]) returns null
    - OUTPUT-02-4: buildUsageExamplesSection(null) returns null
  </behavior>
  <action>
    Create tests/phase2/usageExamples.test.js. Import extractExamples from patternDetector.js
    and buildUsageExamplesSection from mdGenerator.js using the exact paths:
      import { extractExamples } from '../../src/analyzer/patternDetector.js'
      import { buildUsageExamplesSection } from '../../src/generators/mdGenerator.js'

    These functions do not exist yet — the import will succeed (ESM named import fails silently
    as undefined), so wrap each test body to call the function and expect a defined result.
    The tests MUST fail RED (assertion failure), not error on module load.

    For ENRICH-03 tests, build minimal deepAnalysis fixture inline — one entry with:
      { file: 'foo.js', language: 'JavaScript', methods: [{ name: 'doThing', lineNumber: 3, isPublic: true }] }
    and a tmp file (use os.tmpdir() + writeFileSync) containing a short mock function body.
    Use folderPath pointing to that tmp directory.

    For ENRICH-03-5 (truncation), write a mock file with a function of 20+ lines, verify last
    snippet line equals '  // ... (truncated)'.

    For OUTPUT-02 tests, use minimal example fixture:
      [{ methodName: 'doThing', relativePath: 'src/foo.js', lineNumber: 3, lang: 'JavaScript', snippet: ['function doThing() {', '  return 1', '}'] }]

    Label describe blocks with the requirement ID string so -t filter works:
      describe('ENRICH-03: extractExamples', ...)
      describe('OUTPUT-02: buildUsageExamplesSection', ...)

    All tests must fail with a clear assertion error, not a TypeError/ReferenceError.
  </action>
  <verify>
    <automated>node --experimental-vm-modules node_modules/.bin/jest tests/phase2/usageExamples.test.js --no-coverage 2>&1 | grep -E "FAIL|PASS|● " | head -20</automated>
  </verify>
  <done>File exists, imports load without crash, all tests fail with assertion errors (not TypeError "is not a function"), suite shows FAIL with test names listed</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create dependencies.test.js with OUTPUT-04 stubs</name>
  <files>tests/phase2/dependencies.test.js</files>
  <behavior>
    - OUTPUT-04-builtin: extractDependencies() result entries include a role field; for an import of 'fs' the role is 'file system reads/writes'
    - OUTPUT-04-builtin-path: for an import of 'path' the role is 'path manipulation'
    - OUTPUT-04-callsite: for an unknown import where named symbols are used in file content, role contains those symbol names
    - OUTPUT-04-fallback: for a completely unknown import with no call sites, role is derived from the path segment (not undefined, not empty string)
    - OUTPUT-04-shape: every returned entry has both path and role properties
  </behavior>
  <action>
    Create tests/phase2/dependencies.test.js. The upgrade to extractDependencies() will change
    its return type from string[] to { path: string, role: string }[]. The test must import the
    current extractDependencies (which returns strings today) and assert the NEW shape — these
    tests will be RED until Plan 02 makes them GREEN.

    Import:
      import { extractDependencies } from '../../src/analyzer/patternDetector.js'

    Build minimal deepAnalysis fixtures containing entries with imports arrays:
      - For builtin: { language: 'JavaScript', imports: ['fs', 'path'] }
      - For call-site: { language: 'JavaScript', imports: ['../utils/logger'], content: "import logger from '../utils/logger'\nlogger.info('hello')" }
      - For fallback: { language: 'JavaScript', imports: ['../../some/helper-utils'] }

    Note: extractDependencies currently takes (deepAnalysis, relativePath). Use 'src/services'
    as the relativePath fixture value.

    Label describe blocks:
      describe('OUTPUT-04: extractDependencies role inference', ...)

    All assertions check dep.role (e.g., expect(dep.role).toBe('file system reads/writes')).
    The current string[] return means dep.role is undefined — tests fail RED. Correct.
  </action>
  <verify>
    <automated>node --experimental-vm-modules node_modules/.bin/jest tests/phase2/dependencies.test.js --no-coverage 2>&1 | grep -E "FAIL|PASS|● " | head -20</automated>
  </verify>
  <done>File exists, imports load without crash, all tests fail RED on dep.role assertions, suite shows FAIL with test names listed</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create integration.test.js with section order and combined rendering stubs</name>
  <files>tests/phase2/integration.test.js</files>
  <behavior>
    - OUTPUT-02-order: generated markdown places '## Usage Examples' after '## Project Conventions' and before '## Classes & Interfaces'
    - OUTPUT-02-integration: generated markdown contains '## Usage Examples' section header
    - OUTPUT-04-integration: dependencies section uses '— role' format (contains ' — ' separator) instead of bare path only
  </behavior>
  <action>
    Create tests/phase2/integration.test.js. Use the real generateInstructions() pipeline with
    a small synthetic folderInfo and patternInfo fixture to produce markdown, then assert on the
    output string.

    Import:
      import { generateInstructions } from '../../src/generators/mdGenerator.js'
      import { detectFolderPattern } from '../../src/analyzer/patternDetector.js'
      import { writeFileSync, mkdtempSync, rmSync } from 'fs'
      import { join } from 'path'
      import { tmpdir } from 'os'

    Fixture: create a tmp directory with a single JS file containing a simple exported function
    (3-4 lines). Build folderInfo pointing to it. Call detectFolderPattern(folderInfo) to get
    patternInfo. Then call generateInstructions() and assert on the returned markdown string.

    IMPORTANT: generateInstructions writes a file and returns a path — for integration tests,
    read the generated file content and assert on it. Or call buildMarkdown directly if exported;
    if not, use readFileSync on the output path.

    For section order test: use indexOf to verify
      indexConventions < indexExamples < indexClasses
    where each index = markdown.indexOf('## Project Conventions') etc.

    For dependencies format test: if dependencies exist, verify markdown includes ' — ' in the
    dependencies section block.

    Wrap entire tests in beforeAll/afterAll with tmp dir creation and cleanup (rmSync with
    recursive: true).

    Label describe blocks:
      describe('OUTPUT-02: integration section placement', ...)
      describe('OUTPUT-04: integration dependencies format', ...)

    These will fail RED because Usage Examples and role annotations don't exist yet.
  </action>
  <verify>
    <automated>node --experimental-vm-modules node_modules/.bin/jest tests/phase2/integration.test.js --no-coverage 2>&1 | grep -E "FAIL|PASS|● " | head -20</automated>
  </verify>
  <done>File exists, imports load without crash, all tests fail RED (assertion failures, not module errors), full phase 2 suite runs: node --experimental-vm-modules node_modules/.bin/jest tests/phase2/ exits non-zero with 3 FAIL files</done>
</task>

</tasks>

<verification>
Run full phase 2 suite after all three files created:
  node --experimental-vm-modules node_modules/.bin/jest tests/phase2/ --no-coverage

Expected: 3 test files found, all FAIL, total test count > 0, zero "Cannot find module" errors.
Existing phase 1 tests must still pass:
  node --experimental-vm-modules node_modules/.bin/jest tests/phase1/ --no-coverage
</verification>

<success_criteria>
- tests/phase2/usageExamples.test.js exists with >= 8 failing test cases
- tests/phase2/dependencies.test.js exists with >= 5 failing test cases
- tests/phase2/integration.test.js exists with >= 3 failing test cases
- All failures are assertion errors, zero "is not a function" / "Cannot find module" errors
- Phase 1 tests remain GREEN
</success_criteria>

<output>
After completion, create .planning/phases/02-usage-examples/02-W0-SUMMARY.md summarizing:
- Test files created and their test case counts
- Any adjustments made vs the plan (e.g., import workarounds for not-yet-exported functions)
- Exact failing test names confirmed
</output>
