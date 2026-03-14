#!/usr/bin/env node
import { resolve } from 'path'
import { existsSync, statSync } from 'fs'
import { analyze } from '../src/analyzer/index.js'

const args = process.argv.slice(2)
const flags = {}
const positional = []

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--help' || arg === '-h') {
    printHelp()
    process.exit(0)
  } else if (arg === '--version' || arg === '-v') {
    printVersion()
    process.exit(0)
  } else if (arg === '--depth' || arg === '-d') {
    flags.maxDepth = parseInt(args[++i], 10)
  } else if (arg === '--quiet' || arg === '-q') {
    flags.verbose = false
  } else if (arg === '--llm') {
    flags.llm = true
  } else if (arg === '--llm-model') {
    flags.llmModel = args[++i]
  } else if (!arg.startsWith('-')) {
    positional.push(arg)
  }
}

const targetPath = resolve(positional[0] || '.')

if (!existsSync(targetPath) || !statSync(targetPath).isDirectory()) {
  console.error(`\n  Error: "${targetPath}" is not a valid directory.\n`)
  process.exit(1)
}

if (flags.llm) {
  if (!process.env.GITHUB_TOKEN) {
    console.error('\n  Error: --llm requires the GITHUB_TOKEN environment variable to be set.')
    console.error('  Ensure your GITHUB_TOKEN has the `models:read` permission.')
    console.error('  For fine-grained PATs, add the Models (read-only) permission.\n')
    process.exit(1)
  }
  if (!flags.llmModel) {
    console.error('\n  Error: --llm requires --llm-model <name>. Available models:')
    console.error('    openai/gpt-4o')
    console.error('    openai/gpt-4o-mini')
    console.error('    openai/gpt-4.1')
    console.error('    meta/llama-3.3-70b-instruct')
    console.error('    mistral/mistral-large-2411')
    console.error('    ai21-labs/jamba-1.5-large')
    console.error('  See: https://github.com/marketplace?type=models for the full list.\n')
    process.exit(1)
  }
}

analyze(targetPath, {
  maxDepth: flags.maxDepth,
  verbose: flags.verbose !== false,
  llm: flags.llm,
  llmModel: flags.llmModel,
}).catch(err => {
  console.error('\n  Unexpected error:', err.message)
  process.exit(1)
})

function printHelp() {
  console.log(`
  skill-me-up — Project analyzer for AI agents

  Usage:
    npx skill-me-up [path] [options]

  Arguments:
    path          Path to the project to analyze (default: current directory)

  Options:
    -d, --depth      Maximum folder depth to scan (default: 3)
    -q, --quiet      Suppress output
    -h, --help       Show this help message
    -v, --version    Show version
        --llm        Rewrite output using an external LLM (requires GITHUB_TOKEN)
        --llm-model  Model name to use (e.g. openai/gpt-4o) — required with --llm

  Examples:
    npx skill-me-up
    npx skill-me-up ./my-project
    npx skill-me-up ./my-project --depth 2
    npx skill-me-up /absolute/path/to/project

  Output:
    For each relevant folder found, generates:
    <folder>/agent_<folder>_instructions.md
  `)
}

async function printVersion() {
  try {
    const { createRequire } = await import('module')
    const require = createRequire(import.meta.url)
    const pkg = require('../package.json')
    console.log(pkg.version)
  } catch {
    console.log('1.0.0')
  }
}
