import { MongoClient } from "mongodb";
import { log, safeErr } from "./log.js";

let client = null;
let db = null;
let disabled = false;

export async function connectDb(mongoUri) {
  if (!mongoUri) {
    disabled = true;
    log.warn("db disabled", { reason: "MONGODB_URI missing; using in-memory fallback" });
    return null;
  }
  if (db) return db;
  try {
    client = new MongoClient(mongoUri, { maxPoolSize: 5, ignoreUndefined: true });
    await client.connect();
    db = client.db();
    await ensureIndexes(db);
    log.info("db connected", { mongoSet: true });
    return db;
  } catch (err) {
    disabled = true;
    log.error("db connect failed", { err: safeErr(err) });
    return null;
  }
}

export function getDb() {
  return disabled ? null : db;
}

export async function closeDb() {
  if (!client) return;
  try {
    await client.close();
    log.info("db closed");
  } catch (err) {
    log.warn("db close failed", { err: safeErr(err) });
  }
}

async function safeIndex(database, collection, spec, options = {}) {
  if (Object.keys(spec).length === 1 && spec._id === 1) return;
  try {
    await database.collection(collection).createIndex(spec, options);
  } catch (err) {
    log.error("db index failed", { collection, operation: "createIndex", err: safeErr(err) });
  }
}

export async function ensureIndexes(database) {
  await safeIndex(database, "users", { platform: 1, userId: 1 }, { unique: true });
  await safeIndex(database, "conversations", { platform: 1, chatId: 1, userId: 1 });
  await safeIndex(database, "messages", { platform: 1, userId: 1, createdAt: -1 });
  await safeIndex(database, "memory_messages", { platform: 1, userId: 1, chatId: 1, ts: -1 });
  await safeIndex(database, "knowledgesources", { status: 1, updatedAt: -1 });
  await safeIndex(database, "knowledgechunks", { sourceId: 1, visibility: 1 });
  await safeIndex(database, "feedback", { userId: 1, createdAt: -1 });
  await safeIndex(database, "escalations", { status: 1, createdAt: -1 });
}
