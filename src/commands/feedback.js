import { getLastAssistantMessage, saveFeedback } from "../services/repositories.js";

export default function register(bot) {
  bot.command("feedback", async (ctx) => {
    const text = String(ctx.match || "").trim();
    if (!text) {
      await ctx.reply("Usage: /feedback helpful or /feedback not helpful: missing pricing details");
      return;
    }
    const lower = text.toLowerCase();
    const rating = lower.startsWith("helpful") ? "helpful" : lower.startsWith("not helpful") ? "not_helpful" : "comment";
    const last = await getLastAssistantMessage(ctx.from?.id, ctx.chat?.id);
    await saveFeedback({
      platform: "telegram",
      userId: String(ctx.from?.id || "unknown"),
      chatId: String(ctx.chat?.id || ""),
      messageId: String(last?._id || ""),
      rating,
      comment: text,
      reasonCategory: rating === "not_helpful" ? "missing_or_incorrect" : "general"
    });
    await ctx.reply("Thanks. Your feedback was saved for review.");
  });
}
