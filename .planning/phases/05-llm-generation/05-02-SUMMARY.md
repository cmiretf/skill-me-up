---
phase: 05-llm-generation
plan: "02"
subsystem: api
tags: [llm, github-models, fetch, markdown-generation, token-estimation]

requires:
  - phase: 05-llm-generation plan 01
    provides: --llm and --llm-model CLI flags + GITHUB_TOKEN validation in bin/cli.js

provides:
  - estimateTokens(text) — word-based token estimator (1 token ≈ 0.75 words)
  - parseResponse(responseText, expectedFolderPaths) — delimiter-based LLM response parser returning Map<string, string>
  - generateLLMInstructions(generatedPaths, folders, options) — async orchestrator that reads static files, calls GitHub Models API, and overwrites files with LLM-enriched content

affects:
  - 05-llm-generation plan 03 (wires generateLLMInstructions into analyze())

tech-stack:
  added: []
  patterns:
    - "Zero-dependency Node.js fetch usage (global, Node 18+) for external LLM API calls"
    - "Delimiter-based response parsing using String.split(regex) alternation pattern"
    - "Fail-hard pattern: process.exit(1) with informative stderr on all LLM errors"
    - "TDD: RED tests written first (Wave 0), then GREEN implementation in Plan 02"

key-files:
  created:
    - src/generators/llmGenerator.js
  modified: []

key-decisions:
  - "parseResponse throws Error (not returns falsy) when expected folder path absent — fail-hard is the locked design"
  - "estimateTokens uses ceil(wordCount / 0.75) — word-split approximation, no external tokenizer dependency"
  - "DELIMITER_RE uses /^=== FOLDER:\\s*(.+?)\\s*===$/ with multiline flag — tolerates minor whitespace variation"
  - "generateLLMInstructions uses posix.normalize for folder path consistency across OS"
  - "Token budget enforced pre-call with MODEL_LIMITS lookup — exits before wasting API credits"

patterns-established:
  - "LLM response parsing: split on delimiter regex, iterate alternating index pairs (path at odd, content at even)"
  - "Auth error UX: 401/403 triggers specific models:read permission hint in stderr"

requirements-completed: []

duration: 15min
completed: 2026-03-14
---

# Phase 5 Plan 02: LLM Generator Summary

**ESM llmGenerator.js with estimateTokens, parseResponse, and generateLLMInstructions using Node.js built-in fetch and GitHub Models API — zero new npm dependencies**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-14T00:00:00Z
- **Completed:** 2026-03-14T00:15:00Z
- **Tasks:** 1 (TDD: RED already existed from W0, GREEN implementation created)
- **Files modified:** 1

## Accomplishments

- Created `src/generators/llmGenerator.js` with three named exports satisfying all LLM-B3/B4/B5 test contracts
- `estimateTokens` returns correct token approximations using `ceil(wordCount / 0.75)` with zero dependencies
- `parseResponse` correctly splits delimiter-separated LLM responses into a `Map<string, string>` and throws `Error` on any missing expected folder (fail-hard behavior)
- `generateLLMInstructions` fully implemented: reads static files, batches into one prompt, calls GitHub Models API via global `fetch`, validates token budget, parses delimited response, and overwrites files
- All 82 tests pass — no regressions across phase1/phase2/phase3/phase5

## Task Commits

Note: Per CLAUDE.md project instructions, git commits are handled manually by the user.

1. **Task 1: Create src/generators/llmGenerator.js with estimateTokens and parseResponse** — feat(05-02): implement llmGenerator with estimateTokens, parseResponse, generateLLMInstructions

## Files Created/Modified

- `/Users/carlosmiret/Desktop/skill-me-up/src/generators/llmGenerator.js` — ESM module with `estimateTokens`, `parseResponse`, `generateLLMInstructions` exports. Uses only Node.js builtins (fs, path) and global `fetch`.

## Decisions Made

- `parseResponse` throws `Error` on missing folder (fail-hard as specified in CONTEXT.md locked decisions) — no silent fallback
- Used `String.prototype.split(DELIMITER_RE)` which naturally alternates folder-path/content pairs in the resulting array — no manual regex.exec loop needed
- `generateLLMInstructions` uses `posix.normalize` to ensure forward-slash paths cross-platform (Windows compat)
- Token budget check happens before the API call to avoid wasting credits on oversized prompts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — the RED test stubs from Wave 0 matched the plan behavior spec exactly, making GREEN implementation straightforward.

## User Setup Required

None - no external service configuration required at this step. GITHUB_TOKEN validation is handled at CLI flag parsing time (Plan 01).

## Next Phase Readiness

- `src/generators/llmGenerator.js` is fully implemented and tested
- Plan 03 can now wire `generateLLMInstructions` into `analyze()` in `src/analyzer/index.js`
- The function signature matches what Plan 03 expects: `generateLLMInstructions(generatedPaths, folders, options)`

---
*Phase: 05-llm-generation*
*Completed: 2026-03-14*
