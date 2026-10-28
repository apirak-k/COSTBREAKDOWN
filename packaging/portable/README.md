# COSTBREAKDOWN

COSTBREAKDOWN is a local tool for preparing product cost data, comparing Reference and Current datasets, reviewing cost changes, trying supported changes in Simulation, and exporting data to Excel.

## Workflow

```text
Master Data → Cost Breakdown → optional Selected Comparison → Simulation → Excel export
```

Selected Comparison is a temporary focus within Cost Breakdown. It does not change the datasets or limit Simulation.

## Start and stop

1. Keep the portable folder together.
2. Double-click `Start COSTBREAKDOWN.exe`. The app opens in your default browser without leaving a terminal window open. You may create shortcuts to the Start and Stop files if you prefer.
3. When finished, double-click `Stop COSTBREAKDOWN.exe` to stop this folder's local app. Closing the browser tab alone may leave the app running.

No installation, Node.js, or npm is required. Use a current version of Microsoft Edge or Google Chrome.

## Prepare data in Master Data

Choose the dataset you want to work on: `Reference`, `Current`, or `Custom`. Use `Import` to load a compatible `.xlsx` workbook into the dataset currently open. You can also edit the fields and table rows directly. Use `Save` to keep the current working version for this browser-tab session.

`Reset` returns the dataset to its saved version (or its initial version if it has not been saved). `Clone from` copies another dataset into the one currently open. Use `Sizing` to set the table row counts; `Apply Sizing` updates the tables, and `Download Template` creates an Excel template for those counts.

## Review and simulate

Open `Cost Breakdown` to compare Reference with Current. The page starts with the full comparison and shows cost totals and BOM or Routing findings. Select finding checkboxes to focus the totals on selected findings. Clear the selections to return to the full comparison.

Open `Simulation` to compare the datasets shown in its `Before dataset` and `After dataset` controls. Try supported changes in the Simulation BOM and Routing tables, then review the `Result`, `Cost Structure`, and `Break-even` views. Selected Comparison from Cost Breakdown does not carry into Simulation.

## Import, export, and saving work

Import accepts `.xlsx` workbooks in the COSTBREAKDOWN workbook format. In Master Data, `Export` downloads the current working dataset as an Excel workbook, including edits not yet saved with `Save`. Save important workbooks in an approved company location so you can keep or share them.

Working data belongs to the current browser-tab session. COSTBREAKDOWN does not provide a durable company database or shared backup. Export important work before closing the session.

## Remove COSTBREAKDOWN

Run `Stop COSTBREAKDOWN.exe`, then delete the portable folder. There is no installer or uninstaller.

## Troubleshooting

- **The browser did not open:** Double-click `Start COSTBREAKDOWN.exe` again and check that Edge or Chrome is available as the default browser.
- **The app is already open:** Start reuses the healthy local app for this folder. Use the existing app tab, or run `Stop COSTBREAKDOWN.exe` and start again.
- **Import does not accept a file:** Choose an `.xlsx` workbook in the COSTBREAKDOWN workbook format.
- **Closing the tab did not stop the app:** Run `Stop COSTBREAKDOWN.exe` from the same portable folder.
