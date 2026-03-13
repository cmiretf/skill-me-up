// Phase 3 — Wave 0: Failing stubs for ENRICH-04
// These tests are RED until Plan 03-01 implements detectAntipatterns and Plan 03-02 implements buildDontDoSection.
//
// ESM static named imports throw a SyntaxError at link time if the export doesn't exist yet.
// We use dynamic import() in beforeAll so the test suite loads cleanly, functions are undefined,
// and every test body asserts against the expected shape — failing RED rather than erroring.

import { writeFileSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Will be populated in beforeAll via dynamic import
let detectAntipatterns
let buildDontDoSection

let tmpDir

beforeAll(async () => {
  // Dynamic import avoids link-time SyntaxError for not-yet-exported names
  const patternDetector = await import('../../src/analyzer/patternDetector.js')
  detectAntipatterns = patternDetector.detectAntipatterns // undefined until Plan 03-01

  const mdGenerator = await import('../../src/generators/mdGenerator.js')
  buildDontDoSection = mdGenerator.buildDontDoSection // undefined until Plan 03-02

  // Create tmp directory for tests that need real file content on disk
  tmpDir = mkdtempSync(join(tmpdir(), 'skill-me-up-p3-test-'))
})

afterAll(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

// ─── Helper: write a long JS function (>40 lines) ─────────────────────────────

function writeLongMethodFile(dir, filename) {
  const lines = ['export function longHandler(req, res) {']
  for (let i = 1; i <= 45; i++) {
    lines.push(`  const step${i} = ${i}`)
  }
  lines.push('  return step45', '}')
  writeFileSync(join(dir, filename), lines.join('\n'), 'utf8')
}

// ─── Helper: write a short JS function ────────────────────────────────────────

function writeShortFile(dir, filename) {
  const content = [
    'export function shortFn(x) {',
    '  return x * 2',
    '}',
  ].join('\n')
  writeFileSync(join(dir, filename), content, 'utf8')
}

// ─── ENRICH-04 unit stubs ─────────────────────────────────────────────────────

describe('ENRICH-04: detectAntipatterns', () => {
  // ENRICH-04-1: Returns array when >=3 files trigger a rule
  test('ENRICH-04-1: returns array with {id, label, count} entries when 3+ files trigger a rule', () => {
    if (typeof detectAntipatterns !== 'function') {
      expect(detectAntipatterns).toBe('a function')
      return
    }

    // Write 3 JS files each with a long method (>40 lines) to trigger longMethod rule
    writeLongMethodFile(tmpDir, 'a1.js')
    writeLongMethodFile(tmpDir, 'a2.js')
    writeLongMethodFile(tmpDir, 'a3.js')

    const deepAnalysis = [
      { file: 'a1.js', language: 'JavaScript', classType: 'module', methods: [], imports: [] },
      { file: 'a2.js', language: 'JavaScript', classType: 'module', methods: [], imports: [] },
      { file: 'a3.js', language: 'JavaScript', classType: 'module', methods: [], imports: [] },
    ]

    const result = detectAntipatterns(deepAnalysis, tmpDir)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    const entry = result[0]
    expect(entry).toHaveProperty('id')
    expect(entry).toHaveProperty('label')
    expect(entry).toHaveProperty('count')
    expect(typeof entry.id).toBe('string')
    expect(typeof entry.label).toBe('string')
    expect(typeof entry.count).toBe('number')
  })

  // ENRICH-04-2: Returns null when fewer than 3 files trigger any rule
  test('ENRICH-04-2: returns null when fewer than 3 files trigger any rule', () => {
    if (typeof detectAntipatterns !== 'function') {
      expect(detectAntipatterns).toBe('a function')
      return
    }

    // Only 2 files with long methods — below the threshold
    writeLongMethodFile(tmpDir, 'b1.js')
    writeLongMethodFile(tmpDir, 'b2.js')
    writeShortFile(tmpDir, 'b3.js')

    const deepAnalysis = [
      { file: 'b1.js', language: 'JavaScript', classType: 'module', methods: [], imports: [] },
      { file: 'b2.js', language: 'JavaScript', classType: 'module', methods: [], imports: [] },
      { file: 'b3.js', language: 'JavaScript', classType: 'module', methods: [], imports: [] },
    ]

    const result = detectAntipatterns(deepAnalysis, tmpDir)
    expect(result).toBeNull()
  })

  // ENRICH-04-3: God class rule skipped for Go language files
  test('ENRICH-04-3: god class rule is skipped for Go language files', () => {
    if (typeof detectAntipatterns !== 'function') {
      expect(detectAntipatterns).toBe('a function')
      return
    }

    // 3 Go files where each has >20 methods — would normally trigger godClass, but Go is excluded
    const goMethods = Array.from({ length: 25 }, (_, i) => ({ name: `Method${i}`, lineNumber: i + 1, isPublic: true }))

    const deepAnalysis = [
      { file: 'service1.go', language: 'Go', classType: 'class', methods: goMethods, imports: [] },
      { file: 'service2.go', language: 'Go', classType: 'class', methods: goMethods, imports: [] },
      { file: 'service3.go', language: 'Go', classType: 'class', methods: goMethods, imports: [] },
    ]

    // Use empty string for folderPath — god class check is metadata-only, no file reads needed
    const result = detectAntipatterns(deepAnalysis, '')
    const hasGodClass = Array.isArray(result) && result.some(r => r.id === 'godClass')
    expect(hasGodClass).toBe(false)
  })

  // ENRICH-04-4: God class rule skipped for plain JS module/script files
  test('ENRICH-04-4: god class rule is skipped for JS module and script classType files', () => {
    if (typeof detectAntipatterns !== 'function') {
      expect(detectAntipatterns).toBe('a function')
      return
    }

    // 3 JS files with classType 'module' and >20 methods — god class rule should be skipped
    const manyMethods = Array.from({ length: 25 }, (_, i) => ({ name: `fn${i}`, lineNumber: i + 1, isPublic: true }))

    const deepAnalysis = [
      { file: 'utils.js', language: 'JavaScript', classType: 'module', methods: manyMethods, imports: [] },
      { file: 'helpers.js', language: 'JavaScript', classType: 'module', methods: manyMethods, imports: [] },
      { file: 'lib.js', language: 'JavaScript', classType: 'module', methods: manyMethods, imports: [] },
    ]

    const result = detectAntipatterns(deepAnalysis, '')
    const hasGodClass = Array.isArray(result) && result.some(r => r.id === 'godClass')
    expect(hasGodClass).toBe(false)
  })

  // ENRICH-04-5: Empty catch rule returns false for Go files
  test('ENRICH-04-5: emptyCatch rule does not trigger for Go files', () => {
    if (typeof detectAntipatterns !== 'function') {
      expect(detectAntipatterns).toBe('a function')
      return
    }

    // Go uses defer/recover, not try/catch — the rule should be skipped entirely for Go
    // Write 3 Go files with empty-catch-like patterns to verify they are excluded
    const goContent = [
      'func handleRequest(w http.ResponseWriter, r *http.Request) {',
      '  defer func() {',
      '    if err := recover(); err != nil {',
      '    }',
      '  }()',
      '  doSomething()',
      '}',
    ].join('\n')

    writeFileSync(join(tmpDir, 'handler1.go'), goContent, 'utf8')
    writeFileSync(join(tmpDir, 'handler2.go'), goContent, 'utf8')
    writeFileSync(join(tmpDir, 'handler3.go'), goContent, 'utf8')

    const deepAnalysis = [
      { file: 'handler1.go', language: 'Go', classType: 'file', methods: [], imports: [] },
      { file: 'handler2.go', language: 'Go', classType: 'file', methods: [], imports: [] },
      { file: 'handler3.go', language: 'Go', classType: 'file', methods: [], imports: [] },
    ]

    const result = detectAntipatterns(deepAnalysis, tmpDir)
    const hasEmptyCatch = Array.isArray(result) && result.some(r => r.id === 'emptyCatch')
    expect(hasEmptyCatch).toBe(false)
  })

  // ENRICH-04-6: Comment-only catch body is NOT flagged as empty
  test('ENRICH-04-6: catch body with only a comment is NOT flagged as emptyCatch', () => {
    if (typeof detectAntipatterns !== 'function') {
      expect(detectAntipatterns).toBe('a function')
      return
    }

    // 3 JS files where each catch body contains only a comment — should NOT be flagged
    const jsContentWithCommentCatch = [
      'export function riskyOp() {',
      '  try {',
      '    doSomething()',
      '  } catch (e) {',
      '    // TODO handle this error properly',
      '  }',
      '}',
    ].join('\n')

    writeFileSync(join(tmpDir, 'op1.js'), jsContentWithCommentCatch, 'utf8')
    writeFileSync(join(tmpDir, 'op2.js'), jsContentWithCommentCatch, 'utf8')
    writeFileSync(join(tmpDir, 'op3.js'), jsContentWithCommentCatch, 'utf8')

    const deepAnalysis = [
      { file: 'op1.js', language: 'JavaScript', classType: 'module', methods: [], imports: [] },
      { file: 'op2.js', language: 'JavaScript', classType: 'module', methods: [], imports: [] },
      { file: 'op3.js', language: 'JavaScript', classType: 'module', methods: [], imports: [] },
    ]

    const result = detectAntipatterns(deepAnalysis, tmpDir)
    const hasEmptyCatch = Array.isArray(result) && result.some(r => r.id === 'emptyCatch')
    expect(hasEmptyCatch).toBe(false)
  })
})

// ─── ENRICH-04 stubs for buildDontDoSection ───────────────────────────────────

describe('ENRICH-04: buildDontDoSection', () => {
  // ENRICH-04-7: Returns string with "## Don't Do" when antipatterns present
  test("ENRICH-04-7: returns string containing \"## Don't Do\" when antipatterns present", () => {
    if (typeof buildDontDoSection !== 'function') {
      expect(buildDontDoSection).toBe('a function')
      return
    }

    const antipatterns = [
      { id: 'longMethod', label: 'Long methods (>40 lines)', count: 4 },
    ]

    const result = buildDontDoSection(antipatterns)
    expect(typeof result).toBe('string')
    expect(result).toContain("## Don't Do")
  })

  // ENRICH-04-8: Returns null for null input and empty array
  test('ENRICH-04-8: returns null for null input and empty array', () => {
    if (typeof buildDontDoSection !== 'function') {
      expect(buildDontDoSection).toBe('a function')
      return
    }

    expect(buildDontDoSection(null)).toBeNull()
    expect(buildDontDoSection([])).toBeNull()
  })
})
