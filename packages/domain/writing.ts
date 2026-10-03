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
];
