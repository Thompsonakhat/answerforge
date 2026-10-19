# AnswerForge Bot

AnswerForge is a Telegram support automation agent. It answers customer questions from approved documentation and FAQs, collects feedback, and escalates unresolved questions to humans.

## Features

- Telegram bot built with grammY.
- Long polling via @grammyjs/runner for Render-friendly deploys.
- Retrieval-augmented answers from indexed docs and FAQs.
- Admin-only knowledge ingestion with /uploaddocs.
- Feedback capture with /feedback.
- Escalation tickets with /escalate, /unresolved, and /close.
- MongoDB persistence with in-memory fallback when MONGODB_URI is missing.
- CookMyBots AI Gateway integration for grounded answer generation.
- Per-chat and global AI backpressure to avoid runaway memory usage.

## Architecture

src/index.js boots the bot, validates env, connects MongoDB, registers commands, registers the AI support agent, clears Telegram webhooks, and starts long polling.

src/bot.js creates the grammY bot and global error handling.

src/commands contains user and admin commands.

src/features contains the catch-all support agent and support runner.

src/services contains knowledge ingestion, retrieval, admin checks, repositories, Telegram file download, and support answer generation.

src/lib contains config, logging, MongoDB, AI Gateway, memory, backpressure, and the runtime bot profile.

## Setup

Prerequisites:

- Node.js 18 or newer.
- A Telegram bot token from BotFather.
- MongoDB for production persistence.
- CookMyBots AI Gateway credentials for AI-generated answers.

Install:

bash
npm install


Configure:

bash
cp .env.sample .env


Required env:

- TELEGRAM_BOT_TOKEN: Telegram bot token.

Recommended env:

- MONGODB_URI: MongoDB connection string.
- COOKMYBOTS_AI_ENDPOINT: CookMyBots AI Gateway base URL, such as https://api.cookmybots.com/api/ai.
- COOKMYBOTS_AI_KEY: AI Gateway key.
- ADMIN_USER_IDS: comma-separated Telegram numeric user IDs.

Run locally:

bash
npm run dev


Start production:

bash
npm start


Build on Render:

bash
npm run build


## Commands

/start
Expected output: a short welcome explaining AnswerForge.

/help
Expected output: all user and admin commands.

/ask How do I reset my password?
Expected output: a grounded support answer from indexed sources, or an uncertainty message with escalation guidance.

/escalate I still need help with billing
Expected output: an escalation ID.

/feedback helpful
Expected output: feedback saved confirmation.

/feedback not helpful: missing pricing details
Expected output: feedback saved confirmation.

/status
Expected output: open escalation status or no open escalation.

/forgetme
Expected output: memory cleared confirmation.

/admin
Expected output: admin options if the user is allowed.

/uploaddocs Password reset FAQ
Users can reset passwords from Settings > Security > Reset password.
Expected output: indexed source ID and chunk count.

/reindex all
Expected output: reindex confirmation.

/sources
Expected output: indexed source list.

/unresolved
Expected output: open escalations and negative feedback.

/close ESCALATIONID Resolved by sending account recovery steps
Expected output: close confirmation.

## Integrations

Telegram Bot API is accessed through grammY. The bot uses getUpdates long polling and clears webhooks before polling.

CookMyBots AI Gateway is called at POST {COOKMYBOTS_AI_ENDPOINT}/chat. Responses are parsed from output.content only. If the gateway is unavailable or not configured, AnswerForge falls back to retrieval-only answers.

MongoDB stores users, conversations, messages, memory_messages, knowledgesources, knowledgechunks, feedback, and escalations. Indexes are created only on application fields, never on _id.

## Database notes

users stores Telegram profile, role, status, and activity timestamps.

messages stores user and assistant turns, retrieved chunk IDs, confidence, and escalation status.

memory_messages stores recent long-term conversation turns.

knowledgesources stores uploaded source metadata.

knowledgechunks stores searchable chunks and lexical terms.

feedback stores ratings and comments.

escalations stores human-review tickets and resolution notes.

## Deployment

Use one Render web service or worker service running npm start. Set TELEGRAM_BOT_TOKEN at minimum. Add MONGODB_URI, COOKMYBOTS_AI_ENDPOINT, COOKMYBOTS_AI_KEY, and ADMIN_USER_IDS for production.

The bot logs env sanity as booleans only. It never logs tokens or Authorization headers.

## Troubleshooting

If the bot exits on boot, verify TELEGRAM_BOT_TOKEN is set.

If admin commands are denied, set ADMIN_USER_IDS to your numeric Telegram user ID.

If answers say no confident docs were found, add docs with /uploaddocs.

If AI answers are unavailable, verify COOKMYBOTS_AI_ENDPOINT is a base URL and COOKMYBOTS_AI_KEY is set.

If Telegram polling reports a 409 conflict during deploy overlap, the bot backs off and retries automatically.

## Extending

Add new commands under src/commands and export a default register(bot) function. The loader registers command files automatically before the catch-all AI agent.

Add new services under src/services and shared utilities under src/lib.
