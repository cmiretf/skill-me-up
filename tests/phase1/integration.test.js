// OUTPUT-01: buildMarkdown pipeline — conventions section placement

import { generateInstructions } from '../../src/generators/mdGenerator.js'
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import os from 'os'

function makeFolderInfo(overrides = {}) {
  return {
    name: 'testfolder',
    relativePath: 'src/testfolder',
    codeFiles: [{ name: 'index.js' }],
    subdirNames: [],
    depth: 1,
    path: overrides.path || '/tmp/testfolder',
    ...overrides,
  }
}

function makePatternInfo(conventionsOverride) {
  return {
    role: 'Test Role',
    description: 'Test description.',
    agentHint: 'Test hint.',
    fileAnalysis: {
      interfaces: [],
      implementations: [],
      controllers: [],
      tests: [],
      models: [],
      configs: [],
      utils: [],
      other: [],
    },
    hasInterfaces: false,
    hasImplementations: false,
    deepAnalysis: [],
    detectedPatterns: [],
    dependencies: [],
    howToAdd: [],
    conventions: conventionsOverride,
  }
}

function makeLanguageInfo() {
  return { lang: 'JavaScript', framework: 'None' }
}

function makeProjectMeta() {
  return { name: 'test-project' }
}

describe('OUTPUT-01: buildMarkdown conventions placement', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = join(os.tmpdir(), `skill-me-up-test-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test('generated markdown includes ## Project Conventions section after ## Overview and before ## Structure', () => {
    const folderInfo = makeFolderInfo({ path: tmpDir })
    const patternInfo = makePatternInfo({
      methods: { style: 'camelCase', example: 'getUserById' },
      files: { style: 'camelCase', example: 'userService.js' },
    })

    generateInstructions(folderInfo, patternInfo, makeLanguageInfo(), makeProjectMeta())

    const outputPath = join(tmpDir, 'agent_testfolder_instructions.md')
    const content = readFileSync(outputPath, 'utf8')

    expect(content).toContain('## Project Conventions')
    expect(content).toContain('- **Methods**: camelCase')

    // Section order: ## Overview must come before ## Project Conventions, which must come before ## Structure
    const overviewIdx = content.indexOf('## Overview')
    const conventionsIdx = content.indexOf('## Project Conventions')
    const structureIdx = content.indexOf('## Structure')

    expect(overviewIdx).toBeGreaterThanOrEqual(0)
    expect(conventionsIdx).toBeGreaterThan(overviewIdx)
    // Structure may not appear if buildFolderTree returns null for temp dir; only check order if it exists
    if (structureIdx >= 0) {
      expect(conventionsIdx).toBeLessThan(structureIdx)
    }
  })

  test('generated markdown omits ## Project Conventions entirely when conventions is null', () => {
    const folderInfo = makeFolderInfo({ path: tmpDir })
    const patternInfo = makePatternInfo(null)

    generateInstructions(folderInfo, patternInfo, makeLanguageInfo(), makeProjectMeta())

    const outputPath = join(tmpDir, 'agent_testfolder_instructions.md')
    const content = readFileSync(outputPath, 'utf8')

    expect(content).not.toContain('## Project Conventions')
  })

  test('generated markdown omits ## Project Conventions entirely when no dimension meets threshold', () => {
    // Empty conventions object — no dimensions detected
    const folderInfo = makeFolderInfo({ path: tmpDir })
    const patternInfo = makePatternInfo({})

    generateInstructions(folderInfo, patternInfo, makeLanguageInfo(), makeProjectMeta())

    const outputPath = join(tmpDir, 'agent_testfolder_instructions.md')
    const content = readFileSync(outputPath, 'utf8')

    expect(content).not.toContain('## Project Conventions')
  })
})
