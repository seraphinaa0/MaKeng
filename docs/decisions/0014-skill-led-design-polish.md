# 0014 — Skill-led lumen design

The user requested a GitHub design skill and another redesign. Installed
`anthropics/skills/skills/frontend-design` into the user's Codex skills directory,
read it before implementation, and applied its plan/build/critique workflow.
The user's lumen reference takes precedence over the skill's generic aesthetic
advice. No storage, scoring, consent or provider contracts change.

## Plan and brief review

Palette: paper #ffffff, canvas #fafafe, ink #17182d, muted #72748b,
violet #644aff, lavender #efedff. Keep skill colors in small icon surfaces,
not large competing panels. Preserve the reference's rounded white frame.

Type: self-hosted Manrope variable font for a soft geometric academic UI;
Segoe UI fallback. Use deliberate 12/14/16/20/28px levels, tabular numerals
for timers, and readable line lengths. Font asset carries its original OFL.

Layout: left-aligned Practice title and a quiet introductory sentence; a
two-by-two skill grid with one clear library action per skill. Compact mobile
cards omit long descriptions, retaining skill name and real capability labels.

```text
Choose a skill                 Learning mode
Reading       | Listening
Speaking      | Writing
Mock Test — unavailable
Open learning resources
```

Critique before implementation: do not add an oversized gradient hero, fake
exercise counts, decorative numbered cards, or a fabricated streak. The four
cards are legitimate subject categories from the reference, not arbitrary
dashboard metrics. Remove the mock-test arrow because no test can be started.
Retain the existing Home composition and practice split panes, but refine
typography, alignment, focus/hover and mobile density throughout.

Acceptance: all four library links work, unavailable mode is explicit, light
and dark remain readable, no horizontal overflow on desktop/mobile, real
audio/recording and saved drafts continue working. Verify screenshots after
the production build. No commit, deployment or dependency installation.
