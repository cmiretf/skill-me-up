# Technology Stack

**Analysis Date:** 2026-03-08

## Languages

**Primary:**
- JavaScript (ES Modules) - All source files in `src/` and `bin/`

**Secondary:**
- None - project is pure JavaScript with no TypeScript compilation step

## Runtime

**Environment:**
- Node.js >= 18.0.0 (enforced via `engines` field in `package.json`)
- Detected runtime on this machine: Node.js v25.2.1

**Package Manager:**
- npm 11.6.2
- Lockfile: Not present (package-lock.json not committed)

## Frameworks

**Core:**
- None - pure Node.js with no web framework. The tool runs as a CLI process.

**Testing:**
- Not detected - no test framework configured, no test files present

**Build/Dev:**
- No build step - source is run directly via Node.js ESM (`"type": "module"` in `package.json`)

## Key Dependencies

**Critical:**
- None - zero runtime dependencies (no `dependencies` field in `package.json`)
- All functionality uses Node.js built-in modules only:
  - `fs` (`existsSync`, `readFileSync`, `readdirSync`, `writeFileSync`, `statSync`) — file I/O throughout `src/`
  - `path` (`join`, `resolve`, `basename`, `extname`, `relative`) — path manipulation throughout `src/`
  - `module` (`createRequire`) — used in `bin/cli.js` for dynamic version read

**Infrastructure:**
- No external packages. No `node_modules` directory required at runtime.

## Configuration

**Environment:**
- No `.env` files detected
- No environment variables consumed by the application itself
- Configuration lives in source files: `src/config/ignored.js` (ignored dirs, file extensions, scan depth) and `src/config/patterns.js` (folder/file role patterns)

**Build:**
- No build config files (no webpack, esbuild, rollup, tsconfig, etc.)
- Entry points defined directly in `package.json`:
  - CLI: `bin/cli.js` (via `bin.skill-me-up`)
  - Library: `src/analyzer/index.js` (via `main`)

## Module System

**Format:** ES Modules (`"type": "module"`)
- All files use `import`/`export` syntax
- `bin/cli.js` uses dynamic `import()` for version lookup
- No CommonJS (`require`) except inside a dynamic import wrapper in `bin/cli.js`

## CLI Interface

**Invocation:**
```bash
npx skill-me-up [path] [options]
node bin/cli.js [path] [options]
npm run dev          # Runs: node bin/cli.js .
npm run start        # Runs: node bin/cli.js
```

**Flags:**
- `-d, --depth <n>` — max folder scan depth (default: 6, defined in `src/config/ignored.js`)
- `-q, --quiet` — suppress stdout output
- `-h, --help` — print help
- `-v, --version` — print version

## Platform Requirements

**Development:**
- Node.js >= 18.0.0
- No native addons, no compilation required

**Production:**
- Published to npm as `skill-me-up`
- Distributed files: `bin/` and `src/` (specified in `package.json` `files` field)
- Installable globally: `npm install -g skill-me-up` or run via `npx skill-me-up`

---

*Stack analysis: 2026-03-08*
