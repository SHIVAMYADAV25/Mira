"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { queryKeys } from "@/features/conversation/utils/query-keys";
import {
  createBranch,
  deleteBranch,
  listBranches,
  renameBranch,
  type BranchListItem,
} from "../actions/branch-actions";

/**
 * Lists every branch in a conversation for the switcher and per-message fork
 * menu. Pass `initialData` (from the server-rendered page) to avoid a
 * loading flash on first paint.
 */
export function useBranches(
  conversationId: string | undefined,
  initialData?: BranchListItem[]
) {
  return useQuery({
    queryKey: queryKeys.branches.byConversation(conversationId ?? "none"),
    queryFn: () => listBranches(conversationId!),
    enabled: Boolean(conversationId),
    initialData,
  });
}

/** Creates a branch forked from a message and navigates to it. */
export function useCreateBranch(conversationId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({
      forkedFromMessageId,
      name,
    }: {
      forkedFromMessageId: string;
      name?: string;
    }) => createBranch(conversationId, forkedFromMessageId, name),
    onSuccess: (branch) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.branches.byConversation(conversationId),
      });
      router.push(`/c/${conversationId}?branch=${branch.id}`);
      toast.success(`Created "${branch.name}"`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not create branch");
    },
  });
}

/** Renames a branch. */
export function useRenameBranch(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameBranch(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.branches.byConversation(conversationId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not rename branch");
    },
  });
}

/** Deletes a branch; if it was the active one, falls back to the main branch. */
export function useDeleteBranch(conversationId: string, activeBranchId?: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.branches.byConversation(conversationId),
      });

      if (activeBranchId === id) {
        router.push(`/c/${conversationId}`);
      }

      toast.success("Branch deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete branch");
    },
  });
}
