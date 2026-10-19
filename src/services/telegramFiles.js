import { cfg } from "../lib/config.js";

export async function downloadTelegramDocument(ctx, document) {
  if (!document) throw new Error("No document attached.");
  if (document.file_size && document.file_size > cfg.MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large. Limit is ${cfg.MAX_UPLOAD_BYTES} bytes.`);
  }
  const mime = String(document.mime_type || "").toLowerCase();
  const name = String(document.file_name || "document.txt");
  const allowed = mime.startsWith("text/") || /\.(txt|md|markdown|csv|json)$/i.test(name);
  if (!allowed) throw new Error("Please upload a text, Markdown, CSV, or JSON document for indexing.");

  const file = await ctx.api.getFile(document.file_id);
  if (!file.file_path) throw new Error("Telegram did not return a file path.");
  const url = `https://api.telegram.org/file/bot${cfg.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not download the Telegram file.");
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString("utf8").slice(0, cfg.MAX_UPLOAD_CHARS);
}
