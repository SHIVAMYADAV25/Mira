"use server";

import { isTextUIPart, type UIMessage } from "ai";
import type { Message as MessageRow, Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Extracts plain text from an AI SDK `UIMessage` by joining all text parts. */
function getMessageText(message: UIMessage) {
  return message.parts.filter(isTextUIPart).map((part) => part.text).join("");
}

/**
 * Normalizes stored message parts from the database into AI SDK `UIMessage` parts.
 * Falls back to a single text part when no structured parts are stored.
 */
function toUIMessageParts(
  parts: Prisma.JsonValue | null,
  content: string
): UIMessage["parts"] {
  const stored = parts as UIMessage["parts"] | null;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  return [{ type: "text", text: content }];
}

function toUIMessage(row: MessageRow): UIMessage {
  return {
    id: row.id,
    role: row.role === "ASSISTANT" ? "assistant" : "user",
    parts: toUIMessageParts(row.parts, row.content),
  };
}

/**
 * Loads the message history for a branch by walking `parentId` from the
 * branch's head message back to the conversation root, then reversing.
 * Because messages form a tree (never duplicated per branch), this
 * naturally returns the shared prefix plus whatever is unique to the branch.
 *
 * @param branchId - The branch whose history to load.
 * @returns Messages ordered oldest to newest, ready for `useChat`.
 */
export async function loadChatMessages(branchId: string): Promise<UIMessage[]> {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { conversationId: true, headMessageId: true },
  });

  if (!branch || !branch.headMessageId) return [];

  const rows: MessageRow[] = await prisma.message.findMany({
    where: { conversationId: branch.conversationId },
  });

  const byId = new Map<string, MessageRow>(rows.map((row) => [row.id, row]));

  const chain: MessageRow[] = [];
  let currentId: string | null = branch.headMessageId;
  const seen = new Set<string>();

  while (currentId && !seen.has(currentId)) {
    const row = byId.get(currentId);
    if (!row) break;
    seen.add(currentId);
    chain.push(row);
    currentId = row.parentId;
  }

  chain.reverse();
  return chain.map(toUIMessage);
}

type SaveChatMessagesOptions = {
  updateTitle?: boolean;
  /**
   * The message id that the first item in `messages` should be chained onto.
   * Defaults to null (conversation root). Pass the branch's current
   * `headMessageId` when saving a partial batch (e.g. just the new user
   * message) rather than the full reloaded history.
   */
  parentSeed?: string | null;
};

/**
 * Upserts AI SDK `UIMessage`s into the database for a branch, chaining each
 * new message onto the previous one via `parentId`, and advances the
 * branch's `headMessageId` to the last message processed.
 *
 * @param conversationId - Owning conversation.
 * @param branchId - Branch whose head should advance.
 * @param messages - Messages to persist, oldest to newest (system messages skipped).
 * @param options.updateTitle - When true, auto-titles "New Chat" from the first user message.
 * @param options.parentSeed - Parent to chain the first new message onto (see above).
 */
export async function saveChatMessages(
  conversationId: string,
  branchId: string,
  messages: UIMessage[],
  options: SaveChatMessagesOptions = {}
) {
  const { updateTitle = true, parentSeed = null } = options;

  let previousId: string | null = parentSeed;

  for (const message of messages) {
    if (message.role === "system") continue;

    const content = getMessageText(message);
    const role = message.role === "assistant" ? "ASSISTANT" : "USER";
    const parts = message.parts as Prisma.InputJsonValue;

    const existing = await prisma.message.findUnique({
      where: { id: message.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.message.update({
        where: { id: message.id },
        data: { content, parts, status: "COMPLETE" },
      });
    } else {
      await prisma.message.create({
        data: {
          id: message.id,
          conversationId,
          parentId: previousId,
          role,
          status: "COMPLETE",
          content,
          parts,
        },
      });
    }

    previousId = message.id;
  }

  if (previousId) {
    await prisma.branch.update({
      where: { id: branchId },
      data: { headMessageId: previousId },
    });
  }

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    select: { title: true },
  });

  const firstUser = messages.find((message) => message.role === "user");
  const firstUserText = firstUser ? getMessageText(firstUser).trim() : "";

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      title:
        updateTitle && conversation.title === "New Chat" && firstUserText
          ? firstUserText.slice(0, 48)
          : conversation.title,
    },
  });
}
