# Cost Breakdown — Cross-Device Handoff

Date: 2026-09-21
Repository: `https://github.com/apirak-k/COSTBREAKDOWN.git`
Branch: `codex/snapshot-import-role-selector`
Implementation checkpoint: `adaf299 docs: close reset fixture plan`
Working tree at handoff: clean

## Purpose

This is the current handoff for continuing the Cost Breakdown project from another device. The repository is ready for the next work session after the user's manual acceptance check.

The active UI target is the original factory workbench baseline. The later Swiss/industrial visual experiment was intentionally rolled back because the user preferred the first UI and felt it looked less AI-generated.

## Read in this order

1. `AGENTS.md` or the active HAWS instructions provided by the host environment.
2. `.planning/2569-09-21-factory-ui-refinement/task_plan.md` — current plan and acceptance boundary.
3. `.planning/2569-09-21-factory-ui-refinement/progress.md` — executed work and verification evidence.
4. `.planning/2569-09-21-factory-ui-refinement/findings.md` — decisions, constraints, and known limitations.
5. `docs/USER_MANUAL_AND_TESTING_GUIDE.md` — manual product/test reference.
6. `COSTBREAKDOWN_SYSTEM_LOGIC_SOURCE_OF_TRUTH.md` and `ARCHITECTURE.md` when a domain or architecture question is involved.

`HANDOFF.md` is an older HAWS/repository-history handoff and is not the current Cost Breakdown checkpoint. The planning files above are the source of truth for this branch.

## Current checkpoint

### UI baseline

- The active UI matches the original pre-refinement baseline at commit `63c418f`.
- The rollback is recorded in `3857d68 style: restore initial factory UI baseline`.
- Do not start another visual redesign without a concrete user acceptance finding.

### Snapshot and import behavior

- Independent `Reference` and `Current` snapshots are connected to session state and Cost Breakdown.
- The Import panel already has a `Reference` / `Current` role selector (`e01b2f5 feat: let users choose snapshot import role`).
- Do not follow the old handoff text claiming that the role selector is still pending; that was completed before this checkpoint.

### Reset Default testing fixture

- `Reset Default` now loads a deterministic explicit Reference/Current pair built from the RGOM-024 seed fixture.
- The original product and table counts remain intact: `RGOM-024-01`, 4 Work Centers, 16 BOM items, and 39 routing steps.
- The fixture intentionally exposes visible Active variance for testing:
  - BOM `RMMBA1020`: Base `31.70` vs Active `60.10`.
  - Routing `AI-Ins`: Base Yield `74.0%` vs Active Yield `60.0%`.
  - Cost Breakdown: Reference `33.6936`, Current `41.9528`, gap `+8.2592 THB/pc`.
- The feature implementation is in `b209b8c feat: make reset default provide comparison fixture`.
- Verification evidence is in `20fb643 docs: record reset default fixture verification` and the plan closure is in `adaf299`.

## Manual acceptance flow

After starting the app:

1. Open `Master Data`.
2. Click `Reset Default`.
3. Confirm `Reset to Seed Data`.
4. Confirm the product metadata and the Base/Active differences in the tables.
5. Open `Cost Breakdown`.
6. Confirm `REFERENCE VS CURRENT SNAPSHOT`, the non-zero cost gap, changed rows, variance attribution, and the balanced mathematical check.

If the user finds a problem, record the exact screen/flow and expected result in the planning files before changing code. Create the next focused phase (Phase 11) instead of reopening a completed phase.

## Fresh-device setup

Prerequisites used for the last verification:

- Node.js `v22.14.0`
- npm `10.9.2`

PowerShell setup:

```powershell
git clone --branch codex/snapshot-import-role-selector https://github.com/apirak-k/COSTBREAKDOWN.git
cd COSTBREAKDOWN
npm install
npx tsc -b --pretty false
npm run build
npm run dev
```

Use the URL printed by Vite. The port may differ if the default port is already occupied. No proprietary factory source files or environment secrets are required for the seeded acceptance flow.

## Verification baseline

The latest fixture slice passed:

- `npx tsc -b --pretty false`
- `npm run build` (the existing Vite large-chunk warning remains non-blocking)
- `node scripts/test_comprehensive_audit.js` — `31/31`
- Fresh browser Reset Default → Cost Breakdown flow
- Reference/Current totals and variance decomposition
- Final Git diff check and clean worktree

The browser harness did not provide a reliable narrow-width viewport override. Responsive source safeguards remain present, but narrow-width visual acceptance is still a human check.

## Recent commits to preserve

```text
1d0bc6f docs: add cross-device handoff checkpoint
adaf299 docs: close reset fixture plan
20fb643 docs: record reset default fixture verification
b209b8c feat: make reset default provide comparison fixture
5084763 docs: record initial UI baseline verification
3857d68 style: restore initial factory UI baseline
```

## Scope guard

- Preserve the original UI character unless the user reports a specific issue.
- Keep changes on the active path under `src/App.tsx` → `src/features/*` → `src/shared/*`.
- Do not edit legacy duplicate paths under `src/pages`, `src/components`, or `src/lib` without proving they are active imports.
- Do not commit `Sources/`, secrets, local environment files, `node_modules/`, or build output.
- Keep code and tests in English; communicate progress in Thai.
- Commit verified slices atomically and push only after the relevant checks pass.

## Exact resume point

The current implementation is complete for this checkpoint. The next action is manual acceptance. Further implementation starts only from a concrete acceptance finding documented as a new plan phase.
