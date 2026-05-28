import { useMutation, useQueryClient } from "@tanstack/react-query";

import { listsKeys } from "@/services/list.queries";
import { listService } from "@/services/listService";

export type RemoveListItemInput = {
  itemId: string;
  listId: string;
  contentId: number;
  contentType: "movie" | "tv";
};

export function useRemoveListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId }: RemoveListItemInput) =>
      listService.removeListItem(itemId),
    onSettled: (_data, _error, { listId, contentId, contentType }) => {
      void queryClient.invalidateQueries({
        queryKey: listsKeys.detail(listId),
      });
      void queryClient.invalidateQueries({
        queryKey: listsKeys.containingContent(contentId, contentType),
      });
    },
  });
}
