import { z } from "zod";

export const assignmentSchema = z.object({
  title: z.string().min(3, "Title is required"),
  subject: z.string().min(2, "Subject is required"),
  classLevel: z.string().min(1, "Class level is required"),
  dueDate: z.string().min(1, "Due date is required"),
  durationMinutes: z.coerce.number().int().positive(),
  sourceText: z.string().optional(),
  instructions: z.string().optional(),
  questionTypes: z
    .array(
      z.object({
        type: z.enum(["mcq", "short", "long", "case"]),
        count: z.coerce.number().int().positive(),
        marks: z.coerce.number().int().positive(),
        difficulty: z.enum(["easy", "medium", "hard"])
      })
    )
    .min(1, "At least one question type is required")
});
