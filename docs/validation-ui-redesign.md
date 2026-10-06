# Local interface redesign — 2026-10-04

Reviewed on Windows in `E:\MaKeng`, branch `phase6-speaking`. The redesign changes shared presentation, navigation, optional focus mode, Reading library numbering and Writing word-count progress. Domain, scoring, consent, storage and API contracts are unchanged.

## Design intent

- Warm neutral surfaces, green actions, restrained accents and consistent spacing establish a clear visual hierarchy.
- Each skill has a three-step guide and a short invitation to start. These are instructions, not a live completion tracker.
- Focus mode hides the guide and reduces the prominence of other navigation items while retaining access to navigation and storage information.
- Writing progress reflects actual words against the suggested 250-word target; reaching it does not measure writing quality or change submission requirements.
- Storage information uses a keyboard-operable disclosure. Existing consent and feature-specific limitations remain in the practice flow.

These choices are design hypotheses about reducing cognitive load and encouraging manageable practice. No improvement in motivation, concentration or learning outcomes has been measured.

## Verification

- Production build and TypeScript passed.
- ESLint and formatting checks for the changed interface passed.
- 72 existing unit/integration tests passed.
- 14 Chromium E2E scenarios passed across desktop and emulated Pixel 7: existing Writing/Reading/authoring workflows, storage errors and cross-tab conflicts, plus focus-mode draft preservation and viewport checks for all six routes.
- Screenshots of Writing, Reading, Listening, Speaking, authoring and progress inspected at both sizes. No horizontal overflow in the route checks. A logo alignment issue identified in screenshots was corrected with inline-flex.

The browser scenarios do not constitute an accessibility audit or a new real-microphone validation. Existing Listening/Speaking domain logic was not modified. Changes remain local for review.
