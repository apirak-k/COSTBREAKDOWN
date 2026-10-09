# Project Context — Cost Breakdown

> Current product behavior is defined by the canonical specifications listed in
> `docs/REQUIREMENTS_INDEX.md`. This file records implementation context and
> must not override those specifications.

## Current architecture

- **Master Data** prepares independent Reference, Current, and Custom datasets.
- **Cost Breakdown (CBD)** compares Reference with Current. Custom is a
  Master Data workspace, not a CBD comparison side.
- **Candidate Prioritization** ranks eligible material (BOM) and processing
  (Routing Process) findings from the active comparison scope.
- **RCA Case** groups one or more selected Candidates and records Root Cause
  and Action at Case level. RCA is complete without Simulation.
- **Simulation** is an independent module that can be opened directly. The
  user may also choose an optional RCA → Simulation handoff; the Case supplies
  context and does not lock Simulation scope.
- There is **no Trial lifecycle**.

Product logic is governed by `docs/specs/FINAL_LOGIC_SPEC.md` and the
compatible page-specific requirements listed in `docs/REQUIREMENTS_INDEX.md`.
Final Logic supersedes older sources only where product logic conflicts;
compatible finalized requirements remain valid. This file is implementation
context, not a requirements authority.

## Application structure

- Runtime and language: TypeScript, React 18, and Vite.
- UI: Tailwind CSS and shared components.
- Application entry: `src/main.tsx` and `src/App.tsx`.
- Active feature pages and feature-owned UI: `src/features/`
  (`master-data`, `cost-breakdown`, `candidate-selection`, `rca`, and
  `simulation`).
- Domain types, calculations, and data migrations: `src/core/`.
- Application state and dataset operations: `src/state/`.
- Excel and browser-session storage integrations: `src/services/`.
- Shared application layout and cross-feature UI: `src/shared/`.
- Keep feature-specific UI beside its feature; place UI in `src/shared/` only when active features share it.
- The former top-level `src/pages/`, `src/components/`, and `src/lib/` trees were disconnected from the active entry path and have been retired. Their source remains available in Git history.
- Spreadsheet dependencies already present include xlsx and exceljs.

## Implementation context

The active feature folders reflect the current Master Data, CBD, Candidate/RCA
Case, and Simulation architecture. Older task records and agreement files
preserve their original decisions as history; use the current canonical specs
to resolve conflicts. Existing code, prior task completion, build output, and
browser walkthroughs are implementation or verification evidence, not
requirements authority or human acceptance.

## Calculation references

The shared calculation rules are recorded in docs/specs/CROSS_CUTTING.md. Keep workbook calculations aligned with the specified Standard Cost engine and `Gap = Current - Reference`. Code and checked-in workbooks under excel_models/ are implementation evidence, not requirements.

## Current verification record

HANDOFF.md carries the latest checkpoint and records which prior checks were executed. Any prior results apply only to the code and behavior that were checked at that time. Re-run relevant checks before claiming that a new agreement has been implemented or verified.
