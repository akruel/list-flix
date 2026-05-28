import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userContentService } from "@/services/userContent";
import { userContentKeys } from "@/services/userContent.queries";
import { useUserContentStore } from "@/store/useUserContentStore";
import type { ContentItem } from "@/types";

export type ToggleWatchlistInput = {
  item: ContentItem;
  action: "add" | "remove";
};

export function useToggleWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ item, action }: ToggleWatchlistInput) => {
      const ok =
        action === "add"
          ? await userContentService.addToWatchlist(item)
          : await userContentService.removeFromWatchlist(item.id);
      if (!ok) {
        throw new Error(`Failed to ${action} watchlist item`);
      }
    },
    onMutate: async ({ item, action }) => {
      await queryClient.cancelQueries({ queryKey: userContentKeys.all });
      const previous = useUserContentStore.getState().myList;
      if (action === "add") {
        useUserContentStore.getState().addToList(item);
      } else {
        useUserContentStore.getState().removeFromList(item.id);
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        useUserContentStore.setState({ myList: context.previous });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userContentKeys.all });
    },
  });
}
