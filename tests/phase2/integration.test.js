// Phase 2 — Wave 0: Failing integration stubs for OUTPUT-02 and OUTPUT-04
// These tests are RED until Plans 01+02 (phase 2) add Usage Examples and dependency role rendering.
//
// Uses generateInstructions() pipeline with a synthetic fixture, reads the generated file,
// and asserts on section placement and dependency format.

import { generateInstructions } from '../../src/generators/mdGenerator.js'
import { detectFolderPattern } from '../../src/analyzer/patternDetector.js'
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

let tmpDir
let generatedContent
let generatedContentWithDeps

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'skill-me-up-integration-'))

  // Write a JS file with a simple exported function
  const jsFile = [
    'export function processItem(item) {',
    '  return item.name.toUpperCase()',
    '}',
  ].join('\n')
  writeFileSync(join(tmpDir, 'processor.js'), jsFile, 'utf8')

  // Write a JS file with imports to test dependencies format
  const jsFileWithDeps = [
    "import { readFileSync } from 'fs'",
    "import { join } from 'path'",
    '',
    'export function loadConfig(dir) {',
    '  return JSON.parse(readFileSync(join(dir, "config.json"), "utf8"))',
    '}',
  ].join('\n')
  writeFileSync(join(tmpDir, 'loader.js'), jsFileWithDeps, 'utf8')

  // Build folderInfo for the tmp directory
  const folderInfo = {
    name: 'integration',
    relativePath: 'src/integration',
    path: tmpDir,
    codeFiles: ['processor.js', 'loader.js'],
    subdirNames: [],
    depth: 1,
  }

  const languageInfo = { lang: 'JavaScript', framework: 'None' }
  const projectMeta = { name: 'test-project' }

  // Use real detectFolderPattern to get patternInfo
  const patternInfo = detectFolderPattern(folderInfo)

  // Generate instructions file and read its content
  const outputPath = generateInstructions(folderInfo, patternInfo, languageInfo, projectMeta)
  generatedContent = readFileSync(outputPath, 'utf8')
  generatedContentWithDeps = generatedContent // same file for now
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

// ─── OUTPUT-02: integration section placement ─────────────────────────────────

describe('OUTPUT-02: integration section placement', () => {
  test('OUTPUT-02-integration: generated markdown contains "## Usage Examples" section header', () => {
    // Fails RED: Usage Examples section does not exist until Plan 01 (phase 2) implements it
    expect(generatedContent).toContain('## Usage Examples')
  })

  test('OUTPUT-02-order: "## Usage Examples" appears after "## Project Conventions" and before "## Classes & Interfaces"', () => {
    // Fails RED: no Usage Examples section yet; indexOf returns -1, order check fails
    const indexConventions = generatedContent.indexOf('## Project Conventions')
    const indexExamples = generatedContent.indexOf('## Usage Examples')
    const indexClasses = generatedContent.indexOf('## Classes & Interfaces')

    // Usage Examples must exist and be placed between Conventions and Classes
    expect(indexExamples).toBeGreaterThan(-1)
    if (indexConventions >= 0) {
      expect(indexExamples).toBeGreaterThan(indexConventions)
    }
    if (indexClasses >= 0) {
      expect(indexExamples).toBeLessThan(indexClasses)
    }
  })
})

// ─── OUTPUT-04: integration dependencies format ───────────────────────────────

describe('OUTPUT-04: integration dependencies format', () => {
  test('OUTPUT-04-integration: dependencies section uses " — role" format (contains " — " separator)', () => {
    // Fails RED: current format is bare dep name with no " — " role annotation
    const depsIdx = generatedContentWithDeps.indexOf('## Dependencies')
    if (depsIdx === -1) {
      // No deps section at all — fail RED
      expect(generatedContentWithDeps).toContain('## Dependencies')
      return
    }
    // Extract deps section content
    const afterDeps = generatedContentWithDeps.slice(depsIdx)
    // Should contain " — " separator for role annotation
    expect(afterDeps).toContain(' — ')
  })
})
