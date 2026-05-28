import { useMutation, useQueryClient } from "@tanstack/react-query";

import { listsKeys } from "@/services/list.queries";
import { listService } from "@/services/listService";

export type JoinListInput = {
  listId: string;
  memberName: string;
  role?: "editor" | "viewer";
};

export function useJoinList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listId, memberName, role = "viewer" }: JoinListInput) =>
      listService.joinList(listId, memberName, role),
    onSettled: (_data, _error, { listId }) => {
      void queryClient.invalidateQueries({ queryKey: listsKeys.all });
      void queryClient.invalidateQueries({
        queryKey: listsKeys.detail(listId),
      });
    },
  });
}
