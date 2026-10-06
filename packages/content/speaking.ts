import { speakingSetSchema } from "../schemas/speaking";

function originalSet(
  id: string,
  title: string,
  prompts: string[],
  bullets: string[],
) {
  return speakingSetSchema.parse({
    id,
    title,
    version: 1,
    provenance: "original-project-preview",
    questions: prompts.map((prompt, index) => ({
      id: `${id}-${index + 1}`,
      prompt,
      part: index < 2 ? 1 : index === 2 ? 2 : 3,
      bullets: index === 2 ? bullets : [],
      limitSeconds: index === 2 ? 120 : 180,
    })),
  });
}

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

export const speakingCatalog = [
  speakingPreview,
  originalSet(
    "places-and-people",
    "Places & people",
    [
      "What do you enjoy about the area where you live?",
      "Do you prefer spending your free time alone or with other people? Why?",
      "Describe a place in your area that you would recommend to a visitor.",
      "How can public spaces help people feel part of a community?",
      "Should cities prioritise facilities for local residents or tourists? Why?",
    ],
    [
      "where it is",
      "what people can do there",
      "when you visited it",
      "explain why you recommend it",
    ],
  ),
  originalSet(
    "technology-and-time",
    "Technology & daily life",
    [
      "What technology do you use most often in your daily life?",
      "How do you organise your time when you have a busy day?",
      "Describe a useful device that has made a task easier for you.",
      "Does technology always save people time? Why or why not?",
      "How can people maintain a healthy balance between online and offline activities?",
    ],
    [
      "what the device is",
      "when you started using it",
      "how you use it",
      "explain how it helps you",
    ],
  ),
  originalSet(
    "environment-and-habits",
    "Environment & small habits",
    [
      "What do you do with things you no longer need?",
      "Is there a green space you visit regularly? Why do you go there?",
      "Describe a small change you made to reduce waste in your daily life.",
      "How can communities make repairing everyday objects easier?",
      "Should environmental education focus more on individual habits or public policies? Why?",
    ],
    [
      "what you changed",
      "why you decided to change",
      "how you kept the habit",
      "explain what you learned from the experience",
    ],
  ),
  originalSet(
    "travel-and-connections",
    "Travel & connections",
    [
      "How do you usually travel to places near your home?",
      "What helps you feel comfortable when you visit somewhere new?",
      "Describe a journey during which you learned something unexpected.",
      "How can better public transport change life in a town?",
      "What should visitors do to respect the communities they travel to?",
    ],
    [
      "where you travelled",
      "who was with you",
      "what surprised you",
      "explain how the experience changed your view",
    ],
  ),
];
