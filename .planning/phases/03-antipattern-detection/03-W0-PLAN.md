---
phase: 03-antipattern-detection
plan: W0
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/phase3/antipatterns.test.js
  - tests/phase3/integration.test.js
autonomous: true
requirements:
  - ENRICH-04
  - OUTPUT-03

must_haves:
  truths:
    - "Running the phase3 test suite produces RED (failing) tests, not errors"
    - "All test stubs assert on the expected return shapes so GREEN means correct implementation"
    - "Dynamic import pattern prevents link-time SyntaxError for not-yet-exported functions"
  artifacts:
    - path: "tests/phase3/antipatterns.test.js"
      provides: "Unit test stubs for detectAntipatterns() — ENRICH-04"
      exports: []
    - path: "tests/phase3/integration.test.js"
      provides: "Pipeline integration stubs for ## Don't Do section — OUTPUT-03"
      exports: []
  key_links:
    - from: "tests/phase3/antipatterns.test.js"
      to: "src/analyzer/patternDetector.js"
      via: "dynamic import() in beforeAll"
      pattern: "import.*patternDetector"
    - from: "tests/phase3/integration.test.js"
      to: "src/generators/mdGenerator.js"
      via: "static import of generateInstructions"
      pattern: "import.*mdGenerator"
---

<objective>
Create RED test stubs for Phase 3 that define the exact contract detectAntipatterns() and buildDontDoSection() must satisfy.

Purpose: Nyquist compliance — every task in subsequent plans has an automated verify command that was wired before implementation began. Tests fail RED now and turn GREEN when Plan 03-01 and 03-02 complete.
Output: tests/phase3/antipatterns.test.js (unit stubs) and tests/phase3/integration.test.js (pipeline stubs)
</objective>

<execution_context>
@/Users/carlosmiret/.claude/get-shit-done/workflows/execute-plan.md
@/Users/carlosmiret/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-antipattern-detection/03-CONTEXT.md
@.planning/phases/03-antipattern-detection/03-RESEARCH.md

<interfaces>
<!-- Key contracts the executor needs. Extracted from codebase by direct inspection. -->
<!-- Use these directly — no codebase exploration needed. -->

From tests/phase2/usageExamples.test.js (dynamic import pattern template):
```javascript
let detectAntipatterns
let buildDontDoSection

beforeAll(async () => {
  const patternDetector = await import('../../src/analyzer/patternDetector.js')
  detectAntipatterns = patternDetector.detectAntipatterns  // undefined until Plan 03-01

  const mdGenerator = await import('../../src/generators/mdGenerator.js')
  buildDontDoSection = mdGenerator.buildDontDoSection  // undefined until Plan 03-02
})
```

Guard clause pattern (for functions not yet exported):
```javascript
test('ENRICH-04-1: ...', () => {
  if (typeof detectAntipatterns !== 'function') {
    expect(detectAntipatterns).toBe('a function')  // fails RED cleanly
    return
  }
  // actual assertion
})
```

From src/analyzer/patternDetector.js — detectAntipatterns() expected return contract:
```javascript
// Returns array when >=3 files trigger a rule, null otherwise
// Each item: { id: string, label: string, count: number }
// e.g. [{ id: 'longMethod', label: 'Long methods (>40 lines)', count: 4 }]
```

From src/generators/mdGenerator.js — buildDontDoSection() expected output format:
```javascript
// Returns string starting with "## Don't Do" when antipatterns present, null otherwise
// Must contain blockquote: "> Heuristically detected — review before treating as authoritative."
// Each item renders as: "- **{label}**: found in {count} files"
```

From tests/phase2/integration.test.js (pipeline integration pattern):
```javascript
import { generateInstructions } from '../../src/generators/mdGenerator.js'
import { detectFolderPattern } from '../../src/analyzer/patternDetector.js'
// Build folderInfo, call detectFolderPattern(), call generateInstructions(), readFileSync the output
```

Section placement (locked decision): ## Don't Do appears AFTER ## Usage Examples, BEFORE ## Structure
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create tests/phase3/antipatterns.test.js with RED unit stubs</name>
  <files>tests/phase3/antipatterns.test.js</files>
  <behavior>
    - ENRICH-04-1: detectAntipatterns returns array with {id, label, count} entries when 3+ files trigger a rule
    - ENRICH-04-2: detectAntipatterns returns null when fewer than 3 files trigger any rule
    - ENRICH-04-3: God class rule is skipped for Go language files (fa.language === 'Go')
    - ENRICH-04-4: God class rule is skipped for plain JS module files (fa.classType === 'module' or 'script')
    - ENRICH-04-5: Empty catch rule returns false for Go (silently skipped)
    - ENRICH-04-6: Comment-only catch body (catch (e) { // TODO }) is NOT flagged as empty
    - ENRICH-04-7: buildDontDoSection returns string containing "## Don't Do" when antipatterns present
    - ENRICH-04-8: buildDontDoSection returns null for null input and empty array
  </behavior>
  <action>
    Create tests/phase3/ directory and antipatterns.test.js using the dynamic import pattern from tests/phase2/usageExamples.test.js.

    Use dynamic import() in beforeAll for both detectAntipatterns (from patternDetector.js) and buildDontDoSection (from mdGenerator.js) — neither is exported yet, so static imports would throw a SyntaxError at link time.

    Use the guard clause pattern: if (typeof detectAntipatterns !== 'function') { expect(detectAntipatterns).toBe('a function'); return }.

    Build synthetic deepAnalysis fixtures inline in each test. For ENRICH-04-1, build an array of 3 file entries where at least one rule triggers on each file. For ENRICH-04-2, use only 2 entries. For ENRICH-04-3 and 04-4, build entries with fa.language === 'Go' and fa.classType === 'module' respectively with fa.methods.length > 20.

    For ENRICH-04-5: pass a Go file entry with empty catch pattern in content — expect hasEmptyCatch to return false (or detectAntipatterns to skip it). Since hasEmptyCatch is internal, test via detectAntipatterns with a folder of 3 Go files that all have empty catch-like patterns — expect emptyCatch NOT to appear in results.

    For ENRICH-04-6: build deepAnalysis with 3 JS files where each file's content has `catch (e) { // TODO handle }` — expect emptyCatch NOT to appear in results.

    detectAntipatterns receives (deepAnalysis, folderPath) per the Phase 2 precedent. Tests that need real file content must create tmpDir via mkdtempSync and write fixture files. Tests using only metadata (god class) can pass an empty or irrelevant folderPath string.

    Note: detectAntipatterns needs to read file content from disk for longMethod, deepNesting, emptyCatch rules. The god class rule uses fa.methods.length from metadata only.
  </action>
  <verify>
    <automated>node --experimental-vm-modules node_modules/.bin/jest tests/phase3/antipatterns.test.js --testPathPatterns tests/phase3/antipatterns -x 2>&1 | tail -20</automated>
  </verify>
  <done>All tests in antipatterns.test.js run and fail RED (not error). Output shows "X failed" not "X errored". Guard clauses produce assertion failures like "Expected: 'a function', Received: undefined".</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create tests/phase3/integration.test.js with RED pipeline stubs</name>
  <files>tests/phase3/integration.test.js</files>
  <behavior>
    - OUTPUT-03-1: Generated .md includes "## Don't Do" section when folder has 3+ files with longMethod antipattern
    - OUTPUT-03-2: Generated .md omits "## Don't Do" section entirely when no rule clears the 3-file threshold
    - OUTPUT-03-3: "## Don't Do" section contains the blockquote disclaimer line
    - OUTPUT-03-4: "## Don't Do" section appears after "## Usage Examples" and before "## Structure" in the output
  </behavior>
  <action>
    Create tests/phase3/integration.test.js following the exact structure of tests/phase2/integration.test.js.

    Static import: generateInstructions from mdGenerator.js, detectFolderPattern from patternDetector.js, fs/path/os utilities.

    In beforeAll:
    - Create tmpDir via mkdtempSync
    - For the "antipatterns present" fixture: write 3 JS files each containing a function that is clearly >40 lines long (the long method antipattern). Build folderInfo pointing to tmpDir with those 3 files. Call detectFolderPattern(folderInfo) then generateInstructions(...). Store the generated content in a variable.
    - For the "no antipatterns" fixture: write 3 JS files each with a short function (5 lines). Build folderInfo, run the same pipeline. Store as a second content variable.

    Tests assert on the stored content strings:
    - OUTPUT-03-1: expect(antipatternContent).toContain("## Don't Do")
    - OUTPUT-03-2: expect(noAntipatternContent).not.toContain("## Don't Do")
    - OUTPUT-03-3: expect(antipatternContent).toContain('> Heuristically detected')
    - OUTPUT-03-4: Check indexOf('## Usage Examples') < indexOf("## Don't Do") < indexOf('## Structure') in antipatternContent — if any indexOf is -1, test should fail with a descriptive message

    These tests will fail RED because detectFolderPattern does not yet attach antipatterns to patternInfo and buildMarkdown does not yet call buildDontDoSection.

    Use afterAll(() => rmSync(tmpDir, { recursive: true, force: true })) for cleanup.
  </action>
  <verify>
    <automated>node --experimental-vm-modules node_modules/.bin/jest tests/phase3/integration.test.js --testPathPatterns tests/phase3/integration -x 2>&1 | tail -20</automated>
  </verify>
  <done>All tests in integration.test.js run and fail RED. Output shows expected/received mismatch (e.g., "Expected string to contain '## Don't Do'" but received content without that section).</done>
</task>

</tasks>

<verification>
Both test files exist and the full phase3 suite runs RED (failing assertions, not import errors or syntax errors):

```
node --experimental-vm-modules node_modules/.bin/jest tests/phase3/ --testPathPatterns tests/phase3 2>&1 | tail -10
```

Expected: "X tests failed" with assertion messages. Not "Cannot find module" or "SyntaxError".
</verification>

<success_criteria>
- tests/phase3/antipatterns.test.js exists with 8+ test stubs covering ENRICH-04 unit behaviors
- tests/phase3/integration.test.js exists with 4+ test stubs covering OUTPUT-03 pipeline behaviors
- All stubs fail RED (assertion failures, not errors)
- npm test (full suite) shows the new failures without breaking existing phase1/phase2 tests
</success_criteria>

<output>
After completion, create `.planning/phases/03-antipattern-detection/03-W0-SUMMARY.md`
</output>
