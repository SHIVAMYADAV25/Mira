import { loadChatMessages } from '@/features/ai/actions/chat-store';
import { getConversation } from '@/features/conversation/actions/conversation-actions';
import { ConversationView } from '@/features/conversation/components/conversation-view';
import { listBranches } from '@/features/branches/actions/branch-actions';
import { notFound } from 'next/navigation';
import React from 'react'

type ConversationPageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ branch?: string }>;
  };

/**
 * Conversation page — resolves the active branch (via `?branch=`, falling
 * back to Main), loads that branch's message history, and renders the chat UI.
 */
const page = async({params, searchParams}:ConversationPageProps) => {
    const {id} = await params;
    const {branch: branchIdParam} = await searchParams;

    try {
      await getConversation(id)
    } catch {
      notFound()
    }

    const branches = await listBranches(id);
    const mainBranch = branches.find((branch) => branch.isMain) ?? branches[0];
    const activeBranch =
      branches.find((branch) => branch.id === branchIdParam) ?? mainBranch;

    if (!activeBranch) {
      notFound();
    }

    const initialMessages = await loadChatMessages(activeBranch.id);

  return (
    <ConversationView
      key={`${id}:${activeBranch.id}`}
      conversationId={id}
      branchId={activeBranch.id}
      initialBranches={branches}
      initialMessages={initialMessages}
    />
  )
}

export default page
