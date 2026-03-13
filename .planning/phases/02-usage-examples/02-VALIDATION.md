---
phase: 2
slug: usage-examples
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 (`jest@^30.2.0`) |
| **Config file** | `jest.config.js` (root) |
| **Quick run command** | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/` |
| **Full suite command** | `node --experimental-vm-modules node_modules/.bin/jest` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/`
- **After every plan wave:** Run `node --experimental-vm-modules node_modules/.bin/jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-W0-01 | Wave 0 | 0 | ENRICH-03 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/usageExamples.test.js` | ❌ W0 | ⬜ pending |
| 2-W0-02 | Wave 0 | 0 | OUTPUT-04 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/dependencies.test.js` | ❌ W0 | ⬜ pending |
| 2-W0-03 | Wave 0 | 0 | OUTPUT-02 | integration | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/integration.test.js` | ❌ W0 | ⬜ pending |
| 2-01-01 | 01 | 1 | ENRICH-03 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/usageExamples.test.js -t "ENRICH-03"` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | ENRICH-03 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/usageExamples.test.js -t "omits"` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | OUTPUT-02 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/usageExamples.test.js -t "OUTPUT-02"` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | OUTPUT-02 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/usageExamples.test.js -t "omits section"` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 1 | OUTPUT-02 | integration | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/integration.test.js` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 2 | OUTPUT-04 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/dependencies.test.js -t "builtin"` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 2 | OUTPUT-04 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/dependencies.test.js -t "fallback"` | ❌ W0 | ⬜ pending |
| 2-03-03 | 03 | 2 | OUTPUT-04 | integration | `node --experimental-vm-modules node_modules/.bin/jest tests/phase2/integration.test.js -t "dependencies"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase2/usageExamples.test.js` — stubs for ENRICH-03 and OUTPUT-02
- [ ] `tests/phase2/dependencies.test.js` — stubs for OUTPUT-04
- [ ] `tests/phase2/integration.test.js` — integration stubs for section order and combined rendering

*Jest 30 already installed — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
