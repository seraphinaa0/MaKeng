# ADR 0006 — Speaking experiment on the device

Phase 6 extends the original Writing/Reading beta with an independent Speaking
experiment, explicitly requested by the user. It is not a full IELTS examiner.
Original, versioned preview questions cover Part 1, a Part 2 cue card (60 seconds
preparation, up to 120 seconds recording), and Part 3. This is the same documented
original-content preview exception as Listening; no third-party exam data is used.

Microphone access is requested only on an explicit recording action after local
storage consent. No speech recognition service, AI provider or upload is used.
Manual transcripts and guided self-review are not band scores. Accent is not
graded. A future provider needs its own consent, evidence and evaluation contract.

Audio starts in memory and is committed with transcript/review only on Save.
Leaving the tab stops capture; leaving the component discards unsaved audio and
stops even a late permission grant. Saved audio and metadata share one IndexedDB
record/transaction. Revision checks reject stale writes and missing/expired
sessions cannot be recreated by saving. Cross-tab notifications invalidate editors.
Finished text/review is immutable; audio deletion remains allowed for privacy.

IndexedDB v1 `makeng-speaking-v1` is separate from Listening and localStorage.
Retention is 1/7/30 days (default 7), cleaned on access/focus and at expiry while
open, not in the background while the browser is closed. Limits: 20 sessions,
100 MiB total audio, 20 MiB and 180 seconds per response (120 for Part 2).
Recorded duration is elapsed wall time, not a verified decoded speech duration.
Manual/visibility stop captures its timestamp before stopping the recorder;
waiting for encoder finalization does not increase the recorded duration.
Listening and Speaking share bounded, re-armed expiry checks so a continuously
open 30-day session is not stranded after the browser's maximum timer delay.
Expiry closes active capture/playback before attempting storage cleanup. If
cleanup is blocked, the library shows an error/retry instead of allowing the
expired editor to remain active; deletion is not falsely reported as complete.
Reloads reuse unchanged Speaking session snapshots; another session changing
does not replace the current audio URL or interrupt local text drafts.
JSON export includes metadata, manually entered transcript and review; audio is
downloaded separately. Import/restore and cloud synchronization are deferred.

Global demo deletion clears both audio stores before localStorage. Transactions
are atomic per store, not across the three stores: a later failure may leave a
partial deletion. Show the error and allow retry; do not claim a distributed
atomic delete. Browser/site data clearing remains the independent privacy escape.

Acceptance: permission denial/retry, no microphone before consent, real browser
record/stop/playback/save/reload, Part navigation/preparation, immutable completion,
stale-write rejection, expiration/deletion without audio resurrection, responsive
desktop/mobile review, and regressions for the existing demo. Review locally in
the cloud workspace before any GitHub push or Vercel deployment.
