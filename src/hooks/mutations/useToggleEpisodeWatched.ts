import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userContentService } from "@/services/userContent";
import { userContentKeys } from "@/services/userContent.queries";
import { useUserContentStore } from "@/store/useUserContentStore";
import type { WatchedEpisodeMetadata } from "@/types";

export type ToggleEpisodeWatchedInput = {
  showId: number;
  episodeId: number;
  seasonNumber: number;
  episodeNumber: number;
  action: "watch" | "unwatch";
};

export function useToggleEpisodeWatched() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      episodeId,
      seasonNumber,
      episodeNumber,
      showId,
      action,
    }: ToggleEpisodeWatchedInput) => {
      if (action === "watch") {
        await userContentService.markAsWatched(episodeId, "episode", {
          show_id: showId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
        });
      } else {
        await userContentService.markAsUnwatched(episodeId);
      }
    },
    onMutate: async ({
      showId,
      episodeId,
      seasonNumber,
      episodeNumber,
      action,
    }) => {
      await queryClient.cancelQueries({ queryKey: userContentKeys.all });
      const previous = useUserContentStore.getState().watchedEpisodes;
      if (action === "watch") {
        useUserContentStore
          .getState()
          .markEpisodeAsWatched(showId, episodeId, seasonNumber, episodeNumber);
      } else {
        useUserContentStore
          .getState()
          .markEpisodeAsUnwatched(showId, episodeId);
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
