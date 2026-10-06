# 0015 — Correct the preview's actual shell

The user's screenshot shows the current code, not evidence of a stale build.
It also exposes a real responsive cascade bug: the old `.app-header nav`
rule assigns order 3 below 1000px. Because the new sidebar was nested inside
that header, navigation moved after Settings and Pro. Earlier screenshots
at 1280px did not catch this. The visual polish also left oversized practice
cards and excessive chrome, so the change was not sufficiently distinct.

Apply frontend-design's plan/critique workflow with the user's reference first.
Palette remains white #ffffff, canvas #fafafe, ink #17182d, violet #644aff,
lavender #efedff and muted #72748b. Manrope remains self-hosted. No new assets.

Move sidebar out of the header so legacy horizontal-nav rules cannot govern
its layout. Use a narrow, fixed desktop rail with navigation at the top and
settings at the bottom. Make Practice a compact selection workspace: two-by-two
horizontal skill tiles with icon, name and capability label, no duplicated
translation/description/footer blocks. Show the current learning mode below
the skills, and unavailable Mock Test in a subordinate row. Retain useful
real library links, not invented counts, bands or timers.

```text
MaKeng                              Light / Dark    Settings
Home        Choose a skill
Practice    [Reading      ] [Listening    ]
Vocabulary  [Speaking     ] [Writing      ]
Progress    Learning mode: untimed, practice at your own pace
AI Tutor    Mock Test: unavailable
Settings    Open learning resources
```

Reference review: avoid another giant hero or analytics dashboard. Keep left
alignment and the white/pale frame; use type 12/14/16/24 with one dominant
heading. Dark mode remains supported without the bright grey radial wash.
Expose Light/Dark directly so the user can see the light reference treatment
without hunting in Settings. Respect stored theme choices; do not reset data.

Acceptance: inspect desktop 1280px, 900px (preview breakpoint) and Pixel 7.
Assert Home's navigation is physically above Settings/Pro, all four skills are
visible, working routes and saved drafts remain available, no horizontal
overflow and no storage/provider contract change. Keep MaKeng branding.
