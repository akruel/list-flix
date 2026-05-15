import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Pencil,
  Share2,
  Trash2,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

import { listService } from "../services/listService";
import { tmdb } from "../services/tmdb";
import { useStore } from "../store/useStore";
import type { List, ListItem, ListMember } from "../types";
import { DeleteConfirmationModal } from "./DeleteConfirmationModal";
import { MovieCard } from "./MovieCard";

interface ListDetailsViewProps {
  id: string;
}

const ListDetailsSkeleton = () => (
  <div
    className="space-y-8 duration-500 animate-in fade-in"
    data-testid="list-details-skeleton"
  >
    <div className="flex items-start justify-between">
      <div className="w-full max-w-lg space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {[...Array(10)].map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
      ))}
    </div>
  </div>
);

export function ListDetailsView({ id }: ListDetailsViewProps) {
  const navigate = useNavigate();
  const { updateList } = useStore();
  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<ListMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<ListItem | null>(null);
  const [isRemovingItem, setIsRemovingItem] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadList = async () => {
      try {
        setLoading(true);
        const { list, items, members } = await listService.getListDetails(id);

        // Fetch content details for each item
        const itemsWithContent = await Promise.all(
          items.map(async (item) => {
            try {
              const details = await tmdb.getDetails(
                item.content_id,
                item.content_type,
              );
              return { ...item, content: details };
            } catch (e) {
              logger.error(`Failed to fetch details for item ${item.id}`, e);
              return item;
            }
          }),
        );

        setList(list);
        setItems(itemsWithContent);
        setMembers(members);
      } catch (err) {
        logger.error(err);
        setError("Failed to load list");
      } finally {
        setLoading(false);
      }
    };

    loadList();
  }, [id]);

  const getRemoveItemName = (listItem: ListItem | null) => {
    if (!listItem?.content) return null;
    return listItem.content.title || listItem.content.name;
  };

  const handleConfirmRemoveItem = async () => {
    const itemId = itemToRemove!.id;
    try {
      setIsRemovingItem(true);
      await listService.removeListItem(itemId);
      setItems(items.filter((i) => i.id !== itemId));
      toast.success("Item removido com sucesso");
      setItemToRemove(null);
    } catch (err) {
      logger.error(err);
      toast.error("Falha ao remover item");
    } finally {
      setIsRemovingItem(false);
    }
  };

  const handleItemRemoveModalClose = () => {
    if (isRemovingItem) return;
    setItemToRemove(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditing();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleMemberModalClose = () => {
    if (isRemovingMember) return;
    setMemberToRemove(null);
  };

  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  if (loading) {
    return <ListDetailsSkeleton />;
  }

  if (error || !list) {
    return (
      <div className="py-20 text-center">
        <h2 className="mb-4 text-2xl text-destructive">
          {error || "List not found"}
        </h2>
        <Button
          variant="link"
          onClick={() => navigate({ to: "/lists" })}
          className="mx-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para minhas listas
        </Button>
      </div>
    );
  }

  const canEdit = list.role === "owner" || list.role === "editor";

  const handleShare = async (role: "editor" | "viewer") => {
    const url = listService.getShareUrl(list.id, role);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorShareClick = () => {
    void handleShare("editor");
  };

  const handleViewerShareClick = () => {
    void handleShare("viewer");
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditingName(list.name);
  };

  const saveEditing = async () => {
    if (!editingName.trim()) return;

    try {
      await updateList(list.id, editingName);
      setList({ ...list, name: editingName });
      toast.success("Nome da lista atualizado");
      setIsEditing(false);
    } catch (err) {
      logger.error(err);
      toast.error("Erro ao atualizar nome da lista");
    }
  };

  const handleDeleteList = async () => {
    try {
      setIsDeleting(true);
      await listService.deleteList(list.id);
      toast.success("Lista excluída com sucesso");
      navigate({ to: "/lists" });
    } catch (err) {
      logger.error(err);
      toast.error("Erro ao excluir lista");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveMember = async () => {
    const removedMember = memberToRemove!;
    try {
      setIsRemovingMember(true);
      await listService.removeListMember(list.id, removedMember.user_id);
      setMembers((prev) =>
        prev.filter(
          (member) =>
            !(
              member.list_id === removedMember.list_id &&
              member.user_id === removedMember.user_id
            ),
        ),
      );
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
    <div
      data-testid="route-list-details"
      className="duration-300 animate-in fade-in"
    >
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex w-full flex-1 items-start gap-4 md:w-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/lists" })}
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
                    onClick={saveEditing}
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

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{items.length} items</span>
                <span>•</span>
                <span className="capitalize">
                  {list.role === "owner"
                    ? "Dono"
                    : list.role === "editor"
                      ? "Editor"
                      : "Visualizador"}
                </span>
              </div>

              {/* Members List */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users size={16} className="shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className="inline-flex items-center gap-1"
                    >
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
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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
              onClick={openDeleteModal}
              title="Excluir Lista"
              className="flex-1 md:flex-none"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <div key={item.id} className="group relative">
            {item.content ? (
              <MovieCard item={item.content} showProgress={true} />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center rounded-lg bg-muted p-4 text-center">
                <p className="text-muted-foreground">Conteúdo indisponível</p>
              </div>
            )}

            {!!canEdit && (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setItemToRemove(item)}
                className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                title="Remover item"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            <p className="mb-2 text-xl">Esta lista está vazia</p>
            {!!canEdit && (
              <p className="text-sm">Adicione filmes e séries para começar.</p>
            )}
          </div>
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

      <DeleteConfirmationModal
        isOpen={!!itemToRemove}
        onClose={handleItemRemoveModalClose}
        onConfirm={() => {
          void handleConfirmRemoveItem();
        }}
        title="Remover item"
        description={
          itemToRemove
            ? `Tem certeza que deseja remover "${getRemoveItemName(itemToRemove) ?? "este item"}" da lista?`
            : ""
        }
        isDeleting={isRemovingItem}
      />
    </div>
  );
}
