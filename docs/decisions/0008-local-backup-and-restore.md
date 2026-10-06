# ADR 0008 — Local backup and restore

## Decision

Continue the local-web roadmap with a single backup workspace at `/backup`. Keep the existing browser stores and domain behavior. Users export/restore each storage group separately: Writing/Reading/authoring/learning JSON, Listening JSON plus audio, and portable Speaking JSON with embedded audio. No remote requests are involved.

Browser-state restoration is additive under the existing demo Web Lock. Existing IDs and content versions win; backups do not overwrite newer work. Restore reviewed mistake state only when its imported attempt is new. Preferences from an existing local session remain unchanged; a fresh session restores backup preferences. Validate schema, identities, answer references, dates and Writing evidence before any write. Existing exports (versions 1 and 2) remain readable.

Speaking backups use a versioned envelope, bounded base64 audio and SHA-256 per recording. Validate the entire file before the IndexedDB transaction. New session IDs prevent old tabs from editing restored sessions; a fingerprint prevents repeated imports. Retention is chosen again with explicit consent. Keep original practice/completion timestamps and set a new expiry. In-flight restores hold the demo lock used by global deletion, then commit all data for a session in one transaction.

No cross-store atomic restore is promised. The workspace makes the boundaries explicit and restores one group at a time. Unsaved editor/recorder drafts, SQLite data and expired recordings are not included. Downloaded files are managed by the user and are not removed by browser retention cleanup.

## Verification

Round-trip submitted and unfinished work, reject malformed state/audio, preserve existing work, prevent duplicate/concurrent imports, handle storage failures and test desktop/mobile restore flows. Backend local persistence and AI remain later checkpoints.
