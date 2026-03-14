import { scanStructure } from './structureAnalyzer.js'
import { detectLanguage } from './languageDetector.js'
import { detectFolderPattern } from './patternDetector.js'
import { generateInstructions } from '../generators/mdGenerator.js'
import { generateLLMInstructions } from '../generators/llmGenerator.js'
import { readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'

/**
 * Main analysis orchestrator.
 * @param {string} projectPath - Absolute path to the project to analyze
 * @param {Object} options
 * @param {number} [options.maxDepth] - Max folder depth to scan
 * @param {boolean} [options.verbose] - Print progress to stdout
 */
export async function analyze(projectPath, options = {}) {
  const { maxDepth, verbose = true, llm, llmModel } = options

  log(verbose, `\n🔍 skill-me-up — Analyzing project at: ${projectPath}\n`)

  // 1. Detect language / framework
  const languageInfo = detectLanguage(projectPath)
  log(verbose, `  Language  : ${languageInfo.lang}`)
  log(verbose, `  Framework : ${languageInfo.framework}`)
  log(verbose, `  Runtime   : ${languageInfo.runtime}`)

  // 2. Read project name from package.json / pom.xml / folder name
  const projectMeta = readProjectMeta(projectPath)
  log(verbose, `  Project   : ${projectMeta.name}\n`)

  // 3. Scan directory structure
  const folders = scanStructure(projectPath, maxDepth)
  log(verbose, `  Found ${folders.length} relevant folder(s) to document.\n`)

  if (folders.length === 0) {
    log(verbose, '  No relevant folders found. Make sure you are running skill-me-up from the project root.\n')
    return { generated: [], skipped: [] }
  }

  // 4. For each folder: detect patterns + generate instructions.md
  const generated = []
  const skipped = []

  for (const folder of folders) {
    const patternInfo = detectFolderPattern(folder)
    const outputPath = generateInstructions(folder, patternInfo, languageInfo, projectMeta)
    generated.push(outputPath)
    log(verbose, `  ✓  ${folder.relativePath}/agent_${folder.name.toLowerCase()}_instructions.md`)
  }

  if (llm) {
    await generateLLMInstructions(generated, folders, { llmModel, verbose })
  } else {
    log(verbose, `\n✅ Done! Generated ${generated.length} instruction file(s).\n`)
  }

  return { generated, skipped }
}

function readProjectMeta(projectPath) {
  // Try package.json
  const pkgPath = join(projectPath, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      return { name: pkg.name || basename(projectPath), version: pkg.version || null }
    } catch { /* skip */ }
  }

  // Try pom.xml (extract artifactId)
  const pomPath = join(projectPath, 'pom.xml')
  if (existsSync(pomPath)) {
    try {
      const pom = readFileSync(pomPath, 'utf8')
      const match = pom.match(/<artifactId>([^<]+)<\/artifactId>/)
      if (match) return { name: match[1], version: null }
    } catch { /* skip */ }
  }

  // Try pyproject.toml
  const pyPath = join(projectPath, 'pyproject.toml')
  if (existsSync(pyPath)) {
    try {
      const toml = readFileSync(pyPath, 'utf8')
      const match = toml.match(/name\s*=\s*"([^"]+)"/)
      if (match) return { name: match[1], version: null }
    } catch { /* skip */ }
  }

  // Fallback to folder name
  return { name: basename(projectPath), version: null }
}

function log(verbose, msg) {
  if (verbose) process.stdout.write(msg + '\n')
}
