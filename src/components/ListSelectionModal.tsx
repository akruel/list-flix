import { Check, Globe, Loader2, Lock } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { logger } from "@/lib/logger";

import { listService } from "../services/listService";
import { useStore } from "../store/useStore";
import type { ContentItem } from "../types";
import { ListSelectionModalSkeleton } from "./skeletons";

interface ListSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentItem;
}

export const ListSelectionModal: React.FC<ListSelectionModalProps> = ({
  isOpen,
  onClose,
  content,
}) => {
  const { lists, fetchLists, addToList, removeFromList, isInList } = useStore();
  const [loading, setLoading] = useState(false);
  const [membership, setMembership] = useState<Record<string, string>>({}); // listId -> itemId
  const [toggling, setToggling] = useState<Record<string, boolean>>({}); // listId -> boolean

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setLoading(true);
        try {
          await fetchLists();
          const memberMap = await listService.getListsContainingContent(
            content.id,
            content.media_type,
          );
          setMembership(memberMap);
        } catch (error) {
          logger.error("Error loading lists:", error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [isOpen, content.id, content.media_type, fetchLists]);

  const handleToggleDefaultList = () => {
    if (isInList(content.id)) {
      removeFromList(content.id);
    } else {
      addToList(content);
    }
  };

  const handleToggleCustomList = async (listId: string) => {
    setToggling((prev) => ({ ...prev, [listId]: true }));
    try {
      const itemId = Object.hasOwn(membership, listId)
        ? membership[listId]
        : undefined;
      if (itemId) {
        // Remove
        await listService.removeListItem(itemId);
        setMembership((prev) => {
          const next = Object.fromEntries(
            Object.entries(prev).filter(([key]) => key !== listId),
          );
          return next;
        });
      } else {
        // Add
        await listService.addListItem(listId, content);
        // We need to fetch the new item ID or just reload.
        // Reloading is safer to get the correct ID for future removal.
        const memberMap = await listService.getListsContainingContent(
          content.id,
          content.media_type,
        );
        setMembership(memberMap);
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
          {loading ? (
            <ListSelectionModalSkeleton />
          ) : (
            <div className="space-y-1">
              {/* Default List */}
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
                {isInList(content.id) && (
                  <Check size={20} className="text-purple-500" />
                )}
              </Button>

              <div className="mx-3 my-2 h-px bg-gray-800" />

              {/* Custom Lists */}
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
                      onClick={() => handleToggleCustomList(list.id)}
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
};
