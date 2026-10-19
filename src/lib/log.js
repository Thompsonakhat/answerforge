export function safeErr(err) {
  return err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    String(err);
}

function redactValue(value) {
  const text = String(value || "");
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/bot\d+:[A-Za-z0-9_-]+/gi, "bot[redacted]")
    .replace(/COOKMYBOTS_AI_KEY=[^\s]+/gi, "COOKMYBOTS_AI_KEY=[redacted]");
}

function cleanMeta(meta = {}) {
  const out = {};
  for (const [key, value] of Object.entries(meta || {})) {
    if (/token|secret|key|authorization/i.test(key)) {
      out[key] = Boolean(value);
    } else if (typeof value === "string") {
      out[key] = redactValue(value).slice(0, 500);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function write(level, message, meta = {}) {
  const row = {
    level,
    message,
    time: new Date().toISOString(),
    ...cleanMeta(meta)
  };
  const line = JSON.stringify(row);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta)
};
