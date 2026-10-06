# Quiet workspace UI — local verification

Date: 2026-10-05

## Scope

- Rounded lavender desktop frame and violet shared action palette.
- Light/dark/system themes, with the existing local preference persistence.
- Home: code-native mountain silhouette, functional skill launcher, compact
  shortcuts, saved-work resumption and data-backed next action.
- Sidebar grouping and responsive mobile navigation, including source and
  backup pages. No additional remote font or image dependency.
- Reading radio-choice surfaces, Writing prompt/editor panels, Listening
  question surfaces, and an opt-in circular Speaking microphone action.
- Speaking question displayed before voice settings. Recording, hiding, local
  speech, consent and storage behavior are unchanged.
- Focus mode hides the sidebar and widens desktop practice. Menu and Escape
  keep navigation available without resetting a draft.

## Checks

TypeScript, ESLint, 88 unit tests and production build passed. Scoped formatting
passed. The final browser regression suite passed all 102 tests across desktop
and mobile (5.7 minutes), using the production build on port 3400. The local
preview was restarted on port 3000 with the final build.

Browser checks cover desktop and Pixel 7 layouts, all ten routes, light/dark
Home screenshots, active Reading/Listening/Speaking/Writing screenshots and a
focused Speaking screenshot. The launcher rejects ambiguous input and routes
Vietnamese input to the selected library. Existing tests cover local draft
resumption, recording lifecycle, storage failures and backup/restore.

## Boundaries

The visual reference is a design direction, not evidence of implemented AI
tutoring, vocabulary lookup, official bands, mock-test timers, paid plans or
streaks. The launcher opens an existing skill library; it does not search for
topics or generate a lesson. Listening still uses the accessible native audio
player. No commit, push or deployment was performed.
