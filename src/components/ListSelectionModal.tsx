import { Check, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAuth } from "../contexts/AuthContext";
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
  const { user } = useAuth();
  const {
    myList,
    isInList,
    addToListWithTags,
    removeFromList,
    partners,
    availableUsers,
    fetchPartners,
  } = useStore();
  const [selectedTags, setSelectedTags] = useState<UserListTagType[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>();

  useEffect(() => {
    if (isOpen) {
      fetchPartners();
    }
  }, [isOpen, fetchPartners]);

  const partnerOptions = useMemo(
    () =>
      partners
        .map((p) => {
          const partnerUserId =
            p.user_id === user?.id ? p.partner_user_id : p.user_id;
          const partnerUser = availableUsers.find(
            (u) => u.user_id === partnerUserId,
          );
          return {
            partnerUserId,
            displayName: partnerUser?.display_name ?? "Usuário",
          };
        })
        .filter((p) => p.partnerUserId),
    [partners, availableUsers, user?.id],
  );

  const inList = isInList(content.id);
  const existingItem = myList.find((i) => i.tmdb_id === content.id);

  const handleToggleTag = (tag: UserListTagType) => {
    if (tag === "assistir_com") {
      setSelectedPartnerId(undefined);
    }
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handlePartnerChange = (partnerId: string | undefined) => {
    setSelectedPartnerId(partnerId);
  };

  const handleAdd = () => {
    addToListWithTags(content, selectedTags, selectedPartnerId);
    onClose();
  };

  const handleRemove = () => {
    removeFromList(content.id);
    onClose();
  };

  const handleClose = () => {
    setSelectedTags([]);
    setSelectedPartnerId(undefined);
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

              {existingItem?.tags && existingItem.tags.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Tags atuais:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingItem?.tags?.map((t) => {
                      const tagUser = t.partner_user_id
                        ? availableUsers.find(
                            (u) => u.user_id === t.partner_user_id,
                          )
                        : undefined;
                      return (
                        <span
                          key={`${t.tag}-${t.partner_user_id ?? ""}`}
                          className="rounded-md bg-purple-600/20 px-2.5 py-1 text-xs text-purple-400"
                        >
                          {t.tag === "noite_de_pipoca"
                            ? "Noite de Pipoca"
                            : t.tag === "fim_de_semana"
                              ? "Fim de Semana"
                              : `Assistir com ${tagUser?.display_name ?? "..."}`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}

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
                partnerOptions={partnerOptions}
                selectedPartnerId={selectedPartnerId}
                onPartnerChange={handlePartnerChange}
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
