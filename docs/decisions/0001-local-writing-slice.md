# ADR 0001 — Local Writing Task 2

Status: accepted for local development, not a production deployment decision.

The repository had documentation only. The first Writing slice therefore includes a Next.js workspace, shared schemas, a separate worker and a persistent local repository.

SQLite (Node 24 `node:sqlite`) implements the local repository so the entire mock workflow can run without Supabase credentials or Docker. The API and worker share one absolute database path. Versioned SQL migrations, transactions, job leases and owner checks apply to this adapter. It is not supported on Vercel's ephemeral filesystem or across multiple machines.

Browser sessions use random HttpOnly bearer cookies, storing only their hashes server-side. These are local device identities, not Supabase accounts. Losing the cookie loses access to that device's history. No public launch until Supabase Auth, PostgreSQL/RLS and retention controls are integrated and tested. Bind development/start servers to loopback.

The evaluator is an injected interface. Only the deterministic mock is enabled in this slice. Its fixed scores and feedback are explicitly illustrative; no essays are sent to an external AI service. Live model integration and teacher-reviewed scoring calibration remain follow-up work, not verified capabilities.

For local mocks, users acknowledge local essay persistence before submission. This is not consent for model training or external provider processing. A real provider requires a separate disclosure and consent policy.

CSS semantic tokens implement the initial UI without introducing Tailwind until a consumer needs it. Shared modules live under packages but are not individually published workspace packages yet.

Scores are a practice-only mean of four criteria rounded to the nearest half band. They do not represent the official combined Task 1/Task 2 Writing result. Mock results must not be used to track proficiency.
