import { criteria, type Evaluation } from "../schemas/writing";

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}
export function aggregateBand(evaluation: Evaluation): number {
  return (
    Math.round(
      (criteria.reduce((sum, key) => sum + evaluation.criteria[key].band, 0) /
        4) *
        2,
    ) / 2
  );
}

// Original synthetic prompts authored for MaKeng; not official exam questions.
export const prompts = [
  {
    id: "cities",
    topic: "Cities & communities",
    title: "A city for everyone",
    text: "Some people believe cities should invest more in public parks than in new shopping centres. To what extent do you agree or disagree?",
    provenance: "MaKeng original synthetic prompt • v1",
  },
  {
    id: "education",
    topic: "Education",
    title: "Learning beyond the classroom",
    text: "Some people believe schools should dedicate one day each week to practical community projects. Others think this time should be spent on academic subjects. Discuss both views and give your own opinion.",
    provenance: "MaKeng original synthetic prompt • v1",
  },
  {
    id: "work",
    topic: "Work & society",
    title: "The flexible working week",
    text: "More employers are allowing staff to choose when they start and finish their working day. Do the advantages of this development outweigh the disadvantages?",
    provenance: "MaKeng original synthetic prompt • v1",
  },
  {
    id: "digital-inclusion",
    topic: "Technology & society",
    title: "Digital services for everyone",
    text: "As more public services move online, some people argue that governments should provide free digital skills training for adults. Others believe maintaining face-to-face services is more important. Discuss both views and give your own opinion.",
    provenance:
      "MaKeng original synthetic prompt • v1 • 2026-10-05 • unreviewed preview",
  },
  {
    id: "repair-culture",
    topic: "Environment & consumption",
    title: "Repair or replace?",
    text: "Many households replace damaged products instead of repairing them. What are the reasons for this trend, and what could communities do to encourage people to repair more items?",
    provenance:
      "MaKeng original synthetic prompt • v1 • 2026-10-05 • unreviewed preview",
  },
];
