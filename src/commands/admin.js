import { requireAdmin } from "../services/admin.js";

export default function register(bot) {
  bot.command("admin", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    await ctx.reply([
      "Admin options:",
      "/uploaddocs <title and content> - index FAQ or documentation text",
      "/reindex all - refresh source index metadata",
      "/sources - list indexed sources",
      "/unresolved - list open escalations and negative feedback",
      "/close <id> <resolution note> - close an escalation"
    ].join("\n"));
  });
}
