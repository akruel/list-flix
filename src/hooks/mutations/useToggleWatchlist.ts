import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userContentService } from "@/services/userContent";
import {
  emptyUserContent,
  type UserContent,
  userContentKeys,
} from "@/services/userContent.queries";
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
      const previous = queryClient.getQueryData<UserContent>(
        userContentKeys.all,
      );
      queryClient.setQueryData<UserContent>(userContentKeys.all, (old) => {
        const base = old ?? emptyUserContent();
        if (action === "add") {
          if (base.watchlist.some((i) => i.id === item.id)) return base;
          return { ...base, watchlist: [...base.watchlist, item] };
        }
        return {
          ...base,
          watchlist: base.watchlist.filter((i) => i.id !== item.id),
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userContentKeys.all, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userContentKeys.all });
    },
  });
}
