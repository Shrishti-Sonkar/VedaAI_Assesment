import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { generateQuestionPaper } from "./generator.js";
import { getAssignment, saveAssignment } from "./store.js";
import { publishUpdate } from "./realtime.js";
import type { AssignmentInput } from "./types.js";

const queueName = "assessment-generation";
let queue: Queue<AssignmentInput> | null = null;
let worker: Worker<AssignmentInput> | null = null;
let queueConnection: Redis | null = null;
let workerConnection: Redis | null = null;

export async function setupQueue() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URL missing; background jobs will run in-process");
    return;
  }
  try {
    // 1. Connection for Queue
    queueConnection = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
    queueConnection.on("error", (err) => {
      console.error("Redis Queue connection error:", err);
    });
    await queueConnection.connect();

    // 2. Connection for Worker (must be separate!)
    workerConnection = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
    workerConnection.on("error", (err) => {
      console.error("Redis Worker connection error:", err);
    });
    await workerConnection.connect();

    queue = new Queue<AssignmentInput>(queueName, { connection: queueConnection });
    queue.on("error", (err) => console.error("BullMQ Queue error:", err));

    worker = new Worker<AssignmentInput>(
      queueName,
      (job) => processGeneration(job.id || "", job.data),
      { connection: workerConnection }
    );
    worker.on("error", (err) => console.error("BullMQ Worker error:", err));

    console.log("Redis/BullMQ connected successfully");
  } catch (error) {
    console.error("Redis unavailable; falling back to in-process jobs:", error);
    queue = null;
    worker = null;
    queueConnection = null;
    workerConnection = null;
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
  await workerConnection?.quit().catch(() => undefined);
  await queueConnection?.quit().catch(() => undefined);
}
