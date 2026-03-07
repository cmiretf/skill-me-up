import { readdirSync, statSync } from 'fs'
import { join, extname, basename, relative } from 'path'
import { IGNORED_DIRS, CODE_EXTENSIONS, MAX_DEPTH } from '../config/ignored.js'

/**
 * Scans a project and returns all folders that contain code files.
 * @param {string} projectPath - Root path of the project to analyze
 * @param {number} maxDepth - Maximum recursion depth (default: MAX_DEPTH)
 * @returns {FolderInfo[]} Array of relevant folders with their metadata
 */
export function scanStructure(projectPath, maxDepth = MAX_DEPTH) {
  const folders = []
  scan(projectPath, projectPath, 0, maxDepth, folders)
  return folders
}

function scan(rootPath, currentPath, depth, maxDepth, folders) {
  if (depth > maxDepth) return

  let entries
  try {
    entries = readdirSync(currentPath, { withFileTypes: true })
  } catch {
    return
  }

  const subdirs = entries.filter(e => e.isDirectory() && !IGNORED_DIRS.has(e.name))
  const codeFiles = entries.filter(e => e.isFile() && CODE_EXTENSIONS.has(extname(e.name)))
  const allFiles = entries.filter(e => e.isFile())

  // Include this folder if it has code files (skip the root itself at depth 0)
  if (depth > 0 && codeFiles.length > 0) {
    folders.push({
      path: currentPath,
      name: basename(currentPath),
      relativePath: relative(rootPath, currentPath),
      codeFiles: codeFiles.map(f => f.name),
      allFiles: allFiles.map(f => f.name),
      subdirNames: subdirs.map(d => d.name),
      depth,
    })
  }

  for (const dir of subdirs) {
    scan(rootPath, join(currentPath, dir.name), depth + 1, maxDepth, folders)
  }
}

/**
 * Builds a human-readable directory tree string for a folder (1 level deep).
 * @param {string} folderPath
 * @param {string} relativePath
 * @returns {string}
 */
export function buildFolderTree(folderPath, relativePath) {
  let entries
  try {
    entries = readdirSync(folderPath, { withFileTypes: true })
  } catch {
    return ''
  }

  const lines = [`${relativePath}/`]
  const sorted = [...entries].sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name)
  })

  sorted.forEach((entry, i) => {
    if (IGNORED_DIRS.has(entry.name)) return
    const isLast = i === sorted.length - 1
    const prefix = isLast ? '└── ' : '├── '
    const suffix = entry.isDirectory() ? '/' : ''
    lines.push(`  ${prefix}${entry.name}${suffix}`)
  })

  return lines.join('\n')
}
