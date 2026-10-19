import { clearUserMemory } from "../lib/memory.js";

export default function register(bot) {
  bot.command("forgetme", async (ctx) => {
    await clearUserMemory({ platform: "telegram", userId: ctx.from?.id, chatId: ctx.chat?.id });
    await ctx.reply("Your stored conversation memory for this chat was cleared.");
  });
}
