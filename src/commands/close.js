import { requireAdmin } from "../services/admin.js";
import { closeEscalation } from "../services/repositories.js";

export default function register(bot) {
  bot.command("close", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const raw = String(ctx.match || "").trim();
    const [ticketId, ...noteParts] = raw.split(/\s+/);
    const note = noteParts.join(" ").trim();
    if (!ticketId || !note) {
      await ctx.reply("Usage: /close ESCALATIONID Resolution note");
      return;
    }
    const ok = await closeEscalation(ticketId, note, ctx.from?.id);
    await ctx.reply(ok ? `Closed escalation ${ticketId}.` : "I could not find an open escalation with that ID.");
  });
}
