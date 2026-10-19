import "dotenv/config";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function importMaybe(path) {
  try {
    return await import(path);
  } catch (err) {
    console.error("Boot import failed", { path, code: err?.code, message: err?.message });
    if (err?.code === "ERR_MODULE_NOT_FOUND") {
      console.error("Check that every relative import includes .js and that the file exists.");
    }
    throw err;
  }
}

process.on("unhandledRejection", (err) => {
  console.error("UnhandledRejection", err?.message || String(err));
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("UncaughtException", err?.message || String(err));
  process.exit(1);
});

async function boot() {
  const { cfg, logEnvSanity } = await importMaybe("./lib/config.js");
  const { log, safeErr } = await importMaybe("./lib/log.js");
  const { connectDb, closeDb } = await importMaybe("./lib/db.js");
  const { createBot } = await importMaybe("./bot.js");
  const { registerCommands } = await importMaybe("./commands/loader.js");
  const { registerAgent } = await importMaybe("./features/agent.js");
  const { run } = await import("@grammyjs/runner");

  log.info("boot start");
  logEnvSanity(log);

  if (!cfg.TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is required. Add it in the Config tab or .env, then redeploy.");
    process.exit(1);
  }

  await connectDb(cfg.MONGODB_URI);

  const bot = createBot(cfg.TELEGRAM_BOT_TOKEN);
  await bot.init();
  await registerCommands(bot);
  registerAgent(bot);

  await bot.api.setMyCommands([
    { command: "start", description: "Introduction and basic usage" },
    { command: "help", description: "Show commands" },
    { command: "ask", description: "Ask a support question" },
    { command: "escalate", description: "Create a human-review ticket" },
    { command: "feedback", description: "Rate the last answer" },
    { command: "status", description: "Check open support status" },
    { command: "forgetme", description: "Clear stored memory" },
    { command: "admin", description: "Admin options" },
    { command: "uploaddocs", description: "Admin: index docs" },
    { command: "reindex", description: "Admin: refresh index" },
    { command: "sources", description: "Admin: list sources" },
    { command: "unresolved", description: "Admin: review unresolved" },
    { command: "close", description: "Admin: close escalation" }
  ]);

  let stopping = false;
  let runner = null;
  let backoff = 2000;

  const memTimer = setInterval(() => {
    const m = process.memoryUsage();
    log.info("memory", { rssMB: Math.round(m.rss / 1e6), heapUsedMB: Math.round(m.heapUsed / 1e6) });
  }, 60000);
  memTimer.unref?.();

  async function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    log.info("shutdown requested", { signal });
    try { await runner?.stop?.(); } catch (err) { log.warn("runner stop failed", { err: safeErr(err) }); }
    await closeDb();
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  while (!stopping) {
    try {
      log.info("polling start", { concurrency: cfg.RUNNER_CONCURRENCY });
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      runner = run(bot, { sink: { concurrency: cfg.RUNNER_CONCURRENCY } });
      backoff = 2000;
      await runner.task();
    } catch (err) {
      const msg = safeErr(err);
      log.error("polling failure", { err: msg });
      if (stopping) break;
      const isConflict = /409|conflict|terminated by other getUpdates/i.test(msg);
      await sleep(isConflict ? backoff : Math.min(backoff, 10000));
      backoff = Math.min(backoff * 2, 20000);
    }
  }
}

boot().catch((err) => {
  console.error("Boot error", { code: err?.code, message: err?.message || String(err) });
  process.exit(1);
});
