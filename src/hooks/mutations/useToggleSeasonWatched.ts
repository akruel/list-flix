import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userContentService } from "@/services/userContent";
import {
  emptyUserContent,
  type UserContent,
  userContentKeys,
} from "@/services/userContent.queries";
import type { Episode } from "@/types";

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
      const previous = queryClient.getQueryData<UserContent>(
        userContentKeys.all,
      );
      queryClient.setQueryData<UserContent>(userContentKeys.all, (old) => {
        const base = old ?? emptyUserContent();
        const showEpisodes = base.watchedEpisodes[showId] ?? {};
        if (action === "watch") {
          const nextEpisodes = { ...showEpisodes };
          episodes.forEach((ep) => {
            nextEpisodes[ep.id] = {
              season_number: seasonNumber,
              episode_number: ep.episode_number,
            };
          });
          return {
            ...base,
            watchedEpisodes: {
              ...base.watchedEpisodes,
              [showId]: nextEpisodes,
            },
          };
        }
        const remaining = Object.fromEntries(
          Object.entries(showEpisodes).filter(
            ([, meta]) => meta.season_number !== seasonNumber,
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
