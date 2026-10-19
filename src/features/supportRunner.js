import { answerQuestion } from "../services/support.js";
import { acquireJob, releaseJob } from "../lib/backpressure.js";
import { log, safeErr } from "../lib/log.js";

export async function handleSupportQuestion(ctx, question, source = "message") {
  const text = String(question || "").trim();
  if (!text) {
    await ctx.reply("Please include a support question. Example: /ask How do I reset my password?");
    return;
  }

  const key = `${ctx.chat?.id || "chat"}:${ctx.from?.id || "user"}`;
  const lock = acquireJob(key);
  if (!lock.ok) {
    await ctx.reply(lock.reason === "chat_busy" ? "I’m working on your last request. Please wait a moment." : "I’m busy right now. Please try again in a moment.");
    return;
  }

  try {
    await ctx.api.sendChatAction(ctx.chat.id, "typing");
    const result = await answerQuestion(ctx, text, source);
    await ctx.reply(result.answer);
  } catch (err) {
    log.error("support pipeline failed", { err: safeErr(err), chatId: ctx.chat?.id });
    await ctx.reply("Sorry, I could not process that support question right now. Please try again or use /escalate.");
  } finally {
    releaseJob(lock);
  }
}
