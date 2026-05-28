import { useMutation, useQueryClient } from "@tanstack/react-query";

import { listsKeys } from "@/services/list.queries";
import { listService } from "@/services/listService";
import type { List, ListItem, ListMember } from "@/types";

export type RemoveListMemberInput = {
  listId: string;
  memberUserId: string;
};

type ListDetailsSnapshot = {
  list: List;
  items: ListItem[];
  members: ListMember[];
};

export function useRemoveListMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, memberUserId }: RemoveListMemberInput) =>
      listService.removeListMember(listId, memberUserId),
    onMutate: async ({ listId, memberUserId }) => {
      await queryClient.cancelQueries({ queryKey: listsKeys.detail(listId) });

      const previousDetails =
        queryClient.getQueryData<ListDetailsSnapshot>(
          listsKeys.detail(listId),
        ) ?? null;

      if (previousDetails) {
        queryClient.setQueryData<ListDetailsSnapshot>(
          listsKeys.detail(listId),
          {
            ...previousDetails,
            members: previousDetails.members.filter(
              (member) => member.user_id !== memberUserId,
            ),
          },
        );
      }

      return { previousDetails };
    },
    onError: (_error, { listId }, context) => {
      if (context?.previousDetails) {
        queryClient.setQueryData(
          listsKeys.detail(listId),
          context.previousDetails,
        );
      }
    },
    onSettled: (_data, _error, { listId }) => {
      void queryClient.invalidateQueries({
        queryKey: listsKeys.detail(listId),
      });
      void queryClient.invalidateQueries({ queryKey: listsKeys.all });
    },
  });
}
