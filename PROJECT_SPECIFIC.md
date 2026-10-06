# Project Specific Rules — Cost Breakdown

## Requirements authority

Follow `docs/REQUIREMENTS_INDEX.md` and read `docs/specs/FINAL_LOGIC_SPEC.md` first for finalized product logic. Final Logic supersedes older sources only where their product logic conflicts; compatible finalized decisions, including UX/UI and interaction behavior, remain valid, and omission from Final Logic does not erase them. Commits can support chronology but do not prove intent; code is implementation evidence only. `tasks/source-crosswalk-80.md` is traceability/status, not a requirements source. `PROJECT.md`, `tasks/`, and `HANDOFF.md` are operational context and do not change product behavior.

## Data and calculation safeguards

- Protect factory, pricing, customer, and other proprietary data. Do not add real operational data or private source workbooks to version control.
- Follow `docs/specs/CROSS_CUTTING.md` for calculation and workbook behavior. Use code and checked-in workbooks as evidence only; do not invent formulas or silently replace missing inputs with zero or another plausible value.
- Keep Reference and Current independent. Follow `docs/specs/FINAL_LOGIC_SPEC.md` for Simulation logic and `docs/specs/RCA_SIMULATION.md` for compatible page detail; leave only genuinely pending items open.
- Keep system-generated UI text in English. Human-entered notes may use the user's language.
- Treat validation warnings separately from comparison statuses.

## Engineering safeguards

- Prefer the smallest change that satisfies the current agreement.
- Reuse installed dependencies and established project patterns.
- Put feature-specific pages, components, and hooks under the owning `src/features/<feature>/` folder.
- Keep domain calculations and types in `src/core/`, application state in `src/state/`, and Excel or storage integrations in `src/services/`.
- Put UI in `src/shared/` only when active features share it. Do not recreate parallel top-level `src/pages/`, `src/components/`, or `src/lib/` trees.
- Check the active import path before changing or removing a module.
- Design for change locality: keep feature-specific behavior beside its feature; when behavior is genuinely shared, keep one canonical implementation and have consumers import it instead of copying it.
- Share based on common behavior and meaning, not visual resemblance alone. Use explicit variants for supported differences; keep separate modules when forcing reuse would couple different workflows or make the interface confusing.
- If an intentional copy or local exception is necessary, add a nearby note explaining why reuse does not fit and what must be kept in sync.
- Before changing a shared module, inspect its callers and verify the affected feature flows. Keep its interface clear and small so implementation changes stay localized.
- Never push to a remote without explicit user authorization.
