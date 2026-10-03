import {
  type WritingEvaluator,
  TransientProviderError,
} from "../../packages/ai/writing";
import { aggregateBand } from "../../packages/domain/writing";
import { validateEvaluation } from "../../packages/schemas/writing";
import { type Repository } from "../../packages/db/repository";

export async function processOne(
  repo: Repository,
  provider: WritingEvaluator,
  timeoutMs = 30000,
): Promise<boolean> {
  const job = repo.claim();
  if (!job) return false;
  const start = Date.now();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = {
    model: provider.model,
    latencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0,
    status: "failed",
  };
  try {
    const output = await Promise.race([
      provider.evaluate(job.input, controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new TransientProviderError("TIMEOUT"));
        }, timeoutMs);
      }),
    ]);
    Object.assign(run, {
      inputTokens: output.inputTokens,
      outputTokens: output.outputTokens,
      estimatedCost: output.estimatedCost,
    });
    const evaluation = validateEvaluation(output.output, job.input.essay);
    repo.finish(
      job,
      { evaluation, overall: aggregateBand(evaluation) },
      { ...run, latencyMs: Date.now() - start, status: "completed" },
      null,
    );
  } catch (error) {
    const transient = error instanceof TransientProviderError;
    repo.finish(
      job,
      null,
      { ...run, latencyMs: Date.now() - start },
      transient ? "PROVIDER_UNAVAILABLE" : "INVALID_EVALUATION",
      transient,
    );
  } finally {
    clearTimeout(timer);
  }
  return true;
}
