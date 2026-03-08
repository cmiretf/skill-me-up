# External Integrations

**Analysis Date:** 2026-03-08

## APIs & External Services

**None detected.**

This project has zero external API integrations. It operates entirely on the local filesystem and makes no HTTP calls, SDK calls, or network requests of any kind.

## Data Storage

**Databases:**
- None. No database connection of any kind.

**File Storage:**
- Local filesystem only
  - Reads: project source files via `fs.readFileSync` and `fs.readdirSync`
  - Writes: generates `agent_<folder>_instructions.md` files into scanned project directories via `fs.writeFileSync`
  - Key write location: `<scanned-folder>/agent_<folderName>_instructions.md` (one file per detected code folder)

**Caching:**
- None. Each run is stateless and re-generates files from scratch.

## Authentication & Identity

**Auth Provider:**
- None. No authentication of any kind.

## Monitoring & Observability

**Error Tracking:**
- None. Errors are written to `process.stderr` and exit with code 1.

**Logs:**
- stdout via `process.stdout.write` (controlled by `--quiet` / `verbose` flag)
- All logging is in `src/analyzer/index.js` via the `log()` helper function

## CI/CD & Deployment

**Hosting:**
- npm registry (`skill-me-up` package, version 1.1.1)

**CI Pipeline:**
- Not detected. No GitHub Actions, CircleCI, or other CI config files present.

## Environment Configuration

**Required env vars:**
- None. The application reads no environment variables.

**Secrets location:**
- No secrets of any kind. No `.env` files present.

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Third-Party SDKs

**None.** The project has no `dependencies` in `package.json` — only Node.js built-in modules are used (`fs`, `path`, `module`).

## External File Formats Parsed

The tool reads and parses the following file formats from target projects during analysis — these are not integrations but represent the tool's analysis scope:

| File | Purpose |
|------|---------|
| `package.json` | Detect JS/TS framework and project name |
| `pom.xml` | Detect Java/Maven projects and artifact name |
| `pyproject.toml` | Detect Python projects and name |
| `build.gradle` / `build.gradle.kts` | Detect Java/Kotlin/Gradle projects |
| `requirements.txt` | Detect Python framework |
| `go.mod` | Detect Go framework |
| `Cargo.toml` | Detect Rust framework |
| `composer.json` | Detect PHP framework |
| `Gemfile` | Detect Ruby framework |
| `*.csproj` | Detect C#/.NET projects |
| `tsconfig.json` | Detect TypeScript presence |

Parsing logic lives in `src/analyzer/languageDetector.js`. All parsing is done via `JSON.parse` or regex on raw strings — no external parsing libraries.

---

*Integration audit: 2026-03-08*
