// import { openai } from "@ai-sdk/openai";

// /** Default OpenAI model used when a conversation has no model override. */
// export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

// /**
//  * Returns an OpenAI language model instance for chat completions.
//  *
//  * @param modelId - Optional model identifier; falls back to {@link DEFAULT_CHAT_MODEL}.
//  */
// export function getChatModel(modelId?: string | null) {
//     return openai( modelId || DEFAULT_CHAT_MODEL)
// }

import { createOpenAI } from "@ai-sdk/openai";

/**
 * Injects OpenRouter's `reasoning: { enabled: true }` flag into every
 * chat-completions request. This is an OpenRouter-specific extension (not
 * part of the OpenAI API, so `@ai-sdk/openai`'s typed `providerOptions`
 * has no field for it) — the only way to add it is to rewrite the
 * outgoing request body ourselves via a custom `fetch`.
 *
 * Note: this only enables reasoning per-request. OpenRouter also lets you
 * pass back a model's `reasoning_details` on the next turn so it can
 * continue from its prior private reasoning instead of redoing it — that
 * needs the opaque blob persisted per-message and re-injected the same
 * way, which isn't wired up here (AI SDK's message types have no field
 * for it). Ask if you want that added; it's a bigger change than this.
 */
const enableReasoningFetch: typeof fetch = async (input, init) => {
    if (init?.body && typeof init.body === "string") {
        try {
            const body = JSON.parse(init.body);
            body.reasoning = { enabled: true };
            init = { ...init, body: JSON.stringify(body) };
        } catch {
            // Not a JSON body (shouldn't happen for chat completions) — send as-is.
        }
    }
    return fetch(input, init);
};

/**
 * OpenAI-compatible provider pointed at OpenRouter instead of api.openai.com.
 * Requires `OPENROUTER_API_KEY` (get one at https://openrouter.ai/keys).
 */
const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    name: "openrouter",
    fetch: enableReasoningFetch,
});

/** Default model used when a conversation has no model override. */
export const DEFAULT_CHAT_MODEL = "poolside/laguna-xs-2.1:free";

/**
 * Returns a language model instance for chat completions, routed through
 * OpenRouter.
 *
 * Uses `.chat()` rather than calling the provider directly — the provider's
 * default call path targets OpenAI's Responses API (`/responses`), which
 * OpenRouter does not implement. OpenRouter only supports the Chat
 * Completions API (`/chat/completions`), so `.chat()` must be explicit here
 * or every request 404s.
 *
 * @param modelId - Optional model identifier; falls back to {@link DEFAULT_CHAT_MODEL}.
 */
export function getChatModel(modelId?: string | null) {
    return openrouter.chat(modelId || DEFAULT_CHAT_MODEL);
}