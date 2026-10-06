# Skill-led design verification

Installed and read [frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
in `C:/Users/Thinkpad/.codex/skills/frontend-design`. The bundled installer
downloaded the skill and its Apache-2.0 license, without executing code from
the downloaded repository. Skill becomes discoverable on the next turn;
its instructions were read directly and applied during this implementation.

The skill influenced the pre-build plan, typography selection, category
hierarchy, accurate labels, removal of a misleading unavailable-mode arrow,
and screenshot-based critique. The user's lumen reference remains authoritative.
See ADR 0014 for the plan and acceptance criteria.

Manrope variable font is served locally from
`apps/web/public/fonts/manrope/Manrope-variable.ttf`, with the original OFL in
the same directory. Source: [Google Fonts Manrope](https://github.com/google/fonts/tree/main/ofl/manrope).
No external font request or UI dependency was added. Practice has a new
two-column category layout and distinct compact mobile cards. Shared
typography updates apply to Home, libraries, practice and tools.

Production build / TypeScript, ESLint, scoped Prettier and 88 unit tests passed.
Browser tests cover light/dark, font loading with no external request,
real skill library links, unavailable Mock Test, all ten routes at desktop
and Pixel 7 sizes, saved drafts, audio controls and local question speech.
All 32 browser tests in the design, hub, catalog and sources groups passed
on the final production build (16 desktop / 16 Pixel 7). The broader
storage/recording regression suite was not rerun for this presentation-only pass.

Screenshots were reviewed for desktop and mobile Practice, desktop dark
Practice, Home and the active practice workspaces. Critique found inherited
Mock Test text colors were unsuitable for the new dark surface; replaced
them with semantic tokens and added a dark-mode assertion.

No storage or scoring migration, AI provider call, commit, push or deployment.
This refinement does not claim exact 100% pixel equivalence to the composite.

## Follow-up: preview screenshot correction

The user's next screenshot exposed a genuine bug below 1000px: inherited
`.app-header nav { order: 3 }` put Home/Practice after Settings and Pro.
Moved the sidebar outside the header, narrowed the fixed desktop rail,
rebuilt skill links as compact horizontal tiles, separated Learning mode,
removed the dark radial wash, and exposed quick Light/Dark choices.
Frontend-design influenced the revised plan and direct screenshot critique;
see ADR 0015. MaKeng branding and saved theme/storage contracts remain intact.

Production build/TypeScript, ESLint and 88 unit tests passed. The design,
hub, catalog and sources browser run passed 33 tests, with the desktop-only
sidebar test intentionally skipped in the mobile project. Screenshots at
900/1100/1280px verified rail ordering and tile heights below 125px.
Repeated the breakpoint test with screenshot animations disabled to avoid
capturing intermediate light-to-dark transitions. Reviewed both themes at
900px, the breakpoint missed by the previous 1280px-only visual review.

## Follow-up: interaction feedback

Frontend-design guided a CSS-only pass that keeps the current layout and domain
logic: fine-pointer hover lifts clickable tiles by 2px, press scales buttons,
navigation and input focus get clear feedback, selected Reading radio answers
have a visible border, and Settings/Notes/voice settings reveal briefly.
No looping decoration, remote assets, dependencies or delayed event handlers.
Disabled controls remain unchanged and reduced motion disables movement.

The first browser run caught a specificity conflict in reduced-motion hover on
desktop; corrected it and reran the entire scoped suite on a fresh production
build. Final result: 36 passed, 2 intentionally skipped mobile-only exclusions
(desktop rail breakpoint and fine-pointer hover). Build/TypeScript, ESLint,
scoped formatting and all 88 unit tests passed. Reviewed the desktop hover
screenshot; the tile stays within its layout and navigation remains readable.
The broader recording/storage browser suite was not rerun for this CSS-only pass.

Restarted the owned local server on port 3000 and verified the served Practice
stylesheet contains the new interaction layer. No commit, push or deployment.
