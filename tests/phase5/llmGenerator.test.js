// Phase 5 — Wave 0: Failing stubs for LLM-B3, LLM-B4, LLM-B5
// These tests are RED until Plan 05-02 implements estimateTokens and parseResponse
// in src/generators/llmGenerator.js.
//
// ESM static named imports throw a SyntaxError at link time if the export doesn't exist yet.
// We use dynamic import() in beforeAll so the test suite loads cleanly, functions are undefined,
// and every test body asserts against the expected shape — failing RED rather than erroring.

// Will be populated in beforeAll via dynamic import
let estimateTokens
let parseResponse

beforeAll(async () => {
  try {
    const llmGenerator = await import('../../src/generators/llmGenerator.js')
    estimateTokens = llmGenerator.estimateTokens   // undefined until Plan 05-02
    parseResponse = llmGenerator.parseResponse     // undefined until Plan 05-02
  } catch {
    // Module doesn't exist yet — functions remain undefined, tests fail RED
  }
})

// ─── estimateTokens (LLM-B3) ──────────────────────────────────────────────────

describe('estimateTokens', () => {
  it('returns a number greater than zero for non-empty text (LLM-B3)', () => {
    if (estimateTokens === undefined) {
      expect(estimateTokens).toBeDefined()
      return
    }
    const result = estimateTokens('export function foo() { return 42 }')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThan(0)
  })

  it('returns more tokens for longer text than shorter text (LLM-B3)', () => {
    if (estimateTokens === undefined) {
      expect(estimateTokens).toBeDefined()
      return
    }
    const shorter = 'one two three four five six seven eight nine ten'
    const longer = Array.from({ length: 10 }, () => shorter).join(' ')
    expect(estimateTokens(longer)).toBeGreaterThan(estimateTokens(shorter))
  })
})

// ─── parseResponse (LLM-B4) ───────────────────────────────────────────────────

describe('parseResponse', () => {
  it('extracts content for each folder from delimiter-separated response (LLM-B4)', () => {
    if (parseResponse === undefined) {
      expect(parseResponse).toBeDefined()
      return
    }

    const responseText = [
      '=== FOLDER: src/services ===',
      '## Services',
      'This folder handles business logic.',
      '',
      '=== FOLDER: src/controllers ===',
      '## Controllers',
      'This folder handles HTTP routing.',
    ].join('\n')

    const expectedFolderPaths = ['src/services', 'src/controllers']
    const result = parseResponse(responseText, expectedFolderPaths)

    expect(result).toBeInstanceOf(Map)
    expect(result.get('src/services')).toContain('Services')
    expect(result.get('src/controllers')).toContain('Controllers')
  })
})

// ─── parseResponse — missing folder (LLM-B5) ──────────────────────────────────

describe('parseResponse — missing folder', () => {
  it('throws or returns error indicator when expected folder is absent from response (LLM-B5)', () => {
    if (parseResponse === undefined) {
      expect(parseResponse).toBeDefined()
      return
    }

    const responseText = [
      '=== FOLDER: src/services ===',
      '## Services',
      'This folder handles business logic.',
    ].join('\n')

    const expectedFolderPaths = ['src/services', 'src/controllers']

    // Plan 02 decision: fail hard when a folder is missing from the response.
    // Either it throws, or it returns a Map where the missing folder is falsy.
    let threw = false
    let result
    try {
      result = parseResponse(responseText, expectedFolderPaths)
    } catch {
      threw = true
    }

    if (!threw) {
      // If it didn't throw, the missing folder entry should be falsy
      const missingEntry = result instanceof Map ? result.get('src/controllers') : undefined
      expect(missingEntry).toBeFalsy()
    }

    // Either path is acceptable RED-state behavior — but when NOT implemented,
    // parseResponse is undefined so the guard above returns early with a failure.
    // This assertion ensures the test can be "green" only after a real implementation.
    expect(threw || (result instanceof Map)).toBe(true)
  })
})
