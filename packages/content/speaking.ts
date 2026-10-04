import { speakingSetSchema } from "../schemas/speaking";

export const speakingPreview = speakingSetSchema.parse({
  id: "everyday-learning",
  version: 1,
  title: "Everyday learning",
  provenance: "original-project-preview",
  questions: [
    {
      id: "p1-place",
      part: 1,
      prompt: "Where do you prefer to learn something new, and why?",
      bullets: [],
      limitSeconds: 180,
    },
    {
      id: "p1-habit",
      part: 1,
      prompt: "What small habit helps you keep learning during a busy week?",
      bullets: [],
      limitSeconds: 180,
    },
    {
      id: "p2-skill",
      part: 2,
      prompt: "Describe a practical skill you learned from another person.",
      bullets: [
        "What the skill was",
        "Who helped you learn it",
        "How you practised",
        "Explain why this experience was useful to you",
      ],
      limitSeconds: 120,
    },
    {
      id: "p3-technology",
      part: 3,
      prompt:
        "How can technology help people learn practical skills? What are its limitations?",
      bullets: [],
      limitSeconds: 180,
    },
    {
      id: "p3-schools",
      part: 3,
      prompt:
        "Should schools give more time to practical skills? Why or why not?",
      bullets: [],
      limitSeconds: 180,
    },
  ],
});
