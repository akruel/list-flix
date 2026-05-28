import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type ContentType, userContentService } from "@/services/userContent";
import {
  emptyUserContent,
  type UserContent,
  userContentKeys,
} from "@/services/userContent.queries";

export type ToggleWatchedInput = {
  id: number;
  mediaType: ContentType;
  action: "watch" | "unwatch";
};

export function useToggleWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, mediaType, action }: ToggleWatchedInput) => {
      if (action === "watch") {
        await userContentService.markAsWatched(id, mediaType);
      } else {
        await userContentService.markAsUnwatched(id);
      }
    },
    onMutate: async ({ id, action }) => {
      await queryClient.cancelQueries({ queryKey: userContentKeys.all });
      const previous = queryClient.getQueryData<UserContent>(
        userContentKeys.all,
      );
      queryClient.setQueryData<UserContent>(userContentKeys.all, (old) => {
        const base = old ?? emptyUserContent();
        if (action === "watch") {
          if (base.watchedIds.includes(id)) return base;
          return { ...base, watchedIds: [...base.watchedIds, id] };
        }
        return {
          ...base,
          watchedIds: base.watchedIds.filter((watchedId) => watchedId !== id),
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
