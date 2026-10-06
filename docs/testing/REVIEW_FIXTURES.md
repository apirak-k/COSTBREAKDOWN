# Development Review Fixtures

The development build provides two synthetic dataset pairs from the Master Data page. They load into a dedicated review session; the previously active working session, its Undo/Redo history, and its Selected Comparison are preserved for the current app session and can be restored with **Return to working session**. Loading either fixture again resets the dedicated mock's Working/Last Saved data and downstream review state.

These fixtures are for deterministic local review. They contain no operational customer data and do not define behavior for requirements that are still pending.

## Load a fixture

1. Start the development app with `npm run dev`.
2. Open **Master Data** and choose **Load complete review mock** or **Load data-quality mock**.
3. Confirm the prompt. Navigate between pages to review the same Reference/Current pair.
4. Use **Return to working session** to restore the session that was active before the mock was loaded.

The fixture starts with Reference and Current prepared for comparison. It does not create a Last Saved copy. Save a side first when reviewing actions that require that side's Last Saved state, such as Reset or Export. Reload the fixture to restore its starting data after destructive flow checks.

## Full manual flow checklist

Use **Load complete review mock** for this sequence:

1. On Master Data, switch Reference/Current, enter Edit Mode, try row/range selection, paste, add/delete/reorder, and change a value. Exercise Undo/Redo across different tables. Check the default All Tables order and same-session state after visiting another page and returning.
2. Save Current, edit it, Reset, and verify the saved values return. Edit it again without saving and export; the exported values should still come from Last Saved. Import that workbook into Reference and confirm Current did not change.
3. In Sizing, apply a metadata/count change and download the template. The initial counts are intentionally larger than the populated row counts so the blank template slots are visible. Check that the values apply to the selected side.
4. Clone in both directions and review the populated-destination confirmation. Clear the viewed Working dataset, then reload the mock to restore the sample.
5. In Cost Breakdown, inspect the status categories, Ref → Current changed inputs, record/WC Gaps, reconciliation, Process drill-down under Work Center, and Selected Comparison. Follow the selected scope downstream.
6. In Candidate Prioritization, inspect changed/added/removed findings, gap-descending order, status filtering, and Controllable. Choose a candidate only on RCA & Simulation.
7. In RCA & Simulation, choose one Candidate for RCA, add optional Root Cause/Action notes, and compare exactly Scenario A and Scenario B. Verify both begin independently from full Current, use supported Standard Cost inputs and finalized economics/Selling Price/SG&A/OP behavior, and leave Reference, Current, and the other scenario unchanged. Review the monetary comparison and the Reference → Current → selected Simulated story, including its Result → Cause → Detail overview.

Use **Load data-quality mock** to check duplicate-identity warnings, Product mismatch, missing-input notices, and unavailable calculation states. Return to the working session when finished.

## Coverage

| Fixture | Intended review |
|---|---|
| Complete review mock | BOM and Routing `UNCHANGED`, `CHANGED`, `ADDED`, and `REMOVED` states; Price, Usage, Loss, Manning, Capacity, Yield, and Work Center rate changes; record-level material cost gaps with changed inputs shown separately; Work Center processing aggregation where Reference and Current have no one-to-one Process match; complete Reference/Current cost results for the integrated Simulation result story. |
| Data-quality mock | Missing material price and missing Work Center rate keep Current cost unavailable; duplicate BOM identity is ambiguous; different Product Names surface a mismatch; warnings remain inspectable. |

Both fixtures can be used to review the Master Data tables, Reference/Current switching, View/Edit, All Tables order, Cost Breakdown, Candidate Prioritization, and the integrated RCA & Simulation result flow. Verify that Selected Scope limits Cost Breakdown/Ranking only and ends when one Candidate enters RCA; any Candidate origin shown afterward is context, not active scope. Manual interaction steps such as Save, Reset, Clear, Clone, Sizing, template download, workbook export, and import can be exercised in the dedicated session without risking the user's previous session.

The deterministic data checks live in `scripts/verify_synthetic_review_fixture.ts` and run with:

```powershell
npx jiti scripts/verify_synthetic_review_fixture.ts
```

## Boundaries

- The complete fixture has known inputs so settled calculations can be reviewed. It does not create monthly history or numeric business metrics whose formulas are pending.
- The data-quality fixture uses partially populated records, not deliberately blank user-owned rows.
- Neither fixture establishes how Import handles saved Sizing counts, whether untouched generated blank rows affect general readiness/calculation/comparison, or whether an intentionally blank user-created row must survive workbook round-trip. Those remain separate pending decisions in [`MASTER_DATA.md`](../specs/MASTER_DATA.md).
- The data fixtures verify model/comparison results. They do not replace browser-level interaction replay or human visual acceptance.
