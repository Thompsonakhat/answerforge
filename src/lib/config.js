function numberEnv(name, fallback) {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function listEnv(name) {
  return String(process.env[name] || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export const cfg = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  MONGODB_URI: process.env.MONGODB_URI || "",
  COOKMYBOTS_AI_ENDPOINT: (process.env.COOKMYBOTS_AI_ENDPOINT || "").replace(/\/+$/, ""),
  COOKMYBOTS_AI_KEY: process.env.COOKMYBOTS_AI_KEY || "",
  AI_TIMEOUT_MS: numberEnv("AI_TIMEOUT_MS", 600000),
  AI_MAX_RETRIES: numberEnv("AI_MAX_RETRIES", 2),
  CONCURRENCY: numberEnv("CONCURRENCY", 20),
  AI_MODEL: process.env.AI_MODEL || "",
  ADMIN_USER_IDS: listEnv("ADMIN_USER_IDS"),
  SUPPORT_CONFIDENCE_THRESHOLD: Number(process.env.SUPPORT_CONFIDENCE_THRESHOLD || 0.35),
  KNOWLEDGE_TOP_K: numberEnv("KNOWLEDGE_TOP_K", 5),
  MAX_UPLOAD_BYTES: numberEnv("MAX_UPLOAD_BYTES", 1048576),
  MAX_UPLOAD_CHARS: numberEnv("MAX_UPLOAD_CHARS", 120000),
  GLOBAL_AI_CAP: numberEnv("GLOBAL_AI_CAP", 1),
  RUNNER_CONCURRENCY: numberEnv("RUNNER_CONCURRENCY", 1)
};

export function logEnvSanity(log) {
  log.info("config loaded", {
    telegramTokenSet: Boolean(cfg.TELEGRAM_BOT_TOKEN),
    mongoSet: Boolean(cfg.MONGODB_URI),
    aiEndpointSet: Boolean(cfg.COOKMYBOTS_AI_ENDPOINT),
    aiKeySet: Boolean(cfg.COOKMYBOTS_AI_KEY),
    adminIdsConfigured: cfg.ADMIN_USER_IDS.length > 0
  });
}
