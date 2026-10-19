import { requireAdmin } from "../services/admin.js";
import { listUnresolved } from "../services/repositories.js";

export default function register(bot) {
  bot.command("unresolved", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const data = await listUnresolved(8);
    const lines = [];
    lines.push("Open escalations:");
    if (!data.escalations.length) lines.push("None");
    for (const e of data.escalations) lines.push(`${e._id} - ${String(e.question || "").slice(0, 120)}`);
    lines.push("\nNegative feedback:");
    if (!data.feedback.length) lines.push("None");
    for (const f of data.feedback) lines.push(`${f._id} - ${String(f.comment || "").slice(0, 120)}`);
    await ctx.reply(lines.join("\n"));
  });
}
