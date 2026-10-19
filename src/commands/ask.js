import { handleSupportQuestion } from "../features/supportRunner.js";

export default function register(bot) {
  bot.command("ask", async (ctx) => {
    await handleSupportQuestion(ctx, String(ctx.match || ""), "ask_command");
  });
}
