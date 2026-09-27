# Project Specific Rules — Cost Breakdown

## Requirements authority

Follow the current agreement set in agreements/, indexed by docs/REQUIREMENTS_INDEX.md. PROJECT.md and HANDOFF.md describe implementation state; they do not change product behavior.

## Data and calculation safeguards

- Protect factory, pricing, customer, and other proprietary data. Do not add real operational data or private source workbooks to version control.
- Use the existing Cost Engine and verified workbook logic. Do not invent factory formulas or silently replace missing required inputs with zero or another plausible value.
- Keep Reference and Current independent. Scenario changes must not mutate Current.
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
