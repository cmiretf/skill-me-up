import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, extname } from 'path'

const INDICATORS = [
  // JavaScript / Node
  {
    file: 'package.json',
    detect: (content, projectPath) => {
      try {
        const pkg = JSON.parse(content)
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
        if (allDeps['vue'] || allDeps['@vue/core']) return { lang: 'JavaScript', framework: 'Vue.js', runtime: 'Node.js' }
        if (allDeps['react'] || allDeps['react-dom']) return { lang: 'JavaScript', framework: 'React', runtime: 'Node.js' }
        if (allDeps['@angular/core']) return { lang: 'TypeScript', framework: 'Angular', runtime: 'Node.js' }
        if (allDeps['svelte']) return { lang: 'JavaScript', framework: 'Svelte', runtime: 'Node.js' }
        if (allDeps['next']) return { lang: 'JavaScript', framework: 'Next.js', runtime: 'Node.js' }
        if (allDeps['nuxt']) return { lang: 'JavaScript', framework: 'Nuxt.js', runtime: 'Node.js' }
        if (allDeps['express']) return { lang: 'JavaScript', framework: 'Express.js', runtime: 'Node.js' }
        if (allDeps['fastify']) return { lang: 'JavaScript', framework: 'Fastify', runtime: 'Node.js' }
        if (allDeps['nestjs'] || allDeps['@nestjs/core']) return { lang: 'TypeScript', framework: 'NestJS', runtime: 'Node.js' }
        const hasTs = existsSync(join(projectPath, 'tsconfig.json'))
        return { lang: hasTs ? 'TypeScript' : 'JavaScript', framework: 'Node.js', runtime: 'Node.js' }
      } catch {
        return { lang: 'JavaScript', framework: 'Node.js', runtime: 'Node.js' }
      }
    },
  },
  // Java / Maven
  {
    file: 'pom.xml',
    detect: (content) => {
      if (content.includes('spring-boot')) return { lang: 'Java', framework: 'Spring Boot', runtime: 'JVM' }
      if (content.includes('spring')) return { lang: 'Java', framework: 'Spring', runtime: 'JVM' }
      if (content.includes('quarkus')) return { lang: 'Java', framework: 'Quarkus', runtime: 'JVM' }
      if (content.includes('micronaut')) return { lang: 'Java', framework: 'Micronaut', runtime: 'JVM' }
      return { lang: 'Java', framework: 'Maven', runtime: 'JVM' }
    },
  },
  // Java / Gradle
  {
    file: 'build.gradle',
    detect: (content) => {
      if (content.includes('spring-boot')) return { lang: 'Java', framework: 'Spring Boot', runtime: 'JVM' }
      if (content.includes('spring')) return { lang: 'Java', framework: 'Spring', runtime: 'JVM' }
      return { lang: 'Java', framework: 'Gradle', runtime: 'JVM' }
    },
  },
  // Kotlin
  {
    file: 'build.gradle.kts',
    detect: (content) => {
      if (content.includes('spring-boot')) return { lang: 'Kotlin', framework: 'Spring Boot', runtime: 'JVM' }
      return { lang: 'Kotlin', framework: 'Gradle', runtime: 'JVM' }
    },
  },
  // Python
  {
    file: 'requirements.txt',
    detect: (content) => {
      if (content.includes('django')) return { lang: 'Python', framework: 'Django', runtime: 'Python' }
      if (content.includes('flask')) return { lang: 'Python', framework: 'Flask', runtime: 'Python' }
      if (content.includes('fastapi')) return { lang: 'Python', framework: 'FastAPI', runtime: 'Python' }
      return { lang: 'Python', framework: 'Python', runtime: 'Python' }
    },
  },
  {
    file: 'pyproject.toml',
    detect: (content) => {
      if (content.includes('django')) return { lang: 'Python', framework: 'Django', runtime: 'Python' }
      if (content.includes('fastapi')) return { lang: 'Python', framework: 'FastAPI', runtime: 'Python' }
      if (content.includes('flask')) return { lang: 'Python', framework: 'Flask', runtime: 'Python' }
      return { lang: 'Python', framework: 'Python', runtime: 'Python' }
    },
  },
  // Go
  {
    file: 'go.mod',
    detect: (content) => {
      if (content.includes('gin-gonic')) return { lang: 'Go', framework: 'Gin', runtime: 'Go' }
      if (content.includes('echo')) return { lang: 'Go', framework: 'Echo', runtime: 'Go' }
      if (content.includes('fiber')) return { lang: 'Go', framework: 'Fiber', runtime: 'Go' }
      return { lang: 'Go', framework: 'Go', runtime: 'Go' }
    },
  },
  // Rust
  {
    file: 'Cargo.toml',
    detect: (content) => {
      if (content.includes('actix')) return { lang: 'Rust', framework: 'Actix', runtime: 'Rust' }
      if (content.includes('axum')) return { lang: 'Rust', framework: 'Axum', runtime: 'Rust' }
      return { lang: 'Rust', framework: 'Rust', runtime: 'Rust' }
    },
  },
  // PHP
  {
    file: 'composer.json',
    detect: (content) => {
      if (content.includes('laravel')) return { lang: 'PHP', framework: 'Laravel', runtime: 'PHP' }
      if (content.includes('symfony')) return { lang: 'PHP', framework: 'Symfony', runtime: 'PHP' }
      return { lang: 'PHP', framework: 'PHP', runtime: 'PHP' }
    },
  },
  // Ruby
  {
    file: 'Gemfile',
    detect: (content) => {
      if (content.includes('rails')) return { lang: 'Ruby', framework: 'Rails', runtime: 'Ruby' }
      if (content.includes('sinatra')) return { lang: 'Ruby', framework: 'Sinatra', runtime: 'Ruby' }
      return { lang: 'Ruby', framework: 'Ruby', runtime: 'Ruby' }
    },
  },
  // .NET
  {
    file: '*.csproj',
    glob: true,
    detect: (content) => {
      if (content.includes('Microsoft.AspNetCore')) return { lang: 'C#', framework: 'ASP.NET Core', runtime: '.NET' }
      return { lang: 'C#', framework: '.NET', runtime: '.NET' }
    },
  },
]

/**
 * Detects the language and framework of a project by inspecting key files.
 * @param {string} projectPath
 * @returns {{ lang: string, framework: string, runtime: string }}
 */
export function detectLanguage(projectPath) {
  for (const indicator of INDICATORS) {
    if (indicator.glob) {
      // Handle glob patterns (e.g. *.csproj)
      try {
        const ext = indicator.file.replace('*', '')
        const entries = readdirSync(projectPath)
        const match = entries.find(f => f.endsWith(ext))
        if (match) {
          const content = readFileSync(join(projectPath, match), 'utf8')
          return indicator.detect(content)
        }
      } catch { /* skip */ }
    } else {
      const filePath = join(projectPath, indicator.file)
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf8')
          return indicator.detect(content, projectPath)
        } catch { /* skip */ }
      }
    }
  }

  // Fallback: count file extensions
  return detectByExtensions(projectPath)
}

function detectByExtensions(projectPath) {
  const counts = {}
  try {
    const entries = readdirSync(projectPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = extname(entry.name)
        if (ext) counts[ext] = (counts[ext] || 0) + 1
      }
    }
  } catch { /* skip */ }

  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (!dominant) return { lang: 'Unknown', framework: 'Unknown', runtime: 'Unknown' }

  const extMap = {
    '.py': { lang: 'Python', framework: 'Python', runtime: 'Python' },
    '.java': { lang: 'Java', framework: 'Java', runtime: 'JVM' },
    '.ts': { lang: 'TypeScript', framework: 'Node.js', runtime: 'Node.js' },
    '.js': { lang: 'JavaScript', framework: 'Node.js', runtime: 'Node.js' },
    '.go': { lang: 'Go', framework: 'Go', runtime: 'Go' },
    '.rs': { lang: 'Rust', framework: 'Rust', runtime: 'Rust' },
    '.rb': { lang: 'Ruby', framework: 'Ruby', runtime: 'Ruby' },
    '.php': { lang: 'PHP', framework: 'PHP', runtime: 'PHP' },
    '.cs': { lang: 'C#', framework: '.NET', runtime: '.NET' },
    '.kt': { lang: 'Kotlin', framework: 'Kotlin', runtime: 'JVM' },
    '.swift': { lang: 'Swift', framework: 'Swift', runtime: 'Swift' },
  }

  return extMap[dominant[0]] || { lang: 'Unknown', framework: 'Unknown', runtime: 'Unknown' }
}
