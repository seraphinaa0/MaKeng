# 0013 — Reference-first UI rebuild

Date: 2026-10-05

The user explicitly rejected the inherited dashboard structure. Replace the
previous Learning Hub and Quiet Workspace stylesheets with a new reference-first
presentation layer. The app displays the reference brand, lumen; persisted data
keys, application identity and storage contracts remain MaKeng for compatibility.

Home has only a greeting, launcher, four skill pills, a continuation card and
three focus rows. Remove analytics cards, band disclaimers, breadcrumb and data
banner from the hero. Put disclosures, theme and authoring/backup/source tools in
Settings. Consent and actionable errors remain at the point of interaction.

Practice uses its own compact back/title/status bar, without the home sidebar.
Reading gets previous/next question navigation within its split-pane workspace.
Speaking separates the interview stage from the transcript/self-review panel.
Writing uses a paper/editor composition and Listening gets a custom audio player
whose controls operate the existing audio element. No provider, scoring or
attempt-storage migration is part of this change.

Vocabulary, AI Tutor, Mock Test and Pro are shown as explicitly unavailable
reference navigation/feature slots, not fake working integrations. No fabricated
streak, band, accuracy, exercise count or elapsed time is presented as user data.
Exact pixel equivalence cannot be claimed without source design assets; verify
actual screenshots at desktop/mobile sizes and document differences.
