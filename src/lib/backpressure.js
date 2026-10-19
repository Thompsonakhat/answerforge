import { cfg } from "./config.js";

const locks = new Set();
let globalInFlight = 0;

export function acquireJob(key) {
  const lockKey = String(key || "global");
  if (locks.has(lockKey)) return { ok: false, reason: "chat_busy" };
  if (globalInFlight >= cfg.GLOBAL_AI_CAP) return { ok: false, reason: "global_busy" };
  locks.add(lockKey);
  globalInFlight += 1;
  return { ok: true, key: lockKey };
}

export function releaseJob(lock) {
  if (!lock?.ok) return;
  locks.delete(lock.key);
  globalInFlight = Math.max(0, globalInFlight - 1);
}
