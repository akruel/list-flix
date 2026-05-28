import { useMutation, useQueryClient } from "@tanstack/react-query";

import { listsKeys } from "@/services/list.queries";
import { listService } from "@/services/listService";
import type { List } from "@/types";

export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => listService.deleteList(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listsKeys.all });

      const previousLists =
        queryClient.getQueryData<List[]>(listsKeys.all) ?? null;

      if (previousLists) {
        queryClient.setQueryData<List[]>(
          listsKeys.all,
          previousLists.filter((list) => list.id !== id),
        );
      }

      return { previousLists };
    },
    onError: (_error, _id, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(listsKeys.all, context.previousLists);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listsKeys.all });
    },
  });
}
