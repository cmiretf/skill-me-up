# Roadmap: skill-me-up

## Overview

This milestone (v2.0) enriches the generated `.md` files with real code examples, detected conventions, antipatterns, and richer cross-folder context — so AI agents reading them understand the codebase better than a developer who reads the source superficially. Four phases follow the data-dependency order forced by the feature set: foundation and conventions first, then examples, then antipatterns, then the quality gate that validates the whole pipeline.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Add line tracking and convention detection; establish the pipeline for new PatternInfo fields
- [ ] **Phase 2: Usage Examples** - Extract real code examples and upgrade cross-folder dependency descriptions
- [ ] **Phase 3: Antipattern Detection** - Detect and surface "Don't Do" patterns with confidence thresholds
- [ ] **Phase 4: Output Quality** - Enforce 300-line budget, add timestamps, and validate with regression fixtures

## Phase Details

### Phase 1: Foundation
**Goal**: Generated files include per-folder naming convention sections and all extractors track source line numbers
**Depends on**: Nothing (first phase)
**Requirements**: ENRICH-01, ENRICH-02, OUTPUT-01
**Success Criteria** (what must be TRUE):
  1. Running `npx skill-me-up` on any project produces `.md` files that include a "## Project Conventions" section listing detected naming style (e.g., camelCase, snake_case) and file naming patterns
  2. Convention entries only appear when at least 5 samples meet 60% coverage — no convention is reported for sparse data
  3. Extracted methods and classes in the analysis output carry source line numbers, visible to downstream phases
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Test infrastructure: jest + ESM config + 4 phase1 test stub files
- [ ] 01-02-PLAN.md — Line tracking: add getLineNumber helper + lineNumber field to all analyze* functions
- [ ] 01-03-PLAN.md — Convention detection: classifyNameStyle, dominantStyle, detectConventions in patternDetector.js
- [ ] 01-04-PLAN.md — MD output: buildConventionsSection + wire into buildMarkdown + human verification

### Phase 2: Usage Examples
**Goal**: Generated files include real code snippets and richer dependency interaction descriptions
**Depends on**: Phase 1
**Requirements**: ENRICH-03, OUTPUT-02, OUTPUT-04
**Success Criteria** (what must be TRUE):
  1. Running `npx skill-me-up` produces `.md` files with a "## Usage Examples" section containing 1-2 real snippets extracted from the actual codebase (not fabricated)
  2. Each example is limited to 15 lines and carries a file+line pointer (e.g., `See: src/services/UserService.js:42`) so agents can verify against current source
  3. The "## Dependencies" section in each `.md` describes what this folder does with each imported module, not just a raw path list
**Plans**: TBD

### Phase 3: Antipattern Detection
**Goal**: Generated files include a "Don't Do" section with heuristically detected antipatterns specific to this codebase
**Depends on**: Phase 2
**Requirements**: ENRICH-04, OUTPUT-03
**Success Criteria** (what must be TRUE):
  1. Running `npx skill-me-up` produces `.md` files with a "## Don't Do" section when antipatterns are found — covering at minimum: methods >40 lines, nesting >3 levels, god classes (>20 public methods), empty catch blocks
  2. No antipattern is surfaced from a single occurrence — minimum 3-file frequency threshold enforced before any antipattern appears in output
  3. The "## Don't Do" section is explicitly labeled as heuristically detected, not authoritative
**Plans**: TBD

### Phase 4: Output Quality
**Goal**: All generated files are safe to ship — length-budgeted, timestamped, and regression-tested against known-good snapshots
**Depends on**: Phase 3
**Requirements**: QUALITY-01, QUALITY-02, QUALITY-03
**Success Criteria** (what must be TRUE):
  1. No generated `.md` file exceeds 300 lines — the limit is enforced in `mdGenerator.js` and cannot be bypassed by adding new sections
  2. Every generated `.md` file contains a generation timestamp comment (`<!-- generated: YYYY-MM-DD -->`) at the top
  3. The project ships with at least 2 fixture projects (in different languages) and snapshot tests that fail if generated output deviates from the expected snapshots
  4. Re-running `npx skill-me-up` on the same project produces identical output (idempotency preserved after all enrichments)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/4 | In Progress|  |
| 2. Usage Examples | 0/? | Not started | - |
| 3. Antipattern Detection | 0/? | Not started | - |
| 4. Output Quality | 0/? | Not started | - |
