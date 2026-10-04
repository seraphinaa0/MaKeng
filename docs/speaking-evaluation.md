# Speaking evaluation before a real provider

Status: protocol only. No learner recording collected, no teacher-reviewed
benchmark run, no scoring/STT provider integrated. Browser tests validate the
recording lifecycle; synthetic microphone signals cannot validate teaching quality.

## Data and consent

Use original questions and at least 20 opt-in recordings covering Part 1/2/3,
different speaking lengths, background noise, hesitant speech and understandable
speech from several accents. Do not use scraped exam audio or copyrighted
recordings without permission. Audio remains private with explicit purpose,
reviewer access, retention and deletion consent. Local-storage consent from the
demo does not authorize collecting recordings or sending them to a provider.
Do not commit real voices or identifying transcripts to this repository.

## Human reference

Two competent IELTS teachers independently listen, transcribe and mark evidence
for fluency/coherence, vocabulary, grammar and intelligibility. Every correction
has a transcript quote and, when about sound, an audio timestamp. Mark uncertainty,
background noise and unverifiable text instead of inventing an observation.
Reconcile disagreements before using an item as reference. Accent similarity,
nationality and native-speaker identity are not quality criteria.

## Provider gate

Version prompt/model/schema and freeze a held-out set before comparison. Measure
transcript word error rate and timestamp error separately from feedback quality.
Teachers label each proposed observation supported, unsupported or uncertain,
and check whether the suggested correction preserves the speaker's meaning.
Report per-criterion disagreement, coverage and unsupported claims; show the
sample size rather than generalizing to IELTS ability from a small pilot.

Required qualitative gates: zero fabricated quotes/timestamps in the pilot,
zero accent grading, explicit uncertainty when audio is insufficient, no official
examiner-score wording, and tested provider consent/deletion boundaries. Numerical
quality thresholds and any band-estimate calibration must be agreed with the
teachers before the run. Failing samples block provider release and become
regression cases. The current demo cannot meet this gate without those reviews.
