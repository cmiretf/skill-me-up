---
phase: 4
slug: output-quality
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.1.3 |
| **Config file** | `jest.config.js` |
| **Quick run command** | `node --experimental-vm-modules node_modules/.bin/jest --testPathPatterns "phase4"` |
| **Full suite command** | `node --experimental-vm-modules node_modules/.bin/jest` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --experimental-vm-modules node_modules/.bin/jest --testPathPatterns "phase4"`
- **After every plan wave:** Run `node --experimental-vm-modules node_modules/.bin/jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | QUALITY-01 | unit stub | `jest --testPathPatterns "phase4/mdGenerator"` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | QUALITY-02 | unit stub | `jest --testPathPatterns "phase4/mdGenerator"` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 0 | QUALITY-03 | snapshot stub | `jest --testPathPatterns "phase4/snapshot"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | QUALITY-01 | unit | `jest --testPathPatterns "phase4/mdGenerator"` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | QUALITY-02 | unit | `jest --testPathPatterns "phase4/mdGenerator"` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | QUALITY-03 | snapshot | `jest --testPathPatterns "phase4/snapshot"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/phase4/mdGenerator.test.js` — RED stubs for QUALITY-01 (truncation) and QUALITY-02 (timestamp)
- [ ] `tests/phase4/snapshot.test.js` — RED stub for QUALITY-03 (snapshot regression)
- [ ] `tests/fixtures/js-project/` — synthetic JavaScript fixture project
- [ ] `tests/fixtures/py-project/` — synthetic Python fixture project

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
