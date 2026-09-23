# Cost Breakdown Requirements Authority

## Status

- **Status:** Working requirements baseline
- **Updated:** 2026-09-23
- **Purpose:** Identify which documents define the current product requirements and prevent historical implementation notes from being mistaken for the target behavior.

This file is the first document to read before changing the product or interpreting a requirement. It records document precedence and the decisions that must remain consistent across pages.

## 1. Document precedence

When documents disagree, use this order:

1. Page specifications in `docs/specs/`.
2. Cross-page contracts in `docs/superpowers/specs/`.
3. The Excel dataset contract in `docs/superpowers/specs/2026-09-23-master-data-excel-dataset-contract.md`.
4. Implementation plans and task files in `tasks/`.
5. Root-level baseline, redesign, analysis, README, and handoff documents.

The root-level documents remain useful for understanding the existing repository and historical decisions. They are not allowed to override the current page specifications.

## 2. Current authoritative documents

| Area | Authoritative document | Responsibility |
|---|---|---|
| Master Data | `docs/specs/master-data.md` | Product context, dataset entry, validation, editing, lifecycle, source, and data quality |
| Master Data Excel contract | `docs/superpowers/specs/2026-09-23-master-data-excel-dataset-contract.md` | One-Product workbook shape and import behavior |
| Cost Breakdown | `docs/specs/cost-breakdown.md` | Independent calculation, full comparison, cost elements, source grouping, and routing/WC traceability |
| Cross-page flow | `docs/superpowers/specs/2026-09-22-costbreakdown-cross-page-flow-design.md` | Handoffs from Master Data through Cost Breakdown, Candidate Selection, RCA, and Simulation |
| Financial and Simulation capability | `docs/specs/cross-cutting-requirements.md` | Sale, COGS, Gross Profit, SG&A, OP, Profit, and extensible scenario variables |

`tasks/` records implementation progress. A checked task is not a substitute for human acceptance of the running application.

## 3. Canonical vocabulary

| Term | Meaning | Must not be confused with |
|---|---|---|
| Product | The Product selected in the Header and used as the working context | A Product Code read from an unrelated workbook |
| Dataset | One Product's Product, Work Center, BOM, Routing, and supported additional data | A comparison result |
| Reference / Current | The comparison role assigned by the application | Draft / Active / Archived lifecycle state |
| Draft / Active / Archived | Dataset lifecycle states | Reference / Current comparison roles |
| Source / Provenance | Where a value came from, such as Excel, manual entry, or clone | The canonical working dataset |
| Source Value | The original value retained from the source | Working Value |
| Working Value | The value used after an explicit edit or mapping | An untracked silent fallback |
| CostSnapshot | The canonical in-application dataset used for role-specific editing and downstream calculations | The external source file or a legacy paired projection |
| Data quality status | `Missing`, `Invalid`, `Warning`, `Ambiguous`, or `Needs Review` for one dataset | `Added`, `Removed`, `Modified`, or other comparison status |

Excel is an external input/evidence source and must not be silently overwritten. The application keeps a canonical `CostSnapshot` working dataset while preserving source values and provenance for auditability.

## 4. Confirmed product direction

### Master Data

- The user selects Product before starting data entry or import.
- The application-provided workbook contains one Product only. A file with multiple Products is not the target format.
- The user chooses the import role (`Reference` or `Current`) in the Header, not through paired workbook columns.
- Product Code is checked immediately during import. A mismatch blocks the import before state mutation.
- Reference and Current are independent datasets and may be imported in separate actions.
- Initial entry methods are Import Excel, Manual Entry, and Clone. This is an extensible set of entry methods, not a permanently closed list.
- All entry methods produce the same editable Product Dataset contract.
- Data may be adjusted after import, including supported row additions, removals, and edits.
- Active data is not edited in place. The user clones it into a Draft before changing it.
- Source values, working values, and data-quality findings remain distinguishable.
- Missing or invalid values are never silently replaced with zero or another plausible value.

### Cost Breakdown

- Reference and Current are calculated independently and must belong to the same Product.
- The comparison covers all supported records and fields, including Added, Removed, Modified, Reordered, and relationship changes.
- The page provides both All Data and Changed Only views.
- Material, Labor, and Burden remain the stable Core Cost Elements. They are not user-configurable from Cost Breakdown.
- Additional financial metrics and scenario variables belong to a later Calculation/Simulation layer, not to the Core Cost Element structure.
- Routing calculations and explanations resolve Work Center data from the same dataset side.
- Source information is grouped to reduce repetition, with row/field detail available on demand and bulk grouping/filtering actions where useful.

### Candidate Selection, RCA, and Simulation

- Candidate Selection is a human selection step based on comparison findings.
- The user may select any finding of interest; selection is not limited to a Top 10 list.
- Controllability is optional metadata. A user may select a finding without classifying it as controllable.
- RCA starts from findings explicitly selected by the user; the system must not silently choose one.
- Simulation uses isolated scenario overrides and must not mutate official Product, Reference, Current, Active, or Master Data values.
- The web application must support Sale, COGS, Gross Profit, SG&A, OP, Profit, and future add-on variables. Exact formulas, units, and placement remain page/domain decisions.

### Export

Export is deferred from the current page implementation scope. Any export node described in architecture or historical redesign documents is a future boundary, not a current acceptance requirement.

## 5. Intended flow

```text
Select Product
    -> Master Data: choose an entry method
    -> create/import/edit Reference or Current Draft
    -> validate Product, data quality, and Routing -> Work Center links
    -> Cost Breakdown: calculate both sides and compare all supported data
    -> Candidate Selection: choose findings of interest
    -> RCA: explain change, cause, and action
    -> Simulation: test isolated scenario variables and financial add-ons
    -> review a resulting Draft before any explicit activation
```

The flow is navigable rather than a forced one-way wizard, but each downstream page must receive the selected Product and dataset context.

## 6. Explicitly pending details

These items are intentionally not silently decided by the documents:

- The exact activation readiness matrix for Drafts containing reviewable Missing, Invalid, Warning, or Needs Review findings.
- The exact formulas, units, time periods, and input/calculated roles for Sale, COGS, Gross Profit, SG&A, OP, Profit, and future variables.
- The final Simulation variable registry and formula-authoring model.
- The exact RCA form fields for each driver type.
- The first release decision for the optional `ADDITIONAL_DATA` sheet and optional routing time fields.

Pending details must not weaken the confirmed rules above or introduce silent fallbacks.

## 7. Historical and baseline documents

- `PROJECT.md` describes the current implementation baseline and intentionally contains legacy paired Base/Active details.
- `ARCHITECTURE.md` describes a target architecture; its Export boundary is future/deferred for the current scope.
- `PROJECT_SPECIFIC.md` and `README.md` contain older Excel-first and Reference/Active wording; the current vocabulary and data-quality rules are defined above.
- `report.md` is a read-only review of an earlier commit, not a target requirements specification.
- `COSTBREAKDOWN_SYSTEM_LOGIC_SOURCE_OF_TRUTH.md`, `COSTBREAKDOWN_ANALYSIS_RECOMMENDATIONS.md`, redesign documents, and handoff files preserve useful historical reasoning but must defer to the authoritative documents listed above when terminology or scope differs.
