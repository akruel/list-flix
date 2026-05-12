import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useStore } from "../store/useStore";
import type { ContentItem, UserListTagType } from "../types";
import { TagSelector } from "./TagSelector";

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
  const { myList, isInList, addToListWithTags, removeFromList } = useStore();
  const [selectedTags, setSelectedTags] = useState<UserListTagType[]>([]);

  const inList = isInList(content.id);
  const existingItem = myList.find((i) => i.tmdb_id === content.id);
  const existingTags =
    existingItem?.tags?.map((t) => t.tag as UserListTagType) || [];

  const handleToggleTag = (tag: UserListTagType) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleAdd = () => {
    addToListWithTags(content, selectedTags);
    onClose();
  };

  const handleRemove = () => {
    removeFromList(content.id);
    onClose();
  };

  const handleClose = () => {
    setSelectedTags([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {inList ? "Minha Lista" : "Adicionar à Minha Lista"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {inList ? (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-purple-600/10 p-3">
                <Check size={20} className="text-purple-500" />
                <span className="text-sm text-purple-400">
                  Este item está na sua lista
                </span>
              </div>

              {existingTags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Tags atuais:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-purple-600/20 px-2.5 py-1 text-xs text-purple-400"
                      >
                        {tag === "noite_de_pipoca"
                          ? "Noite de Pipoca"
                          : "Fim de Semana"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Button
                data-testid="list-selection-remove"
                onClick={handleRemove}
                variant="outline"
                className="w-full border-red-800 text-red-400 hover:bg-red-900/20 hover:text-red-300"
              >
                <Trash2 size={16} className="mr-2" />
                Remover da Lista
              </Button>
            </>
          ) : (
            <>
              <TagSelector
                selectedTags={selectedTags}
                onToggle={handleToggleTag}
              />

              <Button
                data-testid="list-selection-add"
                onClick={handleAdd}
                className="w-full bg-purple-600 text-white hover:bg-purple-700"
              >
                <Plus size={16} className="mr-2" />
                Adicionar à Lista
              </Button>
            </>
          )}
        </div>

        <div className="border-t border-gray-800 pt-4">
          <Button
            onClick={handleClose}
            className="w-full bg-gray-800 text-white hover:bg-gray-700"
          >
            Concluído
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
