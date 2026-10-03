# ADR 0002 — Simple navigation and Reading local preview

The user requested simpler interactions and starting Phase 2 before the remaining cloud prerequisites. Keep the local session and SQLite adapter from ADR 0001. Add explicit Writing and Reading routes, short Vietnamese labels and primary actions close to the editor/questions.

Five original short Reading sets exercise MCQ, TFNG and completion. These are fictional practice scenarios, not official or calibrated IELTS passages. Their status is `preview`, with human review pending. The local preview catalog is explicitly separate from the published-content selector. Publication requires recorded human approval; this task does not manufacture that approval. A public beta must use only the published selector and reviewed content. Phase 2 runtime can be tested now; its human-reviewed-content exit criterion remains open.

Each attempt snapshots an immutable content version and its answer key server-side. Only a question projection is returned before submission. Submission computes a deterministic raw score and per-type mistake summary. A five-question practice is not converted to an IELTS band.

Draft saves use optimistic revisions. Concurrent tabs cannot silently overwrite each other. The browser additionally keeps unsynced answers for reload/offline recovery; server confirmation is distinguished from a device-only save. Submitting flushes edits then freezes the attempt. Repeated submission is idempotent. Session deletion cascades through Reading attempts.
