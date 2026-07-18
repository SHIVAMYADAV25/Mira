"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** Shape of a branch row used to render the branch switcher and per-message fork menu. */
export type BranchListItem = {
  id: string;
  conversationId: string;
  name: string;
  isMain: boolean;
  headMessageId: string | null;
  forkedFromMessageId: string | null;
  createdAt: Date;
};

/**
 * Verifies that a conversation exists and belongs to the given user.
 *
 * @throws {Error} When the conversation is not found or not owned by the user.
 */
async function assertOwnsConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

/** Lists every branch in a conversation, main branch first, then by creation order. */
export async function listBranches(conversationId: string): Promise<BranchListItem[]> {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id);

  return prisma.branch.findMany({
    where: { conversationId },
    orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      conversationId: true,
      name: true,
      isMain: true,
      headMessageId: true,
      forkedFromMessageId: true,
      createdAt: true,
    },
  });
}

/**
 * Creates a new branch forked from a specific message. The branch shares
 * every message up to and including `forkedFromMessageId` (via the message
 * tree's `parentId` chain) and grows independently from there.
 *
 * @param conversationId - Owning conversation.
 * @param forkedFromMessageId - The message to branch off of.
 * @param name - Optional branch name; defaults to "Branch N".
 */
export async function createBranch(
  conversationId: string,
  forkedFromMessageId: string,
  name?: string
) {
  const user = await requireUser();
  await assertOwnsConversation(conversationId, user.id);

  const message = await prisma.message.findFirst({
    where: { id: forkedFromMessageId, conversationId },
  });

  if (!message) {
    throw new Error("Message not found");
  }

  const branchCount = await prisma.branch.count({ where: { conversationId } });

  const branch = await prisma.branch.create({
    data: {
      conversationId,
      name: name?.trim() || `Branch ${branchCount}`,
      headMessageId: forkedFromMessageId,
      forkedFromMessageId,
    },
  });

  revalidatePath(`/c/${conversationId}`);
  return branch;
}

/** Renames a branch. */
export async function renameBranch(branchId: string, name: string) {
  const user = await requireUser();

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { conversation: { select: { userId: true } } },
  });

  if (!branch || branch.conversation.userId !== user.id) {
    throw new Error("Branch not found");
  }

  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Branch name cannot be empty");
  }

  const updated = await prisma.branch.update({
    where: { id: branchId },
    data: { name: trimmed },
  });

  revalidatePath(`/c/${branch.conversationId}`);
  return updated;
}

/**
 * Deletes a branch pointer. The underlying messages are left in place
 * (they may still be reachable from other branches, or simply retained as
 * conversation history) — only the named branch pointer is removed. The
 * main branch can never be deleted.
 */
export async function deleteBranch(branchId: string) {
  const user = await requireUser();

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { conversation: { select: { userId: true } } },
  });

  if (!branch || branch.conversation.userId !== user.id) {
    throw new Error("Branch not found");
  }

  if (branch.isMain) {
    throw new Error("The main branch can't be deleted");
  }

  await prisma.branch.delete({ where: { id: branchId } });

  revalidatePath(`/c/${branch.conversationId}`);
  return { id: branchId, conversationId: branch.conversationId };
}
