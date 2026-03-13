// Phase 2 — Wave 0: Failing stubs for OUTPUT-04
// These tests are RED until Plan 02 (phase 2) upgrades extractDependencies to return { path, role }[].
//
// Currently extractDependencies is a private (non-exported) function returning string[].
// These tests import it via dynamic import; it resolves as undefined until exported.
// Each test asserts dep.role — currently undefined — so all fail RED with assertion errors.

// extractDependencies will be imported via dynamic import (avoids link-time SyntaxError)
let extractDependencies

beforeAll(async () => {
  const patternDetector = await import('../../src/analyzer/patternDetector.js')
  extractDependencies = patternDetector.extractDependencies // undefined until exported by Plan 02
})

describe('OUTPUT-04: extractDependencies role inference', () => {
  test('OUTPUT-04-builtin: entry for "fs" import has role "file system reads/writes"', () => {
    if (typeof extractDependencies !== 'function') {
      expect(extractDependencies).toBe('a function')
      return
    }
    const deepAnalysis = [
      { language: 'JavaScript', imports: ['fs'], file: 'index.js' },
    ]
    const result = extractDependencies(deepAnalysis, 'src/services')
    expect(Array.isArray(result)).toBe(true)
    const fsDep = result.find(d => d.path === 'fs')
    expect(fsDep).toBeDefined()
    expect(fsDep.role).toBe('file system reads/writes')
  })

  test('OUTPUT-04-builtin-path: entry for "path" import has role "path manipulation"', () => {
    if (typeof extractDependencies !== 'function') {
      expect(extractDependencies).toBe('a function')
      return
    }
    const deepAnalysis = [
      { language: 'JavaScript', imports: ['path'], file: 'index.js' },
    ]
    const result = extractDependencies(deepAnalysis, 'src/services')
    expect(Array.isArray(result)).toBe(true)
    const pathDep = result.find(d => d.path === 'path')
    expect(pathDep).toBeDefined()
    expect(pathDep.role).toBe('path manipulation')
  })

  test('OUTPUT-04-callsite: role for unknown import contains named symbols used in file content', () => {
    if (typeof extractDependencies !== 'function') {
      expect(extractDependencies).toBe('a function')
      return
    }
    const deepAnalysis = [
      {
        language: 'JavaScript',
        file: 'index.js',
        imports: ['../utils/logger'],
        content: "import logger from '../utils/logger'\nlogger.info('hello')\nlogger.warn('bye')",
      },
    ]
    const result = extractDependencies(deepAnalysis, 'src/services')
    expect(Array.isArray(result)).toBe(true)
    const loggerDep = result.find(d => d.path && d.path.includes('logger'))
    expect(loggerDep).toBeDefined()
    // Role should reference the symbol names found at call sites
    expect(loggerDep.role).toContain('logger')
  })

  test('OUTPUT-04-fallback: completely unknown import gets a non-empty role derived from path segment', () => {
    if (typeof extractDependencies !== 'function') {
      expect(extractDependencies).toBe('a function')
      return
    }
    const deepAnalysis = [
      {
        language: 'JavaScript',
        file: 'index.js',
        imports: ['../../some/helper-utils'],
        content: '',
      },
    ]
    const result = extractDependencies(deepAnalysis, 'src/services')
    expect(Array.isArray(result)).toBe(true)
    const dep = result.find(d => d.path && d.path.includes('helper-utils'))
    expect(dep).toBeDefined()
    expect(dep.role).toBeDefined()
    expect(dep.role).not.toBe('')
    expect(dep.role).not.toBe(undefined)
  })

  test('OUTPUT-04-shape: every returned entry has both path and role properties', () => {
    if (typeof extractDependencies !== 'function') {
      expect(extractDependencies).toBe('a function')
      return
    }
    const deepAnalysis = [
      {
        language: 'JavaScript',
        file: 'index.js',
        imports: ['fs', 'path', '../utils/logger'],
        content: "import logger from '../utils/logger'\nlogger.debug('x')",
      },
    ]
    const result = extractDependencies(deepAnalysis, 'src/services')
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
    for (const dep of result) {
      expect(dep).toHaveProperty('path')
      expect(dep).toHaveProperty('role')
    }
  })
})
