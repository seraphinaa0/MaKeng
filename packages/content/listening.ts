import sample from "./listening-sample.json";
import { FixtureTranscriber } from "../ai/listening";
import { buildListening } from "../domain/listening";
import {
  listeningContentSchema,
  transcriptSchema,
  type ListeningContent,
} from "../schemas/listening";

export async function sampleListening(
  audio: ListeningContent["audio"],
): Promise<ListeningContent> {
  const fixture = new FixtureTranscriber(
    sample.sha256,
    transcriptSchema.parse({
      schemaVersion: 1,
      mode: "fixture",
      cues: sample.cues,
    }),
  );
  const transcript = await fixture.transcribe(
    audio,
    new AbortController().signal,
  );
  const content = buildListening(audio, transcript, {
    title: "A community garden tour",
    author: "MaKeng",
    rightsConfirmed: true,
    reviewer: "Fixture preview",
    reviewConfirmed: true,
    questions: [
      {
        cueId: "cue-1",
        prompt: "The next garden tour takes place on ___.",
        answer: "Tuesday",
        maxWords: 1,
      },
      {
        cueId: "cue-2",
        prompt: "Visitors meet outside the ___.",
        answer: "library",
        maxWords: 1,
      },
      {
        cueId: "cue-3",
        prompt: "Visitors should bring a ___ to write down ideas.",
        answer: "notebook",
        maxWords: 1,
      },
    ],
  });
  return listeningContentSchema.parse({
    ...content,
    set: {
      ...content.set,
      id: "garden-tour-listening",
      publication: "preview",
      provenance: {
        author: "MaKeng",
        source: "original-synthetic",
        rights: "original-project-content",
        humanReviewer: null,
      },
    },
  });
}
