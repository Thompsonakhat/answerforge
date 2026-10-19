import { handleSupportQuestion } from "./supportRunner.js";

function mentioned(text, entities, username) {
  if (!username) return false;
  const target = "@" + username.toLowerCase();
  return (entities || []).some((entity) => {
    if (entity.type !== "mention") return false;
    return text.slice(entity.offset, entity.offset + entity.length).toLowerCase() === target;
  });
}

export function registerAgent(bot) {
  bot.on("message:text", async (ctx, next) => {
    const raw = ctx.message?.text || "";
    if (raw.startsWith("/")) return next();

    const chatType = ctx.chat?.type || "private";
    const isPrivate = chatType === "private";
    const botUsername = ctx.me?.username || ctx.botInfo?.username || "";
    const replyFrom = ctx.message?.reply_to_message?.from;
    const isReplyToBot = Boolean(replyFrom?.is_bot && botUsername && String(replyFrom.username || "").toLowerCase() === botUsername.toLowerCase());
    const isMentioned = mentioned(raw, ctx.message?.entities || [], botUsername);

    if (!isPrivate && !isMentioned && !isReplyToBot) return next();

    let question = raw;
    if (botUsername) {
      question = question.replace(new RegExp("@" + botUsername + "\\b", "ig"), "").trim();
    }
    if (!question) {
      await ctx.reply("Ask me a support question and I’ll answer from the approved docs.");
      return;
    }
    await handleSupportQuestion(ctx, question, "natural_message");
  });
}
