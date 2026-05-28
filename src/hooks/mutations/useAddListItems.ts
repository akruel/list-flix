import { useMutation, useQueryClient } from "@tanstack/react-query";

import { listsKeys } from "@/services/list.queries";
import { listService } from "@/services/listService";
import type { ContentItem } from "@/types";

export type AddListItemsInput = {
  listId: string;
  items: ContentItem[];
};

export function useAddListItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, items }: AddListItemsInput) =>
      listService.addListItems(listId, items),
    onSettled: (_data, _error, { listId }) => {
      void queryClient.invalidateQueries({
        queryKey: listsKeys.detail(listId),
      });
      void queryClient.invalidateQueries({ queryKey: listsKeys.all });
    },
  });
}
