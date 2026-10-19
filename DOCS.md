# AnswerForge Bot

AnswerForge is a Telegram support automation bot. It answers support questions from approved docs and FAQs, stores feedback, and creates escalation tickets when an answer is missing or uncertain.

## Commands

### /start
Usage: /start
Introduces AnswerForge and explains how to ask support questions.

### /help
Usage: /help
Shows all user and admin commands.

### /ask
Usage: /ask How do I reset my password?
Submits a support question explicitly. The bot retrieves relevant knowledge chunks and generates a grounded answer.

### /escalate
Usage: /escalate I still need help with billing
Creates a human-review escalation for the current issue.

### /feedback
Usage: /feedback helpful
Usage: /feedback not helpful: missing pricing details
Stores feedback about the last answer.

### /status
Usage: /status
Shows whether you have an open escalation in the current chat.

### /forgetme
Usage: /forgetme
Clears your stored conversation memory for the current chat.

### /admin
Usage: /admin
Admin-only. Shows knowledge-base and escalation admin options.

### /uploaddocs
Usage: /uploaddocs Title followed by FAQ or documentation text
Admin-only. Indexes text, Markdown, CSV, or JSON docs. You can also attach a supported text document with /uploaddocs as the caption.

### /reindex
Usage: /reindex all
Usage: /reindex sourceid
Admin-only. Refreshes source index metadata.

### /sources
Usage: /sources
Admin-only. Lists indexed knowledge sources.

### /unresolved
Usage: /unresolved
Admin-only. Lists open escalations and negative feedback.

### /close
Usage: /close ESCALATIONID Resolved by sending account recovery steps
Admin-only. Closes an escalation with a resolution note.

## Environment variables

TELEGRAM_BOT_TOKEN is required and stores the Telegram bot token.

MONGODB_URI is optional at boot but recommended for production. It stores users, memory, messages, knowledge sources, knowledge chunks, feedback, and escalations. If missing, the bot uses bounded in-memory fallback storage.

COOKMYBOTS_AI_ENDPOINT is the CookMyBots AI Gateway base URL. Do not include /chat.

COOKMYBOTS_AI_KEY authenticates AI Gateway calls.

ADMIN_USER_IDS is a comma-separated list of Telegram numeric user IDs allowed to run admin commands.

AI_TIMEOUT_MS defaults to 600000.

AI_MAX_RETRIES defaults to 2.

GLOBAL_AI_CAP defaults to 1 to protect memory during slow AI calls.

RUNNER_CONCURRENCY defaults to 1 for safe Telegram AI processing.

## Storage collections

The bot uses users, conversations, messages, memory_messages, knowledgesources, knowledgechunks, feedback, and escalations. MongoDB writes keep createdAt insert-only and update updatedAt on updates.

## Setup

1. Install dependencies with npm install.
2. Copy .env.sample to .env and set TELEGRAM_BOT_TOKEN.
3. Add MONGODB_URI, COOKMYBOTS_AI_ENDPOINT, COOKMYBOTS_AI_KEY, and ADMIN_USER_IDS for production use.
4. Run npm run dev locally or npm start in production.

## Notes

In groups, the bot only responds when mentioned or when replying to a bot message. Answers are grounded in indexed docs where possible, and uncertain questions are escalated instead of hallucinated.
