import { useMutation, useQueryClient } from "@tanstack/react-query";

import { listsKeys } from "@/services/list.queries";
import { listService } from "@/services/listService";
import type { List, ListItem, ListMember } from "@/types";

export type UpdateListInput = {
  id: string;
  name: string;
};

type ListDetailsSnapshot = {
  list: List;
  items: ListItem[];
  members: ListMember[];
};

export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: UpdateListInput) =>
      listService.updateList(id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: listsKeys.all });

      const previousLists =
        queryClient.getQueryData<List[]>(listsKeys.all) ?? null;
      const previousDetails =
        queryClient.getQueryData<ListDetailsSnapshot>(listsKeys.detail(id)) ??
        null;

      if (previousLists) {
        queryClient.setQueryData<List[]>(
          listsKeys.all,
          previousLists.map((list) =>
            list.id === id ? { ...list, name } : list,
          ),
        );
      }

      if (previousDetails) {
        queryClient.setQueryData<ListDetailsSnapshot>(listsKeys.detail(id), {
          ...previousDetails,
          list: { ...previousDetails.list, name },
        });
      }

      return { previousLists, previousDetails };
    },
    onError: (_error, { id }, context) => {
      if (
        context?.previousLists !== undefined &&
        context.previousLists !== null
      ) {
        queryClient.setQueryData(listsKeys.all, context.previousLists);
      }
      if (context?.previousDetails) {
        queryClient.setQueryData(listsKeys.detail(id), context.previousDetails);
      }
    },
    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: listsKeys.all });
      void queryClient.invalidateQueries({ queryKey: listsKeys.detail(id) });
    },
  });
}
