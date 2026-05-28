import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Pencil, Share2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDeleteList, useUpdateList } from "@/hooks/mutations";
import { logger } from "@/lib/logger";
import { listService } from "@/services/listService";
import type { List } from "@/types";

interface ListHeaderProps {
  list: List;
  itemsCount: number;
}

export function ListHeader({ list, itemsCount }: ListHeaderProps) {
  const navigate = useNavigate();
  const updateList = useUpdateList();
  const deleteList = useDeleteList();

  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const startEditing = () => {
    setIsEditing(true);
    setEditingName(list.name);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingName("");
  };

  const saveEditing = async () => {
    if (!editingName.trim()) return;

    try {
      await updateList.mutateAsync({ id: list.id, name: editingName });
      toast.success("Nome da lista atualizado");
      setIsEditing(false);
    } catch (err) {
      logger.error(err);
      toast.error("Erro ao atualizar nome da lista");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void saveEditing();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleShare = async (role: "editor" | "viewer") => {
    const url = listService.getShareUrl(list.id, role);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorShareClick = () => {
    void handleShare("editor");
  };

  const handleViewerShareClick = () => {
    void handleShare("viewer");
  };

  const handleDeleteList = async () => {
    try {
      setIsDeleting(true);
      await deleteList.mutateAsync(list.id);
      toast.success("Lista excluída com sucesso");
      navigate({ to: "/lists", search: { tab: "custom" } });
    } catch (err) {
      logger.error(err);
      toast.error("Erro ao excluir lista");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start">
      <div className="flex w-full flex-1 items-start gap-4 md:w-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/lists", search: { tab: "custom" } })}
          title="Voltar"
          className="mt-1 shrink-0"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="mb-2 flex flex-col gap-2">
              <Input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-auto w-full px-3 py-1 text-2xl font-bold md:text-3xl"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void saveEditing();
                  }}
                  className="text-green-500 hover:bg-green-500/10 hover:text-green-600"
                >
                  <Check className="mr-1 h-4 w-4" /> Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEditing}
                  className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
                >
                  <X className="mr-1 h-4 w-4" /> Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="group mb-2 flex items-start gap-2">
              <h1 className="break-words text-2xl font-bold text-foreground md:text-3xl">
                {list.name}
              </h1>
              {list.role === "owner" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startEditing}
                  className="shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                  title="Editar nome"
                >
                  <Pencil className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{itemsCount} items</span>
            <span>•</span>
            <span className="capitalize">
              {list.role === "owner"
                ? "Dono"
                : list.role === "editor"
                  ? "Editor"
                  : "Visualizador"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex w-full items-center gap-2 pl-[3.25rem] md:mt-0 md:w-auto md:pl-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              data-testid="list-details-share-trigger"
              className="flex-1 bg-purple-600 text-white hover:bg-purple-700 md:flex-none"
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copiado!" : "Compartilhar"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem
              data-testid="list-details-share-editor"
              onClick={handleEditorShareClick}
              className="cursor-pointer gap-3 py-3"
            >
              <span className="text-xl">✏️</span>
              <div>
                <div className="font-medium">Compartilhar como Editor</div>
                <div className="text-xs text-muted-foreground">
                  Poderá adicionar e remover itens
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="list-details-share-viewer"
              onClick={handleViewerShareClick}
              className="cursor-pointer gap-3 py-3"
            >
              <span className="text-xl">👁️</span>
              <div>
                <div className="font-medium">
                  Compartilhar como Visualizador
                </div>
                <div className="text-xs text-muted-foreground">
                  Acesso somente leitura
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {list.role === "owner" && (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            title="Excluir Lista"
            className="flex-1 md:flex-none"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </Button>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteList}
        title="Excluir Lista"
        description="Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita e todos os itens da lista serão perdidos."
        isDeleting={isDeleting}
      />
    </div>
  );
}
