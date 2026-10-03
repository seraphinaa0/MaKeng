# Phase 2 local preview — validation

Validated with Node 24.19.0, pnpm 11.19.0 and installed Chromium. This includes regression checks for the simplified Writing interface.

| Check | Result |
| --- | --- |
| Unit/integration | 27 passed: 15 Writing, 12 Reading |
| Playwright desktop/mobile | 10 passed: 4 Writing, 6 Reading |
| TypeScript, ESLint, Prettier | Passed |
| Next.js production build | Passed, including `/reading` |
| Production visual smoke | Writing, Reading library and player opened without browser page errors |
| Mobile layout | No horizontal overflow at 390px |

Reading tests cover all five content schemas and evidence spans; MCQ/TFNG/completion scoring; missing answers and word limits; exclusion of preview sets from published selection; no answer key before submit; session isolation; idempotent resume/submit; revisions; immutable content snapshots; freezing submitted answers; session-delete cascades; and upgrading a populated Phase-1 database while preserving its Writing record.

Browser tests cover saving and restoring answers/flags across reloads, device draft recovery after failed offline saves, confirming unanswered submission, raw scoring, explanations, evidence highlighting and history. API tests check stale writes, cross-session access and post-submit mutation rejection. Test databases are temporary and separate from user history.

Content status remains `preview`: these are original fictional short exercises, not teacher-approved or calibrated IELTS tests. The human-reviewed-content exit criterion of Phase 2 is still open. No claim is made about live AI quality, public deployment readiness, full offline/PWA support or completion of an accessibility audit.
