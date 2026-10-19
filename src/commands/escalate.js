import { createEscalation, getLastUserQuestion } from "../services/repositories.js";

export default function register(bot) {
  bot.command("escalate", async (ctx) => {
    const userId = String(ctx.from?.id || "unknown");
    const chatId = String(ctx.chat?.id || "");
    const provided = String(ctx.match || "").trim();
    const question = provided || await getLastUserQuestion(userId, chatId) || "User requested human support.";
    const ticket = await createEscalation({
      platform: "telegram",
      userId,
      chatId,
      conversationId: chatId,
      question,
      reason: "user_requested"
    });
    await ctx.reply(`I created escalation ${ticket._id}. A human can review it from /unresolved.`);
  });
}
