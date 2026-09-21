# Project Specification & Scope — Cost Breakdown

> **Document status:** Draft Current Baseline for user review  
> **Purpose:** Record the verified starting point before approving the redesign specification and implementation plan.  
> **Important:** This document describes the current system. It is not approval of the target redesign.

## 1. Project Overview & Scope Boundaries

### Project purpose

Cost Breakdown is an Excel-first cost analysis application for comparing standard/reference cost with current/active cost and tracing the difference to:

- Direct Material (BOM)
- Conversion Process (Routing)
- Work Center labor and burden rates
- Cost drivers and RCA follow-up

### Intended users

**Working assumption — confirm during baseline review:** cost, manufacturing, process, or engineering users who maintain Excel cost models and need an auditable Reference vs Active comparison.

### Current in-scope capabilities

- Import a supported Cost Model workbook into a draft product session.
- Maintain product, BOM, routing, and Work Center rate data in the web application.
- Calculate material, labor, burden, total cost, and selected variance measures.
- Show detailed BOM and routing breakdowns.
- Rank positive cost drivers and record RCA-related user inputs.
- Maintain Draft, Active, and Archived product-session states in the current store.
- Run what-if / RCA simulation flows.

### Current explicit constraints

- Excel is the primary source of truth for cost data and formulas.
- Data flow is Excel → Import → Web. The web application must not automatically write changes back to the source workbook.
- The system interface is English-only. Thai is allowed only in user-entered dynamic text.
- Estimated or Missing data must remain usable for calculation/navigation and must be visibly identified.
- Real factory data and proprietary source files must not be committed to the repository.

### Current non-goals / not yet approved

- Replacing the verified Excel model without a parity check.
- Automatically writing web edits back into the source Excel file.
- Adding a backend, cloud database, permissions model, or multi-site workflow without a separate decision.
- Claiming the redesign is implemented. The redesign is still a proposed target.

## 2. Active Roadmap & Milestones

| Milestone / Phase | Status | Goal & Deliverables | Exit Criteria |
| :--- | :---: | :--- | :--- |
| **Phase 0: Current Baseline** | 🟡 In review | Confirm current repository, Excel structures, calculations, lifecycle, constraints, and open questions | User confirms baseline and terminology |
| **Phase 1: Target Data Contract** | ⚪ Planned | Define independent Reference/Current snapshots, stable identities, provenance, confidence, and matching rules | Approved architecture/spec and migration rules |
| **Phase 2: Calculation & Comparison Core** | ⚪ Planned | Calculate each snapshot independently, then compare with explicit diff statuses | Formula, edge-case, and parity checks pass |
| **Phase 3: Excel Compatibility** | ⚪ Planned | Preserve legacy import, add validated snapshot mapping, and define export/report behavior | Representative workbooks import with no silent data loss |
| **Phase 4: Lifecycle & UI** | ⚪ Planned | Separate business comparison from Draft/Active/Archived lifecycle and implement Before/After flow | Manual acceptance of the main workflow |
| **Phase 5: Trial/RCA & Hardening** | ⚪ Planned | Isolate trials, promote only through review, and complete regression/documentation checks | Build and agreed verification checks pass |

## 3. Tech Stack & Engineering Conventions

- **Runtime and language:** TypeScript, React 18, Vite.
- **UI:** Tailwind CSS and the existing shared UI components.
- **Spreadsheet libraries:** `xlsx` and `exceljs` in the current repository.
- **State:** React application store under `src/state`; a parallel legacy-looking store exists under `src/lib` and must not be treated as a second source of truth.
- **Active application entry:** `src/App.tsx` routes to `src/features`, `src/core`, `src/state`, and `src/shared`.
- **Available package commands:** `dev`, `build`, `preview`, and `excel`. There is no dedicated `test`, `lint`, or `typecheck` script in `package.json` at this baseline.
- **Dependency rule:** Reuse the existing stack and avoid adding dependencies until a concrete requirement and verification need exist.

## 4. System Source of Truth & Verified Live State

### Baseline verification record

- **Last verified:** 2026-09-21
- **Repository:** Cost Breakdown
- **Branch:** `main`
- **HEAD observed:** `f873540`
- **Inspection basis:** current source tree, project documents, checked-in Excel models under `excel_models/`, and package configuration.
- **Code changes during this baseline pass:** none.
- **Build/test execution:** `[Unverified]` — not run as part of this documentation-only baseline pass.

### Active application modules

The current `src/App.tsx` exposes four main areas:

1. Master Data
2. Cost Breakdown
3. Candidate Selection
4. RCA Simulation

### Current data model

- `BOMItem` stores one row with `consumption`, `basePrice`, `activePrice`, `baseLoss`, and `activeLoss`.
- `RoutingStep` stores one row with `opSeq`, `wc`, `manning`, `baseCap`, `activeCap`, `baseYield`, and `activeYield`.
- `WorkCenterRate` stores `wc`, labor rate, burden rate, effective date, source reference, and an optional row-level confidence value.
- `ProductSession` stores one product, one rate collection, one BOM collection, one routing collection, saved drivers, and a Draft/Active/Archived status.

This is a **paired Base/Active row model**, not yet an independent Reference/Current snapshot model.

### Current calculation behavior

- `calculateCostBreakdown(bom, routing, rates)` calculates Base and Active totals in one pass.
- Material cost uses consumption, price, and loss for each side.
- Routing cost uses manning divided by capacity × yield, then applies the Work Center labor and burden rate.
- The current engine uses a hard-coded fallback rate when a routing Work Center is not found.
- Labor-rate variance and burden-rate variance are currently set to zero within the standard card calculation; efficiency variances carry the remaining conversion gap.
- Detailed BOM, routing, and top-driver calculations reuse the paired Base/Active fields.

### Current lifecycle behavior

- `cloneActiveToDraft` creates a draft copy.
- `activateDraft` activates a draft and archives the prior active dataset for the product.
- Excel import creates a new draft session.
- Current CRUD actions can patch the active session directly.
- `promoteActiveToBaseline` copies Active values into Base fields inside the same session, rather than creating a separate immutable reference snapshot.

### Current confidence behavior

Confidence support exists but is partial:

- `DataConfidence` supports `verified`, `estimated`, and `missing`.
- A utility can infer confidence from a value and `sourceRef` and calculate a roll-up summary.
- A visual `ConfidenceBadge` exists and is used in Candidate Selection.
- The data entities expose an optional row-level `confidence` field, not a persisted confidence record for every important input field.
- The roll-up summary is not currently connected to the main KPI/UI flow.
- The Excel parser applies defaults for several missing values, so a missing source value can become a plausible number unless the import path is changed.

### Current Excel model baseline

Checked-in models inspected:

- `CostModel_RGOM-024_v2.xlsx`
- `CostModel_BLANK_TEMPLATE_v2.xlsx`
- `CostModel_SYNTHETIC_MOCK_v2.xlsx`
- `CostModel_TEST_SCENARIOS_v2.xlsx`

Observed workbook variants:

- Most models contain `1_MASTER_RATES`, `2_BOM_BREAKDOWN`, `3_ROUTING_BREAKDOWN`, `_CALC_ENGINE`, and `4_SUMMARY_&_COMPARISON`.
- `CostModel_SYNTHETIC_MOCK_v2.xlsx` does not contain `_CALC_ENGINE`.
- The current input layout places Base and Active columns together in BOM and Routing sheets.
- The current calculation engine and summary sheets are formula-driven and use `IFERROR`-style shielding in the checked-in models.
- The current web parser requires the three primary sheets and does not require `_CALC_ENGINE` or `4_SUMMARY_&_COMPARISON` for import.
- The dynamic web generator produces the primary sheets plus a summary/comparison sheet; its relationship with the checked-in `_CALC_ENGINE` variant must be verified before changing the Excel contract.

### Verified capabilities and implementation locations

| Capability | Current location | Current status |
| :--- | :--- | :--- |
| Application routing | `src/App.tsx` | Present |
| Cost types | `src/core/types/cost.types.ts` | Paired Base/Active model |
| Cost engine | `src/core/calculations/cost-engine.ts` | Present; fallback-rate behavior needs redesign |
| Detailed breakdown | `src/core/calculations/detailed-breakdown.ts` | Present; paired model |
| Top drivers | `src/core/calculations/top-drivers.ts` | Present; positive-gap ranking with confidence warning |
| Excel import | `src/services/excel/excel-parser.ts` | Present; legacy paired layout and defaulting behavior |
| Excel generation | `src/services/excel/dynamic-excel-generator.ts` | Present; parity/contract review needed |
| Version lifecycle | `src/state/store.tsx` | Partially present; active edits and baseline promotion need separation |
| Confidence UI | `src/shared/ui/ConfidenceBadge.tsx` | Present; not yet field-complete or rolled up in main UI |

## 5. Confirmed Architectural Invariants & Learned Lessons

These are current project rules from `PROJECT_SPECIFIC.md` and must be preserved unless the user explicitly changes them:

1. **Excel-first validation:** web calculations must mirror the verified Excel logic.
2. **Core workflow:** Standard Comparison (Reference vs Active Gap) and detailed BOM/Routing breakdown come before advanced What-If/Simulation work.
3. **Three-state dataset lifecycle:** each product dataset is Draft, Active, or Archived; only one Active version exists per product.
4. **One-way source flow:** Excel → Import → Web; web changes do not silently rewrite Excel.
5. **Data confidence:** input values are Verified, Estimated, or Missing; Estimated/Missing remain non-blocking but must be visible and must not be mistaken for verified findings.
6. **English system UI:** system labels and generated summaries remain English.

## 6. Baseline Findings Before Target Specification

### Confirmed current gaps

- The current row model couples Reference/Base and Current/Active values.
- Snapshot identity, source provenance, and effective dates are not modeled as independent comparison records.
- Routing identity relies heavily on sequence and descriptive fields; operation matching rules are not explicit.
- Work Center rates are not independently versioned per comparison side and missing rates can use a hidden fallback.
- Active data can be edited directly, and promoting Active to Base overwrites the comparison baseline within the same record.
- Confidence support is present but not consistently persisted or displayed at field level.
- Legacy and active-looking implementation paths coexist under `src/core` and `src/lib`; the redesign must declare one canonical path before broad changes.

### Pending decisions for the next document

- Exact meaning and naming of `Reference`, `Current`, `Baseline`, and `Active` in the product UI.
- Stable BOM item identity and stable Routing operation identity.
- MHr definition and whether capacity/yield are the only routing drivers.
- Rate effective-date and rate-version behavior.
- Whether an unmatched or ambiguous row is shown as a warning, `Need Review`, or a blocked comparison.
- Exact canonical Excel layout for independent snapshots while preserving legacy imports.
- Acceptance thresholds for Excel/web formula parity and regression checks.

## 7. Next Action

Review and approve this Current Baseline. After approval, create the target architecture/specification from the HAWS `ARCHITECTURE.md` template, then create the implementation plan and verification gates before changing application code.
