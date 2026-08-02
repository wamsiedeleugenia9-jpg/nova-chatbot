# Creator Blueprint — Phase 3 implementation

## Scope

The Creator Blueprint flow covers Ateliers 1–7. Atelier 8 and Creator DNA are intentionally
outside this phase. Canonical workshop and question content lives in
`content/creator-blueprint.json`.

## Persistence and compatibility

The flow continues to use the approved production tables:

- `creator_blueprints` for overall status and `current_atelier`;
- `blueprint_sections` for each workshop summary, review status, and confirmation time;
- `blueprint_answers` for numbered raw answers.

Phase 2 answer rows remain readable. The additive migration is retained and no parallel response
table is introduced. Runtime status values are limited to `inceput`, `in_desfasurare`,
`confirmat`, and `de_revizuit`.

Pause/resume has no special timestamp. A load derives the current step from `current_atelier`,
saved numbered answers, and section state. It selects the first unanswered **question number**, so
sparse or legacy answer sets cannot cause a question to be skipped.

## Server invariants

- Every answer submission must identify the server-derived current atelier and question.
- Existing answers are never overwritten by a normal submission.
- Completing the last answer saves it before summary generation. If generation fails, the next
  load offers a summary-only retry and leaves all answers untouched.
- Confirmation requires a stored summary and writes `confirmed_at`.
- An adjustment regenerates only the current section summary, clears its confirmation, and marks
  the section `de_revizuit`.
- Confirming Atelier 7 marks the overall Blueprint `confirmat`; it does not create Atelier 8 or
  Creator DNA output.
