"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  GitBranchIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useBranches, useDeleteBranch, useRenameBranch } from "../hooks/use-branches";

type BranchSwitcherProps = {
  conversationId: string;
  activeBranchId: string;
};

/**
 * Header control for navigating a conversation's branches — switch, rename,
 * or delete. Renders nothing extra beyond a "Main" badge when there's only
 * one branch, so simple conversations stay uncluttered.
 */
export function BranchSwitcher({ conversationId, activeBranchId }: BranchSwitcherProps) {
  const router = useRouter();
  const { data: branches } = useBranches(conversationId);
  const renameBranch = useRenameBranch(conversationId);
  const deleteBranch = useDeleteBranch(conversationId, activeBranchId);

  const activeBranch = branches?.find((branch) => branch.id === activeBranchId);

  if (!branches || branches.length <= 1) {
    return (
      <Badge variant="secondary" className="gap-1 rounded-full font-normal">
        <GitBranchIcon className="size-3" />
        Main
      </Badge>
    );
  }

  function handleRename(branchId: string, currentName: string) {
    const next = window.prompt("Rename branch", currentName);
    if (!next || next.trim() === currentName) return;
    renameBranch.mutate({ id: branchId, name: next });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-full pl-2.5 pr-2 text-xs font-medium"
          />
        }
      >
        <GitBranchIcon className="size-3.5 text-muted-foreground" />
        <span className="max-w-40 truncate">{activeBranch?.name ?? "Main"}</span>
        <ChevronDownIcon className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Branches
        </DropdownMenuLabel>
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            className={cn(
              "group/branch-item justify-between gap-2",
              branch.id === activeBranchId && "bg-accent text-accent-foreground"
            )}
            onClick={() =>
              router.push(
                branch.isMain
                  ? `/c/${conversationId}`
                  : `/c/${conversationId}?branch=${branch.id}`
              )
            }
          >
            <span className="flex min-w-0 items-center gap-2">
              <GitBranchIcon className="size-3.5 shrink-0" />
              <span className="truncate">{branch.name}</span>
            </span>

            <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/branch-item:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRename(branch.id, branch.name);
                }}
              >
                <PencilIcon className="size-3" />
                <span className="sr-only">Rename branch</span>
              </Button>
              {!branch.isMain && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-6 text-destructive hover:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteBranch.mutate(branch.id);
                  }}
                >
                  <Trash2Icon className="size-3" />
                  <span className="sr-only">Delete branch</span>
                </Button>
              )}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Fork a new branch from any message using the{" "}
          <GitBranchIcon className="inline size-3" /> icon next to it.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
