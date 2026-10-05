# Project Context — Cost Breakdown

> Current product behavior is defined by the canonical specifications listed in docs/REQUIREMENTS_INDEX.md. This file records implementation context and must not override those specifications.

## Product flow

The agreed flow is:

Master Data → Cost Breakdown / Comparison → Candidate Prioritization → RCA & Simulation → Trial.

The user-facing behavior and boundaries are defined by the relevant files in docs/specs/. Detailed Candidate, RCA & Simulation, and Trial behavior remains pending where those specs say PENDING/TBD.

## Application structure

- Runtime and language: TypeScript, React 18, and Vite.
- UI: Tailwind CSS and shared components.
- Application entry: `src/main.tsx` and `src/App.tsx`.
- Feature pages and feature-owned UI: `src/features/` (`master-data`, `cost-breakdown`, `candidate-selection`, and `rca-simulation`).
- Domain types, calculations, and data migrations: `src/core/`.
- Application state and dataset operations: `src/state/`.
- Excel and browser-session storage integrations: `src/services/`.
- Shared application layout and cross-feature UI: `src/shared/`.
- Keep feature-specific UI beside its feature; place UI in `src/shared/` only when active features share it.
- The former top-level `src/pages/`, `src/components/`, and `src/lib/` trees were disconnected from the active entry path and have been retired. Their source remains available in Git history.
- Spreadsheet dependencies already present include xlsx and exceljs.

## Implementation context

The code was developed under earlier specifications that used Product selection, dataset lifecycle states, and other behaviors that differ from the current agreements. The 2026-09-23 handoff recorded role-aware Master Data work and downstream compatibility behavior under that earlier contract.

Treat the existing implementation as a starting point to inspect against the current agreements. Do not treat earlier task completion, build output, or browser walkthroughs as acceptance of the new behavior.

## Calculation references

The shared calculation rules are recorded in docs/specs/CROSS_CUTTING.md. Keep workbook calculations aligned with the specified Standard Cost engine. Gap arithmetic remains pending canonical confirmation; code and checked-in workbooks under excel_models/ are implementation evidence, not requirements.

## Current verification record

HANDOFF.md carries the latest checkpoint and records which prior checks were executed. Any prior results apply only to the code and behavior that were checked at that time. Re-run relevant checks before claiming that a new agreement has been implemented or verified.
