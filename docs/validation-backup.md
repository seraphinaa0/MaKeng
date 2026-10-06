# Local backup checkpoint — 2026-10-04

Validated on Windows in `E:\MaKeng`, branch `phase6-speaking`, Node 24.17.0. Changes remain local. See [ADR 0008](decisions/0008-local-backup-and-restore.md).

## Implementation

`/backup` gathers browser-state export/import, portable Speaking JSON with embedded audio and the existing Listening JSON/audio restore. Browser import validates Writing evidence and aggregate score, Reading answer references, timestamps, duplicate identities, content publication states and mistake-review keys. Additive restoration preserves existing records/preferences and does not switch storage mode.

Speaking validates the complete envelope and audio checksums before committing metadata/Blobs together. New IDs protect restored sessions from existing tabs; fingerprints prevent duplicate snapshot imports, including simultaneous tabs. The existing demo lock orders global deletion after any in-flight Speaking restore. Restored completion dates and original questions remain unchanged; consent and expiry are renewed.

Added `scripts/start-local.ps1` for Node 24 production/dev startup at the existing fixed loopback URL, using the installed Next.js executable without requiring a pnpm shell shim. Dependencies must already be installed; the launcher does not change package management.

## Verification

- TypeScript, ESLint, production build and formatting checks passed.
- 81 unit/integration tests passed, including 9 backup tests for unfinished/submitted Reading, reviewed mistakes, published content, mock Writing evidence, v1 migration, storage failure, additive import and audio round-trip/corruption.
- Full demo E2E: 80/80 desktop/mobile scenarios passed. New scenarios exercise Speaking playable audio/editing after restore, duplicate imports, simultaneous imports, global deletion during hashing, invalid-file preservation and Writing/Reading recovery. Existing consent, microphone lifecycle, retention, authoring, progress and Listening tests remain passing.
- Inspected backup workspace screenshots at desktop and emulated mobile sizes. Viewport checks include all seven routes.
- PowerShell launcher parsed successfully and started the production app at `http://127.0.0.1:3000`. Prettier now uses `endOfLine: auto` so Windows Git CRLF checkout and cloud LF files pass the same style checks without rewriting unrelated files.

## Limits

Each storage group restores separately; there is no cross-store atomic transaction. Audio checksum integrity does not prove provenance or speech quality. Speaking duration remains recorder metadata; old metadata-only exports cannot restore audio. Unsaved drafts, expired audio and SQLite are outside these exports. Downloaded files are unencrypted and managed by the user. These checks use Chromium and a simulated microphone; a real hardware microphone still needs user validation.
