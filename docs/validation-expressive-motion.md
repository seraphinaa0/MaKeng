# Expressive motion — local validation

The user's detailed brief overrides the previous quiet interaction pass.
Frontend-design influenced the subject-specific SVG motion, book/M/ascent mark,
and a single launcher focal point. No raster generation or external asset was
needed: logo and icon animation remain native SVG/CSS.

Implemented travelling conic perimeter beam and a hover flash on the Home
launcher, sliding/fading hints every two seconds only while empty, independently
animated icon parts, a measured persistent sidebar pill, and an outgoing/incoming
navigation scene with selectable cinematic/slide/fade/off and speed.
Modified clicks still use normal Next Link behavior. Reduced motion stops the
hint scheduler and motion; background tabs pause hints. Animation never changes
typed launcher content or lesson data.

Settings and profile are now separate. Profile stores local name/preset avatar,
theme (including static lavender Ambient) and motion preferences. Pomodoro stays
mounted while the popover closes and across client navigation, but resets on
reload. Keyboard Escape returns focus to the actual opening control.
Settings discloses local limitations, links to backup and tools, reports browser
permission state, and explicitly discovers microphone devices without recording.
Discovery streams are stopped immediately and in finally, including after leaving
the page while permission is pending. Selected input applies to subsequent
Speaking capture, output to Listening/Speaking media; TTS remains system output.
Unsupported speaker selection has a visible fallback. No automatic audio play.

The first scoped browser pass found exact-label locator failures on the new
selects and missing active navigation on tool pages. Added explicit accessible
labels and mapped tool routes to the Practice group. A fresh desktop pass of all
four new scenarios passed. Reviewed Home, Ambient profile and Settings screenshots;
feathered mountains across Home and compacted unavailable Pro copy in short rails.

Full browser regression passed 120 tests, with two intentional mobile exclusions
for desktop rail/fine-pointer hover (122 planned, 8.5 minutes). A supplemental
selected-device test caught a stale device ID after a full reload in the test
browser: added clear OverconstrainedError/empty-message recovery instructions
and verified both selecting a real fake-device microphone through Settings and
switching back to the system default after an invalid selection.

After that error-message fix, a fresh production build passed TypeScript, root
typecheck, ESLint, scoped Prettier and all 88 unit tests. The final focused browser
run passed all 56 desktop/mobile cases across audio-settings, expressive,
Speaking and Listening (3.2 minutes). It includes actual exit/entrance Web Animation
frames and durations, motion off, selected microphone constraints with fake-media
capture and track shutdown, stale-input recovery, and selected output wiring via
a capability stub. Physical audio hardware/output routing was not verified.
The broader backup/Reading/Writing/browser suite was not rerun after this final
audio error-message change; those paths are unchanged from the passing full run.

Reviewed Home/profile/Settings at desktop and Pixel 7 sizes. Final owned loopback
server was restarted on 3000; Home CSS includes beam/page-turn, Settings and SVG
icon return HTTP 200. UI preferences remain browser-local and outside backup.
No commit, push, deployment, AI call, new dependency or learner-data migration.
