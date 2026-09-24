# Cost Breakdown

An Excel-assisted cost analysis application for preparing datasets, comparing cost, and reviewing improvement scenarios.

## Current agreement

The current behavior is defined by the four documents in [agreements/](agreements/). Read [docs/REQUIREMENTS_INDEX.md](docs/REQUIREMENTS_INDEX.md) first. It links to each specification and describes the agreed flow.

## Project context

PROJECT.md describes the implementation recorded before the current agreement was adopted. HANDOFF.md records the current checkpoint. Existing implementation evidence is not user acceptance of the new behavior.

## Run locally

- Install dependencies with npm install.
- Start the development server with npm run dev.
- Build with npm run build.
- Check the Excel models with npm run excel.

## Repository map

- src/ — application code.
- src/core/ — cost types and calculation logic.
- src/features/ — user-facing product areas.
- src/services/excel/ — workbook import and generation.
- src/state/ — application state.
- excel_models/ — calculation reference workbooks.
- agreements/ — current behavior specifications.
- docs/REQUIREMENTS_INDEX.md — requirements entry point.

Do not commit real factory data, proprietary workbooks, credentials, or other confidential material.
