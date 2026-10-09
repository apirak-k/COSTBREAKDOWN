# Development Mock Data

The development Master Data toolbar exposes one action: **Load Mock Data**. It loads a deterministic Reference/Current data-quality pair immediately into the active product's ordinary Working snapshots and selects Current for review. Custom and Last Saved snapshots remain unchanged. It does not create a mock session or ask for confirmation.

All later edits share the existing Master Data Undo/Redo history. Undoing later edits eventually undoes the mock load as one Working-state action. Reset keeps its normal per-dataset meaning and restores the viewed dataset from its Last Saved snapshot.

## Review sequence

1. Start the development build and open Master Data.
2. Open **Prepare Dataset** and select **Load Mock Data**.
3. Review generated identities, duplicate auto-renames, missing/invalid values, unresolved Work Center references, and Product Mismatch status.
4. Edit a value, then use Undo and Redo to confirm the edits and loaded data share one history.
5. Use the per-dataset **Reset** action to restore Reference or Current from that dataset's Last Saved snapshot.

The fixture contains complete Reference inputs and incomplete Current inputs, so Current calculations remain unavailable where required values are missing. The pair also exercises different Product Names and duplicate business identities; the app resolves the duplicate identity and reports the automatic rename in Prepare Dataset.
