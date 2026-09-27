# Cost Breakdown

An Excel-assisted cost analysis application for preparing datasets, comparing cost, and reviewing improvement scenarios.

## Current agreement

The current behavior is defined by the four documents in [agreements/](agreements/). Read [docs/REQUIREMENTS_INDEX.md](docs/REQUIREMENTS_INDEX.md) first. It links to each specification and describes the agreed flow.

## Project context

PROJECT.md describes the implementation recorded before the current agreement was adopted. HANDOFF.md records the current checkpoint. Existing implementation evidence is not user acceptance of the new behavior.

## Before changing product behavior

1. Read [docs/REQUIREMENTS_INDEX.md](docs/REQUIREMENTS_INDEX.md) and the agreement for the requested flow.
2. Read [PROJECT_SPECIFIC.md](PROJECT_SPECIFIC.md) and [CONSTRAINTS.md](CONSTRAINTS.md) for maintainability and verification rules.
3. Read the current checkpoint at the top of [HANDOFF.md](HANDOFF.md).
4. Check [tasks/todo.md](tasks/todo.md) before creating or replacing a plan.
5. Keep implementation verification separate from user acceptance.

## Run locally

- Install dependencies with npm install.
- Start the development server with npm run dev.
- Build with npm run build.
- Check the Excel models with npm run excel.

## Repository map

- `src/main.tsx` and `src/App.tsx` — application entry and feature navigation.
- `src/features/` — feature pages and feature-owned UI.
- `src/core/` — domain types, calculations, and migrations.
- `src/state/` — application state and dataset operations.
- `src/services/` — Excel and browser-session storage integrations.
- `src/shared/` — layout and UI shared by active features.
- `scripts/` — Excel model tools and focused verification scripts.
- excel_models/ — calculation reference workbooks.
- `agreements/` — current behavior specifications.
- `docs/` — requirements index and dated design proposals.
- `tasks/` — current agreement implementation plan and checklist.
- `.planning/` — dated audit and planning records.

Do not commit real factory data, proprietary workbooks, credentials, or other confidential material.
