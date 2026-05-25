import { MongoClient, type Collection } from "mongodb";
import type { AssignmentRecord } from "./types.js";

const memory = new Map<string, AssignmentRecord>();

let client: MongoClient | null = null;
let collection: Collection<AssignmentRecord> | null = null;

export async function connectStore() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 1200 });
    await client.connect();
    collection = client.db().collection<AssignmentRecord>("assignments");
    await collection.createIndex({ id: 1 }, { unique: true });
    console.log("MongoDB connected");
  } catch (error) {
    console.warn("MongoDB unavailable; using in-memory store");
    collection = null;
    await client?.close().catch(() => undefined);
    client = null;
  }
}

export async function saveAssignment(record: AssignmentRecord) {
  memory.set(record.id, record);
  if (collection) {
    await collection.updateOne({ id: record.id }, { $set: record }, { upsert: true });
  }
  return record;
}

export async function getAssignment(id: string) {
  return (collection ? await collection.findOne({ id }) : memory.get(id)) || null;
}

export async function listAssignments() {
  if (collection) {
    return collection.find().sort({ createdAt: -1 }).limit(50).toArray();
  }
  return [...memory.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function closeStore() {
  await client?.close();
}
