# Draft: Master Data Excel Dataset Contract

## Status

- **Draft — awaiting review**
- Date: 2026-09-23
- This document defines the proposed input contract for the Master Data page.
- It does not authorize code changes, template replacement, or migration yet.
- Its decisions must be read together with `docs/REQUIREMENTS_INDEX.md`; this contract defines the Excel method and does not make Excel the only future entry method.

## 1. Objective

Define one clear Excel input contract for Master Data so that the application can accept a complete dataset for one Product, keep the dataset flexible to edit, and later compare two independent datasets without mixing input data with comparison data.

## 2. Confirmed decisions

1. One workbook represents one Product.
2. The user selects the Product in the page Header before Import.
3. The user selects the Import role outside the workbook: `Reference` or `Current`.
4. The Product Code in the workbook is checked against the selected Product immediately during Import.
5. A Product Code mismatch rejects the Import and must not mutate the existing dataset.
6. Reference and Current are separate datasets. They may be imported in two actions.
7. A dataset may be cloned and adjusted to support similar Products or a new Current Draft.
8. The workbook must not contain `Base`/`Active` input pairs. Those are comparison concepts, not two columns of one dataset.
9. Missing and invalid values remain visible as data-quality findings. The application must not silently convert them to `0`.
10. Comparison statuses such as `Added`, `Removed`, and `Modified` are calculated later and are not stored as input fields.
11. Import Excel is one entry method. Manual Entry and Clone must produce the same one-Product dataset contract, and future entry methods may be added without introducing paired `Base`/`Active` input columns.

## 3. Proposed workbook shape

The application-provided workbook contains these logical sheets:

| Sheet | Purpose | Row rule |
|---|---|---|
| `META` | Template/version and source metadata | One metadata block |
| `PRODUCT` | Identity and product metadata | Exactly one Product row |
| `WORK_CENTER` | Work Center master and rates | Zero or more rows |
| `BOM` | Material/component inputs | Zero or more rows |
| `ROUTING` | Process/operation inputs | Zero or more rows |
| `ADDITIONAL_DATA` | Retain supported extra source fields that are not core calculation fields | Optional rows |

The workbook is an input dataset. It is not a comparison report and does not contain a Reference/Current pair.

## 4. Proposed fields

### 4.1 `META`

| Field | Required | Meaning |
|---|---:|---|
| `Template Version` | Yes | Version used to create the workbook |
| `Source Reference` | No | Original file, system, document, or other source identifier |
| `Effective Date` | No | Date represented by the dataset |
| `Dataset Note` | No | Human-readable context or import note |

The Import role is intentionally not a workbook field. It is selected in the application so the same dataset format can become either Reference or Current.

### 4.2 `PRODUCT`

Exactly one Product row is required.

| Field | Required | Meaning |
|---|---:|---|
| `Product Code` | Yes | Stable identity checked against the selected Product |
| `Product Description` | No | Product description/name |
| `UOM` | Yes | Product unit of measure |
| `Customer` | No | Customer or application context, when available |
| `Effective Date` | No | Product-level effective date, when available |

### 4.3 `WORK_CENTER`

| Field | Required | Meaning |
|---|---:|---|
| `Work Center Code` | Yes | Stable Work Center identifier |
| `Description` | No | Work Center or department description |
| `Labor Rate` | No | Labor rate supplied by the source |
| `Burden Rate` | No | Burden rate supplied by the source |
| `Rate Unit` | No | Unit for the rates, such as THB/MHr |
| `Effective Date` | No | Rate effective date |
| `Source Reference` | No | Source location or reference for the row |

### 4.4 `BOM`

| Field | Required | Meaning |
|---|---:|---|
| `Item Code` | Yes | Stable material/component identifier |
| `Description` | No | Material/component description |
| `Consumption` | Yes | Quantity used by the Product |
| `Unit` | Yes | Consumption unit |
| `Price` | No | Applicable source price, when this dataset provides it |
| `Currency` | No | Currency for the price |
| `Loss` | No | Source loss value, with its documented unit/meaning |
| `Source Reference` | No | Source location or reference for the row |

### 4.5 `ROUTING`

| Field | Required | Meaning |
|---|---:|---|
| `Operation Code` | No | Stable operation identifier, when available |
| `Sequence` | Yes | Operation order |
| `Process Name` | Yes | Process or operation name |
| `Work Center Code` | Yes | Reference to a Work Center in this same dataset |
| `Manning` | No | People/machines assigned, when supplied |
| `Capacity` | No | Capacity input |
| `Capacity Unit` | No | Unit for capacity |
| `Run Time` | No | Run-time input |
| `Yield` | No | Yield input |
| `Setup` | No | Setup-time input |
| `Queue` | No | Queue-time input |
| `Wait` | No | Wait-time input |
| `Move` | No | Move-time input |
| `Source Reference` | No | Source location or reference for the row |

### 4.6 `ADDITIONAL_DATA`

This sheet is an extension/retention area, not an unrestricted calculation engine.

| Field | Required | Meaning |
|---|---:|---|
| `Entity Type` | Yes | `PRODUCT`, `WORK_CENTER`, `BOM`, or `ROUTING` |
| `Entity ID` | Yes | Identifier of the related row |
| `Variable Key` | Yes | Name of the additional variable |
| `Value` | Yes | Original value as supplied |
| `Value Type` | Yes | `text`, `number`, `date`, or `boolean` |
| `Unit` | No | Unit for the value |
| `Source Reference` | No | Source location or reference |
| `Mapping Status` | Yes | `Mapped`, `Retained`, or `Needs Review` |

An additional field may be retained without affecting calculation until an explicit mapping rule exists. It must not be silently discarded or silently treated as a core field.

## 5. Data that is deliberately not in this workbook

The following are not input columns in the one-Product dataset:

- `Base Price`, `Active Price`, `P0`, `P1`
- `Base Loss`, `Active Loss`
- `Base Cap`, `Active Cap`, `Base Yield`, `Active Yield`
- Variance, Cost Gap, Before/After, Added/Removed/Modified
- Calculated totals, comparison status, RCA result, or simulation override
- Financial-period measures such as Sale Amount, COGS, SG&A, OP, and Profit unless a later approved financial-data contract explicitly assigns them to this dataset

These values belong to comparison, calculation, simulation, or a separate financial dataset. They must not be used to force two roles into one input file.

## 6. Import behavior

1. User selects Product and Import role in the page Header.
2. User uploads the workbook.
3. The parser checks that the workbook is structurally readable and contains exactly one Product row.
4. The parser reads the Product Code and compares it with the selected Product Code.
5. If the codes differ, Import stops immediately and the existing dataset remains unchanged.
6. If the workbook is structurally readable but individual values are missing or invalid, the data may be created as a Draft with visible findings.
7. The imported cells remain available as Source Values. Later manual edits become Working Values and do not erase the original Source Values.
8. Routing Work Center references are validated against the Work Center rows in the same dataset.

## 7. Data-quality rules

- Blank required value: `Missing`.
- Unparseable or rule-breaking value: `Invalid`.
- Suspicious, incomplete, or unmapped value that can be retained: `Warning` or `Needs Review`.
- A numeric `0` is valid only when it came from the source or was explicitly entered.
- No fallback from Current to Reference, or from a missing value to zero, is allowed without an explicit user action.
- A missing or unknown Work Center reference is visible and is not silently replaced.

## 8. Evidence from the inspected workbooks

The current static template is a comparison-oriented workbook, not a one-role dataset. It contains paired fields such as `Base Price (THB)`/`Active Price (THB)`, `Base Loss (%)`/`Active Loss (%)`, and `Base Cap`/`Active Cap` in `excel_models/CostModel_BLANK_TEMPLATE_v2.xlsx`.

The current web generator also emits legacy paired headers in `src/services/excel/dynamic-excel-generator.ts:38-220`. This is the primary mismatch to resolve after this draft is approved.

The inspected source workbooks contain different data families:

- Cost-declare sheets contain product cost, Work Center rates, BOM, and routing inputs.
- The Price List is a broad material-price master and should not be copied wholesale into one Product's dataset.
- IS data contains period-level Sale Amount, COGS, SG&A, OP, and related financial measures; it is a separate financial-data concern.
- Some raw source files contain multiple product contexts. They are source material for normalization, while the application-provided import template remains one Product per workbook.

## 9. Acceptance criteria for the next implementation phase

- The downloaded template follows the sheet and field contract above.
- The downloaded template has an instructions/legend area and one realistic example row without treating the example as user data.
- The generated workbook does not contain Base/Active input pairs.
- Import role is selected in the UI, not encoded as workbook columns.
- Product mismatch is rejected before state mutation.
- Missing and invalid values are preserved with visible findings, never silently defaulted to zero.
- Reference and Current can be imported separately and cloned/edited independently.
- Routing-to-Work-Center relationships are validated within each dataset.
- A separate approved contract is required before adding financial-period fields or simulation-only variables to this workbook.

## 10. Open decisions for review

1. Should `Price` remain an optional BOM input only, or should product-level Sale Price be defined in a separate financial/simulation contract?
2. Are all routing time fields (`Setup`, `Queue`, `Wait`, `Move`) needed in the first template version, or should some remain optional retained fields until their calculation use is defined?
3. Should `ADDITIONAL_DATA` be included in the first downloadable template, or introduced after the core import flow is stable?

## Related documents

- `docs/REQUIREMENTS_INDEX.md` — document authority and shared vocabulary.
- `docs/specs/master-data.md` — approved Master Data page behavior and lifecycle rules.
- `docs/specs/cost-breakdown.md` — comparison and Cost Breakdown behavior.
- `docs/specs/cross-cutting-requirements.md` — cross-page financial/simulation capability requirements.
