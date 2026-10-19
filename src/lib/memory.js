import { getDb } from "./db.js";
import { log, safeErr } from "./log.js";

const collectionName = "memory_messages";
const fallback = [];
const maxFallback = 500;

function normalize({ platform, userId, chatId }) {
  return {
    platform: String(platform || "telegram"),
    userId: String(userId || "unknown"),
    chatId: chatId ? String(chatId) : ""
  };
}

export async function addTurn({ platform = "telegram", userId, chatId, role, text }) {
  const doc = {
    ...normalize({ platform, userId, chatId }),
    role: role === "assistant" ? "assistant" : "user",
    text: String(text || "").slice(0, 4000),
    ts: new Date()
  };
  const db = getDb();
  if (!db) {
    fallback.push(doc);
    while (fallback.length > maxFallback) fallback.shift();
    return;
  }
  try {
    await db.collection(collectionName).insertOne(doc);
  } catch (err) {
    log.error("db write failed", { collection: collectionName, operation: "insertOne", err: safeErr(err) });
  }
}

export async function getRecentTurns({ platform = "telegram", userId, chatId, limit = 12 }) {
  const q = normalize({ platform, userId, chatId });
  const db = getDb();
  if (!db) {
    return fallback
      .filter((m) => m.platform === q.platform && m.userId === q.userId && (!q.chatId || m.chatId === q.chatId))
      .slice(-limit)
      .map((m) => ({ role: m.role, text: m.text }));
  }
  try {
    const rows = await db.collection(collectionName)
      .find(q)
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();
    return rows.reverse().map((m) => ({ role: m.role, text: m.text }));
  } catch (err) {
    log.error("db read failed", { collection: collectionName, operation: "find", err: safeErr(err) });
    return [];
  }
}

export async function clearUserMemory({ platform = "telegram", userId, chatId }) {
  const q = normalize({ platform, userId, chatId });
  const db = getDb();
  if (!db) {
    for (let i = fallback.length - 1; i >= 0; i -= 1) {
      const m = fallback[i];
      if (m.platform === q.platform && m.userId === q.userId && (!q.chatId || m.chatId === q.chatId)) fallback.splice(i, 1);
    }
    return;
  }
  try {
    await db.collection(collectionName).deleteMany(q);
  } catch (err) {
    log.error("db write failed", { collection: collectionName, operation: "deleteMany", err: safeErr(err) });
  }
}
