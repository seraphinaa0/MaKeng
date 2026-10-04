# Phase 4 — validation

Verified on 2026-10-04 with Node 24, pnpm 11.19.0 and system Chromium.

- Phase 2–3 was rechecked before its GitHub push: 36 unit/integration tests, 10 local API/worker browser tests, 10 production-demo browser tests, typecheck, lint, formatting and build passed.
- Final Phase 4 unit/integration suite: **46 passed**, including 10 new learning-loop tests. Coverage includes incomplete/empty/future data, rolling date boundaries, six-attempt trend threshold, full histories beyond 20 rows, observational taxonomy, deterministic recommendations, dismissal/opt-out, separate repeated mistakes, immutable original scores and schema-v1 migration with data preservation.
- Final production-demo Playwright suite: **18 passed** (9 desktop + 9 mobile), including Phase 1–3 regression. New flows cover preference persistence and rollback on failed storage writes; recommendation dismissal/restore and navigation; Reading → progress → incorrect/correct retry → reload → reopen → original score; v1 upgrade and blocked storage without invented metrics.
- Browser demo tests reject application `/api/**` requests; no worker or AI credentials are used. Local API regression tests use separate temporary SQLite databases.
- Next production build including `/progress`, TypeScript, ESLint, Prettier and diff whitespace check passed. Desktop and mobile progress screenshots were inspected; browser tests assert no horizontal overflow.

Testing found that the controlled preference checkbox waited for persistence before visibly changing state. It now updates immediately while disabled during the write, then restores its old value on failure. Tests verify both persistence and rollback. An initial word-limit fixture was corrected to exceed the actual two-word limit; the assertion remains enforced.

Limits: no live Vercel deployment status has been verified here; browser-only data is not synced. No live AI, Writing criterion/band trend, cloud analytics, authenticated reviewer workflow or calibrated IELTS ability estimate is claimed. A reviewed mistake means the user answered it correctly during a retry, not that they mastered the skill. Old tabs must reload after a v2 data write.
