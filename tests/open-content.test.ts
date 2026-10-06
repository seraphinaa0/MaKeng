import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  openContentPack,
  openContentPackSchema,
} from "../packages/content/open-content";
import { prompts } from "../packages/domain/writing";
import { speakingCatalog } from "../packages/content/speaking";
import { taskOnePrompts } from "../packages/content/writing-task-one";

describe("open content starter pack", () => {
  it("keeps third-party provenance and does not pretend to publish exercises", () => {
    expect(openContentPack.status).toBe("source-only");
    expect(
      openContentPack.items.filter((item) => item.skill === "reading"),
    ).toHaveLength(3);
    for (const item of openContentPack.items) {
      expect(item.attribution.length).toBeGreaterThan(30);
      expect(item.conditions.length).toBeGreaterThan(30);
      expect(item.changes.length).toBeGreaterThan(30);
      expect(item).not.toHaveProperty("solutions");
      expect(item).not.toHaveProperty("publication");
    }
    expect(
      openContentPack.pending.every((item) => item.status === "not-imported"),
    ).toBe(true);
  });
  it("matches the bundled VOA binary with its size and checksum", () => {
    const item = openContentPack.items.find((item) => item.audio)!;
    const bytes = readFileSync(`apps/web/public${item.audio!.path}`);
    expect(bytes.byteLength).toBe(item.audio!.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      item.audio!.sha256,
    );
    expect(bytes.subarray(0, 3).toString()).toBe("ID3");
  });
  it("rejects missing credits, remote audio, duplicate IDs and fake published status", () => {
    const mutate = (change: (pack: typeof openContentPack) => void) => {
      const pack = structuredClone(openContentPack);
      change(pack);
      expect(openContentPackSchema.safeParse(pack).success).toBe(false);
    };
    mutate((pack) => {
      pack.items[0].attribution = "";
    });
    mutate((pack) => {
      pack.items[1].historyUrl = undefined;
    });
    mutate((pack) => {
      pack.items[3].audio!.path = "https://example.com/audio.mp3";
    });
    mutate((pack) => {
      pack.items.push(pack.items[0]);
    });
    expect(
      openContentPackSchema.safeParse({
        ...openContentPack,
        status: "published",
      }).success,
    ).toBe(false);
  });
  it("adds original, uniquely identified preview prompts without changing old defaults", () => {
    expect(prompts[0].id).toBe("cities");
    expect(speakingCatalog[0].id).toBe("everyday-learning");
    expect(prompts).toHaveLength(5);
    expect(speakingCatalog).toHaveLength(5);
    expect(taskOnePrompts).toHaveLength(4);
    for (const catalog of [prompts, speakingCatalog, taskOnePrompts])
      expect(new Set(catalog.map((item) => item.id)).size).toBe(catalog.length);
    const energy = taskOnePrompts.find(
      (item) => item.id === "household-energy-table",
    )!;
    for (const column of [1, 2])
      expect(
        energy.rows.reduce((sum, row) => sum + Number(row[column]), 0),
      ).toBe(100);
    expect(
      taskOnePrompts.every((item) => item.instruction.includes("fictional")),
    ).toBe(true);
  });
});
