import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { generateQuestionPaper } from "./generator.js";
import { getAssignment, saveAssignment } from "./store.js";
import { publishUpdate } from "./realtime.js";
import type { AssignmentInput } from "./types.js";

const queueName = "assessment-generation";
let queue: Queue<AssignmentInput> | null = null;
let worker: Worker<AssignmentInput> | null = null;

export async function setupQueue() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URL missing; background jobs will run in-process");
    return;
  }
  try {
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
    await connection.connect();
    queue = new Queue<AssignmentInput>(queueName, { connection });
    worker = new Worker<AssignmentInput>(
      queueName,
      (job) => processGeneration(job.id || "", job.data),
      { connection }
    );
    console.log("Redis/BullMQ connected");
  } catch (error) {
    console.warn("Redis unavailable; jobs will run in-process");
    queue = null;
    worker = null;
  }
}

export async function enqueueGeneration(assignmentId: string, data: AssignmentInput) {
  if (queue) {
    await queue.add("generate", data, { jobId: assignmentId, removeOnComplete: true, removeOnFail: true });
    return;
  }
  setTimeout(() => processGeneration(assignmentId, data), 150);
}

async function processGeneration(assignmentId: string, data: AssignmentInput) {
  const record = await getAssignment(assignmentId);
  if (!record) return;
  await update(record.id, "generating", 20, "Structuring prompt from assignment settings");
  await delay(500);
  await update(record.id, "generating", 55, "Generating sections and questions");
  await delay(700);
  const { result } = generateQuestionPaper(data);
  await saveAssignment({ ...record, status: "completed", result, updatedAt: new Date().toISOString() });
  publishUpdate({ assignmentId: record.id, status: "completed", progress: 100, message: "Question paper ready", result });
}

async function update(assignmentId: string, status: "generating", progress: number, message: string) {
  const record = await getAssignment(assignmentId);
  if (record) await saveAssignment({ ...record, status, updatedAt: new Date().toISOString() });
  publishUpdate({ assignmentId, status, progress, message });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function closeQueue() {
  await worker?.close();
  await queue?.close();
}
