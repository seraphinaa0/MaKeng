# Phase 6 Speaking demo validation

Validated on 2026-10-04 in `/workspace/MaKeng`, local branch `phase6-speaking`,
Node 24.19.0 / pnpm 11.19.0 / system Chromium. Existing uncommitted Phase 5 work
was preserved. No commit, GitHub push, pull request or Vercel deployment was made.
This is a cloud-machine review, not access to the user's Windows PC.

## Completed checks

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`: passed.
- `pnpm test`: **72 tests passed**, including **6 Speaking domain tests** for
  consent, versioned original questions, retention, revision conflicts, foreign
  questions, expired writes, completed-text immutability, privacy deletion,
  recording/transcript limits and rejection of invented score fields.
- `pnpm build`: passed, including the static `/speaking` route in browser-demo mode.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e:demo`:
  **56 tests passed in one final full run** (28 desktop, 28 mobile), including
  **14 Speaking cases** and all 42 existing Writing/Reading/authoring/progress/
  Listening/Listening-restore regression cases.
- `git diff --check`: passed. Generated results/screenshots remain outside tracked source.

Speaking browser tests use real Chromium MediaRecorder with a fake microphone
device; no real learner voice or cloud AI is used. They verify no microphone
before consent/action, capture/stop/playback, RAM-only audio before Save,
save/reload of audio/transcript/review, Part 2 preparation and Part 3 navigation,
export downloads, completion with explicit missing-response confirmation,
immutable completed text and audio deletion with revoked object URLs.

Failure/privacy tests cover denied microphone permission and retry, late
permission grants after leaving a session (tracks stopped), cancelled draft
navigation, automatic recording stop (virtual clock tests the timer, not decoded
speech duration), full storage with preserved drafts/retry, real IndexedDB CAS
between tabs without notifications, corrupt records preserved without fake empty
state, expiration cleanup, blocked IndexedDB, cross-tab deletion during capture,
and global demo deletion. Unexpected API calls and uncaught browser errors fail
the Speaking tests. A browser-test init hook was corrected to account for the
initial insecure `about:blank` page; production saves also had a metadata/Blob
boundary bug that was fixed and exercised in the passing save/reload cases.

## UI review

Inspected production screenshots at desktop 1280px and emulated Pixel 7 width
393px: `/tmp/makeng-phase6-desktop.png` and `/tmp/makeng-phase6-mobile.png`.
Question/audio and transcript/review form use two columns on desktop and stack
on mobile. Navigation wraps, controls and labels remain visible, and browser
assertions found no horizontal overflow. Own-tab saves no longer display an
unnecessary cross-tab-change notice or refresh the audio player on every focus.

## Remaining production criteria

This completes the local Speaking **demo slice**, not the production Phase 6 exit.
STT, provider feedback, human-reviewed benchmarks, a full examiner session,
authentication, cloud audio storage/deletion, JSON restore and progress-dashboard
integration are not implemented. No real microphone hardware, Safari or Firefox
was tested. The optional SQLite/API worker suite was unchanged and was not rerun
for Phase 6; the full browser-demo regression suite was run.

Checklist values are self-review, not assessed ability. Recorded duration is
wall-time metadata rather than decoded speech measurement. Retention cleanup
runs on access/focus/active expiry, not after the browser closes. Audio is private
to the browser origin but not separately encrypted; downloaded files cannot be
recalled. Global deletion spans Listening IndexedDB, Speaking IndexedDB and
localStorage, so a later failure can leave a partial deletion, reported for retry.
See [ADR 0006](decisions/0006-speaking-demo.md) and
[evaluation protocol](speaking-evaluation.md).

## Follow-up review — recording, expiry and playback

The review reproduced four failing behaviors on the prior production bundle:
manual-stop duration included a delayed encoder callback; Speaking and Listening
30-day timers stopped checking after their capped first timeout; creating another
Speaking session replaced the unchanged current session's Blob URL.

Fixes capture the manual/visibility stop timestamp before encoder completion,
share bounded re-armed expiry checks, and retain unchanged Speaking snapshots
across library refreshes. Expiry closes the active editor/recorder/player before
storage cleanup; blocked cleanup reports an error and retry instead of exposing
an expired session for continued capture. Stored data cannot be claimed deleted
when IndexedDB access fails. Sessions with corrupt data remain preserved.

Added five browser regression scenarios on both desktop/mobile: delayed encoder
completion, continuously open Speaking 30-day retention, the same Listening
retention boundary, microphone release when expiry cleanup fails, and another
session changing while the current audio/text draft remains stable. The clock
tests simulate long retention, not real 30-day uptime. The delayed encoder test
still uses native MediaRecorder; only callback delivery is delayed.

All **10 targeted regression cases passed**. The next native/mobile milestone
remains gated by identity/cloud API work and pilot evidence, documented in
[Phase 7 readiness](phase7-readiness.md). No Expo app or native login is claimed.

Final verification after fixes: lint, format, typecheck, build and **72 unit tests
passed**; the full demo suite finished with **66/66 passed** (33 desktop, 33 mobile).
The earlier full run had 65 passed and one timeout tearing down the mobile browser
context after all deletion assertions and the secondary-page close had passed.
That case passed in isolation with tracing, then passed in the final full run.
No application failure was reproduced for that timeout; its root cause remains
unconfirmed. No assertions were removed and no timeout was increased.

Reviewed the current production desktop/mobile screenshots again. Existing
layout, labels and audio controls remain intact. All changes are still local on
`phase6-speaking`, preserving the earlier Phase 5 changes; no push/deployment.
