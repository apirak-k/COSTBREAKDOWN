# Project Context — Cost Breakdown

> Current product behavior is defined by the agreement set listed in docs/REQUIREMENTS_INDEX.md. This file records implementation context and must not override those agreements.

## Product flow

The agreed flow is:

Master Data → Cost Breakdown / Comparison → Candidate Prioritization → RCA & Simulation → Trial.

The user-facing behavior and boundaries for each stage are defined in agreements/. Trial is named as the next stage but does not yet have a detailed specification.

## Application structure

- Runtime and language: TypeScript, React 18, and Vite.
- UI: Tailwind CSS and shared components.
- Application entry: src/App.tsx.
- Feature areas: Master Data, Cost Breakdown, Candidate Selection, and RCA Simulation under src/features/.
- Calculation and domain logic: src/core/.
- Application state: src/state/.
- Excel import and generation: src/services/excel/.
- A legacy-looking path also exists under src/lib/. Verify runtime callers before changing either path.
- Spreadsheet dependencies already present include xlsx and exceljs.

## Implementation context

The code was developed under earlier specifications that used Product selection, dataset lifecycle states, and other behaviors that differ from the current agreements. The 2026-09-23 handoff recorded role-aware Master Data work and downstream compatibility behavior under that earlier contract.

Treat the existing implementation as a starting point to inspect against the current agreements. Do not treat earlier task completion, build output, or browser walkthroughs as acceptance of the new behavior.

## Calculation references

The RCA & Simulation agreement requires reuse of the existing verified Cost Engine. The current source code and checked-in workbooks under excel_models/ are the calculation references. Keep Standard Cost as Material + Labor + Burden and use Gap = Current - Reference as specified. Verify calculation parity when a code change affects formulas.

## Current verification record

HANDOFF.md carries the latest checkpoint and records which prior checks were executed. Any prior results apply only to the code and behavior that were checked at that time. Re-run relevant checks before claiming that a new agreement has been implemented or verified.
