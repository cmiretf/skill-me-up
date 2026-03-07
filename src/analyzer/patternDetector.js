import { extname, basename } from 'path'
import { FOLDER_PATTERNS, FILE_PATTERNS } from '../config/patterns.js'

/**
 * Detects the architectural role and patterns of a folder based on its name and contents.
 * @param {Object} folderInfo - Folder metadata from structureAnalyzer
 * @returns {Object} Pattern detection result
 */
export function detectFolderPattern(folderInfo) {
  const nameLower = folderInfo.name.toLowerCase()

  // Match folder name against known patterns
  const matched = FOLDER_PATTERNS.find(p =>
    p.keywords.some(k => nameLower === k || nameLower.includes(k))
  )

  const fileAnalysis = analyzeFiles(folderInfo.codeFiles)

  return {
    pattern: matched || null,
    role: matched?.role || inferRoleFromFiles(fileAnalysis),
    description: matched?.description || 'General code folder.',
    agentHint: matched?.agentHint || 'Inspect the files inside to understand specific responsibilities.',
    fileAnalysis,
    hasInterfaces: fileAnalysis.interfaces.length > 0,
    hasImplementations: fileAnalysis.implementations.length > 0,
  }
}

/**
 * Analyzes each file in a folder to detect its role.
 * @param {string[]} files - List of file names
 * @returns {Object} Categorized files
 */
function analyzeFiles(files) {
  const result = {
    interfaces: [],
    implementations: [],
    controllers: [],
    tests: [],
    models: [],
    configs: [],
    utils: [],
    other: [],
  }

  for (const file of files) {
    const nameWithoutExt = basename(file, extname(file))
    const matched = detectFileRole(nameWithoutExt, file)
    const category = mapRoleToCategory(matched.role)
    result[category].push({ file, role: matched.role, note: matched.note })
  }

  return result
}

function detectFileRole(nameWithoutExt, fullName) {
  const nameLower = nameWithoutExt.toLowerCase()

  // Check suffix patterns (order matters — more specific first)
  for (const p of FILE_PATTERNS) {
    const suffixLower = p.suffix.toLowerCase()
    if (nameLower.endsWith(suffixLower)) {
      return { role: p.role, note: p.note }
    }
  }

  // Check common file names
  if (['index', 'main', 'app', 'server', 'bootstrap', 'init'].includes(nameLower)) {
    return { role: 'Entry Point', note: 'Main entry point or bootstrap file' }
  }

  if (nameLower.includes('test') || nameLower.includes('spec') || fullName.includes('.test.') || fullName.includes('.spec.')) {
    return { role: 'Test', note: 'Test file' }
  }

  if (nameLower.includes('config') || nameLower.includes('setting')) {
    return { role: 'Config', note: 'Configuration file' }
  }

  if (nameLower.includes('util') || nameLower.includes('helper') || nameLower.includes('tool')) {
    return { role: 'Utility', note: 'Utility / helper functions' }
  }

  if (nameLower.includes('type') || nameLower.includes('interface') || nameLower.includes('schema')) {
    return { role: 'Interface', note: 'Type definitions or interface' }
  }

  return { role: 'Module', note: 'General module' }
}

function mapRoleToCategory(role) {
  const map = {
    'Interface': 'interfaces',
    'DAO interface': 'interfaces',
    'Service interface': 'interfaces',
    'Implementation': 'implementations',
    'DAO implementation': 'implementations',
    'Service implementation': 'implementations',
    'Controller': 'controllers',
    'Test': 'tests',
    'Entity': 'models',
    'DTO': 'models',
    'Model': 'models',
    'Config': 'configs',
    'Utility': 'utils',
  }
  return map[role] || 'other'
}

function inferRoleFromFiles(fileAnalysis) {
  const { interfaces, implementations, controllers, models } = fileAnalysis
  if (controllers.length > 0) return 'HTTP / Presentation Layer'
  if (implementations.length > 0 && interfaces.length > 0) return 'Service / DAO Layer (interfaces + implementations)'
  if (implementations.length > 0) return 'Implementation Layer'
  if (interfaces.length > 0) return 'Interface / Contract Layer'
  if (models.length > 0) return 'Data Model Layer'
  return 'General Module'
}
