"use client";

import { ChevronDownIcon, GlobeIcon, SearchIcon, TriangleAlertIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader } from "@/components/ai-elements/loader";
import { cn } from "@/lib/utils";
import type { WebSearchOutput, WebSearchResult } from "../tools/web-search-tool";

type ToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

type WebSearchCallProps = {
  state: ToolState;
  input: { query?: string } | undefined;
  output: WebSearchOutput | undefined;
  errorText: string | undefined;
};

/** Type guard narrowing a tool `output` to its error shape. */
function isErrorOutput(
  output: WebSearchOutput | undefined
): output is { error: string } {
  return Boolean(output && "error" in output && output.error);
}

/**
 * Renders a `webSearch` tool call inline in the message stream — a
 * collapsible card showing the query while running, and either result
 * links or an error once it settles. Mirrors "the AI searched the web"
 * the way modern chat products surface tool use.
 */
export function WebSearchCall({ state, input, output, errorText }: WebSearchCallProps) {
  const isLoading =
    state === "input-streaming" ||
    state === "input-available" ||
    state === "approval-requested" ||
    state === "approval-responded";
  const failed =
    state === "output-error" || state === "output-denied" || isErrorOutput(output);
  const query = input?.query;

  const results: WebSearchResult[] =
    !failed && output && "results" in output ? output.results : [];
  const answer = !failed && output && "results" in output ? output.answer : undefined;
  const failureMessage = isErrorOutput(output) ? output.error : errorText;

  return (
    <Collapsible
      defaultOpen={false}
      className="w-full max-w-full rounded-xl border border-border/70 bg-muted/40"
    >
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm",
          "transition-colors hover:bg-muted/70"
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            failed
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary"
          )}
        >
          {isLoading ? (
            <Loader size={13} />
          ) : failed ? (
            <TriangleAlertIcon className="size-3.5" />
          ) : (
            <GlobeIcon className="size-3.5" />
          )}
        </span>

        <span className="min-w-0 flex-1 truncate font-medium text-foreground/90">
          {isLoading ? (
            <>Searching the web{query ? ` for "${query}"` : "…"}</>
          ) : failed ? (
            <>Web search failed{query ? ` for "${query}"` : ""}</>
          ) : (
            <>Searched the web for &ldquo;{query}&rdquo;</>
          )}
        </span>

        {!isLoading && (
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden px-3.5 pb-3.5 data-[starting-style]:h-0 data-[ending-style]:h-0">
        {failed ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {failureMessage || "Something went wrong running this search."}
          </p>
        ) : (
          <div className="space-y-2.5 pt-1">
            {answer && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {answer}
              </p>
            )}

            {results.length === 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SearchIcon className="size-3.5" />
                No results found.
              </p>
            ) : (
              <ul className="space-y-2">
                {results.map((result) => (
                  <li key={result.url}>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block rounded-lg border border-border/60 bg-background px-3 py-2 transition-colors hover:border-border hover:bg-accent"
                    >
                      <p className="truncate text-xs font-medium text-foreground">
                        {result.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {result.url}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {result.snippet}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
