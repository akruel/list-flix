import { Search, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore } from "@/store/useStore";
import type { WatchPartner } from "@/types";

interface PartnerAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PartnerAddModal({ isOpen, onClose }: PartnerAddModalProps) {
  const {
    partners,
    availableUsers,
    fetchAvailableUsers,
    addPartner,
    removePartner,
  } = useStore();
  const [search, setSearch] = useState("");
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen, fetchAvailableUsers]);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const partnerUserIds = useMemo(
    () => new Set(partners.flatMap((p) => [p.user_id, p.partner_user_id])),
    [partners],
  );

  const filteredUsers = useMemo(
    () =>
      availableUsers.filter(
        (u) =>
          !partnerUserIds.has(u.user_id) &&
          u.display_name.toLowerCase().includes(search.toLowerCase()),
      ),
    [availableUsers, partnerUserIds, search],
  );

  const handleAdd = async (userId: string) => {
    setAddingUserId(userId);
    await addPartner(userId);
    setAddingUserId(null);
  };

  const handleRemove = async (partnerId: string) => {
    await removePartner(partnerId);
  };

  const getPartnerName = (p: WatchPartner): string => {
    const user = availableUsers.find(
      (u) => u.user_id === p.partner_user_id || u.user_id === p.user_id,
    );
    return user?.display_name ?? "Usuário";
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Parceiros</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            data-testid="partner-search-input"
            className="pl-10"
            placeholder="Buscar usuário..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {partners.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-400">Meus parceiros</p>
            <div className="space-y-1">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2"
                >
                  <span className="text-sm text-gray-200">
                    {getPartnerName(partner)}
                  </span>
                  <button
                    data-testid={`remove-partner-${partner.id}`}
                    onClick={() => handleRemove(partner.id)}
                    className="rounded p-1 text-gray-500 transition-colors hover:text-red-400"
                  >
                    <UserMinus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredUsers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-400">
              Usuários disponíveis
            </p>
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2"
                >
                  <span className="text-sm text-gray-200">
                    {user.display_name}
                  </span>
                  <button
                    data-testid={`add-partner-${user.user_id}`}
                    onClick={() => handleAdd(user.user_id)}
                    disabled={addingUserId === user.user_id}
                    className="rounded p-1 text-gray-500 transition-colors hover:text-purple-400 disabled:opacity-50"
                  >
                    <UserPlus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredUsers.length === 0 && partners.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            Nenhum usuário disponível
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
