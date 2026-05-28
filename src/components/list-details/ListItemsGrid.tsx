import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { MovieCard } from "@/components/MovieCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRemoveListItem } from "@/hooks/mutations";
import { logger } from "@/lib/logger";
import type { ContentItem, ListItem } from "@/types";

export type ListItemWithContent = ListItem & {
  content?: ContentItem;
  isContentLoading?: boolean;
};

interface ListItemsGridProps {
  listId: string;
  items: ListItemWithContent[];
  canEdit: boolean;
}

export function ListItemsGrid({ listId, items, canEdit }: ListItemsGridProps) {
  const removeListItem = useRemoveListItem();
  const [itemToRemove, setItemToRemove] = useState<ListItemWithContent | null>(
    null,
  );
  const [isRemovingItem, setIsRemovingItem] = useState(false);

  const getRemoveItemName = (listItem: ListItemWithContent) => {
    if (!listItem.content) return null;
    return listItem.content.title || listItem.content.name;
  };

  const handleConfirmRemoveItem = async () => {
    const item = itemToRemove!;
    try {
      setIsRemovingItem(true);
      await removeListItem.mutateAsync({
        itemId: item.id,
        listId,
        contentId: item.content_id,
        contentType: item.content_type,
      });
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

  return (
    <>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <div key={item.id} className="group relative">
            {item.content ? (
              <MovieCard item={item.content} showProgress={true} />
            ) : item.isContentLoading ? (
              <Skeleton
                data-testid="list-item-content-skeleton"
                className="aspect-[2/3] rounded-xl"
              />
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
    </>
  );
}
