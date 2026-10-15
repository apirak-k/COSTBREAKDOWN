# Simulation Specification

**Status:** FINALIZED — USER DECISION
**Scope:** Simulation lifecycle, parameter and economic calculations, Master Data transfer, matching, validation, graph, and page layout.

The visible product flow is:

```text
Master Data → Cost Breakdown → Simulation
```

Simulation is an isolated what-if workspace. It does not add an approval, Trial, Candidate, or RCA stage.

## 1. Workspace lifecycle

### 1.1 Automatic initialization

When Simulation opens without a valid workspace, initialize SIM from the current Current Working dataset and show the working interface immediately. There is no “Start SIM From” landing screen. State belongs to the active product; switching products cannot reuse another product’s SIM, and deleted products are pruned.

### 1.2 Clone from

The compact **Clone from ▾** menu has exactly three sources: Reference, Current, and Custom. Selecting one copies that dataset’s metadata, BOM, Routing, and structure into the isolated SIM snapshot. SIM Work Center rates are then replaced with Current Work Center rates. The selected source is starting content and provenance only: every analysis remains Current → SIM.

Changing Reference or Custom alone does not reset SIM. If Current changes, the saved SIM is stale because both the comparison baseline and rate context changed. Reconcile it, then initialize from the new Current when Simulation is active. Preserve valid Economic draft inputs where possible.

### 1.3 Send to

The compact **Send to ▾** menu has exactly three targets: Reference, Current, and Custom. Sending copies the complete SIM snapshot, including its Current-rate context and structure, into that target’s Working dataset. Reconcile sizing counts from the copied rate, BOM, and Routing rows. Record the change through the existing Master Data Working/history lifecycle; do not overwrite Last Saved.

- Sending to Reference or Custom leaves Current and the existing SIM baseline intact.
- Sending to Current changes the baseline; reconcile and recreate SIM from the new Current while preserving valid Economic inputs where possible.
- Reject a transfer if it would introduce invalid Master Data values or unresolved Work Center references.
- Do not create a fourth dataset or a promotion/approval lifecycle.

## 2. Parameter Simulation

SIM is temporary. Its structure is locked: no add, delete, resize, split, merge, rate editing, or structural reorder. Prepare structural alternatives in Master Data / Custom, then choose **Clone from Custom**.

### 2.1 Matching and status

Match by canonical business identity, never row position: BOM material identity, Work Center identity, and Routing process identity. Missing, duplicate, ambiguous, or unsafe identity is protected; do not guess or fabricate an attribution.

| Current → SIM status | Visible | Editable |
|---|---:|---:|
| `UNCHANGED` | Yes | Yes, when a SIM record exists |
| `CHANGED` | Yes | Yes |
| `ADDED` | Yes | Yes; the record exists in SIM |
| `REMOVED` | Yes | No; the record exists only in Current |
| Ambiguous / unmatched | Where applicable | No |

There is no **Factors to Simulate** selector. Edit supported fields directly in SIM.

### 2.2 Editable inputs and validation

UI controls and state/calculation boundaries both enforce the domains below. Reject invalid input and retain the previous committed valid value. Never silently clamp or turn invalid or missing input into zero.

| Input | Valid domain |
|---|---|
| BOM Price | finite, `>= 0` |
| BOM Usage / Consumption | finite, `>= 0` |
| BOM Loss | `0–100%` inclusive; stored as `0–1` |
| Routing Manning | finite, `>= 0` |
| Routing Capacity | finite, `> 0` |
| Routing Yield | greater than `0%` and at most `100%`; stored as `0–1` with zero excluded |
| Work Center Labor/Burden Rate | read-only in SIM; always from Current |

Blank/null may remain unavailable where the data model allows it. A missing required input makes its result unavailable; it is not a structural zero. ADDED/REMOVED comparison sides may use zero only because one side is structurally absent.

### 2.3 Shared Standard Cost and result

Use the shared Standard Cost calculation:

```text
Material Cost = Usage × Price × (1 + Loss)
Direct Material = Σ Material Cost
Routing Factor = Manning / (Capacity × Yield)
Labor = Routing Factor × Current Labor Rate
Burden = Routing Factor × Current Burden Rate
Conversion = Labor + Burden
Standard Cost = Direct Material + Labor + Burden
```

Missing or invalid required values make the corresponding result unavailable. Do not substitute zero. Negative analytical differences are valid.

The Result panel is engineering cost only and uses `Cost | Current | SIM | Change | %` with rows Material Cost, Labor Cost, Burden Cost, Conversion Cost, and Standard Cost:

```text
Change = SIM − Current
% = (Change / Current) × 100
```

Show `—` when Current is unavailable or zero for the percentage. Never show Infinity, -Infinity, or NaN. Economic metrics stay outside Result.

## 3. Parameter Cost Effect

Each BOM and Routing row can expand a compact **Parameter Cost Effect** detail. Use the existing multiplicative attribution helper and show absolute THB/pc effects only.

- BOM attributes Material Cost change to Price, Usage, and Loss.
- Routing attributes Conversion Cost change to Manning, Capacity, and Yield.
- Routing uses Current Work Center rates on both sides; there is no Rate Effect.
- Effects must reconcile to `SIM row cost − Current row cost` within floating-point tolerance.
- Per-parameter percentages are not displayed. Only the Total may show `100%`, only when attribution is available and non-zero. A zero total or unavailable attribution shows `—` for the percentage.
- Added/Removed rows, ambiguous identity, missing required values, invalid math, or unreconciled Work Center context have unavailable attribution (`—`) with a concise explanation.

## 4. Economic Simulation

Economic assumptions form a separate dimension and never change MAT, Labor, Burden, Conversion, or Standard Cost. They are advisory and never an approval gate.

Inputs:

1. Fixed Action Cost (THB), finite and `>= 0`.
2. Variable Action Cost / pc (THB/pc), finite and `>= 0`.
3. Batch Size (pcs), a positive integer.
4. Selling Price override, finite and `>= 0`; blank uses Current Selling Price.
5. SG&A override, `0–100%` inclusive; blank uses Current SG&A.

```text
Fixed Cost / pc = Fixed Action Cost / Batch Size
Required Saving / pc = Fixed Cost / pc + Variable Action Cost / pc
Parameter Saving / pc = Current Standard Cost − SIM Standard Cost
Economic Margin / pc = Parameter Saving / pc − Required Saving / pc
SG&A / pc = Selling Price × (SG&A % / 100)
OP / pc = Selling Price − SIM Standard Cost − SG&A / pc
```

Negative Economic Margin and negative Operating Profit are valid outputs and remain visible. Zero Batch Size, negative/non-finite inputs, and SG&A above 100% are rejected/unavailable; they are never converted to zero.

## 5. Graph story

The story order and signs are fixed:

```text
REF → GAP 1 → CUR → GAP 2 → SIM
GAP 1 = Current − Reference
GAP 2 = SIM − Current
Result Change = SIM − Current
Parameter Saving = Current − SIM
```

REF, CUR, and SIM may show MAT, LB, BD, SG&A, and OP. Standard Cost remains MAT + LB + BD; SG&A and OP are separate business values. Selling Price is a separate line/marker. GAP 1 and GAP 2 contain only signed MAT, LB, and BD effects, with the Standard Cost gap labelled clearly. Positive values extend above zero; negative values extend below zero. The graph supports negative OP.

The draggable THB/pc ruler is visual only. It cannot change data, draft inputs, or calculations. Keep keyboard access and allow subtle snapping to zero, Standard Cost, or Selling Price levels.

## 6. Page layout and navigation

- Remove the large Simulation PageHeading/title block; begin with working content.
- Desktop: wider graph at upper left; Result and Economic stacked at upper right; BOM and RTG tables below in two columns.
- Keep exactly two separate compact controls, **Clone from ▾** and **Send to ▾**, in the Result action line. Keep transfer feedback compact and menus keyboard accessible.
- BOM and RTG must not have horizontal scrollbars. Keep vertical internal scrolling and usable sticky table headers. Use fixed/proportional columns and a responsive reflow/card presentation at narrow widths while preserving every editable field.
- The page must not have horizontal overflow. Stack the major panels on narrow screens.
- The visible product navigation contains only Master Data, Cost Breakdown, and Simulation. No RCA context strip or visible Candidate/RCA-to-Simulation handoff appears.

Legacy RCA case/session migration may remain for old saved data. It is compatibility only and does not create an active RCA Simulation workflow.

## 7. Worked examples

### No change

Current SC `100`, SIM SC `100`: GAP 2 `0`, Parameter Saving `0`, Result Change `0`, Result `%` `0%`.

### BOM Price

Current `Usage=2`, `Price=10`, `Loss=5%`: Material Cost `21.00`. SIM Price `12`: Material Cost `25.20`, Change `+4.20`. Attribution: Price `+4.20`, Usage `0.00`, Loss `0.00`, Total `+4.20`.

### Routing Manning

Current Manning `1`, Capacity `100`, Yield `100%`, Labor Rate `100`, Burden Rate `50`: Factor `0.01`, Labor `1.00`, Burden `0.50`, Conversion `1.50`. SIM Manning `0.8`: Labor `0.80`, Burden `0.40`, Conversion `1.20`; parameter effects reconcile to `-0.30`.

### Economic margin

Current SC `100`, SIM SC `90`, Fixed Action Cost `1000`, Variable Action Cost / pc `1`, Batch Size `100`: Fixed Cost / pc `10`, Required Saving / pc `11`, Parameter Saving / pc `10`, Economic Margin / pc `-1`.

### Operating Profit

Selling Price `120`, SIM SC `90`, SG&A `10%`: SG&A / pc `12`, OP / pc `18`. With Selling Price `80`, SIM SC `90`, SG&A `10%`: SG&A / pc `8`, OP / pc `-18`.

### Input rejection

Reject Loss `-1%` or `101%`; Yield `0%` or `101%`; SG&A `-5%` or `101%`; negative Price, Usage, Manning, Fixed Action Cost, Variable Action Cost / pc, or Selling Price; Capacity `0` or negative; Batch Size `0`, negative, or fractional; and non-finite values. Do not coerce any of these to zero.

### Custom structure

Current Routing `[Cut, Form]`, Custom Routing `[Cut, Form, Polish]`, then Clone from Custom: Cut/Form match by identity; Polish is ADDED and editable; Current Work Center rates still apply. If Custom omits Form, Form remains visible as REMOVED and is not editable.
