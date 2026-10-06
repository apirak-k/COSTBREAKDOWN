# Current Handoff — Spec-Aligned Product Implementation

**Updated:** 2026-10-06

## Active checkpoint

- Repository: E:\COSTBREAKDOWN.
- Working branch: codex/costbreakdown-spec-source.
- Remote target: origin/codex/costbreakdown-spec-source. The user authorized pushing this completed checkpoint. Do not merge to main.
- The design reference branch feature/taste-frontend-ui remains read-only. The current branch owns all implementation and design.md.
- This run’s local planning notes are in the untracked .planning/2026-10-06-cbd-autonomous-implementation/ folder; the active-plan pointer was restored and the notes are excluded from product commits.
- The eight pre-existing synthetic verification files remain untracked and untouched: .make-synthetic-verification.mjs, .synthetic-current.xlsx, .synthetic-mismatch.xlsx, .synthetic-reference.xlsx, .verify-cost-calc-sample.mjs, .verify-duplicate-calc.mjs, .verify-neutral-workbook-via-vite.mjs, and .verify-sizing-via-vite.mjs.

## Requirement and design contract

- Follow docs/REQUIREMENTS_INDEX.md, then canonical specs, then compatible finalized agreement/history detail. Source-crosswalk-80.md is traceability/status only; this file is a work checkpoint only.
- design.md was created using the HAWS DESIGN.md template. It extracts visual language from feature/taste-frontend-ui at f873540a6fa2bd1564c070a1164f457857762752 without importing its product behavior.
- docs/PROVISIONAL_IMPLEMENTATION_DECISIONS.md records reversible AI choices separately from user decisions. P-009 records the compact, full-width table work surface.
- Candidate monetary values remain at material-record level. THB is the cost unit; changed Price/Usage/Loss values remain explanatory Ref → Current details. No conversion or per-factor THB allocation was added.
- The Dashboard uses settled engineering calculations. Unresolved business metrics remain explicitly unavailable; MatVAR/LBVAR/BDVAR remain out of scope.

## Implemented

- Master Data opens on All Tables in BOM → Work Centers → Routing order and restores selected side, View/Edit mode, and table view during same-session navigation using transient application state.
- Removed CB, Product Cost Analysis, and bottom-left Workspace chrome while retaining useful totals/status.
- Master Data Undo/Redo now covers Working edits across the page and all tables. Spreadsheet paste and selected-row bulk operations are batched into one history action.
- Candidate material rows show record-level cost Gap separately from changed input details.
- Applied the compact full-width design direction: tighter page spacing, 36px target data rows, 32px edit controls, and table-local horizontal scrolling.
- Updated five stale verifier fixtures to current schema and identity contracts.
- Updated compatible lockfile patches for brace-expansion and source-map-js; no breaking dependency upgrades were applied.

## Verification

- All 47 scripts/verify*.ts and scripts/verify*.mjs verifiers passed after the final implementation and lockfile patch.
- npm run build passed: TypeScript and Vite production build; 2,035 modules transformed. Vite still reports ExcelJS browser externalization warnings for Node fs/crypto.
- git diff --check passed. The repository has no npm lint or generic test script.
- npm audit was run. A non-breaking npm audit fix removed the compatible findings; 5 high and 4 moderate transitive advisories remain around Tailwind/ExcelJS. The suggested force update crosses major versions and was not applied.
- Browser visual inspection and human visual acceptance remain unverified because local browser inspection is blocked by environment policy. No visual acceptance is claimed.

## Genuine pending product decisions

Master Data lifecycle questions in docs/specs/MASTER_DATA.md remain open and must not be resolved from existing implementation code:

1. Whether Clone requires a ready source and how readiness state transfers to the destination.
2. Whether Import preserves the target side’s configured Sizing counts, resets them, or recalculates them.
3. Whether generated blank Sizing rows count toward calculation/readiness or remain excluded placeholders.

The confirmed business concepts still lack approved formulas for COGS, GP, GP Margin, OP, OP Margin, Sales, and Volume/Quantity. Trial execution, validation, approval, and promotion also remain unspecified. The engineering-first dashboard continues to provide useful settled outputs without fabricating these values.

Current code contains implementation behavior for Clone readiness, Import readiness/Sizing, and generated placeholders. That behavior is evidence of what the code currently does, not evidence of a user decision. See the escalation packet in the delivery response before changing those lifecycle semantics.

## Next step

Bring the three narrow Master Data questions to the ChatGPT conversation “CBD Refactor #1”. Independent implementation from finalized requirements is committed on this branch. After those answers, update the canonical spec first, then adjust the affected lifecycle paths.
