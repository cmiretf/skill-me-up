# Pitfalls Research

**Domain:** Static code analysis enrichment for AI agent context generation
**Researched:** 2026-03-08
**Confidence:** HIGH (multiple independent sources, corroborated by internal codebase audit)

---

## Critical Pitfalls

### Pitfall 1: Generating Stale Examples That Actively Mislead Agents

**What goes wrong:**
Usage examples extracted from the codebase at generation time reflect the code as it was, not as it is. Once the code changes — a method signature evolves, a pattern is deprecated, a class is renamed — the example in the `.md` file becomes incorrect. Because agents trust context files absolutely (Codified Context, arxiv 2602.20478), an outdated example is worse than no example: the agent confidently does the wrong thing.

**Why it happens:**
Generation is a one-shot event. The tool writes files and moves on. There is no mechanism to detect that `agent_service_instructions.md` references `UserService.findByEmail(id)` when the method was renamed to `UserService.lookupByEmail(email)` three weeks ago. Staleness is invisible until an agent produces a broken change.

**How to avoid:**
- Never embed verbatim code snippets that will inevitably drift. Instead, emit file+line pointers (`See: src/services/UserService.js:42`) that force the agent to read the current source.
- When snippets are included, keep them to signatures only (method name + parameters), not full bodies.
- The generated markdown should document the pattern ("services expose a `findBy*` naming convention") not the specific implementation.
- Add a generation timestamp and a warning header: "This file was auto-generated on [date]. If the codebase has changed significantly since then, re-run `npx skill-me-up`."

**Warning signs:**
- Generated files reference method names or class names that no longer exist in the target project.
- The same folder is analyzed twice across months and the second output contradicts the first in ways the code doesn't support.
- Agents produce changes that match the old pattern documented in the file, not the current one in the codebase.

**Phase to address:**
The examples extraction phase. Every usage example must be a pointer, not a copy. Build this constraint into the extractor from the start, not as a retrofit.

---

### Pitfall 2: Regex-Extracted "Examples" Contain Syntax Noise or Are Semantically Wrong

**What goes wrong:**
Regex-based extraction from raw source text captures surface patterns, not semantics. A regex looking for method signatures will match commented-out code, string literals that look like code, multiline declarations split across lines, or generic type parameters that break the pattern. The result is examples that are syntactically plausible but wrong — e.g., a method that appears public but is inside a test-only inner class, or an "antipattern" that is actually the only correct way to call a legacy API.

**Why it happens:**
This is the documented core weakness of `patternDetector.js` (CONCERNS.md): all 9 language parsers use hand-written regexes. When enrichment adds example extraction on top, the same fragility now appears directly in agent-visible output rather than just in internal data structures. Errors that were previously invisible now get surfaced to the agent as authoritative facts.

**How to avoid:**
- Extract examples only from patterns that the existing regex infrastructure can reliably detect. If a pattern has known false positive rates (e.g., Java generic declarations), do not extract examples from it.
- Add a confidence gate: only include an example if it passes a secondary validation check (e.g., the method name also appears in an import or call site elsewhere, confirming it is used).
- For the zero-dependency constraint, use heuristic filters (line count, indentation depth, presence of comment markers) to discard likely-false extractions before writing them.
- Flag examples with `(inferred)` vs `(verified)` based on extraction confidence.

**Warning signs:**
- Generated examples contain comment markers (`//`, `#`, `*`) as the first character.
- Generated examples reference types or methods that do not appear anywhere else in the codebase.
- The same code block appears as both an example and an antipattern in different sections.

**Phase to address:**
The antipattern detection phase and the usage example extraction phase, both. Both rely on the same regex infrastructure and both will surface errors directly in generated output.

---

### Pitfall 3: Antipattern Detection Produces False Positives That Insult Correct Code

**What goes wrong:**
Labeling something as a "Don't Do" antipattern in a generated file tells the agent that code is wrong. If the detection is a false positive — the code matches a surface heuristic but is actually the correct approach for this project — the agent will actively avoid a pattern it should use, or worse, refactor correct code into something broken.

**Why it happens:**
Antipattern detection requires understanding intent, not just structure. "A service that calls another service directly" may be an antipattern in one architecture and the expected pattern in another. Regex-based detection cannot distinguish these cases. The tool risks encoding generic antipatterns that conflict with project-specific conventions.

**How to avoid:**
- Only detect antipatterns with near-zero false positive rates: things that are universally wrong in a given language regardless of project (e.g., `catch(Exception e) {}` empty catch blocks in Java, `console.log` left in production controller methods in JS).
- Never infer an antipattern from a single occurrence. Require a minimum frequency threshold (e.g., appears in 3+ files) before including it, to avoid flagging one-off intentional exceptions.
- For project-specific conventions, use inversion: detect the positive pattern and phrase the antipattern as its absence ("Functions in this folder consistently use X — avoid not using X") rather than detecting the bad form directly.
- Make the antipattern section in the markdown clearly labeled as "Detected heuristically — verify these apply to your use case."

**Warning signs:**
- The same pattern appears in both the "Do this" examples section and the "Don't Do" antipatterns section.
- An antipattern is detected in only one or two files that are otherwise consistent with the rest of the codebase.
- The antipattern description is so generic it would apply to any project in any language.

**Phase to address:**
The antipattern detection phase. Define the detection rules and their confidence thresholds before building the extraction pipeline. A rule with a known 30% false positive rate should not be included even if it is technically detectable.

---

### Pitfall 4: Over-Documentation — Comprehensive Files That Agents Ignore or Get Confused By

**What goes wrong:**
Adding more content to generated `.md` files beyond a readable threshold causes agents to process irrelevant tokens, degrades task success rates, and increases inference costs. Research from Gloaguen et al. (February 2026) found that overly detailed context files reduced task success rates and increased AI inference costs by more than 20%. Frontier LLMs can follow approximately 150-200 distinct instructions with reasonable consistency — past that point, instructions compete with each other and earlier ones get dropped.

**Why it happens:**
The instinct when enriching output is to add more. More examples, more cross-folder context, more conventions. But comprehensiveness and usefulness are in tension for AI consumers. Every line added is also a line that could drown out a more important instruction. This is the core tension for this milestone: enrichment must be selective, not exhaustive.

**How to avoid:**
- Set a target maximum length per generated file (recommended: 300 lines). Enforce this as a hard limit in `mdGenerator.js`.
- Prioritize content by "what would the agent get wrong without this." If the information is inferable from reading the code directly, omit it.
- For cross-folder context, emit summaries not enumerations: "This folder depends on `auth/` for JWT validation and `db/` for persistence" is more useful than listing every import.
- Use progressive disclosure: include the top 2-3 examples, not all 20 detected.

**Warning signs:**
- Generated files exceed 400 lines.
- The same information appears in multiple sections of the same file (e.g., a class is listed in "Key Classes", "How to Add New Code", and "Dependencies").
- Adding enrichment made the file longer but an agent reviewing a PR still makes the same category of mistake.

**Phase to address:**
Every phase of enrichment. Each feature added (examples, antipatterns, cross-folder context, conventions) needs a content budget, not just a feature spec.

---

### Pitfall 5: Cross-Folder Context Becomes a Stale Dependency Graph

**What goes wrong:**
Cross-folder context documents how folders interact: "controllers call services, services call DAOs." This information is derived from import analysis. When the architecture evolves — a new abstraction layer is added, a service is split, a direct dependency is replaced by an event — the cross-folder section describes relationships that no longer exist or misses new ones. Unlike stale examples (which are wrong facts), stale cross-folder context creates a wrong mental model of the system architecture.

**Why it happens:**
Import-based dependency extraction captures static references at analysis time. Architectural changes happen continuously. The generated `.md` file has no awareness of whether the dependency it documents still exists or is still the right way to cross that boundary.

**How to avoid:**
- Limit cross-folder context to structural facts that are highly stable: "This folder contains all HTTP route handlers" is stable; "Route handlers call UserService" may not be.
- Express cross-folder dependencies directionally and at the folder level, not the class or method level. Method-level cross-folder references are especially unstable.
- When documenting cross-folder dependencies, always note they are "as of last analysis" and include the total number of import references found (a count drop from 12 to 2 on re-run is a signal the architecture changed).

**Warning signs:**
- Cross-folder context references a folder or module that no longer exists in the project.
- A folder's documented dependents don't match its actual importers (verifiable by grepping the codebase).
- The project has been refactored but cross-folder sections still describe the old structure.

**Phase to address:**
The cross-folder context phase. Design the output to be explicitly time-bounded and structurally coarse, not fine-grained.

---

### Pitfall 6: Convention Detection Encodes Accidental Patterns as Intentional Rules

**What goes wrong:**
Convention detection looks for consistent patterns across a folder (naming conventions, file structure, annotation usage) and surfaces them as "This is how we do things here." But not every consistent pattern is an intentional convention. If a developer happened to name three variables `result` in three methods across a service layer, the tool might document "`result` as the standard variable name for return values" — which is accidental, not deliberate. Agents then follow it as a rule.

**Why it happens:**
Statistical consistency is not the same as intentional convention. A tool that cannot distinguish the two will over-report conventions. The smaller the codebase or the folder, the worse this gets: 3 files is enough to detect a "pattern" that is actually coincidence.

**How to avoid:**
- Set minimum sample sizes for convention detection. A naming pattern must appear in at least 60-70% of eligible files/methods, with a minimum absolute count of 5+, before being reported as a convention.
- Only detect conventions in categories with strong signal-to-noise ratios: file naming patterns (very reliable), class suffix conventions (reliable), annotation/decorator patterns (reliable), variable naming inside methods (unreliable — do not report).
- Phrase detected conventions as observations, not mandates: "Files in this folder are consistently named `*Service.js`" not "Always name files `*Service.js`."

**Warning signs:**
- Convention detection reports a "convention" found in only 2-3 files.
- Reported conventions conflict between adjacent folders (one folder "always uses X", another "always uses Y" for the same concept).
- A convention is documented for a variable naming pattern (too granular, too noisy).

**Phase to address:**
The convention detection phase. Define detection thresholds and category allow-lists before writing the detection logic.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems specific to this enrichment milestone.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy full method bodies as examples | Easy to implement, looks comprehensive | Examples go stale immediately; agents follow stale patterns | Never — use file+line pointers instead |
| Add all detected patterns without confidence gating | Maximum coverage, minimal filtering logic | False positives embedded in authoritative agent context | Never — confidence gating is mandatory |
| No max-length enforcement on generated files | Simpler generator, no truncation logic | Over-documented files degrade agent performance by 20%+ | Never — always enforce a length budget |
| Detect antipatterns from single occurrences | Catches edge cases | False positives that brand correct code as wrong | Never for cross-project antipatterns; maybe for universal language mistakes |
| Infer conventions from 2-3 samples | Catches early patterns in small codebases | Accidental patterns encoded as rules | Never — require minimum 5 samples and 60% coverage |
| Embed structural cross-folder relationships without timestamps | Simpler output, no metadata clutter | Agents trust stale architectural descriptions absolutely | Only for relationships proven to be stable (e.g., the folder pattern itself) |

---

## Performance Traps

Patterns that work at small scale but fail as projects grow.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reading every file for example extraction on top of existing analysis | Analysis time doubles or triples | Reuse file reads already done in `analyzeFileContents`; do not add a second read pass | 200+ file projects |
| Regex-based example extraction with no size guard | Large generated files (e.g., minified bundles) produce enormous example output | Skip files over 500KB before extraction, same as the existing size-guard gap | Any project with a committed build artifact |
| Building cross-folder context by re-scanning the entire project per folder | O(n²) scans for n folders | Build the cross-folder dependency map once during the main analysis pass, then look up per folder | Projects with 20+ folders |
| Generating examples for all detected methods with no priority ranking | Files with 40+ methods produce unreadably long example sections | Cap examples per folder at 3-5, ranked by usage frequency (call count from import analysis) | Any folder with more than ~10 public methods |

---

## Content Quality Mistakes

Domain-specific quality failures in generated context files.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Documenting what the code does instead of what the agent needs to know to add new code | Context window consumed by descriptions the agent can read from the code directly | Only document non-obvious conventions, constraints, and integration requirements |
| Including boilerplate that matches every project (e.g., "use meaningful variable names") | Generic noise trains agents to skim and miss project-specific rules | Content must be specific to this codebase, not general programming advice |
| Generating antipatterns in languages where the regex parser has known false positive rates | Incorrect antipatterns become agent instructions | Gate antipattern sections on language parser confidence level; skip for languages with known fragile parsers |
| Documenting cross-folder relationships for folders with no detected pattern | Produces vague, useless context ("this folder interacts with other folders") | Only generate cross-folder context for folders with a detected architectural pattern (controller, service, DAO, etc.) |

---

## Zero-Dependency Constraint Pitfalls

Specific risks introduced by maintaining zero external dependencies.

| Constraint | Temptation | Risk | Mitigation |
|------------|------------|------|------------|
| No AST parser available | Use deeper regex heuristics to compensate | Increasing regex complexity compounds false positives geometrically | Accept lower coverage; document what the tool cannot reliably detect |
| No diff library | Re-generate entire files on each run | Agents using the file mid-session see it overwritten with different content | Atomic writes via temp file + rename; keep output deterministic so diffs are minimal |
| No templating engine | Build strings via concatenation in `mdGenerator.js` | Example content with special markdown characters (backticks, brackets) breaks formatting | Escape all extracted code before embedding in markdown; use fenced code blocks consistently |
| No validation library | Skip output validation | Generated markdown with broken syntax (unclosed fences, malformed tables) renders incorrectly in agent context | Add a lightweight post-generation check: count opening vs. closing fences, verify table column counts |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Usage examples:** Extraction produces output — verify that examples reference real, currently-existing code by spot-checking 3 files manually after generation.
- [ ] **Antipatterns:** Detection finds patterns — verify the detected "antipatterns" are actually incorrect usage and not the only valid approach in this project's context.
- [ ] **Cross-folder context:** Dependencies are listed — verify that all listed dependencies still exist as importable modules in the project at the time of analysis.
- [ ] **Conventions:** Patterns are detected — verify that detected conventions appear in the majority of files in the folder, not just a minority.
- [ ] **Length budget:** Content is generated — verify that no generated file exceeds 300 lines.
- [ ] **Re-run idempotency:** Tool completes — verify that running the tool twice produces bit-identical output (existing files are replaced cleanly, no duplicated sections).
- [ ] **Cross-language coverage:** JavaScript examples are generated — verify that the enrichment works equally for Java/Python/Go projects by testing against a fixture of each language type.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale examples already distributed to consumers | MEDIUM | Re-run `npx skill-me-up` to overwrite. Add timestamp headers so consumers can detect staleness. If agents have already committed changes based on stale context, audit those commits manually. |
| False positive antipattern labeling a correct pattern as wrong | MEDIUM | Remove the detection rule. Re-run to overwrite. Audit any agent-generated code from the period the file was live for incorrectly avoided patterns. |
| Over-documented files (400+ lines) degrading agent performance | LOW | Enforce length limit in `mdGenerator.js`, re-run. No data loss — files are regenerated from source. |
| Convention detection encoding accidental patterns as rules | LOW-MEDIUM | Raise the minimum sample threshold. Re-run. Review any agent-generated code that followed the false convention. |
| Broken markdown syntax in generated files | LOW | Add post-generation validation. Re-run. The files are generated artifacts — source of truth is always the code. |
| Cross-folder context describing deleted or renamed modules | LOW | Re-run after the architectural change. Consider adding a CI step that re-runs `skill-me-up` on each significant refactor. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stale examples | Examples extraction phase — use pointers, not copies | After generation, verify 3+ example pointers resolve to existing code |
| Regex false positives in examples | Examples extraction phase — add confidence gate before inclusion | Run against a fixture project; manually verify all extracted examples are syntactically correct |
| Antipattern false positives | Antipattern detection phase — define rules + thresholds first, implement second | Run against a project with known-correct code; verify zero antipattern false positives |
| Over-documentation | Every enrichment phase — enforce 300-line budget per file | After each phase adds content, measure P95 file length across a test project |
| Stale cross-folder context | Cross-folder context phase — emit structural summaries, not method-level references | After a simulated refactor, re-run and verify old module names do not appear in output |
| Accidental convention detection | Convention detection phase — require min 5 samples, 60% coverage | Run against a project with 2-3 files per folder; verify no conventions are reported |
| Broken markdown output | Generator phase — add post-generation lint pass | Parse every generated file with a markdown parser (no external dep needed: count fences and table pipes manually) |
| Zero-dependency constraint breakage | Architecture phase — define what is and is not permitted before enrichment features are built | `npm ls` on published package shows zero production dependencies |

---

## Sources

- Codified Context: Infrastructure for AI Agents in a Complex Codebase (arxiv 2602.20478, February 2026) — stale specification failure modes, agent trust in documentation
- AGENTS.md Files: The Research Says You're Probably Doing Them Wrong (allstacks.com, 2026) — over-documentation performance impact, Gloaguen et al. February 2026 study
- Writing AI coding agent context files is easy. Keeping them accurate isn't. (packmind.com, 2026) — documentation drift, conflicting files, missing validation commands
- The Complete Guide to AI Agent Memory Files (medium.com/data-science-collective, 2025) — staleness, fragmentation, instruction budget
- Context is AI coding's real bottleneck in 2026 (thenewstack.io, 2026) — context gap between engineer knowledge and agent knowledge
- Internal: `.planning/codebase/CONCERNS.md` — regex fragility in `patternDetector.js`, silent error swallowing, no test coverage, `extractMatches` infinite loop risk, `buildFolderTree` off-by-one

---
*Pitfalls research for: static code analysis enrichment for AI agent context generation (skill-me-up)*
*Researched: 2026-03-08*
