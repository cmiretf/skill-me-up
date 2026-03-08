# Project Research Summary

**Project:** skill-me-up
**Domain:** Zero-dependency Node.js CLI for polyglot static code analysis and AI-context documentation generation
**Researched:** 2026-03-08
**Confidence:** HIGH

## Executive Summary

`skill-me-up` is a shipped tool (v1.1) that needs a quality milestone, not a greenfield build. It already scans polyglot codebases and emits per-folder agent instruction files. The enrichment goal for this milestone (v1.2) is narrow and high-leverage: add the specific information that AI agents cannot infer from reading source code directly — real code examples, detected antipatterns, naming conventions, and richer cross-folder context. Research from ETH Zurich and DeepMind (2026) provides a clear mandate: context files that document discoverable information reduce task success rates by 2-3%, while files focused on non-inferable information produce ~4% improvement. Every addition must clear that bar.

The recommended approach is to extend the existing regex-based pipeline with four targeted additions — all zero-dependency, all additive to the current `PatternInfo` shape — in a sequenced build order that respects data dependencies: conventions first (uses already-extracted metadata), then examples (extends file reading that already happens), then antipatterns (requires conventions as a baseline), then cross-folder context (requires a second aggregation pass in `index.js`). No AST library should be added. The improvement headroom available from better structural heuristics and brace-depth counting on raw source text is large enough to deliver the milestone within the zero-dep constraint.

The primary risks are output quality failures, not implementation failures. Stale examples that mislead agents, false-positive antipatterns that brand correct code as wrong, and over-documented files that degrade agent performance by 20%+ are all more dangerous than incomplete coverage. Every feature in this milestone requires a content budget (300-line max per file), a minimum confidence threshold before inclusion, and a pointer-not-copy strategy for any code embedded in generated output.

---

## Key Findings

### Recommended Stack

The zero-dependency constraint is absolute and correct — `npx skill-me-up` must work instantly with no install cost. All new extraction capabilities must use Node.js stdlib only: enhanced regex heuristics, brace-depth scanning for body extraction, line-count metrics for antipatterns, and corpus-wide frequency analysis for conventions. No npm dependency should be added for any feature in this milestone.

AST parsing was evaluated and rejected. `acorn` (npm, 559 kB) and `meriyah` both violate the zero-dep constraint. Node.js's internally bundled copy of `acorn` is not exposed as a public API and is not importable by user code. A vendored copy of `acorn` in `src/vendor/` remains a viable future option if the milestone demands it, but the current feature scope does not justify it — structural heuristics on raw text deliver sufficient extraction fidelity for examples, antipatterns, and conventions.

**Core technologies:**
- Node.js stdlib (`fs`, `path`, >= 18): File I/O and path manipulation — already in use, zero cost
- Enhanced regex heuristics: Extract examples, detect antipatterns, infer conventions — no dependency; handles 80% of value gain
- Brace-depth scanning: Function body extraction for C-family languages — O(n) on file length, no AST needed
- Line/block metrics: Antipattern detection (long method, deep nesting, god class) — countable from raw text
- Corpus-wide frequency analysis: Naming convention and file pattern detection — simple counting over existing extracted metadata
- JSDoc/comment extraction: Enrich JS/TS output with human-authored descriptions — reliable regex on `/** ... */` blocks

### Expected Features

The feature research establishes a clear priority stack based on agent value vs. implementation cost.

**Must have for v1.2 (table stakes for meaningful output improvement):**
- Real code examples extracted from the codebase — highest-signal addition; one representative example per detected pattern type; requires adding line number tracking to extraction
- Detected naming and structural conventions — statistical analysis over already-extracted metadata; directly prevents the most common agent mistake (inconsistent naming on new code)
- "Don't Do" antipattern section with codebase evidence — second-highest signal; even simple heuristic detection changes agent inference-time behavior
- Richer cross-folder interaction map — upgrade existing import analysis from path lists to a caller/callee description at folder level; low additional parsing work, high readability gain

**Should have for v1.3 (significant value, validate v1.2 first):**
- Staleness-safe file:line pointers — valuable but requires more pipeline changes; add after v1.2 lands and can be evaluated
- Per-folder interface contract documentation — higher complexity; requires contract inference from access modifiers, exception types, and interface/implementation distinction

**Defer to v2+:**
- Semantic behavior inference — high complexity for static analysis; pure lexical analysis of identifiers can yield high signal but belongs after all structural signal is exhausted
- Multi-file root context document — project-level summary file routing agents to folder-level files; adds new output artifact type and scope

### Architecture Approach

The current pipeline is a three-phase sequential system: `structureAnalyzer` produces `FolderInfo[]`, `patternDetector` enriches each folder into `PatternInfo`, and `mdGenerator` renders `PatternInfo` to Markdown. This pipeline supports the milestone without structural overhaul. Two extension strategies are viable and complementary: Pattern 1 adds new fields to `PatternInfo` additively (zero breaking risk, the right choice for small additions), and Pattern 2 introduces a `src/extractors/` module layer for new capabilities that would otherwise bloat the already-977-line `patternDetector.js`. Cross-folder context requires a new second aggregation pass in `index.js` after the per-folder loop — this is the only structural change to the orchestrator.

**Major components:**
1. `src/analyzer/patternDetector.js` — primary extension point; all new per-file extraction logic lives here or in called extractor modules
2. `src/extractors/` (new) — dedicated modules for `exampleExtractor`, `antipatternDetector`, `conventionInferrer`, `crossFolderContextBuilder`; each is a pure function with no side effects
3. `src/generators/mdGenerator.js` — receives pre-computed data only; section builders are pure formatting functions; hard 300-line limit enforced here
4. `src/analyzer/index.js` — add cross-folder aggregation pass after per-folder loop; inject `crossFolderContext` into `PatternInfo` before generation

The recommended build order validated by architecture research: (1) conventions inferrer, (2) usage examples extractor, (3) antipattern detector, (4) cross-folder context aggregation. This order respects data dependencies and isolates the only structural change to `index.js` at the end.

### Critical Pitfalls

1. **Stale examples that actively mislead agents** — Never embed verbatim code bodies; emit file+line pointers (`See: src/services/UserService.js:42`) so agents read current source. When snippets must appear, keep them to signatures only. Include a generation timestamp header. Build pointer-not-copy into the extractor from day one, not as a retrofit.

2. **Antipattern false positives that brand correct code as wrong** — Only detect antipatterns with near-zero false positive rates (e.g., empty catch blocks, `console.log` in production controllers). Require minimum frequency threshold (3+ files) before including any antipattern. Label the section clearly as heuristically detected. Never infer an antipattern from a single occurrence.

3. **Over-documentation degrading agent performance** — Gloaguen et al. (February 2026) found overly detailed context files reduce task success rates and increase inference costs 20%+. Enforce a 300-line hard limit per generated file in `mdGenerator.js`. Cap examples at 2-3 per folder. Emit summaries for cross-folder context, not enumerations.

4. **Convention detection encoding accidental patterns as rules** — Require minimum 5 samples and 60% coverage before reporting any convention. Only detect conventions in high signal-to-noise categories: file naming, class suffix patterns, annotation/decorator usage. Do not detect variable naming inside methods. Phrase conventions as observations ("Files are consistently named `*Service.js`"), not mandates.

5. **Regex extraction producing semantically wrong examples** — Extract examples only from patterns the existing regex infrastructure reliably detects. Add a confidence gate: discard extractions where the method name does not appear elsewhere in the codebase (import or call site). Flag examples as `(inferred)` vs `(verified)` based on extraction confidence.

---

## Implications for Roadmap

Based on research, the feature dependencies and architecture build order directly map to a four-phase structure. The constraint is data dependency: you cannot detect antipatterns without conventions, cannot build cross-folder context without all per-folder extractions complete, and cannot validate the pipeline without a length budget enforced.

### Phase 1: Foundation — Line Tracking and Convention Detection

**Rationale:** Line number tracking is a prerequisite for both example extraction and staleness-safe pointers. Convention detection operates entirely on already-extracted metadata with no new file reads — it is the lowest-risk first step that validates the new field → new section → rendered output pipeline end-to-end. Both must land before later phases build on them.
**Delivers:** Per-folder naming convention sections in generated files; source line number tracking in all extractors; validated pipeline for new `PatternInfo` fields.
**Addresses:** Detected naming/structural conventions (P1 feature), the prerequisite for antipattern detection.
**Avoids:** Accidental convention detection — enforce 5-sample minimum and 60% coverage threshold from day one.
**Research flag:** Standard patterns — well-understood statistical analysis; no phase research needed.

### Phase 2: Usage Examples Extraction

**Rationale:** Real code examples are the highest-signal addition and unlock staleness-safe pointers. Depends on line tracking from Phase 1. Brace-depth scanning extends the existing file read pass without a second I/O cycle.
**Delivers:** Representative code examples (1-2 per folder, top by complexity) in generated files; file+line pointers for staleness safety; signature-only snippet strategy to minimize drift.
**Addresses:** Real code examples (P1 feature), staleness-safe file:line pointers (P2 foundation).
**Avoids:** Stale example pitfall — pointer-not-copy strategy enforced from the start; confidence gate filters regex false positives before surfacing to agents.
**Research flag:** Standard patterns — brace-depth scanning is a well-documented technique; no phase research needed.

### Phase 3: Antipattern Detection

**Rationale:** Requires conventions from Phase 1 as the baseline to define what "wrong" means relative to this codebase. Operates on already-extracted `deepAnalysis[]` with no new file reads. Must be built after examples so the "Do this" and "Don't Do" sections can be cross-validated against each other.
**Delivers:** "Don't Do" section per generated file with heuristically detected antipatterns; universal language antipatterns (empty catch, debug logging in controllers) as baseline coverage.
**Addresses:** "Don't Do" antipattern section with codebase evidence (P1 feature).
**Avoids:** Antipattern false positive pitfall — define detection rules and confidence thresholds before writing detection logic; require 3+ file frequency; label all antipatterns as heuristically detected.
**Research flag:** Needs careful threshold definition — the detection rule set must be defined and reviewed before implementation. Consider a brief design spike on antipattern categories and their false positive rates.

### Phase 4: Cross-Folder Context Aggregation

**Rationale:** Requires all per-folder extraction complete (depends on Phases 1-3) and requires a structural change to `index.js` (second aggregation pass). Isolated last to minimize regression risk to the rest of the pipeline.
**Delivers:** Per-folder "used by / uses" summary at folder level; upgraded cross-folder interaction map replacing raw import path lists; cross-context injected into all generated files.
**Addresses:** Richer cross-folder interaction map (P1 feature).
**Avoids:** Stale dependency graph pitfall — emit structural summaries at folder level only, never method-level references; always note "as of last analysis" with import reference count.
**Research flag:** Standard patterns — dependency graph inversion is a straightforward algorithm; no phase research needed.

### Phase 5: Output Quality and Length Enforcement

**Rationale:** Each enrichment phase adds content. Before shipping, validate total output length, re-run idempotency, and markdown syntax correctness across all generated files. This is not a cleanup afterthought — it is the quality gate that determines whether the enriched output helps agents or hurts them.
**Delivers:** Hard 300-line limit enforcement in `mdGenerator.js`; post-generation markdown lint pass; re-run idempotency verification; generation timestamp headers.
**Addresses:** Over-documentation pitfall (20%+ agent performance degradation); broken markdown output pitfall.
**Avoids:** The common mistake of shipping enrichment that makes files longer without making them more useful.
**Research flag:** Standard patterns — length budgeting and markdown validation are mechanical; no phase research needed.

### Phase Ordering Rationale

- **Conventions before antipatterns:** Antipattern detection requires a baseline of what is correct in this specific project. Convention detection establishes that baseline. This dependency is explicit in the feature research.
- **Line tracking before examples:** Source line number tracking is a prerequisite for both usage examples and staleness-safe pointers. Building it first avoids retrofitting a critical piece of infrastructure.
- **Cross-folder last:** The second aggregation pass in `index.js` is the only structural change to the orchestrator. All other phases are additive within the existing loop. Isolating this change minimizes regression risk.
- **Quality enforcement throughout:** The 300-line budget and markdown validation belong in Phase 5 as an explicit checkpoint, but length awareness should inform content decisions in every earlier phase.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Antipattern Detection):** The detection rule set requires careful design before implementation. A spike defining which antipatterns to detect per language, their expected false positive rates, and the threshold configuration is recommended before coding begins.

Phases with standard patterns (can skip research-phase):
- **Phase 1 (Conventions):** Statistical analysis over extracted string data — well-understood; direct implementation.
- **Phase 2 (Examples):** Brace-depth scanning is documented in multiple static analysis tools; direct implementation.
- **Phase 4 (Cross-Folder):** Dependency graph inversion is a standard algorithm; direct implementation.
- **Phase 5 (Quality):** Length enforcement and markdown validation are mechanical; direct implementation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero-dependency constraint is well-established; all techniques validated against existing codebase. AST options fully enumerated and correctly rejected. |
| Features | HIGH | Feature priorities backed by peer-reviewed research (ETH Zurich/DeepMind 2026) and multiple practitioner sources; feature dependency graph is clear and verified. |
| Architecture | HIGH | Based on direct codebase inspection of current source files; component boundaries and data shapes are documented from actual code, not inference. |
| Pitfalls | HIGH | Six pitfalls each corroborated by multiple independent sources; two verified against existing internal codebase concerns. |

**Overall confidence:** HIGH

### Gaps to Address

- **Antipattern rule set design:** Research identifies the categories and thresholds but does not enumerate specific detection rules per language. This needs a design step before Phase 3 implementation — which specific antipatterns to detect in Java, JS/TS, Python, etc., and their expected false positive rates.
- **Example confidence gating in practice:** The research recommends a confidence gate (method name appears at a call site elsewhere) but the viability of this cross-reference check within the zero-dep constraint needs validation during Phase 2 implementation. A fallback strategy (signature-only snippets) is defined if the cross-reference gate is too expensive.
- **JS/TS richness vs. polyglot parity:** The stack research identifies JS/TS as having the highest extraction potential (JSDoc, export shapes, brace-depth accuracy) while other languages have diminishing returns. The roadmap should explicitly set different extraction depth expectations per language rather than treating all languages as equal.
- **500+ file project performance:** Synchronous file reads in the current pipeline are acceptable for the expected use case but become a bottleneck above ~500 files. This is out of scope for v1.2 but should be flagged as a known scaling limitation in the output.

---

## Sources

### Primary (HIGH confidence)
- [Codified Context: Infrastructure for AI Agents (arxiv 2602.20478, 2026)](https://arxiv.org/html/2602.20478v1) — three-tier context architecture; agent trust in documentation; stale specification failure modes
- [What AGENTS.md Actually Does to Your Coding Agent — Agentic Academy](https://agentic-academy.ai/posts/agents-md-context-files-evaluation/) — ETH Zurich / DeepMind study findings; 4% improvement (human-written) vs. -3% (LLM-generated)
- [New Research Reassesses the Value of AGENTS.md Files — InfoQ (2026)](https://www.infoq.com/news/2026/03/agents-context-file-value-review/) — independent reporting on same research findings
- Direct inspection of `src/analyzer/patternDetector.js` (~977 lines, 2026-03-08) — component boundaries and data shapes
- Direct inspection of `src/generators/mdGenerator.js` (~264 lines, 2026-03-08) — generation pipeline and section structure
- Internal `.planning/codebase/CONCERNS.md` — regex fragility, silent error swallowing, no test coverage

### Secondary (MEDIUM confidence)
- [When AGENTS.md Backfires — Chris Groves](https://notchrisgroves.com/when-agents-md-backfires/) — anti-feature analysis; redundancy pitfalls
- [Writing a good CLAUDE.md — HumanLayer Blog](https://www.humanlayer.dev/blog/writing-a-good-claude-md) — brevity and non-redundancy in practice
- [Coding Guidelines for Your AI Agents — JetBrains Blog (2025)](https://blog.jetbrains.com/idea/2025/05/coding-guidelines-for-your-ai-agents/) — vendor best practice for context files
- [Embold antipatterns docs](https://docs.embold.io/anti-patterns/) — detection thresholds for brain method / god class / deep nesting via metrics
- [Node.js internal acorn update commit](https://github.com/nodejs/node/commit/38aa9d6ea9) — confirms acorn is bundled internally but not exposed as public API
- [acorn GitHub repository](https://github.com/acornjs/acorn) — zero sub-dependencies confirmed; size 559 kB
- AGENTS.md Files: The Research Says You're Probably Doing Them Wrong (allstacks.com, 2026) — Gloaguen et al. February 2026 study on over-documentation performance impact

### Tertiary (LOW confidence)
- [meriyah GitHub](https://github.com/meriyah/meriyah) — zero sub-deps, ESTree-compliant; version 6.1.4 from Libraries.io (not direct npm page)
- [web-tree-sitter npm](https://www.npmjs.com/package/web-tree-sitter) — WASM approach confirmed viable but requires per-language binaries

---
*Research completed: 2026-03-08*
*Ready for roadmap: yes*
