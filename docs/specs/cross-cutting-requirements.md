# Cross-Cutting Requirements

## Financial Metrics and Extensible Simulation

## Status

- Requirement status: **Confirmed — must be supported by the web application**
- Placement status: **Pending — likely centered in Simulation; exact page boundaries are not fixed yet**
- Reviewed: 2026-09-22
- Requirements alignment update: 2026-09-23
- This document records a system capability. The later page specifications define the final UI, formulas, and implementation details.

## 1. Mandatory Financial Capability

The web application must support financial inputs and outputs that include, at minimum:

- `Sale` / sales value
- `COGS` / Cost of Goods Sold
- `Gross Profit`
- `SG&A`
- `OP` / Operating Profit
- `Profit`

These items must be treated as first-class business data or calculated results. They must not be omitted merely because the current page or current data model does not yet expose them.

The exact formula, unit, and source for each item will be defined during the relevant page and domain review. The requirement to support the capability is already confirmed.

## 2. Extensible Variables

The system must support additional variables beyond the initial financial list.

- The variable list must not be permanently hard-coded to only the initial metrics.
- A user or authorized configuration flow must be able to add supported variables as the model grows.
- Each additional variable must be identifiable by a stable key and user-facing label.
- A variable must be able to declare its value type and unit, such as amount, rate, percentage, quantity, or text where appropriate.
- Variables that participate in calculations must have an explicit dependency or formula definition.
- An unknown or unmapped variable must not be silently discarded.

The initial list is a supported starting set, not a permanently fixed variable list. New variables must enter through the same typed, sourced, dependency-aware model.

## 3. Simulation Requirement

Simulation is the primary candidate area for flexible adjustment of these values.

Simulation must allow the user to:

- Adjust existing financial inputs and assumptions.
- Add or configure additional supported variables.
- Override values for a scenario without changing the source Product, Reference, Current, Active, or Master Data dataset.
- Recalculate dependent results when an input or add-on variable changes.
- See which values are source values, calculated values, or simulation overrides.
- Compare or review scenarios without silently overwriting the official dataset.

“ปรับได้เต็มที่” means the simulation model must be extensible and scenario-based, not that the user can bypass validation or change the underlying source data invisibly.

## 4. Data Integrity Rules

- Simulation changes are isolated to the scenario being edited.
- Source values remain available for audit and comparison.
- Calculated values must identify their inputs or formula basis.
- Missing or invalid required inputs must be visible; the system must not hide them behind invented defaults.
- Adding a new variable must not break existing variables or silently change their meaning.

## 5. Acceptance Criteria

- [ ] The web application has a supported path for Sale, COGS, Gross Profit, SG&A, OP, and Profit.
- [ ] The initial metrics are not the permanent limit of the data model.
- [ ] Additional variables can be represented without changing the core model for every new variable.
- [ ] Simulation can override supported inputs without mutating Master Data, Reference, Current, or Active data.
- [ ] Simulation recalculates dependent outputs after an adjustment.
- [ ] The interface distinguishes source, calculated, and scenario-overridden values.
- [ ] Missing, invalid, or unmapped values remain visible and reviewable.
- [ ] The final placement and interaction model are documented in the Simulation specification.

## 6. Decisions Deferred Until Page Review

These are design questions, not reasons to remove the requirement:

- Whether `Sale` is stored as an input, calculated from another input, or both.
- The exact definitions and formulas for COGS, Gross Profit, SG&A, OP, and Profit.
- Whether values are per unit, per Product, per period, or total scenario values.
- Which variables belong in Master Data as source assumptions versus Simulation as scenario overrides.
- Whether users can author formulas directly or select from controlled formula templates.
- The final page placement and visual layout.

The placement of these capabilities must not be interpreted as permission to add financial-period or simulation-only columns to the Master Data Excel contract without a separate approved decision.

## Related Documents

- `docs/REQUIREMENTS_INDEX.md` — document authority and shared terminology.
- `docs/specs/master-data.md` — confirmed requirements for Product and dataset preparation.
- Future `docs/specs/simulation.md` — detailed UI and behavior specification for this requirement.
- Future `docs/specs/cost-breakdown.md` — downstream display and calculation behavior where applicable.
