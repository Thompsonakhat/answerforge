import { ObjectId } from "mongodb";
import { getDb } from "../lib/db.js";
import { log, safeErr } from "../lib/log.js";

const mem = {
  users: new Map(),
  conversations: new Map(),
  messages: [],
  sources: new Map(),
  chunks: new Map(),
  feedback: [],
  escalations: new Map()
};

function id() {
  return new ObjectId().toString();
}

function trimStore(array, max = 1000) {
  while (array.length > max) array.shift();
}

async function collection(name) {
  const db = getDb();
  return db ? db.collection(name) : null;
}

export async function upsertUser(user) {
  const now = new Date();
  const userId = String(user.userId || "unknown");
  const platform = user.platform || "telegram";
  const mutable = { ...user, userId, platform, lastActivityAt: now, updatedAt: now };
  delete mutable._id;
  delete mutable.createdAt;
  const col = await collection("users");
  if (!col) {
    const key = platform + ":" + userId;
    mem.users.set(key, { ...(mem.users.get(key) || { createdAt: now }), ...mutable });
    return;
  }
  try {
    await col.updateOne(
      { platform, userId },
      { $setOnInsert: { createdAt: now }, $set: mutable },
      { upsert: true }
    );
  } catch (err) {
    log.error("db write failed", { collection: "users", operation: "updateOne", err: safeErr(err) });
  }
}

export async function getUserRole(platform, userId) {
  const key = String(platform || "telegram") + ":" + String(userId || "unknown");
  const col = await collection("users");
  if (!col) return mem.users.get(key)?.role || "user";
  try {
    const user = await col.findOne({ platform: String(platform || "telegram"), userId: String(userId || "unknown") });
    return user?.role || "user";
  } catch (err) {
    log.error("db read failed", { collection: "users", operation: "findOne", err: safeErr(err) });
    return "user";
  }
}

export async function saveMessage(doc) {
  const saved = { _id: id(), ...doc, createdAt: new Date() };
  const col = await collection("messages");
  if (!col) {
    mem.messages.push(saved);
    trimStore(mem.messages);
    return saved;
  }
  try {
    const res = await col.insertOne(saved);
    return { ...saved, _id: res.insertedId.toString() };
  } catch (err) {
    log.error("db write failed", { collection: "messages", operation: "insertOne", err: safeErr(err) });
    return saved;
  }
}

export async function getLastAssistantMessage(userId, chatId) {
  const q = { platform: "telegram", userId: String(userId || "unknown"), chatId: String(chatId || "") };
  const col = await collection("messages");
  if (!col) return [...mem.messages].reverse().find((m) => m.role === "assistant" && m.userId === q.userId && m.chatId === q.chatId) || null;
  try {
    return await col.findOne({ ...q, role: "assistant" }, { sort: { createdAt: -1 } });
  } catch (err) {
    log.error("db read failed", { collection: "messages", operation: "findOne", err: safeErr(err) });
    return null;
  }
}

export async function getLastUserQuestion(userId, chatId) {
  const q = { platform: "telegram", userId: String(userId || "unknown"), chatId: String(chatId || "") };
  const col = await collection("messages");
  if (!col) return [...mem.messages].reverse().find((m) => m.role === "user" && m.userId === q.userId && m.chatId === q.chatId)?.text || "";
  try {
    const row = await col.findOne({ ...q, role: "user" }, { sort: { createdAt: -1 } });
    return row?.text || "";
  } catch (err) {
    log.error("db read failed", { collection: "messages", operation: "findOne", err: safeErr(err) });
    return "";
  }
}

export async function createKnowledgeSource(doc) {
  const now = new Date();
  const source = { _id: id(), status: "active", version: 1, ...doc, createdAt: now, updatedAt: now, lastIndexedAt: now };
  const col = await collection("knowledgesources");
  if (!col) {
    mem.sources.set(source._id, source);
    return source;
  }
  try {
    const res = await col.insertOne(source);
    return { ...source, _id: res.insertedId.toString() };
  } catch (err) {
    log.error("db write failed", { collection: "knowledgesources", operation: "insertOne", err: safeErr(err) });
    mem.sources.set(source._id, source);
    return source;
  }
}

export async function saveKnowledgeChunks(chunks) {
  const docs = chunks.map((chunk) => ({ _id: id(), visibility: "active", revision: 1, ...chunk, createdAt: new Date(), updatedAt: new Date() }));
  const col = await collection("knowledgechunks");
  if (!col) {
    for (const doc of docs) mem.chunks.set(doc._id, doc);
    return docs;
  }
  try {
    if (docs.length) await col.insertMany(docs);
  } catch (err) {
    log.error("db write failed", { collection: "knowledgechunks", operation: "insertMany", err: safeErr(err) });
  }
  return docs;
}

export async function listKnowledgeChunks() {
  const col = await collection("knowledgechunks");
  if (!col) return [...mem.chunks.values()].filter((c) => c.visibility === "active");
  try {
    return await col.find({ visibility: "active" }).limit(2000).toArray();
  } catch (err) {
    log.error("db read failed", { collection: "knowledgechunks", operation: "find", err: safeErr(err) });
    return [];
  }
}

export async function listSources(limit = 20) {
  const col = await collection("knowledgesources");
  if (!col) return [...mem.sources.values()].slice(-limit).reverse();
  try {
    return await col.find({}).sort({ updatedAt: -1 }).limit(limit).toArray();
  } catch (err) {
    log.error("db read failed", { collection: "knowledgesources", operation: "find", err: safeErr(err) });
    return [];
  }
}

export async function reindexSources(target = "all") {
  const now = new Date();
  const col = await collection("knowledgesources");
  if (!col) {
    for (const source of mem.sources.values()) {
      if (target === "all" || source._id === target) {
        source.lastIndexedAt = now;
        source.updatedAt = now;
        source.status = "active";
      }
    }
    return;
  }
  const filter = target === "all" ? {} : { _id: target };
  try {
    await col.updateMany(filter, { $set: { lastIndexedAt: now, updatedAt: now, status: "active" } });
  } catch (err) {
    log.error("db write failed", { collection: "knowledgesources", operation: "updateMany", err: safeErr(err) });
  }
}

export async function saveFeedback(doc) {
  const saved = { _id: id(), ...doc, reviewerState: "new" };
  const col = await collection("feedback");
  if (!col) {
    mem.feedback.push(saved);
    trimStore(mem.feedback);
    return saved;
  }
  try {
    await col.insertOne(saved);
  } catch (err) {
    log.error("db write failed", { collection: "feedback", operation: "insertOne", err: safeErr(err) });
  }
  return saved;
}

export async function createEscalation(doc) {
  const saved = { _id: id(), status: "open", ...doc, createdAt: new Date(), updatedAt: new Date() };
  const col = await collection("escalations");
  if (!col) {
    mem.escalations.set(saved._id, saved);
    return saved;
  }
  try {
    await col.insertOne(saved);
  } catch (err) {
    log.error("db write failed", { collection: "escalations", operation: "insertOne", err: safeErr(err) });
  }
  return saved;
}

export async function getOpenEscalation(userId, chatId) {
  const col = await collection("escalations");
  if (!col) return [...mem.escalations.values()].reverse().find((e) => e.userId === String(userId) && e.chatId === String(chatId) && e.status === "open") || null;
  try {
    return await col.findOne({ platform: "telegram", userId: String(userId), chatId: String(chatId), status: "open" }, { sort: { createdAt: -1 } });
  } catch (err) {
    log.error("db read failed", { collection: "escalations", operation: "findOne", err: safeErr(err) });
    return null;
  }
}

export async function listUnresolved(limit = 10) {
  const colEsc = await collection("escalations");
  const colFeedback = await collection("feedback");
  if (!colEsc || !colFeedback) {
    return {
      escalations: [...mem.escalations.values()].filter((e) => e.status === "open").slice(-limit).reverse(),
      feedback: mem.feedback.filter((f) => f.rating !== "helpful").slice(-limit).reverse()
    };
  }
  try {
    const escalations = await colEsc.find({ status: "open" }).sort({ createdAt: -1 }).limit(limit).toArray();
    const feedback = await colFeedback.find({ rating: { $ne: "helpful" } }).sort({ createdAt: -1 }).limit(limit).toArray();
    return { escalations, feedback };
  } catch (err) {
    log.error("db read failed", { collection: "escalations/feedback", operation: "find", err: safeErr(err) });
    return { escalations: [], feedback: [] };
  }
}

export async function closeEscalation(escalationId, note, adminId) {
  const now = new Date();
  const col = await collection("escalations");
  if (!col) {
    const row = mem.escalations.get(escalationId);
    if (!row) return false;
    row.status = "closed";
    row.resolutionSummary = note;
    row.assignedAdmin = String(adminId || "");
    row.updatedAt = now;
    return true;
  }
  try {
    const res = await col.updateOne(
      { _id: escalationId, status: { $ne: "closed" } },
      { $set: { status: "closed", resolutionSummary: note, assignedAdmin: String(adminId || ""), updatedAt: now } }
    );
    return res.modifiedCount > 0;
  } catch (err) {
    log.error("db write failed", { collection: "escalations", operation: "updateOne", err: safeErr(err) });
    return false;
  }
}
