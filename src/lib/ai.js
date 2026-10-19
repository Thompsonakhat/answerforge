import { cfg } from "./config.js";
import { log, safeErr } from "./log.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(response) {
  const text = await response.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export function aiConfigured() {
  return Boolean(cfg.COOKMYBOTS_AI_ENDPOINT && cfg.COOKMYBOTS_AI_KEY);
}

export async function aiChat(messages, meta = {}) {
  if (!aiConfigured()) {
    return { ok: false, status: 412, content: "", error: "AI gateway is not configured" };
  }

  const url = cfg.COOKMYBOTS_AI_ENDPOINT + "/chat";
  const body = {
    messages,
    model: cfg.AI_MODEL || undefined,
    meta: { platform: "telegram", feature: "support_chat", ...meta }
  };

  let attempt = 0;
  while (attempt <= cfg.AI_MAX_RETRIES) {
    attempt += 1;
    const timer = timeoutSignal(cfg.AI_TIMEOUT_MS);
    const started = Date.now();
    try {
      log.info("ai call start", { feature: "chat", attempt, messageCount: messages.length });
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + cfg.COOKMYBOTS_AI_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal: timer.signal
      });
      const { json, text } = await readJson(response);
      if (!response.ok) {
        const err = json?.error?.message || json?.message || json?.error || text || "AI request failed";
        log.warn("ai call failure", { feature: "chat", status: response.status, attempt, err: String(err).slice(0, 300) });
        if ([408, 429, 500, 502, 503, 504].includes(response.status) && attempt <= cfg.AI_MAX_RETRIES) {
          await sleep(750 * attempt);
          continue;
        }
        return { ok: false, status: response.status, content: "", error: String(err) };
      }
      const content = String(json?.output?.content || "").trim();
      if (!content) {
        log.warn("ai call failure", { feature: "chat", status: response.status, attempt, err: "missing output.content" });
        return { ok: false, status: response.status, content: "", error: "AI returned no answer" };
      }
      log.info("ai call success", { feature: "chat", status: response.status, ms: Date.now() - started });
      return { ok: true, status: response.status, content, error: "" };
    } catch (err) {
      const message = err?.name === "AbortError" ? "AI timeout" : safeErr(err);
      log.warn("ai call failure", { feature: "chat", attempt, err: message });
      if (attempt <= cfg.AI_MAX_RETRIES) {
        await sleep(750 * attempt);
        continue;
      }
      return { ok: false, status: err?.name === "AbortError" ? 408 : 0, content: "", error: message };
    } finally {
      timer.clear();
    }
  }

  return { ok: false, status: 0, content: "", error: "AI retries exhausted" };
}

export async function aiEmbeddings(input, meta = {}) {
  if (!aiConfigured()) return { ok: false, vectors: [], error: "AI gateway is not configured" };
  const timer = timeoutSignal(cfg.AI_TIMEOUT_MS);
  try {
    log.info("ai call start", { feature: "embeddings" });
    const response = await fetch(cfg.COOKMYBOTS_AI_ENDPOINT + "/embeddings", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + cfg.COOKMYBOTS_AI_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ input, meta: { platform: "telegram", feature: "knowledge_index", ...meta } }),
      signal: timer.signal
    });
    const { json, text } = await readJson(response);
    if (!response.ok) {
      const err = json?.error?.message || json?.message || json?.error || text || "Embeddings failed";
      log.warn("ai call failure", { feature: "embeddings", status: response.status, err: String(err).slice(0, 300) });
      return { ok: false, vectors: [], error: String(err) };
    }
    const vectors = json?.output?.embeddings || json?.output?.vectors || [];
    log.info("ai call success", { feature: "embeddings", count: Array.isArray(vectors) ? vectors.length : 0 });
    return { ok: true, vectors: Array.isArray(vectors) ? vectors : [], error: "" };
  } catch (err) {
    log.warn("ai call failure", { feature: "embeddings", err: safeErr(err) });
    return { ok: false, vectors: [], error: safeErr(err) };
  } finally {
    timer.clear();
  }
}
