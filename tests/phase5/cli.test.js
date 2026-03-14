// Phase 5 — Wave 0: Failing stubs for LLM-B1 and LLM-B2
// These tests are RED until Plan 05-01 adds --llm-model and GITHUB_TOKEN validation to bin/cli.js.
//
// Tests use spawnSync to launch bin/cli.js as a child process rather than dynamic import,
// because cli.js runs immediately on import (no safe way to import it without side effects).

import { spawnSync } from 'child_process'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI_PATH = resolve(__dirname, '../../bin/cli.js')
const PROJECT_ROOT = resolve(__dirname, '../..')

describe('--llm flag validation', () => {
  describe('missing --llm-model', () => {
    it('exits 1 and prints available models when --llm is passed without --llm-model (LLM-B1)', () => {
      // Spawn CLI with --llm but no --llm-model
      const result = spawnSync(
        'node',
        [CLI_PATH, PROJECT_ROOT, '--llm'],
        {
          encoding: 'utf8',
          env: { ...process.env, GITHUB_TOKEN: 'fake-token' },
        }
      )

      // Should exit 1
      expect(result.status).toBe(1)

      // stderr should tell user which models are available
      const stderr = result.stderr || ''
      expect(stderr).toContain('Available models:')
      expect(stderr).toContain('openai/gpt-4o')
    })
  })

  describe('missing GITHUB_TOKEN', () => {
    it('exits 1 and mentions GITHUB_TOKEN when token is absent and --llm is used (LLM-B2)', () => {
      // Build env without GITHUB_TOKEN
      const envWithoutToken = { ...process.env }
      delete envWithoutToken.GITHUB_TOKEN

      // Spawn CLI with --llm and --llm-model but no token
      const result = spawnSync(
        'node',
        [CLI_PATH, PROJECT_ROOT, '--llm', '--llm-model', 'openai/gpt-4o'],
        {
          encoding: 'utf8',
          env: envWithoutToken,
        }
      )

      // Should exit 1
      expect(result.status).toBe(1)

      // stderr should mention GITHUB_TOKEN so the user knows what to set
      const stderr = result.stderr || ''
      expect(stderr).toContain('GITHUB_TOKEN')
    })
  })
})
