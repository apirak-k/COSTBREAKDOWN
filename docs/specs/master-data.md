# Master Data Page Specification

## Status

- Concept status: **Confirmed in discussion**
- Document status: **Approved concept / implementation pending**
- Reviewed: 2026-09-22
- Requirements alignment update: 2026-09-23
- This document describes the target behavior of the Master Data page. It does not authorize source-code changes by itself.

## 1. Scope

The Master Data page is responsible for preparing, entering, validating, and maintaining the datasets that will later be used by the comparison and cost-calculation flows.

### In scope

- Selecting the Product context before working with data.
- Creating or editing one Product dataset at a time.
- Downloading the application-provided Excel format.
- Allowing the user to set the number of rows/items in the format for Work Centers, BOM, and Routing.
- Importing a workbook as either `Reference` or `Current`.
- Keeping `Reference` and `Current` as separate datasets.
- Manual entry, editing, adding, removing, and adjusting data after import.
- Cloning one dataset as the starting point for another editable dataset.
- Extensible entry methods that produce the same Product Dataset contract; Import Excel, Manual Entry, and Clone are the initial methods, not a closed permanent list.
- Saving imported or edited data as a `Draft`.
- Preserving source values, working values, and data-quality findings.
- Maintaining and validating the relationship between Routing and Work Center data.

### Out of scope for this page

- Showing the final Reference-vs-Current comparison.
- Deciding whether a value is `Added`, `Removed`, `Modified`, or `Unchanged`.
- Choosing the comparison scope on the Cost Breakdown page.
- Candidate selection, RCA, and trial simulation.
- Export behavior.
- Replacing the user-provided source with silently invented values.

## 2. User Goal

The user must be able to prepare a complete dataset flexibly, regardless of whether the data was imported from the provided Excel format or entered and adjusted manually, while being able to see and correct data-quality problems before the dataset is used elsewhere.

## 3. Domain Terms

| Term | Meaning |
|---|---|
| Product | The product identified by a Product Code and its product metadata. |
| Product session | The selected working context for one Product. |
| Dataset | A complete set of Product, Work Center, BOM, Routing, and optional custom data. |
| Reference | The dataset used as the before/reference side of a later comparison. |
| Current | The dataset used as the after/current side of a later comparison. |
| Draft | An editable working version that has not yet become the live dataset. |
| Source Value | The value as supplied by the imported workbook or original source. |
| Working Value | The user-maintained value used by the application after explicit editing or mapping. |
| Missing | A required or expected value is absent. |
| Invalid | A supplied value cannot be interpreted or fails its field rule. |
| Warning | The data is retained, but the user must review a known issue. |
| Product mismatch | The Product Code in the workbook differs from the Product selected in the Header. |
| Source / Provenance | Where a value came from, such as an Excel workbook, manual entry, or clone. This is evidence metadata, not the canonical working dataset. |
| CostSnapshot | The canonical in-application dataset used for role-specific editing and downstream calculation. |

Data-quality status and comparison-change status are different concepts. `Missing`, `Invalid`, and `Warning` describe the quality of one dataset. `Added`, `Removed`, `Modified`, and `Unchanged` belong to the later comparison process.

## 4. Confirmed Product and Workbook Rules

1. The user selects the Product in the Header before importing or editing data.
2. One workbook contains one Product. The application-provided format is designed for that Product and does not need to support multiple Products in one file.
3. The Product Code in the workbook must be checked against the selected Product immediately during import.
4. If the Product Codes do not match, the application must show an error immediately and must not create, replace, or mutate a dataset.
5. A workbook is imported into exactly one selected role: `Reference` or `Current`.
6. To prepare both sides for comparison, the user imports the datasets separately, normally in two import actions.
7. A user may use one dataset as the starting point for another. For example, a Reference dataset may be cloned into an editable Current Draft and then adjusted.
8. The application-provided format may be downloaded with the required row/table sizes. The user may then adjust the data within that structure.
9. The page must not silently change a missing or invalid value into a plausible numeric value such as `0`.
10. Source information and the editable working information must remain distinguishable.
11. Import Excel, Manual Entry, and Clone are supported initial entry methods, but the system must be able to add future entry methods without changing the Product Dataset contract.
12. Every entry method must target one Product and one comparison role at a time, then produce an editable Draft dataset.

## 5. Dataset Lifecycle

### Import

- A successful import creates or updates the selected role inside an editable `Draft` context.
- A failed import must not mutate the existing dataset.
- The imported Product Code must remain consistent with the selected Product.

### Manual editing

- The user may edit Product metadata and dataset rows while working in Draft.
- The user may add or remove Work Centers, BOM items, Routing operations, and supported custom data.
- The user may adjust values after import without needing to recreate the workbook.
- Editing a Draft must not mutate the source values that were imported.

### Clone

- The user may clone an existing dataset as the starting point for a new Draft.
- The clone must preserve the source dataset and become independently editable.
- Cloning Reference into Current is a supported workflow for similar datasets.

### Activation

- Draft, Active, and Archived are lifecycle states and are separate from the `Reference`/`Current` comparison role.
- Only an explicit lifecycle action may make a Draft active.
- An Active dataset must not be silently mutated by editing another Draft.
- Existing project rules for archiving the previous Active version remain applicable.
- Activation readiness must be visible before the action. Structural identity failures and unresolved required relationships must not be hidden by activation; the exact blocking matrix for reviewable quality findings remains an explicit pending decision.

## 6. Data Model Requirements

Each dataset belongs to one Product and contains the following logical areas:

### Product metadata

- Product Code
- Product Description
- Unit of Measure
- Customer, when applicable
- Effective Date, when applicable

### Work Center Master / Rates

- Stable Work Center identifier/code
- Description or department
- Labor rate
- Burden rate
- Effective date and source reference where available

### BOM

- Stable item identifier/code
- Material description
- Consumption/quantity
- Unit
- Applicable price and loss values
- Source reference and data-quality state

### Routing

- Stable operation/process identifier when available
- Sequence/order
- Process code/name
- Work Center reference
- Manning, capacity, yield, and other supported process inputs
- Source reference and data-quality state

### Custom or additional data

Additional supported fields or tables must not be silently discarded. If a field cannot yet be mapped to a calculation field, it may be retained as source/unmapped data and must be visibly marked as requiring review before it affects calculation.

## 7. Source and Working Values

For every imported field where the distinction matters:

- `Source Value` records what came from the workbook/source.
- `Working Value` records the value currently used after explicit user editing or mapping.
- The original Source Value remains available for audit and review.
- Changing a Working Value must not overwrite the Source Value.
- If conversion or mapping fails, the application stores the problem as `Missing`, `Invalid`, or another visible warning state rather than fabricating a valid-looking value.

## 8. Import and Validation Behavior

### Blocking errors

The import is rejected and no dataset state is changed when:

- The file is unreadable or is not a supported Excel file.
- A required workbook structure cannot be read.
- The workbook Product Code does not match the Product selected in the Header.
- The file cannot be associated with one Product.

The error must identify the reason and tell the user what must be corrected.

### Retained data-quality findings

The dataset may still be created as a Draft when individual values have reviewable problems, provided the workbook itself is structurally readable:

- Missing values are retained as `Missing`.
- Unparseable or rule-breaking values are retained as `Invalid`.
- Suspicious, estimated, or incomplete values are retained with a `Warning`.
- Unmapped or ambiguous fields/rows are visibly marked and are not silently merged or defaulted.
- A numeric zero is only shown as a real value when it came from the source or was explicitly entered; it must not be an invisible fallback.

The import result must show a summary of warnings and allow the user to locate the affected rows or fields.

## 9. Routing and Work Center Relationship

Routing uses Work Center data as an explicit dependency, not merely as display text.

- Each Routing operation must reference a Work Center in the same dataset when the field is required.
- A missing, unknown, duplicate, or ambiguous Work Center reference must be visible as a data-quality finding.
- The application must not silently substitute another Work Center or rate.
- Reference Routing uses Reference Work Center data, and Current Routing uses Current Work Center data in later calculations.
- A Work Center change and a Routing-input change must remain distinguishable for the later comparison flow.

## 10. Page UI Requirements

The page must make the following state visible:

- The currently selected Product.
- The dataset role being edited: `Reference` or `Current`.
- The lifecycle state: `Draft`, `Active`, or `Archived`.
- Import success, blocking errors, and data-quality warnings.
- Source Value versus Working Value where both exist.
- The available dataset areas: Product, Work Center, BOM, Routing, and supported custom data.
- The relationship/status of Routing Work Center references.

The page should provide actions for:

- Downloading the application-provided Excel format.
- Selecting the import role.
- Importing a workbook.
- Editing and manually entering data.
- Adding/removing records.
- Cloning a dataset into a Draft.
- Reviewing and resolving warnings before activation or downstream use.

The page may expose future entry methods, but every method must pass through the same Product identity, dataset, role, lifecycle, source, and data-quality rules.

## 11. Acceptance Criteria

- [ ] A user selects a Product before importing data.
- [ ] A workbook represents exactly one Product.
- [ ] A workbook with a Product Code different from the selected Product is rejected before any dataset mutation.
- [ ] The user can choose `Reference` or `Current` for each import.
- [ ] Reference and Current are stored as separate datasets and can be imported in separate actions.
- [ ] A successful import is available as an editable Draft.
- [ ] A user can clone a dataset and adjust the clone independently.
- [ ] A user can add, remove, and edit supported data after import.
- [ ] The number of Work Center, BOM, and Routing entries can be adjusted through the provided format and/or page controls.
- [ ] Source Values remain available after Working Values are edited.
- [ ] Missing and invalid values are visibly marked and are never silently converted to zero.
- [ ] Failed imports leave the previously stored dataset unchanged.
- [ ] Routing-to-Work-Center problems are visible and are not silently repaired.
- [ ] Dataset quality status is not confused with later comparison statuses such as Added or Removed.
- [ ] No comparison, candidate, RCA, or export behavior is required to complete this page.

## 12. Current Repository Behavior

This section records implementation and verification observed on 2026-09-23. The requirements above remain normative; these checks are execution evidence, not human acceptance.

- `src/features/master-data/MasterDataPage.tsx` is the input and validation surface. It shows Reference/Current readiness and disables `Open Cost Breakdown` until both roles are prepared for the selected Header Product.
- `src/features/master-data/components/ExcelImportPanel.tsx` passes the selected role and Header Product Code to the upload flow. `src/shared/ui/ExcelUploadDropzone.tsx` validates with the selected Product and only calls the store after a successful parse; the parser rejects a Product Code mismatch.
- `src/state/store.tsx` keeps the active Product, snapshot pair, role readiness, selected Master Data role, and lifecycle status in the same `ProductSession`. Cost Breakdown derives its comparison from that active session and shows an explicit guard when the pair is not ready.
- `src/core/calculations/master-data-handoff.ts` requires a non-empty Header Product Code, both prepared roles, and matching Product Codes before comparison.
- `src/shared/layout/AppLayout.tsx` shows legacy Base/Active/Net Gap footer totals only when the handoff is ready and both snapshot costs are complete. It shows `Comparison not ready` for an unprepared/mismatched pair and `Cost summary on hold` when prepared data has missing, invalid, or estimated costs. `src/features/cost-breakdown/CostBreakdownPage.tsx` uses the same completeness check before showing the exact legacy variance summary.
- `CostSnapshot` retains source/provenance (`sourceRef` and field evidence), comparison role, and lifecycle status. There is no separate `entryMethod` field; entry actions produce the same snapshot shape, with their result and provenance stored in the session.
- The legacy `rates`/`bom`/`routing` fields remain as a compatibility projection while `snapshotPair` holds the role-specific datasets.
- A synthetic-data browser walkthrough confirmed the 0-role and Reference-only guards, the ready two-role handoff, and persistence of Header Product, selected role, Draft lifecycle, and source references after navigating to Cost Breakdown and back.

## 13. Related Documents

- `docs/REQUIREMENTS_INDEX.md` — document authority, shared vocabulary, and cross-page decisions.
- `PROJECT.md` — project-level current baseline and roadmap.
- `PROJECT_SPECIFIC.md` — confirmed project-wide lifecycle and source-of-truth rules.
- `ARCHITECTURE.md` — target architecture and snapshot/comparison direction.
- `CONSTRAINTS.md` — implementation quality and safety constraints.
- `report.md` — current web review findings; not the authoritative Master Data target specification.
