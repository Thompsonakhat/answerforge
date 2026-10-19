export default function register(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply([
      "Welcome to AnswerForge.",
      "Ask a support question and I’ll answer from approved docs and FAQs when available.",
      "Use /ask for an explicit question, /escalate if you need a human, and /help to see all commands."
    ].join("\n"));
  });
}
