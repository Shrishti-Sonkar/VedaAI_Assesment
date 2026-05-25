import { nanoid } from "nanoid";
import type { AssignmentInput, GeneratedQuestion, QuestionConfig, QuestionSection } from "./types.js";

const labels: Record<QuestionConfig["type"], string> = {
  mcq: "Objective Questions",
  short: "Short Answer Questions",
  long: "Long Answer Questions",
  case: "Case Study Questions"
};

export function buildStructuredPrompt(input: AssignmentInput) {
  return {
    role: "teacher_assistant",
    task: "Generate a structured exam paper as JSON only.",
    constraints: {
      subject: input.subject,
      classLevel: input.classLevel,
      dueDate: input.dueDate,
      durationMinutes: input.durationMinutes,
      questionBlueprint: input.questionTypes,
      instructions: input.instructions || "Attempt all questions.",
      mustReturn: ["sections", "questions", "difficulty", "marks"]
    },
    sourceMaterial: input.sourceText?.slice(0, 3000) || "Use standard curriculum-aligned concepts."
  };
}

export function generateQuestionPaper(input: AssignmentInput) {
  const prompt = buildStructuredPrompt(input);
  const topicPool = extractTopics(input.sourceText, input.subject);
  const sections: QuestionSection[] = input.questionTypes.map((config, index) => ({
    title: `Section ${String.fromCharCode(65 + index)} - ${labels[config.type]}`,
    instruction: sectionInstruction(config),
    questions: buildQuestions(config, topicPool, input, index)
  }));

  return {
    prompt,
    result: {
      schoolName: "Delhi Public School, Sector 45, Kolkata",
      paperTitle: `${input.subject} Assessment - ${input.classLevel}`,
      totalMarks: sections.reduce(
        (sum, section) => sum + section.questions.reduce((inner, q) => inner + q.marks, 0),
        0
      ),
      durationMinutes: input.durationMinutes,
      sections
    }
  };
}

function extractTopics(sourceText: string | undefined, subject: string): string[] {
  const base = sourceText || `${subject} fundamentals, applications, reasoning, examples and real-life use cases`;
  // Extract meaningful multi-char words from source
  const words = base
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .map((w) => w.toLowerCase());
  const unique = [...new Set(words)].slice(0, 20);
  return unique.length ? unique : [subject.toLowerCase(), "concepts", "applications", "analysis"];
}

function sectionInstruction(config: QuestionConfig) {
  if (config.type === "mcq") return "Choose the most appropriate answer. Each question carries 1 mark.";
  if (config.type === "case") return "Read the case carefully and answer all sub-questions with evidence from the passage.";
  return `Attempt all questions. Each question carries ${config.marks} marks.`;
}

function buildQuestions(
  config: QuestionConfig,
  topics: string[],
  input: AssignmentInput,
  sectionIndex: number
): GeneratedQuestion[] {
  return Array.from({ length: config.count }, (_, qi) => {
    const topic = topics[(qi + sectionIndex * 3) % topics.length];
    const capTopic = topic.charAt(0).toUpperCase() + topic.slice(1);

    if (config.type === "mcq") {
      return buildMCQ(capTopic, config, input.subject, qi);
    }
    if (config.type === "short") {
      return buildShort(capTopic, config, input.subject, input.instructions, qi);
    }
    if (config.type === "long") {
      return buildLong(capTopic, config, input.subject, input.instructions, qi);
    }
    return buildCase(capTopic, config, input.subject, qi);
  });
}

// ─── MCQ ───────────────────────────────────────────────────────────────────
function buildMCQ(topic: string, config: QuestionConfig, subject: string, qi: number): GeneratedQuestion {
  const templates = [
    {
      q: `Which of the following best describes the concept of ${topic} in ${subject}?`,
      options: [
        `A) ${topic} refers to the tendency of a body to remain in its current state of rest or motion`,
        `B) ${topic} is only observed in liquid substances under pressure`,
        `C) ${topic} applies exclusively to objects moving at high speeds`,
        `D) ${topic} is a property unique to metallic objects`
      ],
      answer: "A"
    },
    {
      q: `What happens to ${topic} when the applied force is doubled?`,
      options: [
        `A) It remains unchanged`,
        `B) It becomes half`,
        `C) It also doubles in proportion`,
        `D) It becomes negligible`
      ],
      answer: "C"
    },
    {
      q: `Which statement about ${topic} in ${subject} is INCORRECT?`,
      options: [
        `A) ${topic} can be measured and expressed in standard units`,
        `B) ${topic} plays an important role in real-world applications`,
        `C) ${topic} is independent of all surrounding conditions`,
        `D) ${topic} follows the fundamental laws of ${subject}`
      ],
      answer: "C"
    },
    {
      q: `A student conducting an experiment on ${topic} observes that the result changes with temperature. What does this indicate?`,
      options: [
        `A) The experiment was conducted incorrectly`,
        `B) ${topic} is influenced by environmental conditions`,
        `C) Temperature has no relevance to ${subject}`,
        `D) The student's measurements were all wrong`
      ],
      answer: "B"
    },
    {
      q: `In everyday life, which of the following is the most common practical application of ${topic}?`,
      options: [
        `A) Designing spacecraft for outer space`,
        `B) Manufacturing pure gold jewellery`,
        `C) Using brakes in bicycles and vehicles`,
        `D) Extracting minerals from deep ocean beds`
      ],
      answer: "C"
    },
    {
      q: `The unit used to measure ${topic} in the SI system is:`,
      options: [
        `A) Kilogram (kg)`,
        `B) Newton (N)`,
        `C) Joule (J)`,
        `D) Ampere (A)`
      ],
      answer: "B"
    }
  ];

  const t = templates[qi % templates.length];
  return {
    id: nanoid(8),
    type: "mcq",
    difficulty: config.difficulty,
    marks: config.marks,
    text: t.q,
    options: t.options,
    correctAnswer: t.answer
  };
}

// ─── Short Answer ───────────────────────────────────────────────────────────
function buildShort(topic: string, config: QuestionConfig, subject: string, instructions: string | undefined, qi: number): GeneratedQuestion {
  const extra = instructions ? ` (${instructions.slice(0, 60)})` : "";
  const questions = [
    `Define ${topic} in the context of ${subject} and give one real-life example to support your answer.${extra}`,
    `Explain how ${topic} is related to the laws of ${subject}. Provide at least two supporting points.`,
    `Compare ${topic} with one other concept in ${subject}. How are they similar and how do they differ?`,
    `Describe an experiment that demonstrates the effect of ${topic}. Include the materials used and expected observations.`,
    `State two practical applications of ${topic} in daily life. Explain how each application works.`,
    `What factors affect ${topic} in ${subject}? List any three factors and explain their significance.`
  ];
  return {
    id: nanoid(8),
    type: "short",
    difficulty: config.difficulty,
    marks: config.marks,
    text: questions[qi % questions.length]
  };
}

// ─── Long Answer ────────────────────────────────────────────────────────────
function buildLong(topic: string, config: QuestionConfig, subject: string, instructions: string | undefined, qi: number): GeneratedQuestion {
  const extra = instructions ? ` Ensure your answer reflects the following: ${instructions.slice(0, 80)}.` : "";
  const questions = [
    `Explain the concept of ${topic} in ${subject} in detail. Include its definition, the scientific principles behind it, at least three real-world examples, and its importance in modern technology.${extra}`,
    `With the help of a labelled diagram (or a written description of one), describe how ${topic} works in ${subject}. Discuss how it is measured, what factors influence it, and how it is applied in engineering or daily life.${extra}`,
    `"${topic} is one of the most fundamental concepts in ${subject}." Do you agree with this statement? Justify your answer using at least three arguments supported by facts or examples.${extra}`
  ];
  return {
    id: nanoid(8),
    type: "long",
    difficulty: config.difficulty,
    marks: config.marks,
    text: questions[qi % questions.length]
  };
}

// ─── Case Study ─────────────────────────────────────────────────────────────
function buildCase(topic: string, config: QuestionConfig, subject: string, qi: number): GeneratedQuestion {
  const passages = [
    `Arjun notices that when he rides his bicycle on a muddy road, it is harder to pedal compared to a smooth road. His teacher explains that this is because of ${topic}. The amount of ${topic} depends on the surfaces in contact and the weight of the object. Arjun decides to conduct an experiment by pushing a wooden block across different surfaces.\n\n(i) What is ${topic} and how does it affect motion? (2 marks)\n(ii) Name two factors that affect the magnitude of ${topic}. (2 marks)\n(iii) How can ${topic} be reduced? Give one practical example from daily life. (2 marks)`,
    `A science class is conducting an experiment on ${topic}. Students are asked to observe the effect of increasing the applied force on an object. They note that beyond a certain point, the object begins to move. The teacher explains this using the concept of ${topic} in ${subject}.\n\n(i) Explain why the object does not move when a small force is applied initially. (2 marks)\n(ii) What is the significance of ${topic} in engineering structures? (2 marks)\n(iii) How is ${topic} useful in designing safe roads and footwear? (2 marks)`
  ];
  return {
    id: nanoid(8),
    type: "case",
    difficulty: config.difficulty,
    marks: config.marks,
    text: passages[qi % passages.length]
  };
}
