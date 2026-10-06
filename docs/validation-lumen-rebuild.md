# Reference-first lumen rebuild

Date: 2026-10-05

The user rejected inherited dashboard structure. Replaced the imported Learning
Hub / Quiet Workspace presentation layers, rewrote Home and the app shell,
reduced Practice to skill cards and the unavailable Mock Test slot, and gave
active practice a separate compact shell without the sidebar.

## Verification

Final production build (including TypeScript), ESLint, scoped Prettier checks
and 88 unit tests passed. The full desktop/Pixel 7 regression run completed
105/106 tests successfully; the remaining test skipped the Reading questions
tab before hydration. Replaced the immediate visibility check with a
viewport-appropriate, auto-waiting click. The final build, with the redundant
mobile Menu button removed, then passed all 42 tests in the affected UI,
Home, sources and backup groups, including the previously failing mobile test.
The complete 106-test suite was not rerun after that last presentation change.
Screenshots
cover Home light/dark, all library/tool routes and active practice on desktop
and Pixel 7. Tests also cover theme settings, draft resumption, microphone,
local audio lifecycle, backups, new custom audio controls, writing appearance
and saved notes / Reading previous-next navigation.

## Visual assets

Built-in imagegen produced two project-local decorative assets:

- `apps/web/public/images/lumen-mountains.png`: wide low-contrast icy-blue and
  lavender misty alpine range, off-white negative space on the left, peaks on
  the right, no text, logo or UI.
- `apps/web/public/images/lumen-library.png`: natural daylight editorial image
  of a historic pale-stone university library with slate roof and garden,
  square composition, no signage, people, text or logo.

Generated assets are decoration, not exercise source material. No learning
content, score or provenance is inferred from these pictures.

## Differences and boundaries

- The screenshot is a composite of multiple views, not source design assets.
  Exact 100% pixel matching is not verified or claimed.
- User activity, titles, questions, accuracy and audio duration remain real;
  no invented 12-day streak, 7/10 result or IELTS 6.5 band is substituted.
- Alex is the reference's display greeting, not a fetched identity/profile.
- Vocabulary, AI Tutor, Mock Test and Pro are explicitly unavailable; provider,
  vocabulary/SRS, mock-test timing and payment implementations are not part of
  this UI change.
- Writing formatting changes whole-draft display only and is not persisted;
  the stored essay remains plain text. Save draft uses the existing format.
- Highlight is session-only. Notes remain browser-local, excluded from backup,
  and use the existing per-session Reading key prefix for global deletion.
- No commit, push, deployment, provider call or dependency installation.
