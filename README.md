# COSTBREAKDOWN

COSTBREAKDOWN is a local tool for preparing cost data, comparing datasets, reviewing cost changes, testing supported changes in Simulation, and exporting data to Excel.

## Open the app

1. Extract the complete ZIP into a folder. Keep `app`, `Windows`, `macOS`, `Linux`, `docs`, and both guides together.
2. Open the launcher for your operating system:

   - **Windows:** `Windows/Start COSTBREAKDOWN.exe`
   - **macOS:** `macOS/Start COSTBREAKDOWN.app`
   - **Linux:** `Linux/Start COSTBREAKDOWN` or `Linux/Start COSTBREAKDOWN.desktop`

The launcher starts a local server on loopback and opens the default browser. Starting the same package again reuses its existing server. It does not require Node.js, npm, Go, a Vite server, or administrator privileges.

## Close the app

Use the matching Stop launcher from the same package folder:

- **Windows:** `Windows/Stop COSTBREAKDOWN.exe`
- **macOS:** `macOS/Stop COSTBREAKDOWN.app`
- **Linux:** `Linux/Stop COSTBREAKDOWN` or `Linux/Stop COSTBREAKDOWN.desktop`

Closing the browser tab alone may leave the local server running. Stop only closes the server started from that package folder.

## Platform notes

- **Windows:** Use a current version of Microsoft Edge or Google Chrome. The package does not install software or change system settings.
- **macOS:** These app bundles are not signed or notarized. macOS may prevent them from opening. This package does not bypass Gatekeeper; ask your company administrator for an approved signed build if macOS blocks it.
- **Linux:** The bundled helpers support x86_64 and arm64. A desktop environment may ask you to trust or allow a downloaded `.desktop` launcher before it runs. Follow your organization's desktop policy; the package does not change trust settings.

## Your work

Use Master Data to prepare or import a dataset, then open Cost Breakdown or Simulation for the analysis you need. Export important work to Excel before closing your browser session. Working data and saved checkpoints belong to that browser tab and are not a permanent database or shared backup.

For step-by-step instructions, see [USER_GUIDE.md](USER_GUIDE.md).
