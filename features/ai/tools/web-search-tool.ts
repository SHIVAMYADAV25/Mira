import { tool } from "ai";
import { z } from "zod";

/** A single search result returned to the model and rendered in the UI. */
export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

/** Shape written into the tool's `output` field — either results or a handled error. */
export type WebSearchOutput =
  | { results: WebSearchResult[]; answer?: string }
  | { error: string };

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

/**
 * Calls the Tavily Search API and normalizes the response into `WebSearchResult[]`.
 * Tavily is purpose-built for LLM consumption (clean summarized snippets rather
 * than raw HTML), which keeps the model's follow-up answer grounded and short.
 *
 * @throws {Error} When `TAVILY_API_KEY` is missing or the request fails.
 */
async function searchTavily(query: string): Promise<WebSearchOutput> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY is not set. Add it to your .env file — see README for a free key."
    );
  }

  const response = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: 5,
    }),
    // Tool calls shouldn't hang the whole stream forever.
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Tavily search failed (${response.status}): ${body.slice(0, 200) || response.statusText}`
    );
  }

  const data: {
    answer?: string;
    results?: { title: string; url: string; content: string }[];
  } = await response.json();

  return {
    answer: data.answer,
    results: (data.results ?? []).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
    })),
  };
}

/**
 * AI SDK tool that lets the model search the web for real-time information.
 * The model decides when to call this; results (or a structured error) are
 * streamed back as a tool part and persisted alongside the message.
 */
export const webSearchTool = tool({
  description:
    "Search the live web for current information, news, prices, or anything that may have changed since your training data. Use this whenever the user asks about recent events, current facts, or anything you are not confident is still accurate.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe("A short, specific search query (2-8 words)."),
  }),
  execute: async ({ query }): Promise<WebSearchOutput> => {
    try {
      return await searchTavily(query);
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Web search failed unexpectedly.",
      };
    }
  },
});
