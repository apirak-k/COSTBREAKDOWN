# COSTBREAKDOWN

COSTBREAKDOWN helps you prepare product cost data, compare datasets, and test supported what-if changes. Use it to see how BOM, Work Center, and Routing data affect cost.

## Quick Start

1. [Download the ZIP from the `main` branch](https://github.com/apirak-k/COSTBREAKDOWN/archive/refs/heads/main.zip).
2. Extract the ZIP and keep the extracted folder together.
3. Double-click `Start COSTBREAKDOWN.exe`.
4. Use COSTBREAKDOWN in the browser tab that opens.
5. When you finish, double-click `Stop COSTBREAKDOWN.exe`. Closing the browser tab alone does not stop the local app.

## How COSTBREAKDOWN Works

```text
                         ┌─ Cost Breakdown: compare Before and After
Master Data ─────────────┤     └─ Selected Comparison: optional focus on findings
Reference / Current /    │
Custom                   └─ Simulation: test supported what-if changes
                              └─ Send to the matching Master Data dataset

Master Data Export ───────────────→ Excel workbook to keep or share
```

Master Data supplies the latest Working data to both Cost Breakdown and Simulation. Save is a checkpoint inside the current browser session; it is not required before you compare or simulate.

### Prepare data in Master Data

Prepare `Reference`, `Current`, and `Custom` datasets. Import a supported Excel workbook or edit data in the app. Review warnings and blockers from Header `i` → `Prepare Dataset`. Built-in `Complete Mock` and `Incomplete Mock` data are available there for examples and data-quality checks.

### Compare in Cost Breakdown

Choose datasets for `Before` and `After`. Cost Breakdown shows the full cost gap and BOM or Routing findings. Select findings to view an optional Selected Comparison within Cost Breakdown. The full comparison remains available, and the selection does not change Simulation.

### Test changes in Simulation

Simulation is a separate what-if workflow. Choose an active dataset, change supported parameters or economic assumptions, and review the `Result`, `Cost Structure`, and `Break-even` views. `Send` sends the active dataset's BOM and Routing parameter changes to the matching Master Data Working dataset. Economic what-if assumptions stay in Simulation. `Send all datasets` sends parameter changes for all three matching roles.

## Keep a Copy of Your Work

COSTBREAKDOWN keeps working data in browser session storage, not in a company database. Use `Export` in Master Data to create an Excel copy of the current Working dataset, including edits not yet saved with `Save`.

For step-by-step instructions, see the [COSTBREAKDOWN User Guide](USER_GUIDE.md).
