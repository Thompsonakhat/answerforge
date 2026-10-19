import { requireAdmin } from "../services/admin.js";
import { getSources } from "../services/knowledge.js";

export default function register(bot) {
  bot.command("sources", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const sources = await getSources(10);
    if (!sources.length) {
      await ctx.reply("No indexed sources yet. Use /uploaddocs to add one.");
      return;
    }
    await ctx.reply(sources.map((s) => `${s._id} - ${s.title || "Untitled"} - ${s.status || "active"}`).join("\n"));
  });
}
