import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { assignmentSchema } from "./validation.js";
import { attachRealtime, publishUpdate } from "./realtime.js";
import { closeQueue, enqueueGeneration, setupQueue } from "./queue.js";
import { closeStore, connectStore, getAssignment, listAssignments, saveAssignment } from "./store.js";
import type { AssignmentRecord } from "./types.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024 } });

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/assignments", async (_req, res) => {
  res.json(await listAssignments());
});

app.get("/api/assignments/:id", async (req, res) => {
  const assignment = await getAssignment(req.params.id);
  if (!assignment) return res.status(404).json({ message: "Assignment not found" });
  res.json(assignment);
});

app.post("/api/assignments", upload.single("file"), async (req, res) => {
  const raw = normalizeBody(req.body, req.file);
  const parsed = assignmentSchema.safeParse(raw);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid assignment", issues: parsed.error.flatten().fieldErrors });
  }
  const now = new Date().toISOString();
  const record: AssignmentRecord = {
    id: nanoid(10),
    ...parsed.data,
    status: "queued",
    createdAt: now,
    updatedAt: now
  };
  await saveAssignment(record);
  publishUpdate({ assignmentId: record.id, status: "queued", progress: 5, message: "Job added to generation queue" });
  await enqueueGeneration(record.id, parsed.data);
  res.status(202).json(record);
});

function normalizeBody(body: Record<string, unknown>, file?: Express.Multer.File) {
  const questionTypes = typeof body.questionTypes === "string" ? JSON.parse(body.questionTypes) : body.questionTypes;
  const sourceText = file?.buffer.toString("utf8").slice(0, 6000) || String(body.sourceText || "");
  return {
    ...body,
    sourceText,
    questionTypes
  };
}

const server = http.createServer(app);
attachRealtime(server);

const port = Number(process.env.PORT || 4000);
await connectStore();
await setupQueue();
server.listen(port, () => console.log(`VedaAI API running on http://localhost:${port}`));

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
  // Don't exit - keep server running
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Don't exit - keep server running
});

async function shutdown() {
  await closeQueue();
  await closeStore();
  server.close(() => process.exit(0));
}
