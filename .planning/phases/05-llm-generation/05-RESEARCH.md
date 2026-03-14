# Phase 5: LLM Generation - Research

**Researched:** 2026-03-13
**Domain:** GitHub Models API (OpenAI-compatible), Node.js built-in fetch, CLI flag extension
**Confidence:** MEDIUM — API endpoint and request format verified via official docs; exact model list and token limits require a live catalog call at runtime

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Target the **GitHub Models API** (OpenAI-compatible endpoint) — accessible to GitHub Copilot users, supports many models (GPT-4o, Claude, Llama, Mistral, etc.)
- Auth via **`GITHUB_TOKEN` environment variable** — standard convention, works in CI, no flag needed
- User selects model via **`--llm-model <name>` CLI flag**
- If `--llm` is passed without `--llm-model`: **exit with error** listing available model names — no interactive prompt (preserves non-interactive CLI contract)
- Run the **static pipeline first** to produce all pre-rendered `.md` files, then send all of them concatenated to the LLM in a single API call
- LLM **rewrites entirely** — it decides structure and content, not bound to the static section structure
- LLM is instructed to stay within **300 lines per folder doc** (consistent with QUALITY-01 budget from Phase 4)
- **One API call for all folders** — user accepted the token limit tradeoff to give the LLM full cross-folder context
- If the combined prompt exceeds the model's context limit, **exit with a clear error** before sending
- On any LLM call failure (network error, bad token, bad response): **fail hard — exit code 1 with clear error message**
- **No timeout** — user explicitly chose not to limit wait time
- **Minimal validation before writing**: check that LLM response is non-empty and non-whitespace; if empty, fail hard
- LLM output **overwrites the same `agent_<folder>_instructions.md` file** as static mode — idempotent, re-runnable
- LLM receives all folders' pre-rendered static `.md` content concatenated as context
- LLM returns **one response with per-folder delimiters** (e.g. `=== FOLDER: src/services ===`) — implementation splits on delimiter and writes each section to its folder
- **Status messages printed to stdout** during the (potentially long) LLM call
- Summary line: `"Generated X files (LLM-enriched)"`

### Claude's Discretion
- Exact delimiter string used to separate per-folder sections in the LLM response
- System prompt wording and instruction structure sent to the GitHub Models API
- How to detect and report when combined token count approaches model limits
- List of available GitHub Models to display in the error message when `--llm-model` is missing
- How to parse the LLM response and map sections back to folder paths

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 5 adds an optional `--llm` flag to the existing CLI. When present, after the static pipeline writes all `agent_*_instructions.md` files normally, a new module (`src/generators/llmGenerator.js`) reads those files back, concatenates them with delimiters, and sends them in a single call to the GitHub Models API. The API returns one combined response; the module splits it on per-folder delimiters and overwrites each static file.

The GitHub Models API is OpenAI-compatible. The endpoint for chat completions is `https://models.github.ai/inference/chat/completions`. Authentication is Bearer token via `Authorization: Bearer $GITHUB_TOKEN`. Node.js built-in `fetch` (available since Node 18 without flags) handles the HTTP call — no npm packages needed.

Token-budget checking before sending is required by locked decisions. Because GitHub Models does not expose a standard token-counting endpoint, the pre-send check must use a word-count proxy (1 word ≈ 1.3 tokens) against a known per-model context limit. Model limits are discoverable via the `GET /catalog/models` endpoint, but a hardcoded table for the small set of models in the error list is simpler and more reliable at validation time.

**Primary recommendation:** Implement in a single new file `src/generators/llmGenerator.js`. Keep CLI integration minimal — add two flags to `bin/cli.js`, pass them into `analyze()` as options, branch after the static loop. Zero new npm dependencies are added.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `fetch` | Node 18+ (project requires `>=18.0.0`) | HTTP POST to GitHub Models API | Zero-dep constraint; available globally since Node 18, no import needed |
| Node.js `fs.readFileSync` | stdlib | Re-read static `.md` files before sending | Already used in `src/analyzer/index.js` |
| Node.js `process.env` | stdlib | Read `GITHUB_TOKEN` | Already used in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | — | No new dependencies permitted |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in `fetch` | `node:https` module | `fetch` is simpler, returns Promise, handles JSON; `https` is lower-level. No reason to prefer `https` here. |
| Built-in `fetch` | `openai` npm package | Would require adding a dependency — violates zero-dep constraint |

**Installation:**
```bash
# No new packages. Zero-dep constraint preserved.
```

---

## Architecture Patterns

### Recommended Project Structure
```
bin/
└── cli.js              # Add --llm and --llm-model flag parsing + validation
src/
├── analyzer/
│   └── index.js        # Branch after static loop: if llm, call generateLLMInstructions()
└── generators/
    ├── mdGenerator.js   # Unchanged (static path)
    └── llmGenerator.js  # NEW: all LLM logic lives here
```

### Pattern 1: Static-first, LLM-rewrite
**What:** The static pipeline runs to completion (all files written), then `llmGenerator.js` reads them back, batches them, calls the API, parses the response, and overwrites.
**When to use:** Always when `--llm` is passed. The static output acts as both the LLM input and the fallback reference during the API call.
**Example:**
```javascript
// src/analyzer/index.js — branch after static loop
if (options.llm) {
  await generateLLMInstructions(generated, options)
}
```

### Pattern 2: Node.js fetch — OpenAI-compatible chat completions
**What:** POST to `https://models.github.ai/inference/chat/completions` with Bearer token, JSON body using `messages` array (system + user roles).
**When to use:** Single POST for the entire multi-folder batch (one API call total).
**Example:**
```javascript
// Source: https://docs.github.com/en/github-models/quickstart
const response = await fetch('https://models.github.ai/inference/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: modelName,           // e.g. "openai/gpt-4o"
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: MAX_OUTPUT_TOKENS,
  }),
})

if (!response.ok) {
  const body = await response.text()
  console.error(`LLM API error ${response.status}: ${body}`)
  process.exit(1)
}

const data = await response.json()
const text = data.choices[0].message.content
```

### Pattern 3: Per-folder delimiter parsing
**What:** LLM is instructed in the system prompt to delimit each folder's output with `=== FOLDER: <relativePath> ===`. Response is split on this pattern and each section matched back to the original folder's output file path.
**When to use:** Always — this is the only mechanism for extracting N folder docs from one API response.
**Example:**
```javascript
// Split response into per-folder sections
const DELIMITER_RE = /^=== FOLDER: (.+?) ===$/m
const sections = responseText.split(DELIMITER_RE)
// sections alternates: ['', 'src/services', '...content...', 'src/controllers', '...content...']
// Odd indices are paths, even indices >= 2 are content
for (let i = 1; i < sections.length; i += 2) {
  const folderPath = sections[i].trim()
  const content = sections[i + 1]?.trim()
  if (!content) { console.error(`Empty content for ${folderPath}`); process.exit(1) }
  // Map folderPath to outputPath using generated[] list
}
```

### Pattern 4: Pre-send token budget check
**What:** Before sending, estimate total prompt tokens using a word-count proxy. Fail hard if estimate exceeds model's known input limit.
**When to use:** Always, before the fetch call.
**Example:**
```javascript
// Rough estimate: 1 token ≈ 0.75 words → words / 0.75 = tokens
function estimateTokens(text) {
  return Math.ceil(text.split(/\s+/).length / 0.75)
}

const estimated = estimateTokens(systemPrompt + userPrompt)
const MODEL_LIMITS = {
  'openai/gpt-4o':      128_000,
  'openai/gpt-4o-mini': 128_000,
  'openai/gpt-4.1':   1_000_000,
  // ... see Model Limits table below
}
const limit = MODEL_LIMITS[modelName] ?? 128_000
if (estimated > limit) {
  console.error(`Combined prompt (~${estimated} tokens) exceeds ${modelName} limit (${limit}). Reduce --depth or analyze fewer folders.`)
  process.exit(1)
}
```

### Anti-Patterns to Avoid
- **Streaming responses:** Do not use SSE streaming (`stream: true`). Parsing a streamed multi-folder response with delimiters requires reassembly logic that adds complexity with no user benefit (progress is communicated via status messages, not token streaming).
- **Parallel per-folder API calls:** The locked decision is one call for all folders. Do not loop-call the API per folder.
- **Silent fallback to static:** Never catch an LLM error and silently use the static output — the user explicitly chose fail-hard.
- **Importing openai npm package:** Violates zero-dep constraint.
- **Writing a temp file:** The static files are already on disk after the static pipeline runs. Re-read them with `readFileSync` — no temp files needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client | Custom socket/https wrapper | Node.js built-in `fetch` | `fetch` is standard, Promise-based, handles all HTTP semantics |
| JSON serialization | Manual string building | `JSON.stringify` / `JSON.parse` | Handles edge cases (escaping, nested objects) |
| Token counting | Exact tokenizer | Word-count proxy (`words / 0.75`) | Exact tokenization requires loading a BPE model (dependency); proxy is sufficient for a pre-send safety check |

**Key insight:** The GitHub Models API is OpenAI-compatible — no custom auth flow or protocol negotiation. `fetch` + JSON is all that's needed.

---

## Common Pitfalls

### Pitfall 1: Wrong baseURL format
**What goes wrong:** Using `https://models.github.ai/inference/chat/completions` as the `baseURL` directly in SDKs, when it should be just `https://models.github.ai/inference`. The `/chat/completions` suffix is the path, not the base.
**Why it happens:** Copy-pasting the full endpoint URL into SDK config fields designed for base URLs.
**How to avoid:** With raw `fetch`, always POST to the full URL `https://models.github.ai/inference/chat/completions`. There is no base URL concern.
**Warning signs:** HTTP 404 responses.

### Pitfall 2: Legacy Azure endpoint still cited in old docs
**What goes wrong:** Using `https://models.inference.ai.azure.com` — this is the legacy endpoint from when GitHub Models ran on Azure infrastructure. GitHub is migrating away from it.
**Why it happens:** Old documentation, blog posts, and many tutorial sites still reference the Azure endpoint.
**How to avoid:** Always use `https://models.github.ai/inference/chat/completions`. Verified current as of 2026-03-13 from GitHub community discussion thread.
**Warning signs:** Works today but may break during Azure deprecation.

### Pitfall 3: Model name format
**What goes wrong:** Passing `gpt-4o` instead of `openai/gpt-4o`. GitHub Models uses `publisher/model-name` format, not bare model names.
**Why it happens:** Developers familiar with OpenAI's own API use bare names (`gpt-4o`). GitHub Models requires the publisher prefix.
**How to avoid:** Always use the full publisher-prefixed form in both code and error messages. The `--llm-model` flag value is passed through as-is to the API body.
**Warning signs:** HTTP 400 or model-not-found error from the API.

### Pitfall 4: Response parsing when LLM ignores delimiter format
**What goes wrong:** LLM may not produce delimiters exactly as instructed — it might add extra spaces, lowercase the path, or omit a folder entirely.
**Why it happens:** LLMs are probabilistic; strict formatting instructions are followed most of the time but not always.
**How to avoid:** Use a regex for the delimiter that tolerates minor whitespace variation (`/^=== FOLDER:\s*(.+?)\s*===$/m`). Validate that every expected folder path appears in the response; fail hard if any are missing.
**Warning signs:** Empty content for a folder path after splitting.

### Pitfall 5: GITHUB_TOKEN scope
**What goes wrong:** A GitHub token without the `models:read` permission returns HTTP 403. This is especially common with old classic PATs (no scope) or fine-grained PATs missing the models permission.
**Why it happens:** The GitHub Models API requires an explicit scope that's not included in default PAT configurations.
**How to avoid:** Error message on 401/403 should explicitly say: "Ensure your GITHUB_TOKEN has the `models:read` permission. For fine-grained PATs, add the Models (read-only) permission."
**Warning signs:** HTTP 401 or 403 response immediately on call.

### Pitfall 6: Empty response body on non-200 status
**What goes wrong:** Calling `response.json()` after a non-OK response causes a JSON parse error that obscures the real error (e.g., 429 rate limit, 403 auth failure).
**Why it happens:** Error responses from the API may return plain text or HTML rather than JSON.
**How to avoid:** Always check `response.ok` first. On failure, call `response.text()` and include that in the error message before `process.exit(1)`.
**Warning signs:** `SyntaxError: Unexpected token '<'` in error output.

---

## Code Examples

Verified patterns from official sources:

### Full fetch call to GitHub Models API
```javascript
// Source: https://docs.github.com/en/github-models/quickstart
const API_URL = 'https://models.github.ai/inference/chat/completions'

async function callGitHubModels(modelName, systemPrompt, userPrompt) {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error('Error: GITHUB_TOKEN environment variable is not set.')
    process.exit(1)
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`LLM API error (HTTP ${response.status}): ${errorBody}`)
    process.exit(1)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
```

### CLI flag parsing extension (bin/cli.js pattern)
```javascript
// Extends existing arg-parsing loop in bin/cli.js
} else if (arg === '--llm') {
  flags.llm = true
} else if (arg === '--llm-model') {
  flags.llmModel = args[++i]
}
```

### Pre-call validation in bin/cli.js
```javascript
// After flag parsing, before analyze() call
if (flags.llm) {
  if (!process.env.GITHUB_TOKEN) {
    console.error('\n  Error: --llm requires GITHUB_TOKEN environment variable to be set.\n')
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
    console.error('    ... (see https://github.com/marketplace?type=models for full list)\n')
    process.exit(1)
  }
}
```

### System prompt structure
```javascript
// System prompt instructs the LLM on format and scope
const SYSTEM_PROMPT = `You are a technical documentation writer. You will receive pre-analyzed documentation for multiple folders in a software project.

For each folder, rewrite the documentation to be clearer, more actionable, and better structured for AI agents reading it as context.

Rules:
- Keep each folder document under 300 lines
- Use markdown formatting
- Preserve technical accuracy — do not invent information not present in the input
- Output each folder's documentation preceded by exactly this delimiter on its own line:
  === FOLDER: <folder-relative-path> ===
- Include all folders from the input. Do not skip any.`
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `models.inference.ai.azure.com` (Azure-hosted) | `models.github.ai/inference` (GitHub-hosted) | 2025 (rolling migration) | Use new endpoint for all new code |
| OpenAI SDK required | Raw `fetch` sufficient | Node 18 (2022) | No npm package needed for basic chat completions |

**Deprecated/outdated:**
- `models.inference.ai.azure.com` endpoint: Still works during migration but being phased out. All new code should target `models.github.ai/inference/chat/completions`.

---

## Open Questions

1. **Exact current model list**
   - What we know: Catalog includes at least `openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/gpt-4.1`, Meta Llama models, Mistral models, and Anthropic Claude models (publisher-prefixed IDs)
   - What's unclear: The exact model IDs for Claude and Llama on GitHub Models — the publisher prefix format varies (`anthropic/claude-3.5-sonnet` or `claude-3-5-sonnet`?)
   - Recommendation: The error message model list is Claude's discretion. Use a conservative well-known subset (`openai/gpt-4o`, `openai/gpt-4o-mini`, `openai/gpt-4.1`) and point to `https://github.com/marketplace?type=models` for the full list. The `GET https://models.github.ai/catalog/models` endpoint can be called programmatically at runtime to get the live list if needed.

2. **Per-model input token limits for the hardcoded table**
   - What we know: `openai/gpt-4o` and `openai/gpt-4o-mini` have 128k context windows; `openai/gpt-4.1` has ~1M tokens; GitHub enforces per-request token limits that may be tighter than the model's architectural context window
   - What's unclear: GitHub's enforced per-request input limits (community discussion mentions ~8000 token limits for the free tier; this may be lower than model architectural limits)
   - Recommendation: Use conservative limits in the hardcoded table (32k for most models unless documented otherwise). The failure mode (user gets a clear error and is told to reduce scope) is acceptable.

3. **Folder path matching in response parsing**
   - What we know: The static pipeline produces `folder.relativePath` for each folder. The LLM is instructed to echo these paths in delimiters.
   - What's unclear: Whether the LLM will normalize paths (forward slash vs backslash on Windows, trailing slash, etc.)
   - Recommendation: Normalize all paths to forward-slash before embedding in prompt and when matching in the parser. Use `path.posix.normalize` on the relativePath before sending.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 (ESM mode) |
| Config file | `jest.config.js` (project root) |
| Quick run command | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/` |
| Full suite command | `node --experimental-vm-modules node_modules/.bin/jest` |

### Phase Requirements → Test Map

Phase 5 has no formal requirement IDs in REQUIREMENTS.md (it's a new feature outside the v1 milestone). Testing maps to behaviors:

| Behavior ID | Behavior | Test Type | Automated Command | File Exists? |
|-------------|----------|-----------|-------------------|-------------|
| LLM-B1 | `--llm` without `--llm-model` exits code 1 with model list | unit (cli validation) | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/cli.test.js -t "missing llm-model"` | ❌ Wave 0 |
| LLM-B2 | `--llm` without `GITHUB_TOKEN` exits code 1 | unit (cli validation) | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/cli.test.js -t "missing GITHUB_TOKEN"` | ❌ Wave 0 |
| LLM-B3 | `estimateTokens()` returns plausible value | unit (llmGenerator) | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/llmGenerator.test.js -t "estimateTokens"` | ❌ Wave 0 |
| LLM-B4 | Response parser extracts correct folder content from multi-folder delimiter format | unit (llmGenerator) | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/llmGenerator.test.js -t "parseResponse"` | ❌ Wave 0 |
| LLM-B5 | Parser returns empty-content error for missing folder in response | unit (llmGenerator) | `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/llmGenerator.test.js -t "missing folder"` | ❌ Wave 0 |
| LLM-B6 | Full LLM integration (network call to API) | manual-only | — | N/A |

> LLM-B6 is manual-only because it requires a live GITHUB_TOKEN and makes a real API call. It cannot be automated without mocking infrastructure, and the project has no mocking patterns established.

### Sampling Rate
- **Per task commit:** `node --experimental-vm-modules node_modules/.bin/jest tests/phase5/`
- **Per wave merge:** `node --experimental-vm-modules node_modules/.bin/jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase5/cli.test.js` — covers LLM-B1, LLM-B2 (CLI validation before analyze())
- [ ] `tests/phase5/llmGenerator.test.js` — covers LLM-B3 (estimateTokens), LLM-B4 (parseResponse), LLM-B5 (missing folder error)

---

## Sources

### Primary (HIGH confidence)
- Official GitHub Docs (quickstart) — `https://docs.github.com/en/github-models/quickstart` — endpoint URL, request format, Bearer auth, Node.js fetch example
- GitHub Changelog May 2025 — `https://github.blog/changelog/2025-05-15-github-models-api-now-available/` — catalog endpoint (`GET /catalog/models`), inference endpoint (`POST /inference/chat/completions`)

### Secondary (MEDIUM confidence)
- GitHub Community Discussion #157126 — `https://github.com/orgs/community/discussions/157126` — confirms `models.github.ai` is the new canonical endpoint replacing `models.inference.ai.azure.com`
- GitHub Community Discussion #137298 — `https://github.com/orgs/community/discussions/137298` — rate limit behavior (429 on excess), per-model daily request limits

### Tertiary (LOW confidence)
- Promptfoo GitHub Models Provider docs — `https://www.promptfoo.dev/docs/providers/github/` — confirms OpenAI-compatible interface, publisher-prefixed model IDs
- WebSearch results aggregation — model ID format (`openai/gpt-4o`) confirmed across multiple independent sources but exact full list not verified from a single authoritative source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Node.js built-in fetch is confirmed, zero-dep constraint is architectural, no new packages
- API endpoint and auth: HIGH — endpoint URL and Bearer auth verified from official GitHub Docs quickstart
- Model ID format: MEDIUM — `publisher/model-name` format seen in official docs and quickstart examples; full current list requires live catalog call
- Token limits: LOW — architectural context windows documented, but GitHub's enforced per-request limits for the free tier are not officially documented in a stable location
- Architecture patterns: HIGH — follows established project conventions (new file in `src/generators/`, flag parsing in `bin/cli.js`, branch in `analyze()`)
- Pitfalls: MEDIUM — legacy endpoint and model name format verified; LLM delimiter non-compliance is a known LLM behavior pattern

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (API endpoints stable; model catalog changes frequently but model ID format is stable)
