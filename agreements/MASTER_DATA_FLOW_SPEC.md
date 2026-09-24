# Master Data Page — Agreed Flow and Behavior

## 1. Purpose

The **Master Data** page is a temporary workspace for preparing two sets of input data:

- **Reference** — the baseline data used for comparison
- **Current** — the data being compared against the baseline

The page is not a product database, version-management system, or permanent data store.

Its core job is simple:

> Enter or import data for Reference and Current, modify either side as needed, then compare them immediately.

If the user wants to keep a prepared dataset for later use, they may export it to Excel.

---

## 2. Core Principles

1. The page always works with two temporary working contexts:
   - Reference
   - Current

2. There is **no Product selector before entering the page**.
   Product information is part of the data itself.

3. There is no lifecycle such as:
   - Draft
   - Active
   - Archived
   - Confirmed
   - Version

4. There is no required Save or Confirm step before comparison.

5. Data exists only in the current browser/session state.
   If the user closes or resets the session, the working data is lost.

6. Export is optional and is used only when the user wants to keep a dataset outside the system.

---

## 3. Page Structure

The Master Data page has two working contexts:

```text
MASTER DATA

[ Reference ] [ Current ]
```

The user can switch between them at any time.

Each side contains one **Working Dataset**.

At the core, a Working Dataset contains the existing master-data sections used by the system:

```text
Working Dataset
├── Product
├── Work Center
├── BOM
└── Routing
```

The exact fields inside these sections should continue to follow the calculation requirements of the application.

Detailed flexible/custom-field behavior is intentionally out of scope for this document and can be designed separately later.

---

## 4. Empty Initial State

When the user opens Master Data for the first time, the page should be mostly empty and immediately usable.

Do not show a startup wizard such as:

```text
Start Blank
Import Excel
Copy Existing Dataset
```

Instead, the user should simply see the empty Reference/Current workspace and the available actions.

Example:

```text
MASTER DATA

[ Reference ] [ Current ]

Product
No data

Work Center
No data

BOM
No data

Routing
No data

Actions:
Import Excel
Download Template
Export Excel
```

The user decides what to do naturally from the page.

---

## 5. Ways to Enter Data

A Working Dataset can be prepared in two main ways.

### 5.1 Manual Entry

The user can start from an empty workspace and enter data directly on the web page.

They can:

- add data
- edit data
- delete data
- continue adjusting the dataset until it is ready for comparison

There is no required order in which Product, Work Center, BOM, and Routing must be filled unless a calculation specifically requires it.

### 5.2 Import Excel

The user can import an Excel file into the currently selected side.

The system reads the Excel data and displays it in the Working Dataset.

After import, the user may continue to:

- edit values
- add rows
- delete rows
- adjust the imported information on the web page

The imported Excel is therefore a starting data source, not a read-only file.

---

## 6. Important Import Rule

Importing Excel should **not automatically merge** imported data with manually entered data that already exists in the same Working Dataset.

This avoids ambiguous or mixed data.

If the user manually enters data first and later imports Excel into that same side, the imported Excel should become the new working data for that side.

Conceptually:

```text
Manual data already exists
        ↓
User imports Excel
        ↓
Excel becomes the new Working Dataset
        ↓
Previous manual data is no longer used
```

The UI may show a confirmation before replacing existing working data to prevent accidental loss.

After the import finishes, the user may freely modify the imported data again.

---

## 7. Copy Reference to Current

The system should support the common case where Current is only a small modification of Reference.

Provide an action such as:

```text
Copy Reference → Current
```

Behavior:

```text
Reference Working Dataset
        ↓ Copy
Current Working Dataset
        ↓
User edits only the changed values
        ↓
Compare
```

After copying, Reference and Current must be independent working datasets.

Editing Current must not change Reference.

This is especially important when the user wants to keep the original baseline and modify only a few BOM, routing, work-center, or product values for the Current case.

---

## 8. Comparison Flow

The user does not need to export, save, confirm, or activate anything before comparing.

As soon as both sides contain enough information for the intended calculation, they can be compared.

```text
Open Master Data
        ↓
Choose Reference or Current
        ↓
Enter manually OR Import Excel
        ↓
Edit / Add / Delete as needed
        ↓
Switch to the other side
        ↓
Prepare the other Working Dataset
        ↓
Reference Working Dataset
        VS
Current Working Dataset
        ↓
Check Product identity
        ↓
Compare
        ↓
Cost Breakdown / Gap Analysis
```

The data currently shown in the two working contexts is the data used for the comparison.

---

## 9. Product Matching

Normally, Reference and Current are expected to represent the same product.

The system should compare identifying information such as Product Code and/or Product Name.

Example:

```text
Reference Product: RGOM-024
Current Product:   RGOM-024

Product matches
```

If they do not match:

```text
Reference Product: RGOM-024
Current Product:   RGOM-025

Warning: Product mismatch
```

This warning must **not block** the user.

The user is still allowed to compare the two datasets because the system should assist analysis rather than enforce a rigid business rule.

---

## 10. Editing Behavior

Both Reference and Current are editable Working Datasets.

The user should be able to modify the relevant master-data inputs used by the system, including operations such as:

```text
View
Add
Edit
Delete
```

Examples include:

- modifying material/BOM values
- adding or removing BOM rows
- changing routing information
- adding or removing routing rows
- modifying work-center information
- changing product information

Imported data and manually entered data should use the same editing interface after they are loaded into the Working Dataset.

---

## 11. Export Excel

Export is **optional** and is not part of the mandatory comparison flow.

Its purpose is to let the user keep the current state of a Working Dataset because the application itself does not permanently store the data.

The user may export either side independently:

```text
Reference Working Dataset → Export Excel

Current Working Dataset   → Export Excel
```

The exported file must represent the **latest current state** of the dataset, including all edits made on the web page.

Example:

```text
Import original.xlsx
        ↓
Edit BOM
Add Routing rows
Delete one material
Change Work Center rate
        ↓
Export Excel
        ↓
The exported file contains the modified data
```

The exported Excel can later be imported back into the application to restore that dataset as working data.

---

## 12. No Persistence in the Application

The application does not act as permanent storage for datasets.

```text
Working Data
    ↓
Current browser/session only
    ↓
Close/reset session
    ↓
Data is lost
```

Therefore:

```text
Need the data only for this comparison?
→ No export required

Want to keep the prepared data for later?
→ Export Excel
```

This intentionally keeps the system focused on data preparation and comparison instead of becoming a master-data/version-management database.

---

## 13. Download Template

The Master Data page should provide a **Download Template** action for users who do not already have a suitable Excel file.

Expected flow:

```text
Download Template
        ↓
Choose the required data/fields for the template
        ↓
System generates an Excel template
        ↓
User fills the Excel file
        ↓
Import Excel into Reference or Current
        ↓
Edit further on the web if needed
        ↓
Compare or Export
```

The template should be based on the same core data model used by the web application so that import, web editing, comparison, and export remain consistent.

The detailed field-selection rules for the template should be specified separately after the core Master Data flow is finalized.

---

## 14. Working Data and Dataset Normalization

The user should not need to think about internal normalization while editing.

From the user's point of view:

```text
Input data
    ↓
Working Data on the page
    ↓
Compare immediately
```

Internally, the application should normalize the current Reference and Current working data into the common dataset structure required by the calculation engine when needed.

The same normalized structure can also be used when exporting Excel.

Conceptually:

```text
Manual Input ──┐
               ├──> Working Data ──> Normalized Dataset ──> Compare
Excel Import ──┘                            │
                                           └──────────────> Export Excel
```

Normalization is an implementation detail, not a workflow step the user must manually perform.

---

## 15. Final Master Data Flow

```text
OPEN MASTER DATA
        ↓
[ Reference ] [ Current ]
        ↓
Choose the side to work on
        ↓
Enter data
├── Manual entry on the web
└── Import Excel
        ↓
Working Dataset appears on the page
        ↓
Edit / Add / Delete as needed
        ↓
Optional: Export this side to Excel for storage
        ↓
Switch to the other side
        ↓
Prepare the other Working Dataset
        ↓
Optional shortcut:
Copy Reference → Current
and modify only the differences
        ↓
Both Working Datasets are ready
        ↓
Check Product Code / Product Name
├── Match → continue normally
└── Mismatch → show warning, but still allow comparison
        ↓
COMPARE
        ↓
Cost Breakdown / Gap Analysis
        ↓
Need changes?
        ↓
Return to Master Data
        ↓
Edit Reference and/or Current
        ↓
Compare again
```

---

## 16. Explicit Non-Goals for This Flow

The following concepts should not be part of the Master Data core flow unless a future requirement explicitly adds them:

- Product selection before entering Master Data
- permanent dataset storage in the application
- dataset version history
- Draft / Active / Archived lifecycle
- Confirm / Activate workflow
- mandatory Save before Compare
- automatic merging of existing manual data with a newly imported Excel file
- forced rejection when Reference and Current have different Product identities

---

## 17. One-Sentence Definition

> The Master Data page is a temporary two-sided workspace where users prepare editable Reference and Current working data through manual entry or Excel import, compare them immediately, and optionally export either side to Excel if they want to keep the prepared data outside the application.
