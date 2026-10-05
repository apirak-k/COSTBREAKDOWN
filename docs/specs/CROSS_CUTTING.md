# Cross-Cutting Product Rules

**Status:** Canonical shared behavior. Rules not closed below are marked PENDING/TBD.

## Source authority

Follow [REQUIREMENTS_INDEX.md](../REQUIREMENTS_INDEX.md). A code behavior creates no requirement by itself. A changed behavior becomes a requirement only when there is a matching explicit user decision and an identifiable implementation commit; otherwise record the difference as a gap.

## Dataset state and save boundaries

Reference and Current each have an independent in-session Working state and one Last Saved state. Save and Reset affect only the viewed side. Export reads Last Saved; Import and Clear affect only Working; Clone copies the opposite Working state into the viewed Working state. State does not persist across application restarts. See [MASTER_DATA.md](MASTER_DATA.md) for the Master Data actions and workbook shape.

## Comparison identity and result integrity

- Compare by business identity, never row order: BOM Name, Work Center WC, and Routing Process.
- Keep comparison status and numeric Gap as separate concepts. Do not guess ambiguous matches or fabricate unavailable costs.
- Full Comparison is the default.
- Selected Comparison displays only the selected-scope Gap. Do not display the Full Gap alongside it while Selected mode is active.
- Selected scope applies to BOM and Routing. Keep all Work Centers as calculation context. CHANGED/UNCHANGED findings are selected as Reference/Current pairs; ADDED and REMOVED findings can be selected independently.
- Selected scope is temporary analysis state. It does not change source data, Save state, or exports. A change to Reference or Current clears the scope and returns to Full Comparison; cancellation does the same. When active, carry the selected scope through Cost Breakdown, Candidate, and RCA/Simulation.

The arithmetic/sign convention for Gap is **PENDING/TBD** in the canonical requirements pending confirmation against the original source conversation. The historical review context recorded `Current - Reference`; that historical statement alone does not close the decision.

## Standard Cost calculation

The workbook inspection view mirrors the in-app Standard Cost engine:

```text
Material = Usage × Price × (1 + Loss)
Routing Factor = Manning ÷ (Capacity × Yield)
Labor = Routing Factor × matching Work Center Labor rate
Burden = Routing Factor × matching Work Center Burden rate
Total Standard Cost = Material + Labor + Burden
```

Use unavailable/status output when required inputs are missing or invalid, Capacity or Yield is non-positive, or a Work Center match is missing or duplicated. Do not substitute zero or change the in-app engine as part of the workbook view. Zero is valid when it is an explicit input.

Selling Price and SG&A remain metadata inputs. GP/COGS/OP, margin, monetary SG&A, MatVAR/LBVAR/BDVAR, and business-dashboard formulas are **PENDING/TBD**; do not add them to the Standard Cost view.

## Warning behavior

Warnings normally inform and direct; they do not block navigation. Disable only operations that cannot be performed. Keep validation warnings separate from comparison statuses and retain unavailable results when calculation inputs are insufficient.

On Master Data, cell-level invalid cues remain while warning prose, row badges, and warning-count footers stay outside table rows. On Cost Breakdown, remove the redundant top calculation warning banner and collapse details behind the concise label `Review warnings (N)`.

## Shared status and downstream boundaries

The system may show workflow status and a relevant review action, including when Selected Comparison is active. Exact wording, placement, and behavior of status controls remain **PENDING/TBD** until page-level UX review.

ProductSession architecture, business metrics/formulas, exact dashboard composition, Candidate redesign, RCA/Simulation redesign, and Trial execution/approval remain **PENDING/TBD** unless a later explicit user decision closes them.

## Traceability

Selected-scope implementation history is in `872e02e` and `07ba640`; later comparison alignment is in `862fb60`. The formula-linked workbook view is in `5a08907`; warning-density behavior is in `bd967b5` and `2bf5ec5`. See [the 80-topic crosswalk](../../tasks/source-crosswalk-80.md) for evidence and verification status.
