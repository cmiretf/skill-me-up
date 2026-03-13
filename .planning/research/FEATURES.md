# Feature Research

**Domain:** AI-context documentation generators (static analysis → agent instruction files)
**Researched:** 2026-03-08
**Confidence:** HIGH (core claims verified across multiple studies and official sources)

---

## The Governing Constraint: What AI Agents Can vs. Cannot Infer

Before cataloguing features, this constraint must be understood — it determines whether a feature adds signal or noise.

**Agents can infer from code directly:**
- File structure and naming patterns
- Import relationships between files
- Class names, method signatures, type annotations
- Framework conventions (e.g. Spring controllers, Express routes)
- Basic architectural patterns (MVC, layered architecture)
- Code style from existing files

**Agents cannot infer from code:**
- Why a pattern was chosen (intent, not just structure)
- Which patterns are sanctioned vs. legacy/accidental
- What must NOT be done and why
- Cross-folder interaction intent (not just import graphs)
- Non-obvious constraints (why a directory must not be modified)
- Naming and style conventions when they deviate from standard

**Research finding (ETH Zurich / DeepMind, 2026):** Context files that document what agents can already discover reduce task success rates by 2-3% and increase cost by 20%+. Files focused on non-inferable information produce ~4% improvement. The implication for skill-me-up: every generated section should contain information the agent could not recover by reading the source files alone.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features developers expect in any AI-context documentation generator. Missing these means the output files are not credible context for an AI agent.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Folder-level role description | Agents need to know what a folder IS before they can work in it. Without a role label (controller, service, repository, etc.) the agent must guess. | LOW | Already implemented via FOLDER_PATTERNS lookup. Improvement: make descriptions richer and behaviour-focused, not just name-based. |
| Concrete code examples extracted from the actual codebase | Abstract descriptions ("this folder contains services") tell the agent nothing actionable. Examples show the agent what idiomatic code looks like in *this* project, not just in the framework generally. LLM-as-learner benefits enormously from few-shot examples. | MEDIUM | This is the highest-leverage missing feature. Static extraction of representative class/function bodies. |
| Exact commands for build, test, run | Agents execute commands verbatim. Wrong commands = wasted turns, broken CI, agent confusion. This is the most-cited category of non-inferable information in research. | LOW | Extractable from package.json scripts, Makefile targets, pom.xml. Already partially present. |
| Cross-folder dependency map (caller/callee) | Cross-file relationships are the hardest thing for agents to reconstruct on their own. Knowing "this folder is called by X and calls Y" prevents agents from creating new intermediary layers or breaking existing contracts. | MEDIUM | Currently extracted as raw import analysis. Needs presentation as an intent-aware interaction map, not just a list of import paths. |
| Project-specific naming conventions | When conventions deviate from framework defaults, agents produce code that is correct but inconsistent — it passes review but adds drift. Conventions are non-inferable because agents see valid alternatives, not which one is sanctioned. | LOW | Detectable via analysis of existing class/file names. Pattern: if 90%+ of files follow a suffix rule, it's a convention. |
| "How to add new code here" instructions | Agents asked to add a feature in a folder need a concrete protocol, not just knowledge that the folder exists. Vendor best practice (Anthropic, JetBrains) is explicit step-by-step instructions per folder type. | LOW | Already implemented. Improvement: make instructions concrete to the detected pattern, not generic. |

### Differentiators (Competitive Advantage)

Features that make skill-me-up's output meaningfully better than a generic README or hand-written CLAUDE.md. These address the specific failure modes of AI agents in real codebases.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Don't Do" antipattern section with codebase evidence | Research shows agents default to patterns that "look correct" based on training data — they reinvent utilities that already exist, copy code instead of reusing it, and apply generic framework patterns that the project consciously abandoned. An explicit "Don't Do" section with a *reason* changes agent behaviour at inference time. | MEDIUM | Requires detecting antipatterns statically: duplicated code blocks, inconsistency with dominant patterns, abandoned patterns (e.g., old DAO style vs. new repository style coexisting). Hardest part is the "reason" — it can be inferred from pattern prevalence (minority pattern = legacy/accident). |
| Semantic behaviour inference (what this code does, not just what it is) | Current output describes structure (classes, methods, imports). The differentiating layer is behaviour: "this service is responsible for payment idempotency" vs. "this service has 3 methods." Behaviour inference reduces the agent's need to read entire files before acting. | HIGH | Requires heuristic analysis of method names, annotation types, docstrings, and constant/variable names. No LLM calls allowed (zero-dependency constraint). Pure lexical analysis of identifiers can yield high signal: `processRefund`, `IDEMPOTENCY_KEY`, `@Transactional` together signal payment + idempotency. |
| Staleness-safe format (pointers over copies) | Research finding (HumanLayer, 2025): code snippets in context files become outdated and create a worse problem than no context — agents act on stale information confidently. Pointers to file:line references stay valid longer. The differentiating feature is generating explicit pointers ("see `PaymentService.java:45` for the canonical pattern") rather than copying code bodies. Skill-me-up re-runs overwrite files, but the codebase changes between runs. | MEDIUM | Hybrid approach: embed the actual code at generation time but also emit the source path:line so agents can verify. Requires tracking line numbers during extraction. |
| Per-folder interface contract documentation | Agents building across folder boundaries make the most mistakes when they don't know the folder's public interface contract: what it expects, what it guarantees, what it explicitly does not handle. This is distinct from listing methods — it is the behavioural contract. | HIGH | Requires inferring contracts from: public vs. private access modifiers, method parameter validation patterns, exception types thrown, interface vs. implementation distinction. Partially supported (hasInterfaces, hasImplementations flags exist). Needs richer presentation. |
| Detected conventions vs. stated conventions | Most tools ask users to write conventions manually. Skill-me-up can detect them statically. Detecting conventions from 90%+ consistency across the folder (naming suffix, return type patterns, annotation stacking) is higher-signal than human-written rules that go stale. | MEDIUM | Pattern prevalence analysis over the existing file analysis output. Already collecting the data; need to compute statistics and emit convention rules. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like improvements but add noise, not signal, for AI agents.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Comprehensive architectural narrative | Devs want a full project overview section in every file | Agents already infer architecture from code. Narrative prose duplicates discoverable information and fills context budget with low-density content. ETH Zurich study: this is the primary reason LLM-generated files underperform. | Limit narrative to 1-2 sentences of non-inferable intent ("this folder isolates all third-party payment gateway calls so the rest of the system stays testable"). |
| Style guide / formatting rules | Linting rules feel like useful constraints | Agents use linters. Style constraints in context files are redundant and consume instruction budget. Anthropic, HumanLayer, and JetBrains all cite this as the top anti-feature. | Use project linters. Document only style rules that linters cannot enforce (e.g., "we name boolean methods isX not hasX for domain objects"). |
| File tree / directory listing | Looks useful as orientation | Agents can read directory structure directly. A static file tree copied into context becomes stale on next file creation. It adds tokens without adding information the agent can't get from `ls`. | Cross-folder dependency map (which folder CALLS which) is the high-signal alternative. |
| Full method bodies in context files | More code = more context | Copying full method bodies creates a staleness problem and burns context budget. Research: prefer file:line pointers or minimal representative examples. | One representative example per pattern, with source path. The agent reads the full file if it needs more. |
| Per-file documentation | Thorough coverage feels professional | Per-file docs scale poorly (hundreds of files = thousands of lines of context) and overwhelm the context budget. Research confirms shorter files are followed more reliably. | Per-folder documentation with pointers to key files by role. |
| Dependency version listing | Feels like useful environment info | Package versions are already in package.json / pom.xml / pyproject.toml. Duplicating them creates a maintenance burden and adds zero information the agent cannot instantly read. | Point agents to the manifest file. |
| LLM-generated content in the output files | Could enrich descriptions automatically | Violates the zero-dependency constraint and creates a circular dependency (the tool that helps AI needs AI to work). Also: research shows LLM-generated context files underperform human/static-analysis-generated ones by 3-4%. | Static analysis with heuristic enrichment is the right approach for skill-me-up's constraints. |

---

## Feature Dependencies

```
[Real Code Examples]
    └──requires──> [Line Number Tracking during extraction]
    └──enhances──> [Staleness-Safe Pointers]
                       └──requires──> [Line Number Tracking during extraction]

[Cross-Folder Interaction Map]
    └──requires──> [Import Analysis] (already exists)
    └──enhances──> ["Don't Do" Antipatterns] (broken dependency = antipattern)

[Detected Conventions]
    └──requires──> [File Analysis Metadata] (already exists)
    └──enhances──> ["Don't Do" Antipatterns] (deviation from convention = candidate antipattern)

[Semantic Behaviour Inference]
    └──requires──> [Deep File Analysis] (already exists)
    └──enhances──> [Per-Folder Interface Contract]

["Don't Do" Antipattern Section]
    └──requires──> [Detected Conventions] (need baseline to identify deviation)
    └──enhances──> [Role Description] (clarifies what the folder is NOT for)
```

### Dependency Notes

- **Code Examples require Line Number Tracking:** The current patternDetector.js does not track source line numbers — it extracts class/method names but not their source positions. Adding line tracking is a prerequisite for both the example extraction and the staleness-safe pointer features.
- **"Don't Do" requires Detected Conventions:** You cannot identify an antipattern without knowing the sanctioned pattern first. Convention detection must precede antipattern identification in the pipeline.
- **Semantic Behaviour Inference enhances Interface Contracts:** Inferring what a module does (behaviour) is the prerequisite for documenting what callers can rely on (contract). These features belong in the same development phase.
- **Cross-Folder Map requires existing Import Analysis:** This dependency is already satisfied. The gap is presentation, not data collection.

---

## MVP Definition

This milestone is a quality improvement on a shipped tool (v1.1). "MVP" here means the minimum set of improvements that make the generated files meaningfully better for AI agents — not just longer or more detailed.

### Launch With (v1.2)

- [ ] **Real code examples extracted from the codebase** — this is the single highest-signal addition. One representative example per detected pattern type (class structure, method pattern, decorator/annotation style). Requires adding line number tracking to extraction.
- [ ] **"Don't Do" section with detected antipatterns** — the second-highest-signal addition. Even simple detection (minority patterns, naming inconsistencies) is more valuable than no negative examples.
- [ ] **Richer cross-folder interaction map** — upgrade existing import analysis from a list of import paths to a caller/callee description with folder-level roles. Low additional parsing work, high readability improvement.
- [ ] **Detected naming/structural conventions** — statistical analysis over existing extracted metadata. Low complexity, directly prevents the most common agent mistake (inconsistent naming on new code).

### Add After Validation (v1.3)

- [ ] **Staleness-safe pointers (file:line references)** — valuable but requires more pipeline changes. Add after v1.2 lands and can be evaluated.
- [ ] **Per-folder interface contract documentation** — higher complexity (requires contract inference). Validate that the v1.2 improvements are absorbed well before adding this layer.

### Future Consideration (v2+)

- [ ] **Semantic behaviour inference** — high complexity for static analysis. Consider only after exhausting the signal available from structural/lexical analysis. May require accepting a lightweight optional dependency for the most ambiguous cases.
- [ ] **Multi-file root context document** — a project-level summary file that routes agents to folder-level files. Useful for large codebases but adds scope and a new output artifact type.

---

## Feature Prioritization Matrix

| Feature | Agent Value | Implementation Cost | Priority |
|---------|-------------|---------------------|----------|
| Real code examples from codebase | HIGH | MEDIUM | P1 |
| "Don't Do" antipattern section | HIGH | MEDIUM | P1 |
| Richer cross-folder interaction map | HIGH | LOW | P1 |
| Detected naming conventions | HIGH | LOW | P1 |
| Staleness-safe file:line pointers | MEDIUM | MEDIUM | P2 |
| Per-folder interface contract | HIGH | HIGH | P2 |
| Semantic behaviour inference | HIGH | HIGH | P3 |
| Multi-file root context document | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for this milestone — directly addresses the gap between current output and useful AI context
- P2: Should have — significant value, add when P1 is stable
- P3: Nice to have — defer until product-market fit with richer files is confirmed

---

## Competitor Feature Analysis

| Feature | Cursor (`.cursorrules`) | Codebase Context Spec (`.context/`) | skill-me-up target |
|---------|------------------------|--------------------------------------|-------------------|
| Scope | Single global file | Directory-level context files | Per-folder files (existing) |
| Generation | Manual authoring | Manual authoring | Automated static analysis |
| Code examples | Manual inclusion | Manual inclusion | Automated extraction (P1) |
| Antipatterns | Manual inclusion | Not specified | Automated detection (P1) |
| Cross-folder deps | Manual inclusion | Manual inclusion | Automated import analysis (existing, needs enrichment) |
| Staleness | Degrades unless updated | Degrades unless updated | Re-run overwrites (existing advantage) |
| Zero-dependency | N/A | N/A | Core constraint |

**Key differentiator:** Every competitor in this space requires manual authoring. skill-me-up's fundamental advantage is automated generation — the research confirms human-written files perform better than LLM-generated ones, but the research did not test *statically-analyzed* files. The hypothesis is that static analysis hits the right middle ground: it captures non-inferable structural information (which human files do well) without the redundancy problem of LLM generation.

---

## Sources

- [Codified Context: Infrastructure for AI Agents in a Complex Codebase (arxiv, 2026)](https://arxiv.org/html/2602.20478v1) — HIGH confidence: peer-reviewed, describes three-tier architecture and what works at scale
- [What AGENTS.md Actually Does to Your Coding Agent — Agentic Academy](https://agentic-academy.ai/posts/agents-md-context-files-evaluation/) — HIGH confidence: reports ETH Zurich / DeepMind study findings (4% improvement for human-written, -3% for LLM-generated)
- [New Research Reassesses the Value of AGENTS.md Files — InfoQ (2026)](https://www.infoq.com/news/2026/03/agents-context-file-value-review/) — HIGH confidence: independent reporting on same research
- [When AGENTS.md Backfires — Chris Groves](https://notchrisgroves.com/when-agents-md-backfires/) — MEDIUM confidence: analysis piece, consistent with primary research
- [Writing a good CLAUDE.md — HumanLayer Blog](https://www.humanlayer.dev/blog/writing-a-good-claude-md) — MEDIUM confidence: practitioner experience, consistent with research on brevity and non-redundancy
- [My LLM coding workflow going into 2026 — Addy Osmani](https://addyosmani.com/blog/ai-coding-workflow/) — MEDIUM confidence: practitioner perspective, confirms "non-inferable information" principle
- [Codebase Context Specification — Agentic Insights (GitHub)](https://github.com/Agentic-Insights/codebase-context-spec) — MEDIUM confidence: community spec, useful as competitive reference
- [Best Practices for Context Management — DigitalOcean](https://docs.digitalocean.com/products/gradient-ai-platform/concepts/context-management/) — MEDIUM confidence: vendor documentation
- [Coding Guidelines for Your AI Agents — JetBrains Blog (2025)](https://blog.jetbrains.com/idea/2025/05/coding-guidelines-for-your-ai-agents/) — MEDIUM confidence: vendor best practice guidance

---

*Feature research for: AI-context documentation generators (skill-me-up milestone 2)*
*Researched: 2026-03-08*
