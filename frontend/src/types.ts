export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "mcq" | "short" | "long" | "case";

export interface QuestionConfig {
  type: QuestionType;
  count: number;
  marks: number;
  difficulty: Difficulty;
}

export interface AssignmentForm {
  title: string;
  subject: string;
  classLevel: string;
  dueDate: string;
  durationMinutes: number;
  sourceText: string;
  instructions: string;
  questionTypes: QuestionConfig[];
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
}

export interface QuestionSection {
  title: string;
  instruction: string;
  questions: GeneratedQuestion[];
}

export interface AssignmentRecord extends AssignmentForm {
  id: string;
  status: "draft" | "queued" | "generating" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  result?: {
    schoolName: string;
    paperTitle: string;
    totalMarks: number;
    durationMinutes: number;
    sections: QuestionSection[];
  };
}

export interface JobUpdate {
  assignmentId: string;
  status: AssignmentRecord["status"];
  progress: number;
  message: string;
  result?: AssignmentRecord["result"];
  error?: string;
}
