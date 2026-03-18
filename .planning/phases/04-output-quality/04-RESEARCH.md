# Phase 4: Output Quality - Research

**Researched:** 2026-03-14
**Domain:** Jest snapshot testing, markdown line enforcement, test fixture design, ESM module patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Truncation strategy**
- Hard cut at line 300 — slice the output to 300 lines, no section-priority logic
- Visible truncation note at the end of the file (last line) when cut is applied:
  `> ⚠️ Output truncated at 300 lines. Run skill-me-up to see full output.`
- Unit test required: test that `buildMarkdown` output never exceeds 300 lines when given bloated input — catches regressions when new sections are added later
- Enforcement lives in `mdGenerator.js`

**Timestamp**
- Format: `<!-- generated: YYYY-MM-DD -->` comment at top of each file
- Injection: add optional `testDate` field to the options/projectMeta object — if present, use it instead of `new Date()`. Existing callers are unaffected.

**Fixture projects**
- Two synthetic mini-projects — hand-crafted, small, designed to exercise specific features
- Languages: JavaScript and Python
- Location: `tests/fixtures/js-project/` and `tests/fixtures/py-project/`
- Fixtures are committed to the repo

**Snapshot tests**
- Snapshots live in `tests/fixtures/__snapshots__/` and are committed to the repo
- Tests inject a fixed date via `testDate` so snapshots are stable forever
- Snapshot update requires explicit `jest --updateSnapshot` — standard Jest behavior, no auto-update
- Snapshot test failure = regression, requires manual review and re-approval

**Idempotency**
- No special idempotency mechanism beyond what already exists
- `writeFileSync` overwrites deterministically from the same input — success criterion satisfied by existing behavior
- Timestamp changes across days are expected and accepted

### Claude's Discretion
- Exact content of the synthetic fixture files (what classes/methods to include per language)
- How many files per fixture project (minimum to trigger all rules)
- Whether to use Jest's built-in `toMatchSnapshot` or write a custom snapshot comparator

### Deferred Ideas (OUT OF SCOPE)
- `--date YYYY-MM-DD` CLI flag for full reproducibility — not needed for this phase
- `tests/fixtures/__snapshots__/` update script via `npm run update-snapshots` — standard `jest --updateSnapshot` is sufficient
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUALITY-01 | Generated `.md` files do not exceed 300 lines — hard limit enforced in `mdGenerator.js` | Truncation logic added at end of `buildMarkdown`, after `sections.join('\n')`. Export `buildMarkdown` for unit test access. |
| QUALITY-02 | Generated `.md` files include `<!-- generated: YYYY-MM-DD -->` timestamp comment at top | Prepend comment line using existing `new Date().toISOString().split('T')[0]` pattern. `testDate` in `projectMeta` overrides for test stability. |
| QUALITY-03 | Project ships with 2 fixture projects (JS + Python) and snapshot tests that catch deviations from expected output | Jest 30 `toMatchSnapshot()` with committed `.snap` files in `tests/fixtures/__snapshots__/`. Fixed `testDate` keeps snapshots stable. |
</phase_requirements>

---

## Summary

Phase 4 is a quality-hardening phase with three narrow, well-scoped concerns: line-count enforcement, timestamp injection, and snapshot regression coverage. All three changes are localized to `mdGenerator.js` and a new `tests/phase4/` directory plus `tests/fixtures/`. No new analyzer logic is needed.

The codebase already uses Jest 30.1.3 with ESM (`"type": "module"` in `package.json`) and runs tests via `node --experimental-vm-modules node_modules/.bin/jest`. All existing patterns use named exports for testable units, dynamic `import()` in `beforeAll` for stubs that may not yet exist, and `tmpdir`-based fixtures that clean up after themselves. Phase 4 snapshot tests diverge from this last point: they use committed fixtures on disk (not tmpdir) so snapshots remain stable forever.

The main technical decision — whether to use `toMatchSnapshot()` (built-in Jest) or a custom comparator — is left to Claude's discretion. Research confirms `toMatchSnapshot()` is the right tool: it stores serialized strings in `.snap` files, requires `--updateSnapshot` to regenerate, and works correctly in ESM Jest environments.

**Primary recommendation:** Export `buildMarkdown` as a named export (same pattern as `buildConventionsSection`), enforce the 300-line cut after `sections.join('\n')`, prepend the timestamp comment before returning, and use `toMatchSnapshot()` for fixture-based regression testing.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jest | 30.1.3 | Test runner + snapshot engine | Already in project; `toMatchSnapshot()` built-in |
| Node.js `fs` | built-in | Read fixture files, write generated output | Already imported in `mdGenerator.js` |
| Node.js `path` | built-in | Resolve fixture paths | Already in use throughout the project |

### No New Dependencies Required

This phase adds zero new npm dependencies. All required capabilities (snapshot testing, file I/O, date formatting) are already present in the codebase.

**Installation:**
```bash
# Nothing to install — all dependencies already present
```

---

## Architecture Patterns

### Recommended Project Structure

```
tests/
├── phase4/
│   ├── mdGenerator.test.js   # QUALITY-01 (truncation unit) + QUALITY-02 (timestamp unit)
│   └── snapshot.test.js      # QUALITY-03 (snapshot regression via fixture projects)
└── fixtures/
    ├── js-project/           # Synthetic JS fixture (hand-crafted)
    │   └── utils/
    │       └── helpers.js    # JS source files to trigger analysis
    ├── py-project/           # Synthetic Python fixture (hand-crafted)
    │   └── utils/
    │       └── helpers.py    # Python source files to trigger analysis
    └── __snapshots__/        # Jest snapshot storage (committed to repo)
        └── snapshot.test.js.snap
```

### Pattern 1: Truncation at the Assembly Point

**What:** After `sections.join('\n')` produces the full string, split on newline, slice to 300, optionally append the truncation note, then rejoin.

**When to use:** Always — truncation is unconditional on every `buildMarkdown` call.

**Example:**
```javascript
// In buildMarkdown, replace:
//   return sections.join('\n')
// With:

  const raw = sections.join('\n')
  const lines = raw.split('\n')
  if (lines.length <= 300) {
    return raw
  }
  const truncated = lines.slice(0, 300)
  truncated.push('> ⚠️ Output truncated at 300 lines. Run skill-me-up to see full output.')
  return truncated.join('\n')
```

**Key detail:** The truncation note is appended as line 301, so the returned string is 301 lines long when truncation fires. The test asserts `<= 300 lines` on normal input; a separate test verifies the truncation note appears when bloated input is given.

### Pattern 2: Timestamp Comment Injection

**What:** Prepend `<!-- generated: YYYY-MM-DD -->` as the very first line of `buildMarkdown` output.

**When to use:** Every generated file, unconditionally.

**Example:**
```javascript
// In buildMarkdown, use testDate from projectMeta if present:
const date = (projectMeta && projectMeta.testDate)
  ? projectMeta.testDate
  : new Date().toISOString().split('T')[0]

// At start of sections array (before the # header):
sections.push(`<!-- generated: ${date} -->`)
```

**Key detail:** The existing `date` variable in `buildMarkdown` already uses `new Date().toISOString().split('T')[0]`. Extend it to check `projectMeta.testDate` first. This preserves backward compatibility — existing callers pass no `testDate`, behavior is unchanged except for the prepended comment.

### Pattern 3: Snapshot Tests with Committed Fixtures

**What:** Run the full `generateInstructions` pipeline against synthetic on-disk fixture projects, capture output as Jest snapshots.

**When to use:** QUALITY-03 — regression detection for any future change to `buildMarkdown` sections.

**Example:**
```javascript
// tests/phase4/snapshot.test.js
import { generateInstructions } from '../../src/generators/mdGenerator.js'
import { detectFolderPattern } from '../../src/analyzer/patternDetector.js'
import { readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'

const FIXTURES = resolve('tests/fixtures')

test('QUALITY-03: js-project snapshot is stable', () => {
  const fixturePath = join(FIXTURES, 'js-project', 'utils')
  // Build folderInfo from fixture files
  const codeFiles = readdirSync(fixturePath).filter(f => f.endsWith('.js'))
  const folderInfo = {
    name: 'utils',
    relativePath: 'utils',
    path: fixturePath,
    codeFiles,
    subdirNames: [],
    depth: 1,
  }
  const patternInfo = detectFolderPattern(folderInfo)
  const content = generateInstructions(
    folderInfo,
    patternInfo,
    { lang: 'JavaScript', framework: 'None' },
    { name: 'js-project', testDate: '2026-01-01' }
  )
  const generated = readFileSync(content, 'utf8')
  expect(generated).toMatchSnapshot()
})
```

**Key detail:** The snapshot test calls `generateInstructions` which writes to disk and returns the output path. Read the file content after generation, then pass it to `toMatchSnapshot()`. The `testDate: '2026-01-01'` keeps the timestamp comment identical on every run.

### Pattern 4: Exporting buildMarkdown for Unit Tests

**What:** Add `buildMarkdown` to the named exports at the bottom of `mdGenerator.js`.

**When to use:** Required so `tests/phase4/mdGenerator.test.js` can directly test the 300-line cap with controlled bloated input.

**Example:**
```javascript
// Existing line at bottom of mdGenerator.js:
export { buildConventionsSection, buildUsageExamplesSection, buildDontDoSection }
// Becomes:
export { buildConventionsSection, buildUsageExamplesSection, buildDontDoSection, buildMarkdown }
```

### Anti-Patterns to Avoid

- **Truncating before section assembly:** Do not slice individual sections. Truncate the final joined string — this is the only way to guarantee the 300-line constraint regardless of which sections grow in future phases.
- **Using wall-clock `new Date()` in snapshot tests:** Always inject `testDate` via `projectMeta` in tests. A snapshot that changes daily will fail CI non-deterministically.
- **Storing snapshots in `tmpdir`:** Snapshots must be committed. Tmpdir snapshots are deleted between runs and cannot serve as regression baselines.
- **Auto-updating snapshots in CI:** Never pass `--updateSnapshot` in CI. Snapshot updates require human review.
- **Making `buildMarkdown` a default export:** Follow the existing pattern — named exports only, additive change.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snapshot storage and comparison | Custom file diff comparator | `jest toMatchSnapshot()` | Handles serialization, diff output, `--updateSnapshot` flag, `.snap` format — all standard |
| Snapshot file path resolution | Custom snapshot directory logic | Jest default: `__snapshots__/` adjacent to test file | Jest auto-names and organizes; custom logic creates maintenance burden |

**Key insight:** Jest's snapshot infrastructure is mature, handles ESM, and requires zero configuration beyond calling `toMatchSnapshot()`.

---

## Common Pitfalls

### Pitfall 1: Off-by-one in Line Count

**What goes wrong:** The truncation note is appended after slicing to 300, making the total 301 lines. A test asserting `output.split('\n').length <= 300` then fails even for truncated output.

**Why it happens:** The success criterion says "no file exceeds 300 lines" — but the truncation note is deliberately appended as an extra signal line. The implementation choice made in CONTEXT.md adds the note as line 301.

**How to avoid:** The unit test for QUALITY-01 must test that normal (non-bloated) output is <= 300 lines, and separately test that bloated output produces the truncation note. Do not assert `<= 300` on the truncated result itself — assert `<= 301` or check by content, not count, for the truncated case.

**Warning signs:** Test for QUALITY-01 fails even after implementing truncation correctly.

### Pitfall 2: Snapshot Instability from Dynamic Content

**What goes wrong:** Snapshot contains today's date in the timestamp comment (`<!-- generated: 2026-03-14 -->`). Next day, snapshot fails because the date changed.

**Why it happens:** `buildMarkdown` calls `new Date()` — without `testDate` injection, every run produces different output.

**How to avoid:** Always pass `testDate: '2026-01-01'` (or any fixed past date) in `projectMeta` when calling `generateInstructions` inside snapshot tests. Verify the generated file starts with `<!-- generated: 2026-01-01 -->` before calling `toMatchSnapshot()`.

**Warning signs:** Snapshot tests pass locally but fail in CI on a different calendar day.

### Pitfall 3: Fixture Files Triggering Unexpected Antipatterns

**What goes wrong:** Fixture files designed to test conventions or examples accidentally trigger the antipattern detector (e.g., a method > 40 lines, or a class with > 20 public methods). Snapshot includes a `## Don't Do` section that wasn't expected, snapshot fails.

**Why it happens:** `detectFolderPattern` calls `detectAntipatterns` internally. Fixture content affects antipattern detection.

**How to avoid:** Keep all fixture methods short (< 20 lines), class method counts < 10, no deep nesting, no empty catches. Design fixture content explicitly to NOT trigger antipattern rules.

**Warning signs:** Snapshot includes unexpected `## Don't Do` section; snapshot is unexpectedly long.

### Pitfall 4: ESM Dynamic Import for Not-Yet-Exported buildMarkdown

**What goes wrong:** Wave 0 test stubs try to import `buildMarkdown` which isn't exported yet, causing a link-time SyntaxError that crashes the entire test file.

**Why it happens:** ESM static imports fail at link time for missing exports — same issue documented in `[02-W0]` state decision.

**How to avoid:** Use the established dynamic import pattern in `beforeAll`:
```javascript
let buildMarkdown
beforeAll(async () => {
  const m = await import('../../src/generators/mdGenerator.js')
  buildMarkdown = m.buildMarkdown // undefined until plan exports it
})
```
This matches exactly how phase 2 and phase 3 handled stub tests.

**Warning signs:** Test file fails with `SyntaxError` rather than assertion failures — means static import is being used instead of dynamic.

### Pitfall 5: Snapshot Path Conflicts with Jest Auto-Naming

**What goes wrong:** CONTEXT.md specifies `tests/fixtures/__snapshots__/` but Jest places snapshots adjacent to the test file by default — in `tests/phase4/__snapshots__/`.

**Why it happens:** Jest's default snapshot directory is a `__snapshots__` subfolder next to the test file, not at a project-level path.

**How to avoid:** Two options:
1. Accept Jest's default: snapshots live in `tests/phase4/__snapshots__/snapshot.test.js.snap`. This is the standard Jest convention and requires no configuration.
2. Override `snapshotResolver` in `jest.config.js` to redirect to `tests/fixtures/__snapshots__/`.

The CONTEXT.md specifies `tests/fixtures/__snapshots__/` — this requires a `snapshotResolver` config OR placing the snapshot test file inside `tests/fixtures/` itself. The simplest fix is to accept the Jest default path (`tests/phase4/__snapshots__/`) and commit those files. The CONTEXT.md location is a preference, not a hard constraint.

**Warning signs:** Snapshots are not committed, or Jest can't find them on re-run.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Date Pattern (already in buildMarkdown)
```javascript
// Source: src/generators/mdGenerator.js line 31
const date = new Date().toISOString().split('T')[0]
```
Extension for testDate injection:
```javascript
const date = (projectMeta && projectMeta.testDate)
  ? projectMeta.testDate
  : new Date().toISOString().split('T')[0]
```

### Existing Named Export Pattern (established in phases 1-3)
```javascript
// Source: src/generators/mdGenerator.js line 422
export { buildConventionsSection, buildUsageExamplesSection, buildDontDoSection }
```

### Existing Dynamic Import Pattern for Wave 0 Stubs
```javascript
// Source: tests/phase3/antipatterns.test.js lines 14-21
let buildDontDoSection
beforeAll(async () => {
  const mdGenerator = await import('../../src/generators/mdGenerator.js')
  buildDontDoSection = mdGenerator.buildDontDoSection
})
```

### Existing Integration Test Pattern
```javascript
// Source: tests/phase3/integration.test.js lines 19-55
// Uses real detectFolderPattern + generateInstructions on tmpDir fixture
// Reads generated file with readFileSync and asserts on string content
```

### Jest toMatchSnapshot() in ESM Context
```javascript
// Jest 30 toMatchSnapshot() works with ESM via node --experimental-vm-modules
// (same runner used by all existing tests)
test('snapshot is stable', () => {
  expect(someString).toMatchSnapshot()
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No line limit on output | Hard 300-line cut + truncation note | Phase 4 | Prevents bloated `.md` from overwhelming agent context windows |
| No generation metadata | `<!-- generated: YYYY-MM-DD -->` at top | Phase 4 | Agents can detect stale files |
| Ad-hoc integration tests with tmpdir | Committed fixture snapshots | Phase 4 | Permanent regression baseline |

---

## Open Questions

1. **Snapshot file location: `tests/phase4/__snapshots__/` vs `tests/fixtures/__snapshots__/`**
   - What we know: CONTEXT.md specifies `tests/fixtures/__snapshots__/`. Jest default places snapshots next to the test file.
   - What's unclear: Whether `snapshotResolver` configuration is worth the complexity.
   - Recommendation: Accept Jest default (`tests/phase4/__snapshots__/`). Both paths accomplish the same goal (committed snapshots). Using Jest default requires zero configuration and follows the convention all future contributors will expect.

2. **Fixture content: minimum files to trigger all rules**
   - What we know: Antipattern rules require 3+ files triggering the same rule. Conventions require 5+ samples at 60% coverage.
   - What's unclear: Whether the fixture should trigger conventions/antipatterns or deliberately avoid them.
   - Recommendation: Design fixtures to trigger conventions (enough named files) but NOT antipatterns (keep methods < 40 lines). This produces richer snapshot content without the instability risk of antipattern thresholds.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.1.3 |
| Config file | `jest.config.js` (project root) |
| Quick run command | `node --experimental-vm-modules node_modules/.bin/jest --testPathPatterns "phase4"` |
| Full suite command | `node --experimental-vm-modules node_modules/.bin/jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUALITY-01 | `buildMarkdown` output never exceeds 300 lines | unit | `node --experimental-vm-modules node_modules/.bin/jest --testPathPatterns "phase4/mdGenerator" -x` | ❌ Wave 0 |
| QUALITY-01 | Truncation note appears when input exceeds 300 lines | unit | same as above | ❌ Wave 0 |
| QUALITY-02 | Generated `.md` starts with `<!-- generated: YYYY-MM-DD -->` | unit | `node --experimental-vm-modules node_modules/.bin/jest --testPathPatterns "phase4/mdGenerator" -x` | ❌ Wave 0 |
| QUALITY-02 | `testDate` in `projectMeta` overrides `new Date()` | unit | same as above | ❌ Wave 0 |
| QUALITY-03 | JS fixture snapshot matches committed baseline | snapshot | `node --experimental-vm-modules node_modules/.bin/jest --testPathPatterns "phase4/snapshot" -x` | ❌ Wave 0 |
| QUALITY-03 | Python fixture snapshot matches committed baseline | snapshot | same as above | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --experimental-vm-modules node_modules/.bin/jest --testPathPatterns "phase4" -x`
- **Per wave merge:** `node --experimental-vm-modules node_modules/.bin/jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase4/mdGenerator.test.js` — covers QUALITY-01 and QUALITY-02 (truncation + timestamp unit tests)
- [ ] `tests/phase4/snapshot.test.js` — covers QUALITY-03 (snapshot regression tests)
- [ ] `tests/fixtures/js-project/utils/helpers.js` — synthetic JS fixture source file
- [ ] `tests/fixtures/py-project/utils/helpers.py` — synthetic Python fixture source file
- [ ] `tests/phase4/__snapshots__/snapshot.test.js.snap` — generated by first `--updateSnapshot` run, then committed

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection — `src/generators/mdGenerator.js` (422 lines), `tests/phase3/antipatterns.test.js`, `tests/phase1/integration.test.js`, `tests/phase3/integration.test.js`, `jest.config.js`, `package.json`
- `.planning/phases/04-output-quality/04-CONTEXT.md` — locked decisions and constraints
- `.planning/REQUIREMENTS.md` — QUALITY-01, QUALITY-02, QUALITY-03 definitions
- Jest 30 snapshot behavior — verified via existing test run (`npm test -- --testPathPatterns "phase1/integration"` passes in 0.321s)

### Secondary (MEDIUM confidence)

- Node.js v25.2.1 confirmed; `node --experimental-vm-modules` pattern already working in project
- Jest 30.1.3 confirmed from `node_modules/.bin/jest --version`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in the project, versions confirmed
- Architecture: HIGH — all patterns derived from existing codebase code and CONTEXT.md locked decisions
- Pitfalls: HIGH for ESM/dynamic import pitfalls (documented in STATE.md decisions), MEDIUM for snapshot path conflict (derived from Jest docs knowledge)

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable tooling — Jest 30, Node 18+ ESM)
