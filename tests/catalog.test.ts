import { describe, expect, it } from "vitest";
import { randomItem } from "../packages/domain/catalog";
import { taskOnePrompts } from "../packages/content/writing-task-one";
import { speakingCatalog } from "../packages/content/speaking";
import { newSpeaking } from "../packages/domain/speaking";
import { DemoStore, parseDemoBackup } from "../packages/demo/store";

describe("practice catalogs", () => {
  it("picks only visible entries and handles empty catalogs", () => {
    expect(randomItem([], () => 0)).toBeUndefined();
    expect(randomItem(["a", "b"], () => 0)).toBe("a");
    expect(randomItem(["a", "b"], () => 0.99)).toBe("b");
    expect(randomItem(["filtered"], () => 0.5)).toBe("filtered");
  });
  it("persists an original speaking set without changing old default sessions", () => {
    const create = (set?: (typeof speakingCatalog)[number]) =>
      newSpeaking(crypto.randomUUID(), new Date().toISOString(), 7, true, set);
    expect(create().set.id).toBe("everyday-learning");
    for (const set of speakingCatalog) expect(create(set).set).toEqual(set);
  });
  it("saves and restores Task 1 data without mock Task 2 bands", async () => {
    const values = new Map<string, string>();
    const store = new DemoStore({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    });
    const input = {
      prompt: taskOnePrompts[0].text,
      essay:
        "Overall, car travel decreased while cycling and bus use increased over the period.",
      consent: true,
    };
    await store.request("writing/submissions", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(input),
    });
    const backup = parseDemoBackup(
      JSON.stringify(await store.request("demo/export")),
    );
    expect(backup.writing[0].prompt).toContain("55 | 38");
    expect(backup.writing[0].evaluation).toBeNull();
    expect(backup.writing[0].overall).toBeNull();
    expect(() =>
      parseDemoBackup(
        JSON.stringify({
          ...backup,
          writing: [
            {
              ...backup.writing[0],
              prompt: "A normal Task 2 prompt with no evaluation.",
            },
          ],
        }),
      ),
    ).toThrow();
  });
});
