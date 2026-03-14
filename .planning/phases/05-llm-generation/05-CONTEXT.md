# Phase 5: LLM Generation - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add an optional `--llm` flag to the CLI that, after running the static analysis pipeline, sends all pre-rendered folder markdown to an external LLM API and uses the LLM's rewritten output instead of the static template output. The zero-npm-dependency constraint is preserved by using Node.js built-in `fetch` (Node 18+). The core analysis pipeline is unchanged — LLM only affects the final render step.

</domain>

<decisions>
## Implementation Decisions

### API target & auth
- Target the **GitHub Models API** (OpenAI-compatible endpoint) — accessible to GitHub Copilot users, supports many models (GPT-4o, Claude, Llama, Mistral, etc.)
- Auth via **`GITHUB_TOKEN` environment variable** — standard convention, works in CI, no flag needed
- User selects model via **`--llm-model <name>` CLI flag**
- If `--llm` is passed without `--llm-model`: **exit with error** listing available model names — no interactive prompt (preserves non-interactive CLI contract)

### Prompt strategy
- Run the **static pipeline first** to produce all pre-rendered `.md` files, then send all of them concatenated to the LLM in a single API call
- LLM **rewrites entirely** — it decides structure and content, not bound to the static section structure
- LLM is instructed to stay within **300 lines per folder doc** (consistent with QUALITY-01 budget from Phase 4)
- **One API call for all folders** — user accepted the token limit tradeoff to give the LLM full cross-folder context
- If the combined prompt exceeds the model's context limit, **exit with a clear error** before sending

### Fallback behavior
- On any LLM call failure (network error, bad token, bad response): **fail hard — exit code 1 with clear error message**. Silent fallback to static would mislead the user about which output they received.
- **No timeout** — user explicitly chose not to limit wait time
- **Minimal validation before writing**: check that LLM response is non-empty and non-whitespace; if empty, fail hard
- LLM output **overwrites the same `agent_<folder>_instructions.md` file** as static mode — idempotent, re-runnable

### Output scope & UX
- LLM receives all folders' pre-rendered static `.md` content concatenated as context
- LLM returns **one response with per-folder delimiters** (e.g. `=== FOLDER: src/services ===`) — implementation splits on delimiter and writes each section to its folder
- **Status messages printed to stdout** during the (potentially long) LLM call: e.g. `"Sending 8 folders to LLM..."` then `"Writing LLM output for src/services..."` as each is parsed
- Summary line: `"Generated X files (LLM-enriched)"` — distinguishes LLM runs from static runs in terminal output

### Claude's Discretion
- Exact delimiter string used to separate per-folder sections in the LLM response
- System prompt wording and instruction structure sent to the GitHub Models API
- How to detect and report when combined token count approaches model limits
- List of available GitHub Models to display in the error message when `--llm-model` is missing
- How to parse the LLM response and map sections back to folder paths

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bin/cli.js` — arg parsing entry point; `--llm` and `--llm-model` flags slot in here alongside existing `-d`, `-q` flags
- `src/analyzer/index.js` → `analyze()` — the orchestration function; LLM path branches after all `generateInstructions()` calls complete (static first, then LLM rewrite)
- `src/generators/mdGenerator.js` → `generateInstructions()` — currently writes to disk; with `--llm`, this runs as normal but the written files become inputs for the LLM call
- Node.js built-in `fetch` (Node 18+) — available without any npm dependency; use for HTTP calls to GitHub Models API

### Established Patterns
- Zero external npm dependencies is absolute — Node.js `fetch` / `https` module only
- Analysis in `src/analyzer/`, rendering in `src/generators/` — LLM integration logic likely lives in a new `src/generators/llmGenerator.js` (following the module boundary convention)
- CLI flags defined in `bin/cli.js` with validation before `analyze()` is called — `--llm` + `--llm-model` validation goes here
- Silent-omission for missing data (phases 1-3) — but for LLM mode, fail-hard is the chosen behavior (user opted in)

### Integration Points
- `bin/cli.js`: parse `--llm` and `--llm-model` flags; validate `GITHUB_TOKEN` env var is set when `--llm` is used; validate `--llm-model` is provided
- `src/analyzer/index.js` → `analyze()`: after the standard pipeline loop, if `--llm` flag is set, call `generateLLMInstructions(folders, patternInfos, llmOptions)` which overwrites the static files
- The LLM generation step runs after all static files are written — so static output always exists as a fallback reference during the LLM call

</code_context>

<specifics>
## Specific Ideas

- User wants the model list to be shown when `--llm` is used without `--llm-model` — error message should enumerate model names clearly (not just say "pass a model name")
- Status messages during LLM call are important UX — the call may take 10-30+ seconds and the CLI should not appear hung
- The LLM having access to all folders' content at once is an intentional design choice — the user wants cross-folder coherence in the rewritten docs, even at token cost

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-llm-generation*
*Context gathered: 2026-03-13*
