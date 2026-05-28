import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userContentService } from "@/services/userContent";
import {
  emptyUserContent,
  type UserContent,
  userContentKeys,
} from "@/services/userContent.queries";

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
      const previous = queryClient.getQueryData<UserContent>(
        userContentKeys.all,
      );
      queryClient.setQueryData<UserContent>(userContentKeys.all, (old) => {
        const base = old ?? emptyUserContent();
        const showEpisodes = base.watchedEpisodes[showId] ?? {};
        if (action === "watch") {
          if (Object.hasOwn(showEpisodes, episodeId)) return base;
          return {
            ...base,
            watchedEpisodes: {
              ...base.watchedEpisodes,
              [showId]: {
                ...showEpisodes,
                [episodeId]: {
                  season_number: seasonNumber,
                  episode_number: episodeNumber,
                },
              },
            },
          };
        }
        const remaining = Object.fromEntries(
          Object.entries(showEpisodes).filter(
            ([key]) => key !== String(episodeId),
          ),
        );
        return {
          ...base,
          watchedEpisodes: { ...base.watchedEpisodes, [showId]: remaining },
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
