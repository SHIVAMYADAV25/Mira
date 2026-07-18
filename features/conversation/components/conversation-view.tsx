"use client";
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useChat } from "@ai-sdk/react"
import React, { useMemo } from 'react'
import { useConversations } from '../hooks/use-conversation';
import { queryKeys } from '../utils/query-keys';
import { toast } from 'sonner';
import { ChatEmpty } from './chat-empty';
import { ChatMessages } from './chat-messages';
import { ChatComposer } from './chat-composer';
import { BranchSwitcher } from '@/features/branches/components/branch-switcher';
import { useBranches } from '@/features/branches/hooks/use-branches';
import type { BranchListItem } from '@/features/branches/actions/branch-actions';

type ConversationViewProps = {
    conversationId: string;
    branchId: string;
    initialBranches: BranchListItem[];
    initialMessages: UIMessage[];
};

/**
 * Main chat view — header (title + branch switcher), message list (or empty
 * state), and composer with streaming. Remounted (via a `key` on
 * conversationId+branchId from the parent page) whenever the active branch
 * changes, so `useChat` always starts from that branch's own history.
 */
export const ConversationView = ({
    conversationId,
    branchId,
    initialBranches,
    initialMessages,
}: ConversationViewProps) => {

    const queryClient = useQueryClient();
    const { data: conversations } = useConversations();
    const { data: branches = initialBranches } = useBranches(conversationId, initialBranches);

    const transport = useMemo(() => new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
            body: {
                id: conversationId, branchId, message: messages.at(-1)
            }
        })
    }), [conversationId, branchId]);

    const { messages, sendMessage, status } = useChat({
        id: `${conversationId}:${branchId}`,
        messages: initialMessages,
        transport,
        onFinish: () => {
            void queryClient.invalidateQueries({
                queryKey: queryKeys.conversations.all,
            });
            void queryClient.invalidateQueries({
                queryKey: queryKeys.branches.byConversation(conversationId),
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    })
    const title =
    conversations?.find((item) => item.id === conversationId)?.title ?? "Chat";

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mx-1 h-4" />
                <h1 className="truncate text-sm font-medium">{title}</h1>
                <div className="ml-auto flex items-center gap-2">
                    <BranchSwitcher conversationId={conversationId} activeBranchId={branchId} />
                </div>
            </header>

            {messages.length === 0 ? (
                <ChatEmpty />
            ) : (
                <ChatMessages
                    messages={messages}
                    status={status}
                    conversationId={conversationId}
                    activeBranchId={branchId}
                    branches={branches}
                />
            )}

            <ChatComposer
                onSend={(text) => {
                    void sendMessage({ text });
                }}
                isSending={status !== "ready"}
                autoFocus
            />
        </div>
    )
}
