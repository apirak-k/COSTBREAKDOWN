# Cost Breakdown

An Excel-assisted cost analysis application for preparing datasets, comparing cost, and reviewing improvement scenarios.

## Current requirements

The decision authority and current specifications are listed in [docs/REQUIREMENTS_INDEX.md](docs/REQUIREMENTS_INDEX.md). Read the relevant files under [docs/specs/](docs/specs/) for the consolidated behavior. Files in [agreements/](agreements/) preserve prior decisions; finalized decisions stay valid unless a later explicit user decision supersedes them. Missing spec coverage is a migration gap.

For a diagram-oriented overview, see the [System Logic Diagram](docs/SYSTEM_LOGIC_DIAGRAM.md).

## Project context

PROJECT.md summarizes the current implementation architecture. HANDOFF.md
records the latest implementation checkpoint. Historical task ledgers and
agreement files preserve provenance; their old implementation status is not
current status. Existing implementation and verification evidence is not human
acceptance.

## Before changing product behavior

1. Read [docs/REQUIREMENTS_INDEX.md](docs/REQUIREMENTS_INDEX.md) and the canonical spec for the requested flow.
2. Read [PROJECT_SPECIFIC.md](PROJECT_SPECIFIC.md) and [CONSTRAINTS.md](CONSTRAINTS.md) for maintainability and verification rules.
3. Read the current checkpoint at the top of [HANDOFF.md](HANDOFF.md).
4. Check [tasks/todo.md](tasks/todo.md) before creating or replacing a plan.
5. Keep implementation verification separate from user acceptance.

## Run locally

- Install dependencies with npm install.
- Start the development server with npm run dev.

### Default verification

- Run the relevant canonical `scripts/verify_*` verifiers for the changed behavior.
- Run the TypeScript typecheck with `npx tsc --noEmit --pretty false`.
- Build for production with `npm run build`.
- Check whitespace and patch formatting with `git diff --check`.

### Specialized legacy Excel model generation

`npm run excel` runs the legacy model generator and its matching verifier. It
is not the canonical workbook round-trip verification path and may generate old
operational-looking workbook artifacts. Use it only when specifically working
on those legacy model files; do not include it in normal verification.

## Repository map

- `src/main.tsx` and `src/App.tsx` — application entry and feature navigation.
- `src/features/` — feature pages and feature-owned UI.
- `src/core/` — domain types, calculations, and migrations.
- `src/state/` — application state and dataset operations.
- `src/services/` — Excel and browser-session storage integrations.
- `src/shared/` — layout and UI shared by active features.
- `scripts/` — canonical `verify_*` scripts plus specialized legacy Excel model
  tools.
- `excel_models/` — legacy calculation reference workbooks; not the canonical
  workbook contract.
- `docs/specs/` — canonical product specifications.
- `agreements/` — historical decision records and provenance; follow current
  canonical specs for implementation.
- `docs/history/` — dated source, specification, and checkpoint records; use chronology and original decision status.
- `tasks/source-crosswalk-80.md` — historical topic-level traceability/status,
  not current completion status or a requirements source.
- `tasks/` — historical operational plans and task records; current completion
  status is in the frozen audit under
  `.planning/2026-10-09-final-logic-implementation/`.
- `.planning/` — dated audit and planning records.

Do not commit real factory data, proprietary workbooks, credentials, or other confidential material.
