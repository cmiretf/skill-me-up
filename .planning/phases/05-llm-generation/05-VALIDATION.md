---
phase: 5
slug: llm-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 (ESM mode) |
| **Config file** | `jest.config.js` (project root) |
| **Quick run command** | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/` |
| **Full suite command** | `node --experimental-vm-modules node_modules/.bin/jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/`
- **After every plan wave:** Run `node --experimental-vm-modules node_modules/.bin/jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------|-----------|-------------------|-------------|--------|
| 5-W0-01 | W0 | 0 | cli.test.js stub (LLM-B1, LLM-B2) | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/cli.test.js` | ❌ W0 | ⬜ pending |
| 5-W0-02 | W0 | 0 | llmGenerator.test.js stub (LLM-B3, LLM-B4, LLM-B5) | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/llmGenerator.test.js` | ❌ W0 | ⬜ pending |
| 5-01-01 | 01 | 1 | `--llm` without `--llm-model` exits 1 with model list (LLM-B1) | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/cli.test.js -t "missing llm-model"` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | `--llm` without `GITHUB_TOKEN` exits 1 (LLM-B2) | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/cli.test.js -t "missing GITHUB_TOKEN"` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 2 | `estimateTokens()` returns plausible value (LLM-B3) | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/llmGenerator.test.js -t "estimateTokens"` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 2 | Response parser extracts correct content from multi-folder delimiter format (LLM-B4) | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/llmGenerator.test.js -t "parseResponse"` | ❌ W0 | ⬜ pending |
| 5-02-03 | 02 | 2 | Parser fails hard for missing folder in response (LLM-B5) | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/llmGenerator.test.js -t "missing folder"` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 3 | Full LLM integration (network call to API) (LLM-B6) | manual-only | — | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase5/cli.test.js` — RED stubs for LLM-B1 (missing --llm-model) and LLM-B2 (missing GITHUB_TOKEN)
- [ ] `tests/phase5/llmGenerator.test.js` — RED stubs for LLM-B3 (estimateTokens), LLM-B4 (parseResponse), LLM-B5 (missing folder error)

---

## Manual-Only Verifications

| Behavior | Behavior ID | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full LLM integration — real API call to GitHub Models, full rewrite of a sample project's .md files | LLM-B6 | Requires live GITHUB_TOKEN and real network call; no mocking infrastructure in project | Run `GITHUB_TOKEN=<token> node bin/cli.js /path/to/sample-project --llm --llm-model openai/gpt-4o`. Verify output files are non-empty, all expected folders present, summary line says "Generated X files (LLM-enriched)". |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
