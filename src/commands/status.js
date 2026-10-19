import { getOpenEscalation } from "../services/repositories.js";

export default function register(bot) {
  bot.command("status", async (ctx) => {
    const ticket = await getOpenEscalation(ctx.from?.id, ctx.chat?.id);
    if (!ticket) {
      await ctx.reply("You do not have an open escalation in this chat.");
      return;
    }
    await ctx.reply(`Open escalation: ${ticket._id}\nQuestion: ${String(ticket.question || "").slice(0, 300)}`);
  });
}
