import { useMutation, useQueryClient } from "@tanstack/react-query";

import { listsKeys } from "@/services/list.queries";
import { listService } from "@/services/listService";

export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => listService.createList(name),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listsKeys.all });
    },
  });
}
