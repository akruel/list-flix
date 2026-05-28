import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type ContentType, userContentService } from "@/services/userContent";
import { userContentKeys } from "@/services/userContent.queries";
import { useUserContentStore } from "@/store/useUserContentStore";

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
      const previous = useUserContentStore.getState().watchedIds;
      if (action === "watch") {
        useUserContentStore.getState().markAsWatched(id);
      } else {
        useUserContentStore.getState().markAsUnwatched(id);
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        useUserContentStore.setState({ watchedIds: context.previous });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userContentKeys.all });
    },
  });
}
