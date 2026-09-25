# Master Data Dataset Sizing and Bidirectional Clone — Design

**Status:** Proposed design for user review; not yet part of the current agreement set.

## Goal

Make Master Data editing and Excel template preparation convenient by letting users choose how many Work Center, BOM, and Routing rows to start with for each working dataset. Keep Reference and Current independent, let users start with either side, and allow a dataset to be cloned from the other side at any time.

The generated template is an empty input workbook. Its row counts come from the currently selected dataset's sizing settings.

## Governing agreement

The current Master Data agreement defines two temporary working contexts, no Product selector before entry, editable datasets, optional template download, and Reference-to-Current copy. It leaves detailed template field selection for a later definition.

This design clarifies row-count configuration and proposes bidirectional cloning. Bidirectional cloning expands the currently documented one-way action and must be incorporated into the agreement after review. It does not introduce Product selection, versioning, or permanent storage.

## Confirmed design decisions

1. **Reference and Current are peers.** Either side can be prepared first. Neither side is the required source of defaults for the other.
2. **Sizing belongs to a working dataset.** Each side independently stores its starting row counts for Work Center, BOM, and Routing. The Product identity does not own these settings. On a fresh workspace, no count is pre-filled; the user sets the counts when preparing that dataset.
3. **Sizing stays editable.** Users may change a side's row counts while entering data on the web. The counts are starting row slots, not a hard maximum; users may add more rows.
4. **Template follows the selected side.** Downloading from Reference uses Reference's counts; downloading from Current uses Current's counts. The workbook's business-data cells, including Product values, start blank for the user to fill.
5. **Clone works either direction.** Reference may be cloned to Current, or Current to Reference. Clone copies the source dataset and its sizing as an initial state. The target becomes an independent working dataset after the copy; later edits do not propagate.
6. **Existing import behavior remains.** Import replaces the selected side's working dataset and does not merge rows. The opposite side remains unchanged.
7. **Comparison remains independent of row positions or row counts.** Existing business-identity matching and calculation requirements continue to govern comparison.

## Proposed interaction

The page opens directly to the Reference/Current workspace with the usual actions. It does not add a startup wizard or require configuration before the user can enter data.

Each selected side exposes a compact **Dataset setup** control for its Work Center, BOM, and Routing starting row counts. The action is available whenever the user wants to configure or adjust that side.

```text
MASTER DATA
[ Reference ] [ Current ]

Selected side: Reference
Dataset setup: Work Center [ 4 ]  BOM [ 16 ]  Routing [ 39 ]

Product | Work Center | BOM | Routing
[Import Excel] [Download Template] [Export Excel]
```

The controls above illustrate the adjustable counts only; they do not imply pre-filled defaults. Counts start unset for a fresh dataset. A separate Excel mock may demonstrate the workbook layout and workflow, but it is illustrative and does not define default counts or override the product agreement. Cloning copies the source side's current counts along with its data.

On the Current side, the user can choose **Clone from Reference**; on Reference, **Clone from Current** is available. Clone is a full replacement of the destination dataset, not a merge. If the destination already has data, show a confirmation that clearly names the destination before replacing it.

## Editing and count changes

- Show the configured number of empty row slots for a new/empty dataset, using the existing core fields required by the application.
- Blank slots are not valid business records and must not create cost, comparison findings, or false readiness.
- Add, edit, and delete remain available after initialization.
- Increasing the configured count adds blank slots. Decreasing it must not silently remove populated records; populated records remain visible and only surplus blank slots may be removed.
- If users add more records than the configured count, retain and display all records. The configured count remains the starting size and the value used when creating a blank template.

## Excel template behavior

- Keep the canonical core workbook structure needed by the existing import flow and calculation model.
- Leave Product values and all Work Center, BOM, and Routing business-input cells blank. Do not seed illustrative Product codes, materials, prices, rates, or operations.
- Generate the configured number of blank rows for each data section using the selected side's sizing.
- Keep headers and calculation-required fields consistent with the application's core data model. This design does not add arbitrary user-defined columns or change calculation semantics.
- Template download does not modify either working dataset. Importing the completed workbook later replaces only the selected side, following the existing import rule.

## Excel export behavior

- Export is separate from downloading a blank template: **Template** creates an empty workbook with row slots based on the selected side's sizing; **Export** contains that side's current working data.
- Export either Reference or Current independently, using the latest in-memory values, including manual edits, additions, and deletions made after import.
- The exported workbook uses the canonical core workbook structure and can be imported back into either selected side through the existing import path.
- Export does not require running comparison and does not modify either dataset, its sizing, or the opposite side.

## State and independence

Sizing configuration is temporary working state associated with its Reference or Current dataset and follows the existing browser/session lifetime. Cloning copies both source data and source sizing once; it does not create a live link. Changing one side's counts, rows, or Product information must not mutate the other side.

## Out of scope

- Product selection or Product-owned row sizing.
- Draft/Active/Archived/version lifecycle, a required save/confirm step, or permanent dataset storage.
- Arbitrary custom fields or user-defined calculation inputs.
- Changes to the verified Cost Engine, business-identity matching, comparison statuses, or formulas.
- Automatic data merging during import or clone.

## Acceptance criteria

1. A fresh Master Data page presents Reference and Current without a Product-selection step or setup wizard; each side's sizing starts unset rather than pre-filled with fixed counts.
2. The user can start with either side and configure its Work Center, BOM, and Routing starting row counts independently.
3. Changing one side's sizing leaves the opposite side unchanged.
4. A user can adjust sizing after web entry; populated data is never removed implicitly by reducing the configured row count.
5. Download Template from either side produces blank business-input cells and uses that side's configured row counts.
6. The template remains importable through the canonical import path after required Product information is filled in.
7. Clone is available in both directions, copies the source data and sizing, replaces the destination as one dataset after confirmation when destination data exists, and leaves the two sides independent afterward.
8. Existing import replacement, non-blocking Product mismatch behavior, and comparison by business identity remain intact.
9. Exporting either side contains its latest working data, round-trips through the canonical import path, and does not alter either side or its sizing.

## Implementation touchpoints to verify

- Active route: `src/App.tsx` uses the feature-based Master Data page.
- Active template action: `src/features/master-data/components/MasterDataWorkspaceHeader.tsx` currently derives row counts from the selected snapshot.
- Dataset state and clone actions: `src/state/store.tsx`.
- Template generation and canonical import: `src/services/excel/dynamic-excel-generator.ts` and `src/services/excel/snapshot-parser.ts`.
- Current product agreement: `agreements/MASTER_DATA_FLOW_SPEC.md`.

Before implementation, update the agreement to state that sizing is per dataset and clone is supported in either direction. Keep this design document marked proposed until the user reviews it.
