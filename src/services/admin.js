import { cfg } from "../lib/config.js";
import { getUserRole } from "./repositories.js";

export async function isAdmin(ctx) {
  const userId = String(ctx.from?.id || "");
  if (!userId) return false;
  if (cfg.ADMIN_USER_IDS.includes(userId)) return true;
  const role = await getUserRole("telegram", userId);
  return role === "admin";
}

export async function requireAdmin(ctx) {
  if (await isAdmin(ctx)) return true;
  await ctx.reply("This command is restricted to admins. Add your Telegram user ID to ADMIN_USER_IDS to enable admin access.");
  return false;
}
