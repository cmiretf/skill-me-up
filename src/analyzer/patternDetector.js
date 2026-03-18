import { extname, basename, join } from 'path'
import { readFileSync } from 'fs'
import { FOLDER_PATTERNS, FILE_PATTERNS } from '../config/patterns.js'

/**
 * Detects the architectural role and patterns of a folder based on its name and contents.
 * Also performs deep file analysis: reads file contents to extract classes, methods,
 * annotations, imports, and architectural patterns.
 * @param {Object} folderInfo - Folder metadata from structureAnalyzer
 * @returns {Object} Pattern detection result with deep analysis
 */
export function detectFolderPattern(folderInfo) {
  const nameLower = folderInfo.name.toLowerCase()

  // Match folder name against known patterns
  const matched = FOLDER_PATTERNS.find(p =>
    p.keywords.some(k => nameLower === k || nameLower.includes(k))
  )

  const fileAnalysis = analyzeFiles(folderInfo.codeFiles)

  // Deep analysis: read actual file contents
  const deepAnalysis = analyzeFileContents(folderInfo.path, folderInfo.codeFiles)

  // Detect architectural patterns from deep analysis
  const detectedPatterns = detectArchitecturalPatterns(deepAnalysis)

  // Extract cross-folder dependencies from imports
  const dependencies = extractDependencies(deepAnalysis, folderInfo.relativePath, folderInfo.path)

  // Generate contextual "how to add" instructions
  const howToAdd = generateHowToAdd(deepAnalysis, detectedPatterns, matched)

  // Detect naming conventions per folder (ENRICH-02)
  const conventions = detectConventions(deepAnalysis, folderInfo.codeFiles)

  // Extract usage examples from public methods (ENRICH-03)
  const examples = extractExamples(deepAnalysis, folderInfo.path, folderInfo.relativePath)

  // Detect antipatterns heuristically (ENRICH-04)
  const antipatterns = detectAntipatterns(deepAnalysis, folderInfo.path)

  return {
    pattern: matched || null,
    patternId: matched?.id || null,
    role: matched?.role || inferRoleFromFiles(fileAnalysis),
    description: matched?.description || 'General code folder.',
    agentHint: matched?.agentHint || 'Inspect the files inside to understand specific responsibilities.',
    fileAnalysis,
    deepAnalysis,
    detectedPatterns,
    dependencies,
    howToAdd,
    hasInterfaces: fileAnalysis.interfaces.length > 0,
    hasImplementations: fileAnalysis.implementations.length > 0,
    conventions,
    examples,
    antipatterns,
  }
}

/**
 * Reads the content of each code file and extracts structured metadata.
 * Supports Java, Kotlin, TypeScript, JavaScript, Python, Go, C#, PHP, Ruby.
 * @param {string} folderPath - Absolute path to the folder
 * @param {string[]} files - List of file names
 * @returns {Object[]} Array of file analysis objects
 */
function analyzeFileContents(folderPath, files) {
  const results = []

  for (const file of files) {
    const filePath = join(folderPath, file)
    let content
    try {
      content = readFileSync(filePath, 'utf8')
    } catch {
      results.push({ file, error: 'Could not read file', classInfo: null })
      continue
    }

    const ext = extname(file).toLowerCase()
    let analysis

    switch (ext) {
      case '.java':
        analysis = analyzeJava(content, file)
        break
      case '.kt':
        analysis = analyzeKotlin(content, file)
        break
      case '.ts':
      case '.tsx':
      case '.js':
      case '.jsx':
      case '.mjs':
        analysis = analyzeTypeScriptOrJs(content, file)
        break
      case '.py':
      case '.pyw':
        analysis = analyzePython(content, file)
        break
      case '.go':
        analysis = analyzeGo(content, file)
        break
      case '.cs':
        analysis = analyzeCSharp(content, file)
        break
      case '.php':
        analysis = analyzePhp(content, file)
        break
      case '.rb':
        analysis = analyzeRuby(content, file)
        break
      default:
        analysis = analyzeGeneric(content, file)
        break
    }

    results.push(analysis)
  }

  return results
}

// ─── Java Analyzer ───────────────────────────────────────────────────────────

function analyzeJava(content, file) {
  const imports = extractMatches(content, /^import\s+([\w.]+);/gm)
  const packageName = extractFirst(content, /^package\s+([\w.]+);/m)

  // Detect class/interface/enum/abstract/record
  const typeMatch = content.match(/(?:public\s+)?(?:(abstract)\s+)?(class|interface|enum|record|@interface)\s+(\w+)(?:\s+extends\s+([\w.<>, ]+))?(?:\s+implements\s+([\w.<>, ]+))?/)
  const classType = typeMatch ? (typeMatch[1] === 'abstract' ? 'abstract class' : typeMatch[2]) : 'unknown'
  const className = typeMatch ? typeMatch[3] : basename(file, extname(file))
  const extendsClass = typeMatch ? typeMatch[4] || null : null
  const implementsInterfaces = typeMatch ? (typeMatch[5] ? typeMatch[5].split(',').map(s => s.trim()) : []) : []

  // Extract annotations at class level
  const classAnnotations = extractMatches(content, /^(@\w+(?:\([^)]*\))?)\s*\n\s*(?:public\s+)?(?:abstract\s+)?(?:class|interface|enum|record)/gm)
    .map(a => a.replace(/\(.*\)/, '').trim())

  // Extract public methods with their annotations
  const methods = extractPublicMethods(content, 'java')

  // Extract field-level annotations (for entities)
  const fieldAnnotations = extractMatches(content, /@(Column|Id|GeneratedValue|ManyToOne|OneToMany|ManyToMany|OneToOne|JoinColumn|Embedded|Transient|Enumerated|Temporal)\b/g)
  const uniqueFieldAnnotations = [...new Set(fieldAnnotations)]

  // All annotations present in the file
  const allAnnotations = extractMatches(content, /@(\w+)/g)
  const uniqueAnnotations = [...new Set(allAnnotations)]

  return {
    file,
    language: 'Java',
    packageName,
    imports,
    classType,
    className,
    extendsClass,
    implementsInterfaces,
    classAnnotations,
    methods,
    fieldAnnotations: uniqueFieldAnnotations,
    allAnnotations: uniqueAnnotations,
  }
}

// ─── Kotlin Analyzer ─────────────────────────────────────────────────────────

function analyzeKotlin(content, file) {
  const imports = extractMatches(content, /^import\s+([\w.]+)/gm)
  const packageName = extractFirst(content, /^package\s+([\w.]+)/m)

  const typeMatch = content.match(/(?:(abstract|data|sealed|open|enum|annotation)\s+)?(class|interface|object)\s+(\w+)/)
  const modifier = typeMatch ? typeMatch[1] || '' : ''
  const baseType = typeMatch ? typeMatch[2] : 'unknown'
  const classType = modifier ? `${modifier} ${baseType}` : baseType
  const className = typeMatch ? typeMatch[3] : basename(file, extname(file))

  const classAnnotations = extractMatches(content, /^(@\w+(?:\([^)]*\))?)\s*\n\s*(?:(?:abstract|data|sealed|open|enum|annotation)\s+)?(?:class|interface|object)/gm)
    .map(a => a.replace(/\(.*\)/, '').trim())

  const methods = extractKotlinMethods(content)

  const allAnnotations = extractMatches(content, /@(\w+)/g)
  const uniqueAnnotations = [...new Set(allAnnotations)]

  return {
    file,
    language: 'Kotlin',
    packageName,
    imports,
    classType,
    className,
    extendsClass: null,
    implementsInterfaces: [],
    classAnnotations,
    methods,
    fieldAnnotations: [],
    allAnnotations: uniqueAnnotations,
  }
}

function extractKotlinMethods(content) {
  const methods = []
  const regex = /(?:(@\w+(?:\([^)]*\))?)\s+)?(?:(?:override|open|suspend|inline|internal|private|protected|public)\s+)*fun\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([\w<>, ?]+))?/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const annotation = match[1] ? match[1].replace(/\(.*\)/, '').trim() : null
    methods.push({
      name: match[2],
      params: match[3].trim(),
      returnType: match[4] || 'Unit',
      annotation,
      lineNumber: getLineNumber(content, match.index),
    })
  }
  return methods
}

// ─── TypeScript / JavaScript Analyzer ────────────────────────────────────────

function analyzeTypeScriptOrJs(content, file) {
  const imports = extractMatches(content, /(?:import\s+.*?from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g)
    .map(m => m.replace(/^import\s+.*?from\s+['"]/, '').replace(/['"].*/, '').replace(/require\(['"]/, '').replace(/['"]\)/, ''))

  // Re-extract cleaner imports
  const importPaths = []
  const importRegex = /(?:import\s+(?:[\w{},\s*]+)\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g
  let im
  while ((im = importRegex.exec(content)) !== null) {
    importPaths.push(im[1] || im[2])
  }

  // Detect class
  const classMatch = content.match(/(?:export\s+)?(?:(abstract)\s+)?class\s+(\w+)(?:\s+extends\s+([\w.]+))?(?:\s+implements\s+([\w., ]+))?/)
  const className = classMatch ? classMatch[2] : null

  // Detect interface
  const interfaceMatch = content.match(/(?:export\s+)?interface\s+(\w+)/)
  const interfaceName = interfaceMatch ? interfaceMatch[1] : null

  // Detect type alias
  const typeMatch = content.match(/(?:export\s+)?type\s+(\w+)\s*=/)
  const typeName = typeMatch ? typeMatch[1] : null

  // Detect exported functions
  const functions = []
  const fnRegex = /(?:export\s+(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\()/g
  let fn
  while ((fn = fnRegex.exec(content)) !== null) {
    functions.push({
      name: fn[1] || fn[2],
      params: '',
      returnType: '',
      annotation: null,
      lineNumber: getLineNumber(content, fn.index),
      isPublic: true,
    })
  }

  // Detect decorators (NestJS, Angular, etc.)
  const decorators = extractMatches(content, /@(\w+)\(/g)
  const uniqueDecorators = [...new Set(decorators)]

  const classType = classMatch
    ? (classMatch[1] === 'abstract' ? 'abstract class' : 'class')
    : interfaceName
      ? 'interface'
      : typeName
        ? 'type'
        : functions.length > 0
          ? 'module'
          : 'script'

  return {
    file,
    language: file.endsWith('.ts') || file.endsWith('.tsx') ? 'TypeScript' : 'JavaScript',
    packageName: null,
    imports: importPaths,
    classType,
    className: className || interfaceName || typeName || basename(file, extname(file)),
    extendsClass: classMatch ? classMatch[3] || null : null,
    implementsInterfaces: classMatch && classMatch[4] ? classMatch[4].split(',').map(s => s.trim()) : [],
    classAnnotations: uniqueDecorators,
    methods: functions,
    fieldAnnotations: [],
    allAnnotations: uniqueDecorators,
  }
}

// ─── Python Analyzer ─────────────────────────────────────────────────────────

function analyzePython(content, file) {
  const imports = []
  const importRegex = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm
  let im
  while ((im = importRegex.exec(content)) !== null) {
    imports.push(im[1] || im[2])
  }

  // Detect class
  const classMatch = content.match(/class\s+(\w+)(?:\(([^)]*)\))?:/)
  const className = classMatch ? classMatch[1] : null
  const bases = classMatch && classMatch[2] ? classMatch[2].split(',').map(s => s.trim()) : []
  const isAbstract = bases.some(b => b.includes('ABC') || b.includes('Abstract'))

  // Detect decorators on class
  const classDecorators = []
  if (classMatch) {
    const beforeClass = content.substring(0, classMatch.index)
    const lines = beforeClass.split('\n').reverse()
    for (const line of lines) {
      const dec = line.match(/^@(\w+)/)
      if (dec) classDecorators.push(dec[1])
      else if (line.trim()) break
    }
  }

  // Detect methods
  const methods = []
  const methodRegex = /(?:(@\w+)\s*\n\s*)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([\w\[\], ]+))?:/g
  let m
  while ((m = methodRegex.exec(content)) !== null) {
    if (!m[2].startsWith('_') || m[2] === '__init__') {
      methods.push({
        name: m[2],
        params: m[3].replace(/self,?\s*/, '').trim(),
        returnType: m[4] || '',
        annotation: m[1] || null,
        lineNumber: getLineNumber(content, m.index),
      })
    }
  }

  const classType = isAbstract ? 'abstract class' : className ? 'class' : 'module'

  return {
    file,
    language: 'Python',
    packageName: null,
    imports,
    classType,
    className: className || basename(file, extname(file)),
    extendsClass: bases.length > 0 ? bases[0] : null,
    implementsInterfaces: bases.slice(1),
    classAnnotations: classDecorators,
    methods,
    fieldAnnotations: [],
    allAnnotations: classDecorators,
  }
}

// ─── Go Analyzer ─────────────────────────────────────────────────────────────

function analyzeGo(content, file) {
  const packageName = extractFirst(content, /^package\s+(\w+)/m)
  const imports = extractMatches(content, /(?:"([\w./]+)")/g)

  // Detect structs
  const structs = extractMatches(content, /type\s+(\w+)\s+struct\b/g)
  // Detect interfaces
  const interfaces = extractMatches(content, /type\s+(\w+)\s+interface\b/g)

  const classType = interfaces.length > 0 ? 'interface' : structs.length > 0 ? 'struct' : 'package'
  const className = structs[0] || interfaces[0] || basename(file, extname(file))

  // Detect exported functions
  const methods = []
  const fnRegex = /func\s+(?:\((\w+)\s+\*?(\w+)\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s+(?:\(([^)]*)\)|(\w+)))?/g
  let fn
  while ((fn = fnRegex.exec(content)) !== null) {
    const name = fn[3]
    if (name[0] === name[0].toUpperCase()) { // exported
      methods.push({
        name,
        params: fn[4].trim(),
        returnType: fn[5] || fn[6] || '',
        annotation: fn[2] ? `receiver: ${fn[2]}` : null,
        lineNumber: getLineNumber(content, fn.index),
      })
    }
  }

  return {
    file,
    language: 'Go',
    packageName,
    imports,
    classType,
    className,
    extendsClass: null,
    implementsInterfaces: [],
    classAnnotations: [],
    methods,
    fieldAnnotations: [],
    allAnnotations: [],
  }
}

// ─── C# Analyzer ─────────────────────────────────────────────────────────────

function analyzeCSharp(content, file) {
  const namespaceName = extractFirst(content, /namespace\s+([\w.]+)/)
  const imports = extractMatches(content, /^using\s+([\w.]+);/gm)

  const typeMatch = content.match(/(?:public\s+)?(?:(abstract|static|sealed|partial)\s+)?(class|interface|enum|struct|record)\s+(\w+)/)
  const modifier = typeMatch ? typeMatch[1] || '' : ''
  const baseType = typeMatch ? typeMatch[2] : 'unknown'
  const classType = modifier ? `${modifier} ${baseType}` : baseType
  const className = typeMatch ? typeMatch[3] : basename(file, extname(file))

  const attributes = extractMatches(content, /\[(\w+)(?:\([^)]*\))?\]/g)
  const uniqueAttributes = [...new Set(attributes)]

  const methods = []
  const methodRegex = /(?:\[(\w+)(?:\([^)]*\))?\]\s*)?(?:public|protected)\s+(?:(?:async|static|virtual|override|abstract)\s+)*(?:([\w<>,? ]+)\s+)?(\w+)\s*\(([^)]*)\)/g
  let m
  while ((m = methodRegex.exec(content)) !== null) {
    methods.push({
      name: m[3],
      params: m[4].trim(),
      returnType: m[2] || 'void',
      annotation: m[1] || null,
      lineNumber: getLineNumber(content, m.index),
    })
  }

  return {
    file,
    language: 'C#',
    packageName: namespaceName,
    imports,
    classType,
    className,
    extendsClass: null,
    implementsInterfaces: [],
    classAnnotations: uniqueAttributes,
    methods,
    fieldAnnotations: [],
    allAnnotations: uniqueAttributes,
  }
}

// ─── PHP Analyzer ────────────────────────────────────────────────────────────

function analyzePhp(content, file) {
  const namespaceName = extractFirst(content, /namespace\s+([\w\\]+);/)
  const imports = extractMatches(content, /^use\s+([\w\\]+)/gm)

  const typeMatch = content.match(/(?:(abstract|final)\s+)?(class|interface|trait|enum)\s+(\w+)/)
  const modifier = typeMatch ? typeMatch[1] || '' : ''
  const baseType = typeMatch ? typeMatch[2] : 'unknown'
  const classType = modifier ? `${modifier} ${baseType}` : baseType
  const className = typeMatch ? typeMatch[3] : basename(file, extname(file))

  const methods = []
  const methodRegex = /public\s+(?:static\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([\w?|\\]+))?/g
  let m
  while ((m = methodRegex.exec(content)) !== null) {
    methods.push({
      name: m[1],
      params: m[2].trim(),
      returnType: m[3] || '',
      annotation: null,
      lineNumber: getLineNumber(content, m.index),
    })
  }

  return {
    file,
    language: 'PHP',
    packageName: namespaceName,
    imports,
    classType,
    className,
    extendsClass: null,
    implementsInterfaces: [],
    classAnnotations: [],
    methods,
    fieldAnnotations: [],
    allAnnotations: [],
  }
}

// ─── Ruby Analyzer ───────────────────────────────────────────────────────────

function analyzeRuby(content, file) {
  const classMatch = content.match(/class\s+(\w+)(?:\s*<\s*([\w:]+))?/)
  const moduleMatch = content.match(/module\s+(\w+)/)
  const className = classMatch ? classMatch[1] : moduleMatch ? moduleMatch[1] : basename(file, '.rb')
  const classType = classMatch ? 'class' : moduleMatch ? 'module' : 'script'
  const extendsClass = classMatch ? classMatch[2] || null : null

  const methods = []
  const methodRegex = /def\s+(?:self\.)?(\w+)(?:\(([^)]*)\))?/g
  let m
  while ((m = methodRegex.exec(content)) !== null) {
    if (!m[1].startsWith('_')) {
      methods.push({
        name: m[1],
        params: m[2] || '',
        returnType: '',
        annotation: null,
        lineNumber: getLineNumber(content, m.index),
      })
    }
  }

  return {
    file,
    language: 'Ruby',
    packageName: null,
    imports: [],
    classType,
    className,
    extendsClass,
    implementsInterfaces: [],
    classAnnotations: [],
    methods,
    fieldAnnotations: [],
    allAnnotations: [],
  }
}

// ─── Generic Analyzer ────────────────────────────────────────────────────────

function analyzeGeneric(content, file) {
  const lineCount = content.split('\n').length
  return {
    file,
    language: extname(file).replace('.', '').toUpperCase(),
    packageName: null,
    imports: [],
    classType: 'file',
    className: basename(file, extname(file)),
    extendsClass: null,
    implementsInterfaces: [],
    classAnnotations: [],
    methods: [],
    fieldAnnotations: [],
    allAnnotations: [],
    lineCount,
  }
}

// ─── Architectural Pattern Detection ─────────────────────────────────────────

function detectArchitecturalPatterns(deepAnalysis) {
  const patterns = []
  const allAnnotations = new Set()
  const allClassTypes = new Set()

  for (const fa of deepAnalysis) {
    if (fa.allAnnotations) fa.allAnnotations.forEach(a => allAnnotations.add(a))
    if (fa.classType) allClassTypes.add(fa.classType)
  }

  // REST API
  if (allAnnotations.has('RestController') || allAnnotations.has('GetMapping') || allAnnotations.has('PostMapping') ||
      allAnnotations.has('RequestMapping') || allAnnotations.has('PutMapping') || allAnnotations.has('DeleteMapping')) {
    patterns.push({ id: 'rest-api', label: 'REST API (Spring MVC)', description: 'Exposes HTTP endpoints via Spring @RestController. Methods are mapped to HTTP verbs using @GetMapping, @PostMapping, etc.' })
  }

  // Spring Controller (non-REST)
  if (allAnnotations.has('Controller') && !allAnnotations.has('RestController')) {
    patterns.push({ id: 'mvc-controller', label: 'Spring MVC Controller', description: 'Handles HTTP requests and returns view names (server-side rendering). Uses @Controller with @RequestMapping.' })
  }

  // Spring Service
  if (allAnnotations.has('Service')) {
    patterns.push({ id: 'spring-service', label: 'Spring Service Layer', description: 'Business logic annotated with @Service. Managed by Spring IoC container, injected into controllers.' })
  }

  // Spring Repository / Data Access
  if (allAnnotations.has('Repository') || allAnnotations.has('Dao')) {
    patterns.push({ id: 'spring-repository', label: 'Spring Data Repository', description: 'Data access layer annotated with @Repository. Typically extends JpaRepository or CrudRepository.' })
  }

  // JPA Entity
  if (allAnnotations.has('Entity') || allAnnotations.has('Table')) {
    patterns.push({ id: 'jpa-entity', label: 'JPA Entity', description: 'Persistent domain objects mapped to database tables via @Entity and @Table annotations.' })
  }

  // Spring Component
  if (allAnnotations.has('Component')) {
    patterns.push({ id: 'spring-component', label: 'Spring Component', description: 'General Spring-managed bean annotated with @Component.' })
  }

  // Spring Configuration
  if (allAnnotations.has('Configuration') || allAnnotations.has('Bean')) {
    patterns.push({ id: 'spring-config', label: 'Spring Configuration', description: 'Java-based configuration using @Configuration and @Bean to define Spring beans.' })
  }

  // Dependency Injection
  if (allAnnotations.has('Autowired') || allAnnotations.has('Inject') || allAnnotations.has('Value')) {
    patterns.push({ id: 'dependency-injection', label: 'Dependency Injection', description: 'Uses constructor/field injection (@Autowired, @Inject) for loose coupling between components.' })
  }

  // Transactional
  if (allAnnotations.has('Transactional')) {
    patterns.push({ id: 'transactional', label: 'Transaction Management', description: 'Methods/classes annotated with @Transactional for declarative transaction management.' })
  }

  // NestJS patterns
  if (allAnnotations.has('Injectable') || allAnnotations.has('Module')) {
    patterns.push({ id: 'nestjs', label: 'NestJS Module/Injectable', description: 'NestJS dependency injection pattern using @Injectable and @Module decorators.' })
  }

  // Interface/Implementation pattern
  const hasInterface = deepAnalysis.some(fa => fa.classType === 'interface')
  const hasImpl = deepAnalysis.some(fa => fa.implementsInterfaces && fa.implementsInterfaces.length > 0)
  if (hasInterface && hasImpl) {
    patterns.push({ id: 'interface-impl', label: 'Interface-Implementation Pattern', description: 'Contracts are defined as interfaces with separate concrete implementations, enabling polymorphism and testability.' })
  }

  // DAO pattern
  const hasDao = deepAnalysis.some(fa => fa.className && (fa.className.includes('Dao') || fa.className.includes('DAO')))
  if (hasDao) {
    patterns.push({ id: 'dao-pattern', label: 'DAO Pattern', description: 'Data Access Object pattern abstracts database operations behind interfaces.' })
  }

  // Abstract class / Template Method
  const hasAbstract = deepAnalysis.some(fa => fa.classType === 'abstract class')
  if (hasAbstract) {
    patterns.push({ id: 'template-method', label: 'Template Method / Abstract Class', description: 'Uses abstract classes to define skeleton algorithms, with subclasses providing specific steps.' })
  }

  // Enum-based patterns
  const hasEnum = deepAnalysis.some(fa => fa.classType === 'enum')
  if (hasEnum) {
    patterns.push({ id: 'enum-constants', label: 'Enum Constants', description: 'Uses enums to define a fixed set of constants, often representing states, types, or configuration values.' })
  }

  // Python decorators
  if (allAnnotations.has('app') || allAnnotations.has('router') || allAnnotations.has('api_view')) {
    patterns.push({ id: 'python-api', label: 'Python API endpoints', description: 'Uses decorator-based routing (@app.route, @router) to define API endpoints.' })
  }

  // Go struct pattern
  const hasStruct = deepAnalysis.some(fa => fa.classType === 'struct')
  if (hasStruct) {
    patterns.push({ id: 'go-struct', label: 'Go Struct Pattern', description: 'Defines data structures with methods attached via receivers.' })
  }

  return patterns
}

// ─── Dependency Extraction ───────────────────────────────────────────────────

const NODE_BUILTINS = {
  fs: 'file system reads/writes',
  path: 'path manipulation',
  os: 'OS info',
  http: 'HTTP server/client',
  https: 'HTTPS requests',
  crypto: 'cryptographic operations',
  util: 'Node.js utilities',
  events: 'event emitter',
  stream: 'stream processing',
  url: 'URL parsing/formatting',
  child_process: 'spawning child processes',
  readline: 'line-by-line input',
  net: 'TCP/IPC networking',
  buffer: 'binary data handling',
  querystring: 'query string parsing',
}

function inferDepRole(depPath, allDeepAnalysis, folderPath) {
  const segment = depPath.split('/').pop().replace(/\.\w+$/, '')
  if (NODE_BUILTINS[segment]) return NODE_BUILTINS[segment]

  // Call-site scan: extract named import bindings from file content
  const escapedPath = depPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const namedImportRe = new RegExp(
    `import\\s+\\{([^}]+)\\}\\s+from\\s+['"]${escapedPath}['"]`
  )
  const calledNames = new Set()
  for (const fa of allDeepAnalysis) {
    if (!fa.imports) continue
    const imports = fa.imports || []
    if (!imports.some(imp => imp === depPath || imp.endsWith('/' + segment))) continue

    // Resolve file content: prefer fa.content (fixture/cached), fallback to readFileSync
    let content = fa.content || null
    if (!content && folderPath && fa.file) {
      try { content = readFileSync(join(folderPath, fa.file), 'utf8') } catch (_) {}
    }
    if (!content) continue

    const m = content.match(namedImportRe)
    if (m) {
      m[1].split(',')
        .map(n => n.trim().split(/\s+as\s+/)[0].trim())
        .filter(Boolean)
        .forEach(n => calledNames.add(n))
    }
  }

  if (calledNames.size > 0) {
    return [...calledNames].slice(0, 3).join(', ')
  }

  // Fallback: derive from path segment
  return segment.replace(/[-_]/g, ' ')
}

export function extractDependencies(deepAnalysis, currentRelativePath, folderPath) {
  const deps = new Set()
  const currentParts = currentRelativePath.split('/')

  for (const fa of deepAnalysis) {
    if (!fa.imports) continue
    for (const imp of fa.imports) {
      // For Java: com.example.service.UserService -> extract "service"
      if (fa.language === 'Java' || fa.language === 'Kotlin') {
        const parts = imp.split('.')
        // Skip standard library imports
        if (parts[0] === 'java' || parts[0] === 'javax' || parts[0] === 'org' && parts[1] === 'springframework') continue
        if (parts[0] === 'lombok' || parts[0] === 'com' && parts[1] === 'fasterxml') continue
        // Try to find a folder reference in the import path
        if (parts.length >= 3) {
          const folderName = parts[parts.length - 2]
          if (folderName !== currentParts[currentParts.length - 1]) {
            deps.add(folderName)
          }
        }
      }
      // For JS/TS: relative imports and bare package/builtin imports
      else if (fa.language === 'JavaScript' || fa.language === 'TypeScript') {
        if (imp.startsWith('.')) {
          // Relative import: keep full path for role inference
          deps.add(imp)
        } else {
          // Non-relative: builtin or npm package (e.g. 'fs', 'path', 'express')
          deps.add(imp)
        }
      }
      // For Python: from package.module import ...
      else if (fa.language === 'Python') {
        const parts = imp.split('.')
        if (parts.length >= 2) {
          const folderName = parts[parts.length - 1] !== '*' ? parts[parts.length - 1] : parts[parts.length - 2]
          if (folderName !== currentParts[currentParts.length - 1]) {
            deps.add(folderName)
          }
        }
      }
      // For Go: imports are package paths
      else if (fa.language === 'Go') {
        const parts = imp.split('/')
        if (parts.length >= 2) {
          const folderName = parts[parts.length - 1]
          if (folderName !== currentParts[currentParts.length - 1]) {
            deps.add(folderName)
          }
        }
      }
      // For C#: using statements
      else if (fa.language === 'C#') {
        const parts = imp.split('.')
        if (parts.length >= 2 && parts[0] !== 'System' && parts[0] !== 'Microsoft') {
          const folderName = parts[parts.length - 1]
          if (folderName !== currentParts[currentParts.length - 1]) {
            deps.add(folderName)
          }
        }
      }
    }
  }

  return [...deps].sort().map(dep => ({
    path: dep,
    role: inferDepRole(dep, deepAnalysis, folderPath)
  }))
}

// ─── How To Add Instructions ─────────────────────────────────────────────────

function generateHowToAdd(deepAnalysis, detectedPatterns, matchedFolderPattern) {
  const instructions = []
  const patternIds = new Set(detectedPatterns.map(p => p.id))

  if (patternIds.has('rest-api')) {
    instructions.push({
      title: 'Add a new REST endpoint',
      steps: [
        'Create a new method in the existing @RestController class (or create a new controller class annotated with @RestController).',
        'Annotate the method with the appropriate HTTP verb: @GetMapping("/path"), @PostMapping("/path"), @PutMapping("/path/{id}"), or @DeleteMapping("/path/{id}").',
        'Define the request/response DTOs if needed (in the models/dto folder).',
        'Inject the required service via constructor injection.',
        'Delegate business logic to the service layer -- do NOT put logic directly in the controller.',
      ],
    })
  }

  if (patternIds.has('mvc-controller')) {
    instructions.push({
      title: 'Add a new MVC view endpoint',
      steps: [
        'Add a new method annotated with @GetMapping or @PostMapping.',
        'Return a String with the view template name.',
        'Add model attributes via the Model parameter.',
        'Create the corresponding template file in the templates/ folder.',
      ],
    })
  }

  if (patternIds.has('spring-service')) {
    instructions.push({
      title: 'Add a new service method',
      steps: [
        'If an interface exists for this service, add the method signature to the interface first.',
        'Implement the method in the @Service class.',
        'Inject any required repositories or other services via constructor injection.',
        'Add @Transactional if the method modifies data.',
        'Write a unit test for the new method.',
      ],
    })
  }

  if (patternIds.has('spring-repository')) {
    instructions.push({
      title: 'Add a new repository / data access method',
      steps: [
        'If using Spring Data JPA, add a method to the repository interface following the naming convention (e.g., findByEmail, findAllByStatus).',
        'For custom queries, use @Query annotation with JPQL or native SQL.',
        'If using the DAO pattern, add the method to the DAO interface, then implement it in the DaoImpl class.',
      ],
    })
  }

  if (patternIds.has('jpa-entity')) {
    instructions.push({
      title: 'Add a new entity',
      steps: [
        'Create a new class annotated with @Entity and @Table(name = "table_name").',
        'Add an @Id field with @GeneratedValue for the primary key.',
        'Map fields to columns using @Column (optional if names match).',
        'Define relationships with @ManyToOne, @OneToMany, @ManyToMany, @OneToOne as needed.',
        'Add a corresponding repository interface extending JpaRepository<Entity, IdType>.',
      ],
    })
  }

  if (patternIds.has('dao-pattern')) {
    instructions.push({
      title: 'Add a new DAO',
      steps: [
        'Create an interface defining the data access contract (e.g., UserDao).',
        'Create an implementation class (e.g., UserDaoImpl) annotated with @Repository.',
        'Inject the data source (EntityManager, JdbcTemplate, etc.) via constructor.',
        'Implement each method with the appropriate query logic.',
      ],
    })
  }

  if (patternIds.has('interface-impl')) {
    instructions.push({
      title: 'Add a new interface + implementation',
      steps: [
        'Define the contract in a new interface file.',
        'Create a concrete implementation class in the same or a sibling folder.',
        'Register the implementation with the DI container (@Service, @Component, @Repository, etc.).',
        'Use the interface type (not the implementation) when injecting into other classes.',
      ],
    })
  }

  if (patternIds.has('nestjs')) {
    instructions.push({
      title: 'Add a new NestJS provider/service',
      steps: [
        'Create a new class annotated with @Injectable().',
        'Register it in the module\'s providers array.',
        'Inject it into controllers or other services via constructor injection.',
      ],
    })
  }

  // Fallback based on folder pattern
  if (instructions.length === 0 && matchedFolderPattern) {
    const id = matchedFolderPattern.id
    if (id === 'controller') {
      instructions.push({
        title: 'Add a new controller/handler',
        steps: [
          'Create a new file following the naming convention of existing controllers in this folder.',
          'Define request handling methods for each HTTP endpoint.',
          'Inject required services and delegate business logic to them.',
          'Register the controller in the framework\'s routing configuration if required.',
        ],
      })
    } else if (id === 'service') {
      instructions.push({
        title: 'Add a new service',
        steps: [
          'Create a new file following the naming convention of existing services.',
          'Define public methods for each business operation.',
          'Inject repositories/DAOs needed for data access.',
          'Keep business rules and validation logic here.',
        ],
      })
    } else if (id === 'dao' || id === 'model') {
      instructions.push({
        title: `Add a new ${id === 'dao' ? 'data access class' : 'model/entity'}`,
        steps: [
          `Create a new file following the naming convention in this folder.`,
          `Follow the same patterns used by existing files (annotations, base classes, etc.).`,
          `Update any related classes that need to reference the new ${id}.`,
        ],
      })
    } else {
      instructions.push({
        title: `Add new code to this ${matchedFolderPattern.role} folder`,
        steps: [
          'Follow the naming convention and structure of existing files in this folder.',
          matchedFolderPattern.agentHint,
        ],
      })
    }
  }

  return instructions
}

// ─── Java Method Extraction ──────────────────────────────────────────────────

function extractPublicMethods(content, language) {
  const methods = []

  if (language === 'java') {
    // Match methods with optional annotations, visibility, return type, name, and parameters
    const methodRegex = /(?:(@\w+(?:\([^)]*\))?)\s+)?(?:public|protected)\s+(?:(?:static|final|synchronized|abstract|default)\s+)*(?:([\w<>,? \[\]]+)\s+)?(\w+)\s*\(([^)]*)\)/g
    let match
    while ((match = methodRegex.exec(content)) !== null) {
      // Skip constructors (name equals class name)
      const className = extractFirst(content, /(?:class|interface|enum)\s+(\w+)/)
      if (match[3] === className) continue

      methods.push({
        name: match[3],
        params: match[4].trim(),
        returnType: match[2] || 'void',
        annotation: match[1] ? match[1].replace(/\(.*\)/, '').trim() : null,
        lineNumber: getLineNumber(content, match.index),
      })
    }
  }

  return methods
}

// ─── Convention Detection ─────────────────────────────────────────────────────

/**
 * Classifies a single identifier into a naming style bucket.
 * Single-word identifiers (no separator or case change) return null — unclassifiable.
 * @param {string} name
 * @returns {'camelCase'|'PascalCase'|'snake_case'|'SCREAMING_SNAKE_CASE'|'kebab-case'|null}
 */
function classifyNameStyle(name) {
  if (!name || name.length === 0) return null
  if (/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(name)) return 'SCREAMING_SNAKE_CASE'
  if (/^[A-Z][a-zA-Z0-9]*$/.test(name) && /[a-z]/.test(name)) return 'PascalCase'
  if (/^[a-z][a-zA-Z0-9]*$/.test(name) && !name.includes('_') && /[A-Z]/.test(name)) return 'camelCase'
  if (/^[a-z][a-z0-9_]*$/.test(name) && name.includes('_')) return 'snake_case'
  if (/^[a-z][a-z0-9-]*$/.test(name) && name.includes('-')) return 'kebab-case'
  return null  // single word, mixed, or other — not classifiable
}

/**
 * Classifies an import path into an import style bucket.
 * @param {string} importPath
 * @returns {'relative-with-extension'|'relative-bare'|'absolute-bare'|null}
 */
function classifyImportStyle(importPath) {
  if (!importPath) return null
  if (importPath.startsWith('.') && importPath.endsWith('.js')) return 'relative-with-extension'
  if (importPath.startsWith('.') && !importPath.endsWith('.js')) return 'relative-bare'
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) return 'absolute-bare'
  return null
}

/**
 * Returns the dominant style from a tally map if it meets the minimum threshold.
 * @param {Object} tally - { styleName: count }
 * @param {number} minSamples - Minimum total samples required (default 5)
 * @param {number} minRatio - Minimum proportion for dominant style (default 0.6)
 * @returns {string|null} Dominant style name or null
 */
function dominantStyle(tally, minSamples = 5, minRatio = 0.6) {
  const entries = Object.entries(tally)
  if (entries.length === 0) return null
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  if (total < minSamples) return null
  const sorted = entries.sort((a, b) => b[1] - a[1])
  if (sorted[0][1] / total >= minRatio) return sorted[0][0]
  return null
}

/**
 * Detects naming conventions per folder from deep analysis results and code file list.
 * Applies 5-sample / 60%-ratio threshold before reporting any dimension.
 * Multi-language folders are handled by grouping per language.
 * @param {Object[]} deepAnalysis - Array of file analysis objects from analyzeFileContents
 * @param {string[]} codeFiles - Array of code file basenames (already CODE_EXTENSIONS filtered)
 * @returns {Object|null} Conventions object or null if no dimension meets threshold
 */
function detectConventions(deepAnalysis, codeFiles) {
  const byLanguage = {}

  // Group deepAnalysis entries by language
  for (const fa of deepAnalysis) {
    if (fa.error) continue
    const lang = fa.language || 'unknown'
    if (!byLanguage[lang]) byLanguage[lang] = []
    byLanguage[lang].push(fa)
  }

  const perLangResults = []

  for (const [lang, entries] of Object.entries(byLanguage)) {
    const mTally = {}
    const mExamples = {}
    const cTally = {}
    const cExamples = {}

    for (const fa of entries) {
      for (const method of (fa.methods || [])) {
        const style = classifyNameStyle(method.name)
        if (!style) continue
        mTally[style] = (mTally[style] || 0) + 1
        if (!mExamples[style]) mExamples[style] = method.name
      }
      if (fa.className) {
        const style = classifyNameStyle(fa.className)
        if (style) {
          cTally[style] = (cTally[style] || 0) + 1
          if (!cExamples[style]) cExamples[style] = fa.className
        }
      }
    }

    const mStyle = dominantStyle(mTally)
    const cStyle = dominantStyle(cTally)

    perLangResults.push({
      lang,
      methods: mStyle ? { style: mStyle, example: mExamples[mStyle], lang } : null,
      classes: cStyle ? { style: cStyle, example: cExamples[cStyle], lang } : null,
    })
  }

  // Flatten: if single language, use plain style; if multiple languages with same style, collapse
  let methodResult = null
  let classResult = null

  const methodResults = perLangResults.filter(r => r.methods !== null)
  const classResults = perLangResults.filter(r => r.classes !== null)

  if (methodResults.length === 1) {
    methodResult = { style: methodResults[0].methods.style, example: methodResults[0].methods.example }
  } else if (methodResults.length > 1) {
    const allSameStyle = methodResults.every(r => r.methods.style === methodResults[0].methods.style)
    if (allSameStyle) {
      methodResult = { style: methodResults[0].methods.style, example: methodResults[0].methods.example }
    } else {
      methodResult = methodResults.map(r => ({
        style: r.methods.style,
        example: r.methods.example,
        lang: r.lang,
      }))
    }
  }

  if (classResults.length === 1) {
    classResult = { style: classResults[0].classes.style, example: classResults[0].classes.example }
  } else if (classResults.length > 1) {
    const allSameStyle = classResults.every(r => r.classes.style === classResults[0].classes.style)
    if (allSameStyle) {
      classResult = { style: classResults[0].classes.style, example: classResults[0].classes.example }
    } else {
      classResult = classResults.map(r => ({
        style: r.classes.style,
        example: r.classes.example,
        lang: r.lang,
      }))
    }
  }

  // File naming — from codeFiles list (already CODE_EXTENSIONS filtered)
  const fTally = {}
  const fExamples = {}
  for (const filename of (codeFiles || [])) {
    const stem = basename(filename, extname(filename))
    const style = classifyNameStyle(stem)
    if (!style) continue
    fTally[style] = (fTally[style] || 0) + 1
    if (!fExamples[style]) fExamples[style] = filename
  }
  const fileStyle = dominantStyle(fTally)
  const fileResult = fileStyle ? { style: fileStyle, example: fExamples[fileStyle] } : null

  // Import style — from all deepAnalysis imports
  const iTally = {}
  const iExamples = {}
  for (const fa of deepAnalysis) {
    if (fa.error || !fa.imports) continue
    for (const imp of fa.imports) {
      const style = classifyImportStyle(imp)
      if (!style) continue
      iTally[style] = (iTally[style] || 0) + 1
      if (!iExamples[style]) iExamples[style] = imp
    }
  }
  const importStyle = dominantStyle(iTally)
  const importResult = importStyle ? { style: importStyle, example: iExamples[importStyle] } : null

  // Build result — omit null dimensions
  const result = {}
  if (methodResult) result.methods = methodResult
  if (classResult)  result.classes = classResult
  if (fileResult)   result.files   = fileResult
  if (importResult) result.imports = importResult

  return Object.keys(result).length > 0 ? result : null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractMatches(content, regex) {
  const results = []
  let match
  while ((match = regex.exec(content)) !== null) {
    results.push(match[1] || match[0])
  }
  return results
}

function extractFirst(content, regex) {
  const match = content.match(regex)
  return match ? match[1] : null
}

/**
 * Computes 1-based line number of a match from its index in the content string.
 * @param {string} content - Full file content
 * @param {number} matchIndex - match.index from regex exec
 * @returns {number} 1-based line number
 */
function getLineNumber(content, matchIndex) {
  return content.substring(0, matchIndex).split('\n').length
}

// ─── Original functions (kept for backward compat) ───────────────────────────

/**
 * Analyzes each file in a folder to detect its role (by name only).
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

  // Check suffix patterns (order matters -- more specific first)
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

// ─── Usage Examples Extraction (ENRICH-03) ───────────────────────────────────

/**
 * Removes minimum leading whitespace from all non-empty lines (dedent).
 * @param {string[]} lines
 * @returns {string[]}
 */
function dedent(lines) {
  const nonEmpty = lines.filter(l => l.trim().length > 0)
  if (nonEmpty.length === 0) return lines
  const minIndent = Math.min(...nonEmpty.map(l => l.match(/^(\s*)/)[1].length))
  return lines.map(l => l.slice(minIndent))
}

/**
 * Extracts a method body starting at the given 1-based line number.
 * Uses brace-depth walking. Handles expression-body arrows (no braces).
 * @param {string} content - Full file content
 * @param {number} startLineNumber - 1-based line number of the method signature
 * @param {number} maxLines - Maximum lines to capture (default 15)
 * @returns {string[]} Dedented snippet lines
 */
function extractMethodBody(content, startLineNumber, maxLines = 15) {
  const lines = content.split('\n')
  const startIdx = startLineNumber - 1 // 0-indexed
  if (startIdx < 0 || startIdx >= lines.length) return []

  const slice = []
  let depth = 0
  let bodyStarted = false
  let foundBrace = false

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    slice.push(line)

    for (const ch of line) {
      if (ch === '{') { depth++; foundBrace = true; bodyStarted = true }
      if (ch === '}') { depth-- }
    }

    // Expression-body arrow: first line pushed, no brace found yet
    if (slice.length === 1 && !foundBrace) {
      return dedent([line])
    }

    // Body closed
    if (bodyStarted && depth === 0) break

    // Reached max lines limit
    if (slice.length >= maxLines) {
      if (depth > 0) slice.push('  // ... (truncated)')
      break
    }
  }

  return dedent(slice)
}

/**
 * Extracts up to 2 code examples from public methods in deepAnalysis entries.
 * @param {Object[]} deepAnalysis - Array of file analysis objects
 * @param {string} folderPath - Absolute path to folder
 * @param {string} [folderRelativePath=''] - Relative path prefix for relativePath construction
 * @returns {Object[]} Array of { methodName, relativePath, lineNumber, lang, snippet }
 */
export function extractExamples(deepAnalysis, folderPath, folderRelativePath = '') {
  if (!deepAnalysis || deepAnalysis.length === 0) return []

  const examples = []

  for (const fa of deepAnalysis) {
    if (examples.length >= 2) break
    if (fa.error) continue
    if (!fa.methods || fa.methods.length === 0) continue

    const publicMethods = fa.methods.filter(m => m.isPublic === true)
    if (publicMethods.length === 0) continue

    const method = publicMethods[0]

    let content
    try {
      content = readFileSync(join(folderPath, fa.file), 'utf8')
    } catch {
      continue
    }

    const snippet = extractMethodBody(content, method.lineNumber)
    const relPath = folderRelativePath
      ? join(folderRelativePath, fa.file).replace(/\\/g, '/')
      : fa.file

    examples.push({
      methodName: method.name,
      relativePath: relPath,
      lineNumber: method.lineNumber,
      lang: fa.language,
      snippet,
    })
  }

  return examples
}

// ─── Antipattern Detection ────────────────────────────────────────────────────

// Only matches single-line empty catch: catch(...) { }
// Multi-line bodies (even if only whitespace/comments) are NOT matched — prevents false positives
// when the catch body contains only a comment that has been stripped.
const EMPTY_CATCH_BRACE = /catch\s*\([^)]*\)\s*\{[^\S\n]*\}/
const EMPTY_EXCEPT = /except[^:]*:\s*\n(\s*(?:pass\s*)?\n|\s*$)/m

/**
 * Returns true if the file appears to be a "God class" — a class with too many methods.
 * Skips Go (no classes) and module/script/package classTypes (not OOP classes).
 * @param {{ language: string, classType: string, methods: Array }} fa
 * @returns {boolean}
 */
function isGodClass(fa) {
  const noClassLanguages = ['Go']
  const noClassTypes = ['module', 'script', 'package']
  if (noClassLanguages.includes(fa.language)) return false
  if (noClassTypes.includes(fa.classType)) return false
  return (fa.methods || []).length > 20
}

/**
 * Returns true if the file content contains an empty catch/except block.
 * Go is skipped (no try/catch). Comment-only bodies are NOT flagged (comments stripped first).
 * @param {string} content
 * @param {string} language
 * @returns {boolean}
 */
function hasEmptyCatch(content, language) {
  if (language === 'Go') return false
  if (language === 'Python') {
    const stripped = content.replace(/#[^\n]*/g, '')
    return EMPTY_EXCEPT.test(stripped)
  }
  // Strip line comments and block comments before testing
  const stripped = content.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  return EMPTY_CATCH_BRACE.test(stripped)
}

/**
 * Scans method bodies via brace-depth walking to detect long methods and deep nesting.
 * Uses already-extracted method line numbers as entry points.
 * @param {string} content - Full file content
 * @param {Array<{ lineNumber: number }>} methods - Methods with 1-based line numbers
 * @returns {{ hasLongMethod: boolean, hasDeepNesting: boolean }}
 */
function scanMethodBodies(content, methods) {
  const lines = content.split('\n')
  let hasLongMethod = false
  let hasDeepNesting = false

  for (const method of methods) {
    if (hasLongMethod && hasDeepNesting) break

    const startIdx = method.lineNumber - 1
    if (startIdx < 0 || startIdx >= lines.length) continue

    let depth = 0
    let bodyStarted = false
    let foundBrace = false
    let bodyLineCount = 0
    let maxDepth = 0

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i]

      for (const ch of line) {
        if (ch === '{') {
          depth++
          foundBrace = true
          bodyStarted = true
        }
        if (ch === '}') {
          depth--
        }
      }

      if (bodyStarted) {
        bodyLineCount++
        maxDepth = Math.max(maxDepth, depth)
      }

      // Expression-body arrow: first line, no brace — single-line, can't be long/deep
      if (i === startIdx && !foundBrace) break

      // Body closed
      if (bodyStarted && depth === 0) break
    }

    if (bodyLineCount > 40) hasLongMethod = true
    if (maxDepth > 3) hasDeepNesting = true
  }

  return { hasLongMethod, hasDeepNesting }
}

/**
 * Detects antipatterns across files in deepAnalysis.
 * Returns an array of { id, label, count } entries when ≥3 files trigger any rule, else null.
 *
 * Rules (in output order):
 *   longMethod   — any function/method body >40 lines
 *   deepNesting  — brace depth inside any method body >3
 *   godClass     — class with >20 public methods (skips Go, module/script/package)
 *   emptyCatch   — empty catch/except body (skips Go, skips comment-only)
 *
 * @param {Object[]} deepAnalysis - Array of file analysis objects from analyzeFileContents
 * @param {string} folderPath - Absolute path to the folder (for reading file content)
 * @returns {Array<{ id: string, label: string, count: number }>|null}
 */
export function detectAntipatterns(deepAnalysis, folderPath) {
  if (!deepAnalysis || deepAnalysis.length === 0) return null

  const longMethodFiles = new Set()
  const deepNestingFiles = new Set()
  const godClassFiles = new Set()
  const emptyCatchFiles = new Set()

  for (const fa of deepAnalysis) {
    if (fa.error) continue

    // God class — metadata only, no file read needed
    if (isGodClass(fa)) godClassFiles.add(fa.file)

    // Content-based rules — read file once and reuse
    let content
    try {
      content = readFileSync(join(folderPath, fa.file), 'utf8')
    } catch {
      continue
    }

    // Empty catch
    if (hasEmptyCatch(content, fa.language)) emptyCatchFiles.add(fa.file)

    // Long method and deep nesting via brace-depth scan
    const methods = fa.methods || []
    if (methods.length > 0) {
      const { hasLongMethod, hasDeepNesting } = scanMethodBodies(content, methods)
      if (hasLongMethod) longMethodFiles.add(fa.file)
      if (hasDeepNesting) deepNestingFiles.add(fa.file)
    } else {
      // No pre-extracted methods — scan whole file for function-like openings
      // Build synthetic method entry points by scanning for '{' at depth 0
      const lines = content.split('\n')
      const syntheticMethods = []
      let topDepth = 0
      for (let i = 0; i < lines.length; i++) {
        const prevDepth = topDepth
        for (const ch of lines[i]) {
          if (ch === '{') topDepth++
          if (ch === '}') topDepth--
        }
        // A line that opens a top-level block (transitions from depth 0 to depth 1)
        if (prevDepth === 0 && topDepth > 0) {
          syntheticMethods.push({ lineNumber: i + 1 })
        }
      }
      if (syntheticMethods.length > 0) {
        const { hasLongMethod, hasDeepNesting } = scanMethodBodies(content, syntheticMethods)
        if (hasLongMethod) longMethodFiles.add(fa.file)
        if (hasDeepNesting) deepNestingFiles.add(fa.file)
      }
    }
  }

  const THRESHOLD = 3
  const results = []

  const rules = [
    { set: longMethodFiles,  id: 'longMethod',  label: 'Long methods (>40 lines)' },
    { set: deepNestingFiles, id: 'deepNesting', label: 'Deep nesting (>3 levels)' },
    { set: godClassFiles,    id: 'godClass',    label: 'God classes (>20 methods)' },
    { set: emptyCatchFiles,  id: 'emptyCatch',  label: 'Empty catch blocks' },
  ]

  for (const rule of rules) {
    if (rule.set.size >= THRESHOLD) {
      results.push({ id: rule.id, label: rule.label, count: rule.set.size })
    }
  }

  return results.length > 0 ? results : null
}

// ─── Test Exports (used only by tests/phase1/) ───────────────────────────────
export { getLineNumber, analyzeJava, analyzeKotlin, analyzeTypeScriptOrJs, analyzePython, analyzeGo,
         detectConventions, classifyNameStyle, dominantStyle }
