---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (not yet installed — Wave 0 installs) |
| **Config file** | jest.config.js — none yet, Wave 0 creates |
| **Quick run command** | `node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=phase1` |
| **Full suite command** | `node --experimental-vm-modules node_modules/.bin/jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=phase1`
- **After every plan wave:** Run `node --experimental-vm-modules node_modules/.bin/jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-W0-01 | W0 | 0 | ENRICH-01 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase1/lineTracking.test.js` | ❌ W0 | ⬜ pending |
| 1-W0-02 | W0 | 0 | ENRICH-02 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase1/conventions.test.js` | ❌ W0 | ⬜ pending |
| 1-W0-03 | W0 | 0 | OUTPUT-01 | unit | `node --experimental-vm-modules node_modules/.bin/jest tests/phase1/mdGenerator.test.js` | ❌ W0 | ⬜ pending |
| 1-W0-04 | W0 | 0 | OUTPUT-01 | integration | `node --experimental-vm-modules node_modules/.bin/jest tests/phase1/integration.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — install jest as devDependency: `npm install --save-dev jest`
- [ ] `jest.config.js` — configure ESM support (`"transform": {}`, `"extensionsToTreatAsEsm": [".js"]`)
- [ ] `tests/phase1/lineTracking.test.js` — stubs for ENRICH-01 (analyzeJava, analyzeTypeScriptOrJs, analyzePython line numbers)
- [ ] `tests/phase1/conventions.test.js` — stubs for ENRICH-02 (threshold logic, mixed styles, dominant style)
- [ ] `tests/phase1/mdGenerator.test.js` — stubs for OUTPUT-01 (buildConventionsSection rendering and null handling)
- [ ] `tests/phase1/integration.test.js` — stubs for OUTPUT-01 (buildMarkdown section placement and omission)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npx skill-me-up` on a real project produces correct conventions section | OUTPUT-01 | End-to-end output validation with real project filesystem | Run `npx skill-me-up` on a JS project; inspect generated `.md` for `## Project Conventions` section with correct style labels and real examples |
| Convention section absent for sparse folders | ENRICH-02 | Requires a folder with <5 code files | Use a test fixture with 3 files; verify no `## Project Conventions` section appears in output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
