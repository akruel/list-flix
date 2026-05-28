import { UserMinus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRemoveListMember } from "@/hooks/mutations";
import { logger } from "@/lib/logger";
import type { List, ListMember } from "@/types";

interface ListMembersBarProps {
  list: List;
  members: ListMember[];
}

export function ListMembersBar({ list, members }: ListMembersBarProps) {
  const removeListMember = useRemoveListMember();
  const [memberToRemove, setMemberToRemove] = useState<ListMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const handleMemberModalClose = () => {
    if (isRemovingMember) return;
    setMemberToRemove(null);
  };

  const handleRemoveMember = async () => {
    const removedMember = memberToRemove!;
    try {
      setIsRemovingMember(true);
      await removeListMember.mutateAsync({
        listId: list.id,
        memberUserId: removedMember.user_id,
      });
      toast.success("Membro removido com sucesso");
      setMemberToRemove(null);
    } catch (err) {
      logger.error(err);
      toast.error("Falha ao remover membro");
    } finally {
      setIsRemovingMember(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Users size={16} className="shrink-0" />
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <div key={member.user_id} className="inline-flex items-center gap-1">
            <Badge
              variant="outline"
              className={`gap-1 ${
                member.role === "owner"
                  ? "border-yellow-500/50 text-yellow-500"
                  : member.role === "editor"
                    ? "border-purple-500/50 text-purple-500"
                    : "border-blue-500/50 text-blue-500"
              }`}
              title={`Role: ${member.role}`}
            >
              {member.member_name || "Anonymous"}
              {member.role === "owner" && <span>★</span>}
              {member.role === "editor" && <span>✏️</span>}
              {member.role === "viewer" && <span>👁️</span>}
            </Badge>

            {list.role === "owner" && member.role !== "owner" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMemberToRemove(member)}
                disabled={isRemovingMember}
                className="h-6 w-6 rounded-full text-destructive hover:text-destructive"
                title="Remover membro"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <DeleteConfirmationModal
        isOpen={!!memberToRemove}
        onClose={handleMemberModalClose}
        onConfirm={() => {
          void handleRemoveMember();
        }}
        title="Remover membro"
        description={
          memberToRemove
            ? `Tem certeza que deseja remover ${memberToRemove.member_name || "este membro"} desta lista? Essa pessoa poderá entrar novamente usando um convite.`
            : ""
        }
        isDeleting={isRemovingMember}
      />
    </div>
  );
}
