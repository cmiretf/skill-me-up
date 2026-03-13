---
phase: 3
slug: antipattern-detection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | package.json (`"test": "node --experimental-vm-modules node_modules/.bin/jest"`) |
| **Quick run command** | `npm test -- --testPathPattern=tests/phase3` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=tests/phase3`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | ENRICH-04 | unit stub | `npm test -- --testPathPattern=tests/phase3/antipatterns` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | OUTPUT-03 | integration stub | `npm test -- --testPathPattern=tests/phase3/integration` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | ENRICH-04 | unit | `npm test -- --testPathPattern=tests/phase3/antipatterns` | ✅ | ⬜ pending |
| 3-02-02 | 02 | 1 | ENRICH-04 | unit | `npm test -- --testPathPattern=tests/phase3/antipatterns` | ✅ | ⬜ pending |
| 3-02-03 | 02 | 1 | ENRICH-04 | unit | `npm test -- --testPathPattern=tests/phase3/antipatterns` | ✅ | ⬜ pending |
| 3-02-04 | 02 | 1 | ENRICH-04 | unit | `npm test -- --testPathPattern=tests/phase3/antipatterns` | ✅ | ⬜ pending |
| 3-03-01 | 03 | 2 | OUTPUT-03 | integration | `npm test -- --testPathPattern=tests/phase3/integration` | ✅ | ⬜ pending |
| 3-03-02 | 03 | 2 | OUTPUT-03 | integration | `npm test -- --testPathPattern=tests/phase3/integration` | ✅ | ⬜ pending |
| 3-04-01 | 04 | 3 | ENRICH-04, OUTPUT-03 | integration | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase3/antipatterns.test.js` — unit test stubs for `detectAntipatterns()` (ENRICH-04)
- [ ] `tests/phase3/integration.test.js` — pipeline integration stubs for "## Don't Do" section output (OUTPUT-03)

*Pattern: dynamic `import()` + `beforeAll` guard matching `tests/phase2/` conventions.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "## Don't Do" section labeled as heuristic | OUTPUT-03 | Labeling is human-readable prose; automated test verifies string presence | Run `npx skill-me-up` on a target repo with known antipatterns; verify section header includes "heuristically detected" or equivalent disclaimer |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
