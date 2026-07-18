/** TanStack Query key factory for conversations, messages, and branches caches. */
export const queryKeys = {
    conversations: {
      all: ["conversations"] as const,
      detail: (id: string) => ["conversations", id] as const,
    },
    messages: {
      byConversation: (conversationId: string) =>
        ["messages", conversationId] as const,
    },
    branches: {
      byConversation: (conversationId: string) =>
        ["branches", conversationId] as const,
    },
  };
  