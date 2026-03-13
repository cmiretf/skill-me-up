// Phase 3 — Wave 0: Failing integration stubs for OUTPUT-03
// These tests are RED until Plans 03-01 + 03-02 add antipattern detection and "## Don't Do" rendering.
//
// Uses generateInstructions() pipeline with synthetic fixtures, reads the generated content,
// and asserts on section presence, section content, and section placement.

import { generateInstructions } from '../../src/generators/mdGenerator.js'
import { detectFolderPattern } from '../../src/analyzer/patternDetector.js'
import { writeFileSync, mkdtempSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

let tmpDir
let antipatternContent
let noAntipatternContent

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'skill-me-up-p3-integration-'))

  // ── "Antipatterns present" fixture ──────────────────────────────────────────
  // Write 3 JS files each containing a function clearly > 40 lines — triggers longMethod rule

  function longMethodContent(name) {
    const lines = [`export function ${name}Handler(req, res) {`]
    for (let i = 1; i <= 45; i++) {
      lines.push(`  const step${i} = ${i}`)
    }
    lines.push('  return step45', '}')
    return lines.join('\n')
  }

  writeFileSync(join(tmpDir, 'alpha.js'), longMethodContent('alpha'), 'utf8')
  writeFileSync(join(tmpDir, 'beta.js'), longMethodContent('beta'), 'utf8')
  writeFileSync(join(tmpDir, 'gamma.js'), longMethodContent('gamma'), 'utf8')

  const antipatternFolderInfo = {
    name: 'antipattern-test',
    relativePath: 'src/antipattern-test',
    path: tmpDir,
    codeFiles: ['alpha.js', 'beta.js', 'gamma.js'],
    subdirNames: [],
    depth: 1,
  }

  const languageInfo = { lang: 'JavaScript', framework: 'None' }
  const projectMeta = { name: 'test-project' }

  // Use real detectFolderPattern to get patternInfo
  const antipatternPatternInfo = detectFolderPattern(antipatternFolderInfo)

  // Generate instructions and read the output file
  const outputPath1 = generateInstructions(antipatternFolderInfo, antipatternPatternInfo, languageInfo, projectMeta)
  antipatternContent = readFileSync(outputPath1, 'utf8')

  // ── "No antipatterns" fixture ────────────────────────────────────────────────
  // Write 3 JS files each with a short function (5 lines) — no rule clears the threshold

  function shortMethodContent(name) {
    return [
      `export function ${name}Fn(x) {`,
      '  const y = x + 1',
      '  const z = y * 2',
      '  return z',
      '}',
    ].join('\n')
  }

  writeFileSync(join(tmpDir, 'short1.js'), shortMethodContent('short1'), 'utf8')
  writeFileSync(join(tmpDir, 'short2.js'), shortMethodContent('short2'), 'utf8')
  writeFileSync(join(tmpDir, 'short3.js'), shortMethodContent('short3'), 'utf8')

  const noAntipatternFolderInfo = {
    name: 'no-antipattern-test',
    relativePath: 'src/no-antipattern-test',
    path: tmpDir,
    codeFiles: ['short1.js', 'short2.js', 'short3.js'],
    subdirNames: [],
    depth: 1,
  }

  const noAntipatternPatternInfo = detectFolderPattern(noAntipatternFolderInfo)
  const outputPath2 = generateInstructions(noAntipatternFolderInfo, noAntipatternPatternInfo, languageInfo, projectMeta)
  noAntipatternContent = readFileSync(outputPath2, 'utf8')
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

// ─── OUTPUT-03: "## Don't Do" section in generated markdown ──────────────────

describe('OUTPUT-03: Don\'t Do section in generated markdown', () => {
  // OUTPUT-03-1: "## Don't Do" appears when folder has 3+ files with longMethod antipattern
  test("OUTPUT-03-1: generated .md includes \"## Don't Do\" section when 3+ files trigger longMethod", () => {
    // Fails RED: detectFolderPattern does not yet attach antipatterns to patternInfo,
    // and buildMarkdown does not yet call buildDontDoSection
    expect(antipatternContent).toContain("## Don't Do")
  })

  // OUTPUT-03-2: "## Don't Do" is omitted entirely when no rule clears 3-file threshold
  test("OUTPUT-03-2: generated .md omits \"## Don't Do\" section when no antipattern threshold is met", () => {
    // This test will PASS once Output-03-1 is implemented correctly (no antipatterns → no section)
    // It starts RED indirectly: if the section is unconditionally emitted it will fail
    expect(noAntipatternContent).not.toContain("## Don't Do")
  })

  // OUTPUT-03-3: Section contains the blockquote disclaimer
  test('OUTPUT-03-3: "## Don\'t Do" section contains the blockquote disclaimer line', () => {
    // Fails RED: section does not exist yet
    expect(antipatternContent).toContain('> Heuristically detected')
  })

  // OUTPUT-03-4: Section placement — after ## Usage Examples, before ## Structure
  test("OUTPUT-03-4: \"## Don't Do\" appears after \"## Usage Examples\" and before \"## Structure\"", () => {
    // Fails RED: "## Don't Do" section does not exist yet
    const idxExamples = antipatternContent.indexOf('## Usage Examples')
    const idxDontDo = antipatternContent.indexOf("## Don't Do")
    const idxStructure = antipatternContent.indexOf('## Structure')

    if (idxDontDo === -1) {
      // Fail with a descriptive message — section missing
      expect(antipatternContent).toContain("## Don't Do")
      return
    }

    if (idxExamples !== -1) {
      expect(idxDontDo).toBeGreaterThan(idxExamples)
    }

    if (idxStructure !== -1) {
      expect(idxDontDo).toBeLessThan(idxStructure)
    }
  })
})
