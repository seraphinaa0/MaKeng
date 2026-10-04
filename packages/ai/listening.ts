import { parseVtt, validateTranscript } from "../domain/listening";
import type { Transcript } from "../schemas/listening";

export interface TranscriptionInput {
  sha256: string;
  duration: number;
  vtt?: string;
}
export interface SpeechTranscriber {
  transcribe(
    input: TranscriptionInput,
    signal: AbortSignal,
  ): Promise<Transcript>;
}
export class ManualTranscriptAdapter implements SpeechTranscriber {
  async transcribe(input: TranscriptionInput, signal: AbortSignal) {
    signal.throwIfAborted();
    if (!input.vtt)
      throw new Error("Cần transcript WebVTT. Demo chưa nhận dạng giọng nói.");
    return parseVtt(input.vtt, input.duration);
  }
}
export class FixtureTranscriber implements SpeechTranscriber {
  constructor(
    private readonly sha256: string,
    private readonly transcript: Transcript,
  ) {}
  async transcribe(input: TranscriptionInput, signal: AbortSignal) {
    signal.throwIfAborted();
    if (input.sha256 !== this.sha256)
      throw new Error("Fixture chỉ áp dụng cho đúng audio mẫu.");
    return validateTranscript(this.transcript, input.duration);
  }
}
