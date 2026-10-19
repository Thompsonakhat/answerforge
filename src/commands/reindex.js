import { requireAdmin } from "../services/admin.js";
import { refreshIndex } from "../services/knowledge.js";

export default function register(bot) {
  bot.command("reindex", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const target = String(ctx.match || "all").trim() || "all";
    await refreshIndex(target);
    await ctx.reply(`Reindex requested for ${target}.`);
  });
}
