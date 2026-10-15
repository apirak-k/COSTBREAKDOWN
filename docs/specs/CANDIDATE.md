# Candidate and RCA Domain Compatibility

**Status:** This is a legacy domain/session compatibility reference, not the current visible UX specification. The standalone Candidate/Ranking and RCA product stages have been retired. Current Candidate/finding inspection and selection remain inside Cost Breakdown; the visible flow is Master Data → Cost Breakdown → Simulation. Use [`COST_BREAKDOWN.md`](COST_BREAKDOWN.md) for the current finding-table UX and [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md) for business logic.

The historical RCA rules below are retained only where needed to interpret existing domain or session data. They do not authorize a Candidate page, Ranking page, RCA workspace, Root Cause / Why? or Action fields in CBD, or a new CBD-to-Simulation handoff.

## Candidate Source and Scope

Candidates derive directly from [Cost Breakdown findings](COST_BREAKDOWN.md):
- **Full Comparison:** Candidate pool includes all eligible changed, added, or removed records.
- **Selected Comparison:** If Selected Comparison is active in CBD, the Candidate pool is constrained to that selected subset.
- Selected Comparison remains an analysis scope, **not** an RCA Case.
- When Candidates enter an RCA Case, the engineer may analyze them without being forced into Simulation.

## Material and Processing Candidates

### Material Candidates (BOM)
- A material Candidate corresponds to a BOM record.
- The material record's calculated Reference cost, Current cost, and $\text{Gap} = \text{Current} - \text{Reference}$ provide its monetary value.
- Changed inputs (Price, Usage, Loss) are displayed as Reference → Current explanatory details. Zero-gap `CHANGED` findings remain visible.
- **No fabricated per-factor THB attribution:** There is no agreed accounting method to allocate a material record's Gap into separate THB amounts for Price, Usage, or Loss. Do not invent per-input monetary values or repeat the full record Gap across individual factors.
- **Provisional Presentation Boundary (P-001):** How those changed factor details are visually and group-wise represented as one monetary Candidate (e.g. rendering one record-level monetary candidate with nested factor details underneath) is still governed by [P-001 in `PROVISIONAL_IMPLEMENTATION_DECISIONS.md`](../PROVISIONAL_IMPLEMENTATION_DECISIONS.md#p-001--one-record-level-material-monetary-candidate-with-visible-factor-details) (`PROVISIONAL — AI CHOICE`), not an unchangeable user-finalized grouping requirement.

### Processing Candidates (Process / Routing)
- The processing Candidate is strictly the **Process / Routing** record.
- Work Center is the rate owner and calculation context, never a Candidate.
- Each Process is one Candidate; do not split one Process into separate Labor and Burden Candidates.
- **Work Center Rate Dependency:** When a Work Center rate change causes a Process's calculated processing cost to change, that Process is classified as `CHANGED` even if its own Manning, Capacity, Yield, and WC assignment are unchanged. The Work Center rate change is shown as explanatory context.

## Candidate Status, Gap, and Controllability

Only three candidate statuses exist:
- `CHANGED`: Record exists on both sides and its relevant value/cost differs.
- `ADDED`: Record exists only in Current (absent Reference contribution is zero).
- `REMOVED`: Record exists only in Reference (absent Current contribution is zero).

`UNCHANGED` records do not become Candidates.

$$\text{Gap} = \text{Current Cost} - \text{Reference Cost}$$

- **Controllable:** Every Candidate starts marked `true` by default. This is a human engineer judgment. Unchecking Controllable does not delete, hide, or remove the candidate from analysis.
- **Filtering:** Filtering is by status only. `All` selects `CHANGED`, `ADDED`, and `REMOVED` and is the default. Any status filter may be toggled independently. Do not add material/processing, controllability, cost-direction, requirement-fit, or feasibility filters without a later explicit decision.
- **Ranking:** The default ranking sorts Gap descending (highest to lowest: positive → zero → negative). Keep positive, zero, and negative Gap candidates visible in that sorted order. Zero-gap `CHANGED` candidates must remain visible in their sorted place. Do not infer that `ADDED` is necessarily an adverse cost increase or that `REMOVED` is necessarily a favorable cost decrease. A zero-gap candidate may be an operational change without cost impact. Ranking is an **advisory aid only**; the system must never auto-select rank #1 or require top-rank selection.

---

## RCA Case Logic: 1 or Many Candidates

An **RCA Case** represents a focused engineering investigation.

### One RCA Case Supports 1 or Multiple Candidates
An RCA Case may contain:
- **1 Candidate**, or
- **Multiple Candidates**.

*Engineering Rationale:* In manufacturing engineering, a single structural modification frequently produces multiple comparison findings. For instance, replacing an obsolete inspection station with two automated stations creates one REMOVED finding and two ADDED findings. These findings represent one cohesive event and belong in **one RCA Case**.

### Multi-Candidate Example
```text
Reference:
  Process QA1

Current:
  Process QA1.1
  Process QA1.2

CBD Findings:
  QA1   → REMOVED
  QA1.1 → ADDED
  QA1.2 → ADDED

RCA Case:
  Selected Candidates: [QA1, QA1.1, QA1.2]
  Root Cause / Why?: Rebalancing quality line into sequential optical and mechanical checks.
  Action: Fine-tune optical camera throughput to balance cycle times.
```

## Root Cause / Why? and Action

- **Root Cause / Why?:** Explains the physical, operational, or commercial reason for the observed cost gap.
- **Action:** Describes the proposed or executed engineering countermeasure.
- Both fields are captured at the **RCA Case level**.
- Do not require duplicate Root Cause / Action fields for each individual candidate in the case.
- **No new RCA Note system:** Do not create duplicate RCA Note, Candidate Note, or Bulk Note features. Existing Master Data annotations (`Note` and `META.Dataset Remark`) remain separate.

## Legacy RCA Completion Boundary

RCA is complete when the engineer records:
$$\text{Candidate(s)} + \text{Root Cause / Why?} + \text{Action}$$

- **Simulation is optional:** The engineer may complete RCA and end the workflow without running a Simulation.
- **Trial execution is not mandatory:** The RCA Case does not require a formal Trial or approval workflow to be closed.

## Retired RCA-to-Simulation Workflow (historical compatibility only)

Older saved sessions or task records may describe an RCA-to-Simulation handoff. That workflow is retired and does not define current navigation or Simulation behavior:
- There is no visible RCA page, active RCA handoff, Candidate context strip, or Factors to Simulate selector.
- Current visible flow is Master Data → Cost Breakdown → Simulation.
- Simulation initializes from Current when needed; Clone from Reference/Current/Custom is an explicit starting-snapshot choice, and analysis always remains Current → SIM.
- Legacy RCA domain/session records may remain only where migration requires them.

## Traceability

The Candidate foundation derives from [`agreements/CANDIDATE_PRIORITIZATION_SPEC.md`](../../agreements/CANDIDATE_PRIORITIZATION_SPEC.md). Retained multi-candidate RCA session semantics and the current page flow/Simulation contract are distinguished in [`FINAL_LOGIC_SPEC.md`](FINAL_LOGIC_SPEC.md).
