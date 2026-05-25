import { create } from "zustand";
import type { AssignmentForm, AssignmentRecord, JobUpdate } from "@/types";
import { createAssignment, fetchAssignments, WS_URL } from "@/lib/api";

const defaultForm: AssignmentForm = {
  title: "Chapter 4 Practice Assessment",
  subject: "Science",
  classLevel: "Grade 8",
  dueDate: "",
  durationMinutes: 90,
  sourceText: "Force, pressure, friction, motion, practical examples and conceptual reasoning.",
  instructions: "Balance conceptual, application and reasoning questions.",
  questionTypes: [
    { type: "mcq", count: 5, marks: 1, difficulty: "easy" },
    { type: "short", count: 4, marks: 3, difficulty: "medium" },
    { type: "long", count: 2, marks: 5, difficulty: "hard" }
  ]
};

interface AssessmentState {
  assignments: AssignmentRecord[];
  selectedId?: string;
  form: AssignmentForm;
  progress: number;
  statusMessage: string;
  isCreating: boolean;
  error?: string;
  load: () => Promise<void>;
  setForm: (patch: Partial<AssignmentForm>) => void;
  setSelected: (id: string) => void;
  submit: (file?: File | null) => Promise<void>;
  applyUpdate: (update: JobUpdate) => void;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  assignments: [],
  form: defaultForm,
  progress: 0,
  statusMessage: "Ready",
  isCreating: false,
  load: async () => {
    const assignments = await fetchAssignments().catch(() => []);
    set({ assignments, selectedId: assignments[0]?.id });
  },
  setForm: (patch) => set((state) => ({ form: { ...state.form, ...patch } })),
  setSelected: (id) => set({ selectedId: id }),
  submit: async (file) => {
    set({ isCreating: true, error: undefined, progress: 4, statusMessage: "Creating assignment" });
    try {
      const assignment = await createAssignment(get().form, file);
      set((state) => ({
        assignments: [assignment, ...state.assignments.filter((item) => item.id !== assignment.id)],
        selectedId: assignment.id,
        isCreating: false,
        statusMessage: "Queued for generation"
      }));
      subscribeToJob(assignment.id, get().applyUpdate);
    } catch (error) {
      set({ isCreating: false, error: error instanceof Error ? error.message : "Something went wrong" });
    }
  },
  applyUpdate: (update) =>
    set((state) => ({
      progress: update.progress,
      statusMessage: update.message,
      assignments: state.assignments.map((assignment) =>
        assignment.id === update.assignmentId
          ? { ...assignment, status: update.status, result: update.result || assignment.result, updatedAt: new Date().toISOString() }
          : assignment
      )
    }))
}));

function subscribeToJob(id: string, onUpdate: (update: JobUpdate) => void) {
  const socket = new WebSocket(`${WS_URL}?assignmentId=${id}`);
  socket.onmessage = (event) => onUpdate(JSON.parse(event.data) as JobUpdate);
}
