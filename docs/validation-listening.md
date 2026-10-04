# Phase 5 Listening demo validation

Later Phase 6 review also corrected continuously open 30-day expiry for Listening
using a shared bounded expiry check. The player closes at expiry even if IndexedDB
cleanup fails; the error remains visible for retry. This review's evidence is in
[Speaking follow-up validation](validation-speaking.md).

Validated on 2026-10-04 in `/workspace/MaKeng`, local branch `phase5-listening`, Node 24.19.0, pnpm 11.19.0, system Chromium `/usr/bin/chromium`. This was a cloud-machine review, not a review on the user's Windows PC. No branch was pushed and no Vercel deployment was created.

## Checks

- Frozen-lockfile installation succeeded; pnpm supply-chain checks stayed enabled. No dependency or lockfile changes.
- Production demo build, TypeScript, ESLint and Prettier checks passed.
- Vitest: **60 tests passed**, including **14 Listening tests**. Tests cover exact fixture SHA-256, transcript/evidence mapping, rejected timestamps/markup/overlap/duplicate cues, review and rights gates, partial-word rejection, audio limits, cancellation, revision conflicts, immutable/idempotent submission, blanks/word limits and expiration boundaries.
- Production browser demo: **34 distinct desktop/mobile scenarios verified**. The full run passed 32; two blocked-delete tests initially captured localStorage before Writing initialization. They were corrected to save a real Writing submission first, then both passed in a targeted rerun. An earlier global-delete test was corrected to inspect the stable second tab while the Writing tab navigates after deletion. No application assertions were removed.
- Local SQLite/worker regression: **10 tests passed** on desktop/mobile using a fresh temporary database, including ownership, origin, consent, revision and idempotency checks.

Browser scenarios exercise sample playback and end-of-cue pause, immediate submission after typing, JSON export, persistence/review, private file/manual VTT import, required rights and local review, no backend calls or upload POSTs, cross-tab stale writes, object URL revocation after deletion, retention cleanup, invalid storage without erasure, failed writes preserving the visible draft, global deletion clearing audio, and failed global deletion retaining a real Writing submission.

Inspected production screenshots of desktop/mobile submitted practice, empty library and private audio intake. Layout uses two columns for results/transcript on desktop and one on mobile. Before submission questions use the full width. Audio controls, speed/section buttons, completion fields, raw score, answer evidence and cue transcript are visible. The shared `.eyebrow` style hid preview labels; the Listening override restores them. A standalone production start on port 3000 returned 200 for `/listening` and the 653,164-byte audio fixture. Chromium review found no uncaught page errors or horizontal overflow at desktop 1280px/mobile 412px.

## Limits and remaining work

Only the original synthesized project sample is public. User Blobs and text stay in IndexedDB, separate from localStorage Writing/Reading. These are local browser copies, without additional encryption or authenticated cloud storage. No provider keys, STT requests, cloud upload or external IELTS recordings were used.

Fixture cue ranges come from synthesized PCM segment boundaries. They are not measured STT accuracy. Manual transcript review remains the user's responsibility. Real STT quality benchmarks, teacher approval, cloud consent/private buckets/signed URLs, auth/RLS and full IELTS test structure remain open Phase 5 production criteria. Listening does not affect the Reading progress dashboard.

Cleanup runs on Listening access/focus/active expiry, not while the browser is closed. Explicit delete removes audio, transcript and attempts together; downloads cannot be recalled. Global deletion spans two browser stores, so it cannot be one atomic transaction: IndexedDB clears first, then localStorage; a later localStorage failure may leave audio already deleted and is reported. Listening now has restore from a JSON/audio pair; Writing/Reading restoration remains unimplemented.

The environment draft saves `install_script` and `start_skill`; saving did not apply or publish the draft. Review/save/publish in Environment settings is separate from a Vercel deployment. Fresh-task restoration has not been independently verified.

## Continuation — Listening backup restore

Added a versioned JSON export and an explicit JSON/audio restore form; earlier bare lesson JSON remains supported. A new local copy receives fresh lesson/attempt IDs and a newly confirmed retention period, preserving content, original attempt dates, submitted scores and in-progress answers. Audio is bound by size/SHA-256 and validated decoded timestamps. Identical content/history snapshots are rejected atomically; no existing lesson is merged or overwritten. Restore holds the Listening Web Lock across validation and insertion so a subsequent global deletion also removes the in-flight restored copy.

Final continuation validation on 2026-10-04:

- Production build, TypeScript, ESLint and Prettier passed; no added dependency or lockfile change.
- **66 unit/integration tests passed**, including six backup boundary tests.
- **42 distinct production browser scenarios verified** on desktop/mobile. The final full run passed 41; the older cross-tab audio test read an asynchronously created URL without awaiting it and checked cleanup without waiting for the passive effect. After adding an explicit `blob:` source assertion and polling for revocation, both desktop/mobile variants passed in a targeted rerun. An earlier run exposed a file-label selector ambiguity after adding the restore form; using the exact original label fixed it. No grading, history or deletion assertion was dropped.
- Eight new restore browser scenarios cover export/delete/restore, original scores and resumed answers after reload, explicit consent, renamed audio/no MIME association, wrong audio bytes without lost inputs, concurrent duplicate attempts, malformed/oversized/unknown-version JSON, expired legacy backups, quota failure with no partial insertion, and global deletion queued while checksum validation is deliberately paused. All backend requests are blocked in these tests.
- Inspected `/tmp/makeng-restore-desktop.png` and `/tmp/makeng-restore-mobile.png`. The form provides labelled file inputs, title/history preview, retention, consent, inline errors and disabled/loading states; both viewport checks confirm no horizontal overflow.

API/worker code was unchanged in this continuation; the ten prior local API/worker scenarios were not repeated. Real STT/cloud storage and teacher benchmarks remain open. No GitHub push or Vercel deployment was performed. The existing saved environment setup/start instructions still apply; no new configuration was necessary.
