import crypto from "node:crypto";
import { cfg } from "../lib/config.js";
import { createKnowledgeSource, saveKnowledgeChunks, listKnowledgeChunks, listSources, reindexSources } from "./repositories.js";

function checksum(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 500);
}

function chunkText(text, size = 1200, overlap = 150) {
  const clean = String(text || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const chunks = [];
  let index = 0;
  while (index < clean.length) {
    const part = clean.slice(index, index + size).trim();
    if (part) chunks.push(part);
    index += size - overlap;
  }
  return chunks;
}

export async function ingestKnowledge({ title, text, ownerId, tags = [] }) {
  const content = String(text || "").slice(0, cfg.MAX_UPLOAD_CHARS).trim();
  if (content.length < 20) throw new Error("Document text is too short to index.");
  const source = await createKnowledgeSource({
    title: String(title || "Untitled source").slice(0, 160),
    owner: String(ownerId || ""),
    checksum: checksum(content),
    tags,
    kind: "text",
    status: "active"
  });
  const parts = chunkText(content);
  const docs = parts.map((part, i) => ({
    sourceId: String(source._id),
    chunkIndex: i,
    text: part,
    title: source.title,
    path: source.title,
    tags,
    language: "unknown",
    terms: tokenize(part),
    visibility: "active"
  }));
  const chunks = await saveKnowledgeChunks(docs);
  return { source, chunks };
}

export async function searchKnowledge(query, topK = cfg.KNOWLEDGE_TOP_K) {
  const terms = new Set(tokenize(query));
  if (!terms.size) return [];
  const chunks = await listKnowledgeChunks();
  const scored = chunks.map((chunk) => {
    const chunkTerms = Array.isArray(chunk.terms) ? chunk.terms : tokenize(chunk.text);
    let hits = 0;
    for (const term of new Set(chunkTerms)) {
      if (terms.has(term)) hits += 1;
    }
    const score = hits / Math.max(terms.size, 1);
    return { ...chunk, score };
  }).filter((chunk) => chunk.score > 0);
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

export async function getSources(limit) {
  return listSources(limit);
}

export async function refreshIndex(target) {
  await reindexSources(target || "all");
}
