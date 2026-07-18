"use client";


import { useRouter } from "next/navigation";
import { GitBranchIcon, GitForkIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BranchListItem } from "../actions/branch-actions";
import { useCreateBranch } from "../hooks/use-branches";

type MessageBranchMenuProps = {
  conversationId: string;
  messageId: string;
  activeBranchId: string;
  /** All branches in the conversation; filtered here to the ones forked from this message. */
  branches: BranchListItem[];
  className?: string;
};

/**
 * Small "fork" control shown on every message. Reveals on hover (and is
 * fully keyboard-reachable via Tab + Enter) so branching stays out of the
 * way until wanted. Lists any existing branches already forked from this
 * message so the user can jump straight to them.
 */
export function MessageBranchMenu({
  conversationId,
  messageId,
  activeBranchId,
  branches,
  className,
}: MessageBranchMenuProps) {
  const router = useRouter();
  const createBranch = useCreateBranch(conversationId);

  const forksHere = branches.filter(
    (branch) => branch.forkedFromMessageId === messageId
  );

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      "size-7 rounded-full text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-popup-open:opacity-100",
                      forksHere.length > 0 && "opacity-100",
                      className
                    )}
                  />
                }
              >
                {forksHere.length > 0 ? (
                  <span className="relative inline-flex">
                    <GitBranchIcon className="size-3.5" />
                    <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-medium text-primary-foreground">
                      {forksHere.length}
                    </span>
                  </span>
                ) : (
                  <GitBranchIcon className="size-3.5" />
                )}
                <span className="sr-only">Branch options</span>
              </DropdownMenuTrigger>
            }
          />
          <TooltipContent side="top">
            <p>{forksHere.length > 0 ? "Branches from here" : "Branch from here"}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="start" side="bottom" className="w-56">
          <DropdownMenuItem
            disabled={createBranch.isPending}
            onClick={() => createBranch.mutate({ forkedFromMessageId: messageId })}
          >
            <PlusIcon />
            New branch from here
          </DropdownMenuItem>

          {forksHere.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Branches from here
                </DropdownMenuLabel>
                {forksHere.map((branch) => (
                  <DropdownMenuItem
                    key={branch.id}
                    onClick={() =>
                      router.push(`/c/${conversationId}?branch=${branch.id}`)
                    }
                    className={cn(
                      branch.id === activeBranchId && "bg-accent text-accent-foreground"
                    )}
                  >
                    <GitForkIcon />
                    <span className="truncate">{branch.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}