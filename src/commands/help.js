export default function register(bot) {
  bot.command("help", async (ctx) => {
    await ctx.reply([
      "AnswerForge commands:",
      "/start - introduction and basic usage",
      "/help - show this help message",
      "/ask <question> - ask a support question from the docs",
      "/escalate <issue> - create a human-review ticket",
      "/feedback helpful - mark the last answer helpful",
      "/feedback not helpful: <reason> - explain what was missing",
      "/status - check your open escalation",
      "/forgetme - clear your stored conversation memory",
      "Admin commands: /admin, /uploaddocs, /reindex, /sources, /unresolved, /close",
      "In groups, mention the bot or reply to it before asking."
    ].join("\n"));
  });
}
