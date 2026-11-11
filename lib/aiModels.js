/**
 * lib/aiModels.js
 *
 * Single source of truth for the chat model IDs used across API routes.
 *
 * Providers retire model IDs without warning. When that happens the call fails
 * with 404 model_not_found and the whole pipeline falls through to its
 * secondary provider — or 500s if that one is also unavailable. Keeping the IDs
 * in one place means a retirement is a one-line fix instead of a hunt through
 * every route.
 *
 * Verify the current list against the account's own key before changing these:
 *   groq.models.list()              — Groq
 *   openai.models.list()            — OpenAI
 */

// Groq is the primary provider (fast + generous free tier).
// Verified available on this account 2026-11-11.
export const GROQ_MODEL = 'openai/gpt-oss-120b';

// Smaller/faster Groq model for short, single-shot generations.
export const GROQ_MODEL_FAST = 'openai/gpt-oss-20b';

// OpenAI is the paid fallback — requires credits on the billing account.
export const OPENAI_MODEL = 'gpt-4o-mini';
export const OPENAI_MODEL_CHAT = 'gpt-4o';
