import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userContentService } from "@/services/userContent";
import { userContentKeys } from "@/services/userContent.queries";
import { useUserContentStore } from "@/store/useUserContentStore";
import type { Episode, WatchedEpisodeMetadata } from "@/types";

export type ToggleSeasonWatchedInput = {
  showId: number;
  seasonNumber: number;
  episodes: Episode[];
  action: "watch" | "unwatch";
};

export function useToggleSeasonWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      showId,
      seasonNumber,
      episodes,
      action,
    }: ToggleSeasonWatchedInput) => {
      if (action === "watch") {
        await userContentService.markSeasonAsWatched(
          showId,
          seasonNumber,
          episodes,
        );
      } else {
        await userContentService.markSeasonAsUnwatched(showId, seasonNumber);
      }
    },
    onMutate: async ({ showId, seasonNumber, episodes, action }) => {
      await queryClient.cancelQueries({ queryKey: userContentKeys.all });
      const previous = useUserContentStore.getState().watchedEpisodes;
      if (action === "watch") {
        useUserContentStore
          .getState()
          .markSeasonAsWatched(showId, seasonNumber, episodes);
      } else {
        useUserContentStore
          .getState()
          .markSeasonAsUnwatched(showId, seasonNumber);
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        useUserContentStore.setState({
          watchedEpisodes: context.previous as Record<
            number,
            Record<number, WatchedEpisodeMetadata>
          >,
        });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: userContentKeys.all });
    },
  });
}
