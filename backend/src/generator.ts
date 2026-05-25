import { nanoid } from "nanoid";
import type { AssignmentInput, GeneratedQuestion, QuestionConfig, QuestionSection } from "./types.js";

const labels: Record<QuestionConfig["type"], string> = {
  mcq: "Objective Questions",
  short: "Short Answer Questions",
  long: "Long Answer Questions",
  case: "Case Study Questions"
};

const verbs = {
  easy: ["Identify", "Define", "List", "Recall"],
  medium: ["Explain", "Compare", "Apply", "Analyze"],
  hard: ["Evaluate", "Design", "Justify", "Synthesize"]
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

function extractTopics(sourceText: string | undefined, subject: string) {
  const base = sourceText || `${subject} fundamentals, applications, reasoning, examples and real-life use cases`;
  const words = base
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 5);
  const unique = [...new Set(words.map((word) => word.toLowerCase()))].slice(0, 12);
  return unique.length ? unique : [subject.toLowerCase(), "concepts", "applications", "analysis"];
}

function sectionInstruction(config: QuestionConfig) {
  if (config.type === "mcq") return "Choose the most appropriate answer. Attempt all questions.";
  if (config.type === "case") return "Read the case carefully and answer with evidence from the passage.";
  return `Attempt all questions. Each question carries ${config.marks} marks.`;
}

function buildQuestions(config: QuestionConfig, topics: string[], input: AssignmentInput, sectionIndex: number): GeneratedQuestion[] {
  return Array.from({ length: config.count }, (_, questionIndex) => {
    const topic = topics[(questionIndex + sectionIndex) % topics.length];
    const verbList = verbs[config.difficulty];
    const verb = verbList[questionIndex % verbList.length];
    return {
      id: nanoid(8),
      type: config.type,
      difficulty: config.difficulty,
      marks: config.marks,
      text: questionText(config.type, verb, topic, input.subject, questionIndex)
    };
  });
}

function questionText(type: QuestionConfig["type"], verb: string, topic: string, subject: string, index: number) {
  const polishedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
  if (type === "mcq") {
    return `${verb} the best statement related to ${polishedTopic} in ${subject}. Include four options and mark one correct answer.`;
  }
  if (type === "case") {
    return `A learner observes a real-world situation involving ${polishedTopic}. ${verb} the situation and answer with two supporting points.`;
  }
  if (type === "long") {
    return `${verb} ${polishedTopic} in detail and connect it with at least one practical example from ${subject}.`;
  }
  return `${verb} the role of ${polishedTopic} in ${subject} in 3-4 sentences.`;
}
