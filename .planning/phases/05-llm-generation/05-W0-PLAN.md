---
phase: 05-llm-generation
plan: W0
type: tdd
wave: 0
depends_on: []
files_modified:
  - tests/phase5/cli.test.js
  - tests/phase5/llmGenerator.test.js
autonomous: true
requirements: []
must_haves:
  truths:
    - "tests/phase5/cli.test.js exists and runs RED (fails) on npm test"
    - "tests/phase5/llmGenerator.test.js exists and runs RED (fails) on npm test"
    - "No TypeErrors or SyntaxErrors — failures are assertion failures from undefined functions"
  artifacts:
    - path: "tests/phase5/cli.test.js"
      provides: "RED stubs for LLM-B1 (missing --llm-model) and LLM-B2 (missing GITHUB_TOKEN)"
    - path: "tests/phase5/llmGenerator.test.js"
      provides: "RED stubs for LLM-B3 (estimateTokens), LLM-B4 (parseResponse), LLM-B5 (missing folder)"
  key_links:
    - from: "tests/phase5/cli.test.js"
      to: "bin/cli.js"
      via: "dynamic import in beforeAll"
      pattern: "import.*bin/cli"
    - from: "tests/phase5/llmGenerator.test.js"
      to: "src/generators/llmGenerator.js"
      via: "dynamic import in beforeAll"
      pattern: "import.*llmGenerator"
---

<objective>
Create RED test stubs for Phase 5 behaviors. Tests must load cleanly (no SyntaxErrors) and fail with assertion errors — not TypeErrors — since the functions they target do not yet exist.

Purpose: Nyquist compliance. Stubs define the contract that Plans 01 and 02 will implement against.
Output: tests/phase5/cli.test.js and tests/phase5/llmGenerator.test.js, both failing RED.
</objective>

<execution_context>
@/Users/carlosmiret/.claude/get-shit-done/workflows/execute-plan.md
@/Users/carlosmiret/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-llm-generation/05-CONTEXT.md
@.planning/phases/05-llm-generation/05-RESEARCH.md
@.planning/phases/05-llm-generation/05-VALIDATION.md

<interfaces>
<!-- ESM guard pattern established in phase3 for not-yet-exported functions. -->
<!-- Executor should follow this pattern exactly — no static imports of functions that don't exist yet. -->

From tests/phase3/antipatterns.test.js (established pattern):
```javascript
// Dynamic import in beforeAll avoids link-time SyntaxError for not-yet-exported names
let detectAntipatterns
let buildDontDoSection

beforeAll(async () => {
  const patternDetector = await import('../../src/analyzer/patternDetector.js')
  detectAntipatterns = patternDetector.detectAntipatterns // undefined until implemented

  const mdGenerator = await import('../../src/generators/mdGenerator.js')
  buildDontDoSection = mdGenerator.buildDontDoSection // undefined until implemented
})
```

From bin/cli.js (current interface — flags object and arg parsing loop):
```javascript
const args = process.argv.slice(2)
const flags = {}
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--depth' || arg === '-d') {
    flags.maxDepth = parseInt(args[++i], 10)
  } else if (arg === '--quiet' || arg === '-q') {
    flags.verbose = false
  }
}
// After loop: validates flags, calls analyze()
```

From src/generators/llmGenerator.js (does not exist yet — tests import defensively):
```javascript
// Target exports (Plan 02 will create these):
// export function estimateTokens(text) { ... }   // returns number
// export function parseResponse(responseText, expectedFolderPaths) { ... }  // returns Map<folderPath, content>
// export async function generateLLMInstructions(generatedPaths, options) { ... }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create tests/phase5/cli.test.js — RED stubs for LLM-B1 and LLM-B2</name>
  <files>tests/phase5/cli.test.js</files>
  <action>
Create `tests/phase5/cli.test.js`. The CLI flag validation cannot easily be unit-tested by importing bin/cli.js because it runs immediately on import. Instead, test the validation logic by spawning the CLI as a child process using Node.js `child_process.spawnSync` or by extracting the validation logic. Use `spawnSync` to call `node bin/cli.js` with specific env/args and assert on exit code and stderr output.

Write two describe blocks:

**"--llm flag validation" / "missing --llm-model"** (LLM-B1):
- Spawn `node bin/cli.js . --llm` with `GITHUB_TOKEN=fake-token` in env and no `--llm-model`
- Assert `status === 1`
- Assert `stderr.toString()` contains "Available models:" and at least one model name like "openai/gpt-4o"
- This test will FAIL RED until Plan 01 adds `--llm-model` validation to bin/cli.js

**"--llm flag validation" / "missing GITHUB_TOKEN"** (LLM-B2):
- Spawn `node bin/cli.js . --llm --llm-model openai/gpt-4o` with `GITHUB_TOKEN` explicitly deleted from env
- Assert `status === 1`
- Assert `stderr.toString()` contains "GITHUB_TOKEN"
- This test will FAIL RED until Plan 01 adds `GITHUB_TOKEN` validation to bin/cli.js

Use `spawnSync` from `child_process` with `{ encoding: 'utf8', env: { ...process.env, GITHUB_TOKEN: 'fake-token' } }` pattern. For the missing-token test, spread process.env then delete GITHUB_TOKEN from the copy.

IMPORTANT: `spawnSync` is a Node.js built-in, no dynamic import pattern needed. The tests fail RED because bin/cli.js does not yet accept --llm flags (it will exit 1 with the generic "not a valid directory" error on `.`, OR it may succeed without the flag — either way, the specific stderr assertions will fail).

Note: Run tests with `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/cli.test.js`.
  </action>
  <verify>
    <automated>node --experimental-vm-modules node_modules/.bin/jest tests/phase5/cli.test.js 2>&1 | tail -20</automated>
  </verify>
  <done>File exists, jest runs it without SyntaxError, tests fail RED (assertion failures, not TypeErrors). At least 2 failing tests visible.</done>
</task>

<task type="auto">
  <name>Task 2: Create tests/phase5/llmGenerator.test.js — RED stubs for LLM-B3, LLM-B4, LLM-B5</name>
  <files>tests/phase5/llmGenerator.test.js</files>
  <action>
Create `tests/phase5/llmGenerator.test.js`. Use the dynamic import pattern from phase3/antipatterns.test.js to guard against the not-yet-existing `src/generators/llmGenerator.js`.

```javascript
let estimateTokens
let parseResponse

beforeAll(async () => {
  try {
    const llmGenerator = await import('../../src/generators/llmGenerator.js')
    estimateTokens = llmGenerator.estimateTokens   // undefined until Plan 02
    parseResponse = llmGenerator.parseResponse     // undefined until Plan 02
  } catch {
    // Module doesn't exist yet — functions remain undefined, tests fail RED
  }
})
```

Write three describe blocks:

**"estimateTokens"** (LLM-B3):
- Test: "returns a number greater than zero for non-empty text"
  - Input: `"export function foo() { return 42 }"` (a short string)
  - Assert `typeof result === 'number' && result > 0`
- Test: "returns more tokens for longer text than shorter text"
  - Compare estimate for 10-word string vs 100-word string
  - Assert `estimateTokens(longer) > estimateTokens(shorter)`
- Use guard clause: if `estimateTokens === undefined`, call `expect(estimateTokens).toBeDefined()` to fail RED

**"parseResponse"** (LLM-B4):
- Test: "extracts content for each folder from delimiter-separated response"
  - Input responseText with two sections:
    ```
    === FOLDER: src/services ===
    ## Services
    This folder handles business logic.

    === FOLDER: src/controllers ===
    ## Controllers
    This folder handles HTTP routing.
    ```
  - Input expectedFolderPaths: `['src/services', 'src/controllers']`
  - Assert result is a Map with `result.get('src/services')` containing "Services" and `result.get('src/controllers')` containing "Controllers"
- Use guard clause: if `parseResponse === undefined`, call `expect(parseResponse).toBeDefined()` to fail RED

**"parseResponse — missing folder"** (LLM-B5):
- Test: "throws or returns error indicator when expected folder is absent from response"
  - Input responseText with only `=== FOLDER: src/services ===` section
  - Input expectedFolderPaths: `['src/services', 'src/controllers']`
  - Assert that calling parseResponse throws an Error OR returns a result where `result.get('src/controllers')` is falsy/undefined
  - The test should fail RED until Plan 02 implements the missing-folder error behavior
  - Use `expect(() => parseResponse(...)).toThrow()` — this fails RED if parseResponse is undefined (TypeError) — wrap in the guard clause pattern instead: if undefined, call `expect(parseResponse).toBeDefined()`
  - When implemented, plan 02 should throw on missing folder per the locked decision "fail hard"

Note: Run tests with `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/llmGenerator.test.js`.
  </action>
  <verify>
    <automated>node --experimental-vm-modules node_modules/.bin/jest tests/phase5/llmGenerator.test.js 2>&1 | tail -20</automated>
  </verify>
  <done>File exists, jest runs it without SyntaxError, all 5 tests fail RED (estimateTokens ×2, parseResponse ×2, missing folder ×1). Failures are assertion failures ("Expected undefined to be defined"), not unhandled exceptions.</done>
</task>

</tasks>

<verification>
Both test files exist in tests/phase5/. Jest runs the full phase5 suite without crashing. All tests fail RED (assertion errors, not SyntaxErrors or unhandled rejections).

```
node --experimental-vm-modules node_modules/.bin/jest tests/phase5/
```

Expected: 5-7 failing tests, 0 passing, 0 errored suites.
</verification>

<success_criteria>
- tests/phase5/cli.test.js contains 2 RED tests (LLM-B1: missing --llm-model, LLM-B2: missing GITHUB_TOKEN)
- tests/phase5/llmGenerator.test.js contains 5 RED tests (LLM-B3: estimateTokens ×2, LLM-B4: parseResponse, LLM-B5: missing folder)
- No test suite exits with a thrown exception or SyntaxError
- Full suite (`node --experimental-vm-modules node_modules/.bin/jest`) still passes existing phase1/phase2/phase3 tests
</success_criteria>

<output>
After completion, create `.planning/phases/05-llm-generation/05-W0-SUMMARY.md`
</output>
