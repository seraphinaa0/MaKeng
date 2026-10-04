# Phase 2 regression and Phase 3 browser demo validation

Validated on 2026-10-03 with Node 24, pnpm 11.19.0 and system Chromium.

- 36 unit/integration tests passed (27 existing Writing/Reading; 9 authoring/demo tests).
- 10 local API/worker Playwright tests passed on desktop and mobile: original Phase 1/2 regression suite, including isolation, revisions, offline draft recovery, three-type scoring, evidence and history.
- 10 browser-demo Playwright tests passed on desktop and mobile against a production Next build, with no worker and with browser `/api/**` requests configured to fail the test.
- Demo coverage: Writing mock persistence/delete; Reading save/reload/score/evidence/history; stale writes across two real tabs; quota failure without endless loading; original source intake, three-type mock generation, invalid evidence gate, editing, explicit approval/publication, JSON export and practice of the published content.
- Unit coverage adds rejected-to-review transitions, consent and provenance, regeneration limit, approval invalidation on edits, immutable published revisions/attempt snapshots, no draft leakage into catalog, idempotency, storage corruption preservation and failed-write preservation.
- Production build includes `/`, `/reading`, `/create`; API session returned `503 DEMO_ONLY` without opening the database in demo mode.
- TypeScript, ESLint and formatting checks passed. Desktop/mobile screenshots inspected; authoring flow asserts no horizontal overflow.

The first demo E2E run found test locator issues: an implicit textarea label included its initial text, and Next's route announcer supplied a second alert role. Tests now use textbox accessible names and scope the error alert to main; final rerun passed. Assertions were retained.

The original deployment screenshot demonstrated an API failure and endless loading, not a fully working Phase 2 deployment. Code inspection established the incompatible SQLite/worker dependency; remote Vercel runtime logs were not available. The new demo removes that dependency instead of assuming serverless local persistence works.

Not verified: deployment of this change to public Vercel, Safari/Firefox, complete WCAG audit, real AI quality, cloud database/auth/RLS, durable generation jobs, teacher-calibrated content. Published browser content is self-reviewed demo content, not shared production publication. Browser data is not encrypted/backed up, and JSON export does not yet have an import UI. The local server mode retains the Phase 1/2 workflow only.
