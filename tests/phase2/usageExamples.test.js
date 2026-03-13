// Phase 2 — Wave 0: Failing stubs for ENRICH-03 and OUTPUT-02
// These tests are RED until Plan 01 (phase 2) implements extractExamples and buildUsageExamplesSection.
//
// ESM static named imports throw a SyntaxError at link time if the export doesn't exist yet.
// We use dynamic import() in beforeAll so the test suite loads cleanly, functions are undefined,
// and every test body asserts against the expected shape — failing RED rather than erroring.

import { writeFileSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Will be populated in beforeAll via dynamic import
let extractExamples
let buildUsageExamplesSection

let tmpDir

beforeAll(async () => {
  // Dynamic import avoids link-time SyntaxError for not-yet-exported names
  const patternDetector = await import('../../src/analyzer/patternDetector.js')
  extractExamples = patternDetector.extractExamples // undefined until implemented

  const mdGenerator = await import('../../src/generators/mdGenerator.js')
  buildUsageExamplesSection = mdGenerator.buildUsageExamplesSection // undefined until implemented

  // Create tmp directory and test files
  tmpDir = mkdtempSync(join(tmpdir(), 'skill-me-up-test-'))

  // Short function file (< 15 lines)
  const shortFn = [
    'export function doThing(x) {',
    '  const result = x * 2',
    '  return result',
    '}',
  ].join('\n')
  writeFileSync(join(tmpDir, 'foo.js'), shortFn, 'utf8')

  // Long function file (20+ lines) to test truncation
  const longLines = ['export function bigFn() {']
  for (let i = 1; i <= 20; i++) {
    longLines.push(`  const step${i} = ${i}`)
  }
  longLines.push('  return step20', '}')
  writeFileSync(join(tmpDir, 'big.js'), longLines.join('\n'), 'utf8')
})

afterAll(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true })
})

// ─── ENRICH-03: extractExamples ───────────────────────────────────────────────

describe('ENRICH-03: extractExamples', () => {
  const publicMethodDeepAnalysis = () => [
    {
      file: 'foo.js',
      language: 'JavaScript',
      methods: [{ name: 'doThing', lineNumber: 1, isPublic: true }],
      imports: [],
    },
  ]

  test('ENRICH-03-1: returns array with {methodName, relativePath, lineNumber, lang, snippet} for public methods', () => {
    if (typeof extractExamples !== 'function') {
      // Fail RED — function not yet exported
      expect(extractExamples).toBe('a function')
      return
    }
    const result = extractExamples(publicMethodDeepAnalysis(), tmpDir)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    const ex = result[0]
    expect(ex).toHaveProperty('methodName')
    expect(ex).toHaveProperty('relativePath')
    expect(ex).toHaveProperty('lineNumber')
    expect(ex).toHaveProperty('lang')
    expect(ex).toHaveProperty('snippet')
  })

  test('ENRICH-03-2: returns at most 2 examples per folder', () => {
    const deepAnalysis = [
      {
        file: 'foo.js',
        language: 'JavaScript',
        methods: [
          { name: 'doThing', lineNumber: 1, isPublic: true },
          { name: 'doOther', lineNumber: 5, isPublic: true },
          { name: 'doThird', lineNumber: 9, isPublic: true },
        ],
        imports: [],
      },
    ]
    if (typeof extractExamples !== 'function') {
      expect(extractExamples).toBe('a function')
      return
    }
    const result = extractExamples(deepAnalysis, tmpDir)
    expect(result.length).toBeLessThanOrEqual(2)
  })

  test('ENRICH-03-3: returns [] when no public methods exist', () => {
    const deepAnalysis = [
      {
        file: 'foo.js',
        language: 'JavaScript',
        methods: [{ name: 'privateHelper', lineNumber: 1, isPublic: false }],
        imports: [],
      },
    ]
    if (typeof extractExamples !== 'function') {
      expect(extractExamples).toBe('a function')
      return
    }
    const result = extractExamples(deepAnalysis, tmpDir)
    expect(result).toEqual([])
  })

  test('ENRICH-03-4: snippet is dedented (first non-empty line starts at column 0)', () => {
    if (typeof extractExamples !== 'function') {
      expect(extractExamples).toBe('a function')
      return
    }
    const result = extractExamples(publicMethodDeepAnalysis(), tmpDir)
    expect(result.length).toBeGreaterThan(0)
    const snippet = result[0].snippet
    const firstNonEmpty = snippet.find(line => line.trim().length > 0)
    expect(firstNonEmpty).toBeDefined()
    expect(firstNonEmpty[0]).not.toBe(' ')
  })

  test('ENRICH-03-5: snippet longer than 15 lines ends with "  // ... (truncated)"', () => {
    const deepAnalysis = [
      {
        file: 'big.js',
        language: 'JavaScript',
        methods: [{ name: 'bigFn', lineNumber: 1, isPublic: true }],
        imports: [],
      },
    ]
    if (typeof extractExamples !== 'function') {
      expect(extractExamples).toBe('a function')
      return
    }
    const result = extractExamples(deepAnalysis, tmpDir)
    expect(result.length).toBeGreaterThan(0)
    const snippet = result[0].snippet
    expect(snippet[snippet.length - 1]).toBe('  // ... (truncated)')
  })
})

// ─── OUTPUT-02: buildUsageExamplesSection ─────────────────────────────────────

const sampleExamples = [
  {
    methodName: 'doThing',
    relativePath: 'src/foo.js',
    lineNumber: 3,
    lang: 'JavaScript',
    snippet: ['function doThing() {', '  return 1', '}'],
  },
]

describe('OUTPUT-02: buildUsageExamplesSection', () => {
  test('OUTPUT-02-1: returns string containing "## Usage Examples" marker when examples provided', () => {
    if (typeof buildUsageExamplesSection !== 'function') {
      expect(buildUsageExamplesSection).toBe('a function')
      return
    }
    const result = buildUsageExamplesSection(sampleExamples)
    expect(typeof result).toBe('string')
    expect(result).toContain('## Usage Examples')
  })

  test('OUTPUT-02-2: contains ### methodName header, See: path:lineNumber pointer, and fenced code block', () => {
    if (typeof buildUsageExamplesSection !== 'function') {
      expect(buildUsageExamplesSection).toBe('a function')
      return
    }
    const result = buildUsageExamplesSection(sampleExamples)
    expect(result).toContain('### doThing')
    expect(result).toContain('src/foo.js:3')
    expect(result).toContain('```')
  })

  test('OUTPUT-02-3: returns null for empty array', () => {
    if (typeof buildUsageExamplesSection !== 'function') {
      expect(buildUsageExamplesSection).toBe('a function')
      return
    }
    const result = buildUsageExamplesSection([])
    expect(result).toBeNull()
  })

  test('OUTPUT-02-4: returns null for null input', () => {
    if (typeof buildUsageExamplesSection !== 'function') {
      expect(buildUsageExamplesSection).toBe('a function')
      return
    }
    const result = buildUsageExamplesSection(null)
    expect(result).toBeNull()
  })
})
