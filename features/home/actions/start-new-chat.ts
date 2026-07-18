"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";


/**
 * Server action that creates a new conversation titled "New Chat" along
 * with its main branch.
 *
 * @returns The new conversation's id and its main branch's id.
 */
export async function startNewChat() {
    const user = await requireUser();

    const conversation = await prisma.conversation.create({
        data: {
            userId: user.id,
            title: "New Chat"
        }
    });

    const branch = await prisma.branch.create({
        data: {
            conversationId: conversation.id,
            name: "Main",
            isMain: true,
        },
    });

    return { conversationId: conversation.id, branchId: branch.id };
}
