import { setTimeout } from "node:timers/promises";
import { repository } from "../../packages/db/repository";
import { MockWritingEvaluator } from "../../packages/ai/writing";
import { processOne } from "./process";

let running = true;
process.on("SIGINT", () => {
  running = false;
});
process.on("SIGTERM", () => {
  running = false;
});
async function main() {
  const repo = repository();
  const provider = new MockWritingEvaluator();
  console.log(JSON.stringify({ event: "worker_started", mode: "mock" }));
  try {
    while (running) {
      if (!(await processOne(repo, provider))) await setTimeout(500);
    }
  } finally {
    repo.close();
  }
}
main().catch(() => {
  console.error("Worker stopped. Check database path and migration.");
  process.exitCode = 1;
});
