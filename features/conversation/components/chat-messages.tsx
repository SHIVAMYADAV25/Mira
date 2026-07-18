"use client";

import { getToolName, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import type { ChatStatus } from "ai";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import type { WebSearchOutput } from "@/features/ai/tools/web-search-tool";
import { WebSearchCall } from "@/features/ai/components/web-search-call";
import type { BranchListItem } from "@/features/branches/actions/branch-actions";
import { MessageBranchMenu } from "@/features/branches/components/message-branch-menu";

/** Extracts plain text from a `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
  conversationId: string;
  activeBranchId: string;
  branches: BranchListItem[];
};

/**
 * Renders the conversation message list — markdown text, web-search tool
 * calls, and a per-message branch-fork control — plus a loading indicator
 * while the assistant is working.
 */
export function ChatMessages({
  messages,
  status,
  conversationId,
  activeBranchId,
  branches,
}: ChatMessagesProps) {
  const isWaiting =
    status === "submitted" && messages.at(-1)?.role === "user";

  return (
    <Conversation>
      <ConversationContent className="mx-auto w-full max-w-3xl py-8">
        {messages.map((message) => {
          const text = getMessageText(message);

          return (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, index) => {
                  if (isToolUIPart(part) && getToolName(part) === "webSearch") {
                    return (
                      <WebSearchCall
                        key={`${message.id}-tool-${index}`}
                        state={part.state}
                        input={part.input as { query?: string } | undefined}
                        output={part.output as WebSearchOutput | undefined}
                        errorText={part.errorText}
                      />
                    );
                  }
                  return null;
                })}

                {text ? <MessageResponse>{text}</MessageResponse> : null}
              </MessageContent>

              <div
                className={
                  message.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <MessageBranchMenu
                  conversationId={conversationId}
                  messageId={message.id}
                  activeBranchId={activeBranchId}
                  branches={branches}
                />
              </div>
            </Message>
          );
        })}

        {isWaiting ? (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>

      <ConversationScrollButton />
    </Conversation>
  );
}
