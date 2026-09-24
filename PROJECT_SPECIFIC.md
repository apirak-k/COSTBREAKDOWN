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
- Check the active runtime path before changing code in src/core/ or the legacy-looking src/lib/.
- Never push to a remote without explicit user authorization.
