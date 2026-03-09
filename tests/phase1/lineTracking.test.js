// ENRICH-01: line number tracking on methods and classes
// These tests verify that analyze* functions return lineNumber (1-based integer) on method objects.

import {
  getLineNumber,
  analyzeJava,
  analyzeKotlin,
  analyzeTypeScriptOrJs,
  analyzePython,
  analyzeGo,
} from '../../src/analyzer/patternDetector.js'

describe('ENRICH-01: Line number tracking', () => {
  describe('getLineNumber helper', () => {
    test('returns 1 for matchIndex 0 (first line)', () => {
      const content = 'public void foo() {}'
      expect(getLineNumber(content, 0)).toBe(1)
    })

    test('returns correct 1-based line number', () => {
      const content = 'line1\nline2\nline3'
      // 'line3' starts at index 12
      expect(getLineNumber(content, 12)).toBe(3)
    })

    test('returns 2 for content starting on second line', () => {
      const content = 'first\nsecond method here'
      // 'second' starts at index 6
      expect(getLineNumber(content, 6)).toBe(2)
    })
  })

  describe('analyzeJava returns lineNumber on each method', () => {
    test('method at line 5 returns lineNumber 5', () => {
      // 4 blank lines then method
      const content = '\n\n\n\npublic void myMethod(String name) {}'
      const result = analyzeJava(content, 'Test.java')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(result.methods[0].lineNumber).toBe(5)
    })

    test('method on first line returns lineNumber 1', () => {
      const content = 'public void firstMethod() {}'
      const result = analyzeJava(content, 'Test.java')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(result.methods[0].lineNumber).toBe(1)
    })

    test('lineNumber is an integer', () => {
      const content = 'public String getName() { return name; }'
      const result = analyzeJava(content, 'Test.java')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(Number.isInteger(result.methods[0].lineNumber)).toBe(true)
    })
  })

  describe('analyzeTypeScriptOrJs returns lineNumber on exported functions', () => {
    test('exported function on line 3 returns lineNumber 3', () => {
      const content = '// comment\n// another\nexport function foo() {}'
      const result = analyzeTypeScriptOrJs(content, 'foo.ts')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(result.methods[0].lineNumber).toBe(3)
    })

    test('exported function on first line returns lineNumber 1', () => {
      const content = 'export function bar(x, y) { return x + y }'
      const result = analyzeTypeScriptOrJs(content, 'bar.js')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(result.methods[0].lineNumber).toBe(1)
    })

    test('methods array contains objects (not bare strings)', () => {
      const content = 'export function baz() {}'
      const result = analyzeTypeScriptOrJs(content, 'baz.js')
      expect(result.methods.length).toBeGreaterThan(0)
      const m = result.methods[0]
      expect(m).toHaveProperty('name')
      expect(m).toHaveProperty('lineNumber')
      expect(m).toHaveProperty('params')
      expect(m).toHaveProperty('returnType')
      expect(m).toHaveProperty('annotation')
    })
  })

  describe('analyzePython returns lineNumber on each method', () => {
    test('def method on line 4 returns lineNumber 4', () => {
      const content = 'class Foo:\n  x = 1\n  y = 2\n  def my_method(self):\n    pass'
      const result = analyzePython(content, 'foo.py')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(result.methods[0].lineNumber).toBe(4)
    })

    test('def on first line returns lineNumber 1', () => {
      const content = 'def top_level():\n  pass'
      const result = analyzePython(content, 'util.py')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(result.methods[0].lineNumber).toBe(1)
    })
  })

  describe('analyzeKotlin returns lineNumber on each method', () => {
    test('fun on line 2 returns lineNumber 2', () => {
      const content = 'class Foo {\n  fun doSomething(): Unit {}\n}'
      const result = analyzeKotlin(content, 'Foo.kt')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(result.methods[0].lineNumber).toBe(2)
    })

    test('fun on first line returns lineNumber 1', () => {
      const content = 'fun standalone(): String { return "hi" }'
      const result = analyzeKotlin(content, 'Foo.kt')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(result.methods[0].lineNumber).toBe(1)
    })
  })

  describe('analyzeGo returns lineNumber on exported functions', () => {
    test('exported func on line 3 returns lineNumber 3', () => {
      const content = 'package main\n\nfunc DoWork() error {\n  return nil\n}'
      const result = analyzeGo(content, 'main.go')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(result.methods[0].lineNumber).toBe(3)
    })

    test('exported func on first line returns lineNumber 1', () => {
      const content = 'func ExportedFn() {}'
      const result = analyzeGo(content, 'util.go')
      expect(result.methods.length).toBeGreaterThan(0)
      expect(result.methods[0].lineNumber).toBe(1)
    })
  })

  describe('lineNumber is 1-based', () => {
    test('single-line content method at index 0 is lineNumber 1', () => {
      const content = 'export function solo() {}'
      const result = analyzeTypeScriptOrJs(content, 'solo.js')
      expect(result.methods[0].lineNumber).toBe(1)
    })
  })
})
