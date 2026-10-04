# Cross-Cutting Decisions — Historical Snapshot

**Original snapshot:** 2026-09-30

**Status:** Historical implementation context only. This is not a current requirements or status ledger.

Current requirements and source precedence are in [REQUIREMENTS_INDEX.md](REQUIREMENTS_INDEX.md). The user later designated the two newer Markdown documents, the two linked ChatGPT source conversations, and the 80-topic crosswalk as the active source set; the older `agreements/` are historical only. Some choices below were superseded, including the Routing identity and partial/Selected Comparison scope. Do not copy an old item below into the active plan without checking the current sources.

## Decisions for the current implementation

### Template sizing

- Download Template uses the selected dataset's saved `DatasetSizing` counts for Work Centers, BOM, and Routing.
- The template modal shows those counts as read-only. Users change them in Dataset Setup, where the sizing state is maintained.
- Product identity fields remain editable in the template modal.

### Dataset export

- Excel export omits a row only when `isGeneratedSizingPlaceholder === true`.
- Manually edited rows and incomplete business rows remain exportable, even when their visible fields are blank. Export does not infer placeholder status from row contents, IDs, or position.
- This applies to Work Center rates, BOM, and Routing.

### Snapshot import identity

- Data-bearing Work Center and BOM rows with a missing business code remain in the editable Working Dataset and carry a warning. Empty rows are skipped.
- Routing comparison still matches only by Operation Code; missing or duplicate codes remain warnings and are not guessed. Imported Routing rows receive distinct internal IDs when their preferred IDs collide.

### RCA and scenario UI state

- Selected candidate, trial handoff, and scenario drafts are kept per product in `sessionStorage` so navigating between pages does not discard them. They remain browser-session data, not permanent application storage.
- RCA page state is bound to the product session's Master Data revision. Effective edits, snapshot imports into an existing session, Reference/Current copy operations, sizing changes, clears, and resets advance that revision; saved candidate selection, Trial handoff, and scenario drafts are then replaced with empty state. Applying unchanged product/sizing values, or resetting already-unset sizing, is a no-op and preserves RCA state. Legacy Excel import creates a new product session, so it has no prior RCA page state to invalidate. Navigating between pages or products without changing their data preserves drafts, and deleting a session prunes its orphaned RCA state.

### Synthetic review data

- The Master Data page offers a synthetic mock review fixture in development builds only.
- Loading it resets a dedicated `ps-dev-review-fixture` session. The user's previously active working session is preserved and can be restored with “Return to working session.”
- The fixture contains unchanged, changed, added, and removed material and routing rows, plus a Work Center rate change. It is not operational customer data and is not included in production assets.
- The fixture supports local flow review and deterministic verification. It does not replace a representative real-data UX review.

### JavaScript bundle splitting

- Feature pages retain the existing loading behavior. Excel parsing, template generation, and workbook export are loaded when the corresponding action runs.
- Keep the production build below Vite's default 500 kB chunk advisory. Do not raise `chunkSizeWarningLimit` to hide the output size.
- The ExcelJS `bare` entry is loaded only after the browser shims (`buffer`, `process`, `readable-stream`, `events`, and `util`) are available. `readable-stream` is isolated in its own lazy chunk.
- Latest production build sizes are: main entry 382.79 kB, parser 381.40 kB, ExcelJS 431.35 kB, and Excel stream support 104.43 kB. The default `> 500 kB` advisory is gone; its configured threshold is unchanged.
- Vite still reports externalized `fs` and `crypto` imports from ExcelJS and its CSV dependencies. A production-preview Template action completed workbook generation and closed the dialog without a new browser exception. The browser harness did not capture a download event, so the saved `.xlsx` file still needs a direct human check.

### Existing comparison choices retained

- In Cost Breakdown, `All` continues to select every comparison status as specified in the current requirements index.
- Differences in custom `additionalFields` continue to be retained and included in `fieldDiffs`, so they can produce `CHANGED` status. No new policy was added in this patch.
- Current-side sizing placeholders remain visible under the existing Cost Breakdown behavior. Any display change awaits UX review.

## Open or deferred owner decisions

- **Import and sizing metadata:** The current agreement does not settle whether replacing a dataset by import should preserve, reset, or recalculate saved `DatasetSizing`. Keep the existing behavior and do not infer saved sizing counts from imported row counts until this policy is agreed.
- **Partial comparison:** Deferred. Before implementing a selectable subset, define whether excluded rows leave the calculation or are only hidden; the choice affects totals, Gaps, and downstream candidates.
- **Blank user-owned rows:** Export can include an intentionally blank user row, while import skips all-empty rows. The current workbook has no marker that distinguishes an intentionally blank row from an empty template row; defer round-trip support until the representation or policy is agreed.
- **Human acceptance:** UX/UI and end-to-end flow logic acceptance remains with the user. Automated verifiers and ChatGPT review do not count as acceptance.
