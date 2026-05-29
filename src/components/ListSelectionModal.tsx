import { Check, Globe, Loader2, Lock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useAddListItem,
  useRemoveListItem,
  useToggleWatchlist,
} from "@/hooks/mutations";
import { useLists, useListsContainingContent } from "@/hooks/useListQueries";
import { useIsInList } from "@/hooks/userContent";
import { logger } from "@/lib/logger";
import type { ContentItem } from "@/types";

import { ListSelectionModalSkeleton } from "./skeletons";

interface ListSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentItem;
}

export function ListSelectionModal({
  isOpen,
  onClose,
  content,
}: ListSelectionModalProps) {
  const listsResult = useLists(isOpen);
  const membershipResult = useListsContainingContent(
    content.id,
    content.media_type,
    isOpen,
  );

  const { mutate: toggleWatchlist } = useToggleWatchlist();
  const addListItem = useAddListItem();
  const removeListItem = useRemoveListItem();
  const isContentInList = useIsInList(content.id);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const lists = listsResult.data ?? [];
  const membership = membershipResult.data ?? {};
  const isLoading =
    (listsResult.isLoading || membershipResult.isLoading) && isOpen;

  if (listsResult.isError) {
    logger.error("Error loading lists:", listsResult.error);
  }
  if (membershipResult.isError) {
    logger.error("Error loading membership:", membershipResult.error);
  }

  const handleToggleDefaultList = () => {
    toggleWatchlist({
      item: content,
      action: isContentInList ? "remove" : "add",
    });
  };

  const handleToggleCustomList = async (listId: string) => {
    setToggling((prev) => ({ ...prev, [listId]: true }));
    try {
      const itemId = Object.hasOwn(membership, listId)
        ? membership[listId]
        : undefined;
      if (itemId) {
        await removeListItem.mutateAsync({
          itemId,
          listId,
          contentId: content.id,
          contentType: content.media_type,
        });
      } else {
        await addListItem.mutateAsync({ listId, item: content });
      }
    } catch (error) {
      logger.error("Error toggling list:", error);
    } finally {
      setToggling((prev) => ({ ...prev, [listId]: false }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Salvar em...</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <ListSelectionModalSkeleton />
          ) : (
            <div className="space-y-1">
              <Button
                data-testid="list-selection-default"
                variant="ghost"
                onClick={handleToggleDefaultList}
                className="h-auto w-full justify-between px-3 py-3 hover:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-600/20 p-2 text-purple-400">
                    <Lock size={18} />
                  </div>
                  <span className="font-medium text-white">Minha Lista</span>
                </div>
                {isContentInList ? (
                  <Check size={20} className="text-purple-500" />
                ) : null}
              </Button>

              <div className="mx-3 my-2 h-px bg-gray-800" />

              {lists
                .filter(
                  (list) => list.role === "owner" || list.role === "editor",
                )
                .map((list) => {
                  const isMember = !!membership[list.id];
                  const isToggling = toggling[list.id];

                  return (
                    <Button
                      key={list.id}
                      variant="ghost"
                      onClick={() => {
                        void handleToggleCustomList(list.id);
                      }}
                      disabled={isToggling}
                      className="h-auto w-full justify-between px-3 py-3 hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600/20 p-2 text-blue-400">
                          <Globe size={18} />
                        </div>
                        <div className="text-left">
                          <span className="block font-medium text-white">
                            {list.name}
                          </span>
                          <span className="text-xs capitalize text-gray-500">
                            {list.role === "owner" ? "Dono" : list.role}
                          </span>
                        </div>
                      </div>
                      {isToggling ? (
                        <Loader2
                          size={20}
                          className="animate-spin text-gray-500"
                        />
                      ) : (
                        isMember && (
                          <Check size={20} className="text-blue-500" />
                        )
                      )}
                    </Button>
                  );
                })}

              {lists.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  Nenhuma lista personalizada encontrada.
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-gray-800 pt-4">
          <Button
            data-testid="list-selection-done"
            onClick={onClose}
            className="w-full bg-purple-600 text-white hover:bg-purple-700"
          >
            Concluído
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
