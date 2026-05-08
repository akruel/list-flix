import { Link } from "@tanstack/react-router";
import { ChevronDown, Plus, Sparkles, Trash2, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { listService } from "../services/listService";
import { useStore } from "../store/useStore";
import type { ContentItem } from "../types";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { MagicSearchModal } from "./MagicSearchModal";

export function CustomLists() {
  const { lists, fetchLists, createList, deleteList } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Magic Search State
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    await createList(newListName);
    setNewListName("");
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (!listToDelete) return;
    try {
      setIsDeleting(true);
      await deleteList(listToDelete);
      toast.success("Lista excluída com sucesso");
      setListToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir lista");
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setListToDelete(null);
  };

  const handleSaveMagicList = async (name: string, items: ContentItem[]) => {
    try {
      // 1. Create the list
      const newList = await createList(name);

      // 2. Add items to the list
      // We do this sequentially to avoid overwhelming the server/rate limits,
      // but parallel could be faster. Given it's a POC, sequential is safer.
      for (const item of items) {
        await listService.addListItem(newList.id, item);
      }

      // 3. Refresh lists
      fetchLists();
    } catch (error) {
      console.error("Error saving magic list:", error);
      throw error; // Propagate to modal to show error toast
    }
  };

  const closeMagicModal = () => {
    setIsMagicModalOpen(false);
  };

  return (
    <div data-testid="custom-lists">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Listas Personalizadas</h2>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button data-testid="custom-lists-new-list-trigger">
              <Plus className="mr-2 h-4 w-4" />
              Nova Lista
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              data-testid="custom-lists-option-manual"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Lista Manual
            </DropdownMenuItem>
            <DropdownMenuItem
              data-testid="custom-lists-option-smart"
              onClick={() => setIsMagicModalOpen(true)}
            >
              <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
              Lista Inteligente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isCreating && (
        <Card className="mb-8 border-border bg-card">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="flex gap-4">
              <Input
                data-testid="custom-lists-manual-name-input"
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Nome da Lista"
                 className="flex-1"
               />
              <Button type="submit" data-testid="custom-lists-manual-submit">
                Criar
              </Button>
              <Button
                data-testid="custom-lists-manual-cancel"
                type="button"
                variant="ghost"
                onClick={() => setIsCreating(false)}
              >
                Cancelar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Link
            key={list.id}
            to="/lists/$id"
            params={{ id: list.id }}
            data-testid="custom-lists-card-link"
            className="block h-full"
          >
            <Card className="group relative h-full border-border bg-card transition-colors hover:bg-accent/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary md:text-xl">
                    {list.name}
                  </CardTitle>
                  <Badge
                    variant={list.role === "owner" ? "default" : "secondary"}
                  >
                    {list.role === "owner" ? "Dono" : "Visualizador"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
                  <Users size={16} />
                  <span>Lista Compartilhada</span>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Criado em {new Date(list.created_at).toLocaleDateString()}
                </div>

                {list.role === "owner" && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      setListToDelete(list.id);
                    }}
                    className="absolute right-4 top-4 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    title="Excluir Lista"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}

        {lists.length === 0 && !isCreating && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <p>Você ainda não criou nenhuma lista personalizada.</p>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={!!listToDelete}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Excluir Lista"
        description="Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita e todos os itens da lista serão perdidos."
        isDeleting={isDeleting}
      />

      <MagicSearchModal
        isOpen={isMagicModalOpen}
        onClose={closeMagicModal}
        onSaveList={handleSaveMagicList}
      />
    </div>
  );
}
