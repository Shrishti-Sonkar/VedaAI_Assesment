import type { AssignmentForm, AssignmentRecord } from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";

export async function fetchAssignments() {
  const response = await fetch(`${API_URL}/api/assignments`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load assignments");
  return (await response.json()) as AssignmentRecord[];
}

export async function createAssignment(form: AssignmentForm, file?: File | null) {
  const payload = new FormData();
  Object.entries(form).forEach(([key, value]) => {
    payload.append(key, key === "questionTypes" ? JSON.stringify(value) : String(value));
  });
  if (file) payload.append("file", file);
  const response = await fetch(`${API_URL}/api/assignments`, { method: "POST", body: payload });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Invalid assignment" }));
    throw new Error(error.message || "Invalid assignment");
  }
  return (await response.json()) as AssignmentRecord;
}
