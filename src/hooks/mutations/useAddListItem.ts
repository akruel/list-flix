import { useMutation, useQueryClient } from "@tanstack/react-query";

import { listsKeys } from "@/services/list.queries";
import { listService } from "@/services/listService";
import type { ContentItem } from "@/types";

export type AddListItemInput = {
  listId: string;
  item: ContentItem;
};

export function useAddListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, item }: AddListItemInput) =>
      listService.addListItem(listId, item),
    onSettled: (_data, _error, { listId, item }) => {
      void queryClient.invalidateQueries({
        queryKey: listsKeys.detail(listId),
      });
      void queryClient.invalidateQueries({
        queryKey: listsKeys.containingContent(item.id, item.media_type),
      });
    },
  });
}
