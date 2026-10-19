import { requireAdmin } from "../services/admin.js";
import { ingestKnowledge } from "../services/knowledge.js";
import { downloadTelegramDocument } from "../services/telegramFiles.js";
import { log, safeErr } from "../lib/log.js";

export default function register(bot) {
  bot.command("uploaddocs", async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    try {
      let text = String(ctx.match || "").trim();
      let title = "Admin knowledge entry";
      const document = ctx.message?.document || ctx.message?.reply_to_message?.document;
      if (document) {
        title = document.file_name || title;
        text = await downloadTelegramDocument(ctx, document);
      } else if (text.includes("\n")) {
        const [first, ...rest] = text.split("\n");
        title = first.slice(0, 120) || title;
        text = rest.join("\n").trim() || text;
      }
      if (!text) {
        await ctx.reply("Usage: /uploaddocs Title\nPaste FAQ or documentation text. You can also attach a .txt or .md file with this command as the caption.");
        return;
      }
      const result = await ingestKnowledge({ title, text, ownerId: ctx.from?.id });
      await ctx.reply(`Indexed source ${result.source._id} with ${result.chunks.length} chunks.`);
    } catch (err) {
      log.warn("doc upload failed", { err: safeErr(err) });
      await ctx.reply(`Could not index that document: ${safeErr(err)}`);
    }
  });
}
