export const IGNORED_DIRS = new Set([
  // Dependencies
  'node_modules', 'vendor', 'venv', 'env', '.venv',
  // Build outputs
  'dist', 'build', 'out', 'target', '.next', '.nuxt', '__pycache__',
  'bin', '.gradle', 'obj', 'coverage', '.nyc_output',
  // VCS & IDE
  '.git', '.svn', '.idea', '.vscode',
  // Cache & temp
  '.cache', 'tmp', 'temp', 'logs', '.tmp',
  // Static assets (no code logic)
  'public', 'static', 'assets', 'media', 'images', 'fonts',
])

export const CODE_EXTENSIONS = new Set([
  // JavaScript ecosystem
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.vue', '.svelte',
  // JVM
  '.java', '.kt', '.scala', '.groovy', '.clj',
  // Python
  '.py', '.pyw',
  // Systems
  '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.cs',
  // Scripting
  '.rb', '.php', '.swift', '.dart', '.ex', '.exs',
  // Shell
  '.sh', '.bash',
])

export const MIN_CODE_FILES = 1
export const MAX_DEPTH = 3
