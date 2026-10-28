# COSTBREAKDOWN User Guide

## 1. Start COSTBREAKDOWN

1. Download the ZIP from the [`main` branch](https://github.com/apirak-k/COSTBREAKDOWN/archive/refs/heads/main.zip).
2. Extract the ZIP. Keep the extracted folder and its files together.
3. Double-click `Start COSTBREAKDOWN.exe`.
4. Use the app in the browser tab that opens.
5. When you finish, double-click `Stop COSTBREAKDOWN.exe` from the same folder. Closing the browser tab alone does not stop the local app.

## 2. Understand the Workflow

Start in **Master Data** to prepare Reference, Current, and Custom. Then use either workflow as needed:

- **Cost Breakdown** compares two datasets and explains the cost gap.
- **Simulation** tests supported what-if changes using Master Data Working data.

Selected Comparison is an optional focus inside Cost Breakdown. It is not a step you must complete before Simulation, and it does not change Simulation.

Both Cost Breakdown and Simulation use the latest Master Data **Working** values. You do not need to press Save before using them.

## 3. Prepare Data in Master Data

### Choose a dataset

Use the dataset selector to open `Reference`, `Current`, or `Custom`.

- **Reference** is a reference dataset for comparison.
- **Current** is the current dataset you want to review.
- **Custom** is a third workspace for another set of data. It has no fixed business status.

The active dataset is the one affected by the Master Data controls.

### Edit data

Switch from View to Edit to change product information or table cells. The tables cover BOM, Work Centers, and Routing. You can edit supported values, add or remove rows, and reorder rows in Master Data.

Use the local search and table controls to find the rows you need. The `All` table view shows all three tables.

### Import an Excel workbook

1. Open the dataset that should receive the workbook.
2. Select `Import` and choose a compatible `.xlsx` COSTBREAKDOWN workbook.
3. Review the workbook status and row summary.
4. Select `Import` to apply a valid workbook.

Choosing a file only checks it. The explicit Import action replaces the active dataset's Working data. Its Last Saved data stays unchanged. An invalid workbook cannot be imported. Use `Download Template` in Sizing to create a workbook in the supported format.

### Save, Reset, Clear, and Clone

- **Save** copies the active dataset's Working data to its Last Saved checkpoint for the current browser session.
- **Reset** restores the active dataset from its latest Last Saved checkpoint. If there is no saved checkpoint, Reset restores that dataset's initial reset state.
- **Clear** blanks editable values in the active dataset while keeping its table structure. It does not change Last Saved.
- **Clone from** copies another dataset into the active dataset's Working data. The active dataset is the destination; choose the source from the menu. Clone does not overwrite the destination's Last Saved checkpoint.

Save, Reset, and Clear act on the active dataset when clicked. Hover over the control or focus it and press `Alt` + `Down Arrow` to open its all-dataset action, such as `Save all datasets` or `Reset all datasets`.

### Set table sizes and download a template

1. Select `Sizing`.
2. Set the starting row counts for BOM, Work Centers, and Routing.
3. Select `Apply Sizing` to apply the counts to the active Working dataset.
4. Select `Download Template` to create an Excel workbook for the counts shown in the form.

### Review warnings and blockers

Open Header `i` → `Prepare Dataset`. The panel shows whether Reference and Current are `Ready` or `Incomplete`, plus warning and blocker counts for each dataset. Select a dataset row to filter the issue list. Expand a category to see its locations, then select a location to jump to the relevant Master Data field.

Warnings identify items to review. Blockers identify missing required data and can keep Reference or Current from being ready. Custom issues are listed too, but Custom does not determine the Reference/Current readiness indicator.

### Use the built-in mock data

Open Header `i` → `Prepare Dataset`, then choose:

- **Complete Mock** for a complete example dataset.
- **Incomplete Mock** for an example with warnings and blockers.

Loading either mock replaces Reference and Current Working data, clears Custom Working data, and selects Current. It leaves the Last Saved checkpoints unchanged and can be undone as one action. Export each Working dataset you want to keep before loading a mock.

## 4. Compare Data in Cost Breakdown

Cost Breakdown starts with `Before: Reference` and `After: Current`. You can choose Reference, Current, or Custom for either side.

The page shows the Standard Cost Gap, with the direction `After − Before`. The overview breaks the cost into Material, Labor, Burden, and Standard Cost. A separate Work Center panel shows conversion cost by Work Center. The finding tables show BOM and Routing changes.

Use `BOM`, `RTG`, or `All` to choose which finding table to view. Use the status and sort controls to narrow or organize the findings. Open a changed finding to review its Before, After, and Parameter Cost Effect details.

## 5. Focus Findings with Selected Comparison

Select one or more finding checkboxes in the BOM or Routing table. Cost Breakdown adds a Selected value beside the full gap in the overview. The selected gap includes the findings you selected.

The full gap, full finding rows, and Work Center context remain available. Selected Comparison is a temporary view of the current Before/After pair; it does not change Master Data or Simulation. Unselect the selected findings to return to the full comparison.

Changing the Before or After dataset, or changing its Working data, clears the selected finding membership because it belongs to that comparison pair.

## 6. Test Changes in Simulation

Simulation uses Reference, Current, and Custom from Master Data. It keeps what-if changes separate from Master Data until you send them back.

### Choose the active dataset

Select a dataset label in the `Cost Structure` graph to make it active for parameter editing. The active dataset also becomes the Result's `After` dataset. By default, Custom is active, with Current → Custom shown in Result.

The Result's `Before` and `After` selectors can be changed independently. Those selectors change the comparison shown; `Send` still uses the active dataset selected in the Cost Structure graph.

### Change supported values

In the BOM table, Simulation supports `Price`, `Usage`, and `Loss`. In Routing, it supports `Manning`, `Capacity`, and `Yield`. Rows show `CHANGED` or `UNCHANGED` against the active role's current Master Data basis. Work Center rates and table structure are read-only in Simulation; edit them in Master Data.

The Economic panel supports `Fixed Action Cost`, `Variable Action Cost`, `Batch Size`, `Selling Price`, and `SG&A %`. These values let you review per-unit costs, required savings, operating profit, and break-even. They do not change Standard Cost inputs in Master Data.

### Review results and reset changes

- **Result** compares the selected Before and After datasets, including Standard Cost and business outcomes.
- **Cost Structure** shows the datasets and cost components. Select a dataset label there to change the active parameter workspace.
- **Break-even** compares cumulative parameter savings with total action cost by production quantity. Batch Size can be changed in the Economic panel or at the graph marker.
- **Reset** restores the active Simulation dataset's what-if values to its current Master Data basis.
- **Reset all** restores the what-if values for all three Simulation datasets.

Reset affects Simulation only. It does not reset Master Data.

### Send results back to Master Data

- **Send** sends the active Simulation dataset to the same role in Master Data: Reference to Reference, Current to Current, or Custom to Custom.
- **Send all datasets** sends all three Simulation datasets to their matching Master Data roles.

Sending copies the active Simulation dataset's BOM and Routing parameter changes to the matching Master Data Working role. The Economic panel's what-if values, such as action costs, Batch Size, and Selling Price or SG&A overrides, stay in Simulation and are not sent. Sending does not update Last Saved. To keep the sent parameter changes as a Last Saved checkpoint, open Master Data and select `Save` for that role after sending.

## 7. Import, Export, and Session Data

`Export` in Master Data creates an Excel workbook from the active dataset's current Working data, including unsaved edits. `Download Template` creates an import-ready workbook based on the Sizing form. Export the dataset after a Simulation send if you need a workbook containing those values.

The current app has no separate Export action in Cost Breakdown or Simulation. Use Master Data Export for a dataset workbook.

Master Data Working data, Last Saved checkpoints, and Simulation what-if values are kept in browser `sessionStorage` (temporary storage for the browser session). This is not a permanent database or shared company backup. Export important work to an Excel file that you can keep separately.

## 8. Troubleshooting

- **The app does not open:** Run `Start COSTBREAKDOWN.exe` from the extracted folder. If you need to restart the local app, run `Stop COSTBREAKDOWN.exe` from that folder, then Start it again.
- **Reference or Current is Incomplete:** Open Header `i` → `Prepare Dataset` and select a listed blocker to jump to the field that needs attention.
- **You want to see the warning flow:** Load `Incomplete Mock` from Prepare Dataset.
- **A workbook is invalid:** Use `Download Template` in Sizing and keep the required workbook sheets and headings intact.
- **You need to keep your work:** Use `Export` in Master Data before ending the browser session.
