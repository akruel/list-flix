import { useMemo } from "react";

import { useUserContentStore } from "../store/useUserContentStore";

interface SeasonProgress {
  watchedCount: number;
  totalCount: number;
  percentage: number;
}

/**
 * Hook to calculate the progress of a specific season.
 *
 * @param showId - The TMDB ID of the TV show
 * @param seasonNumber - The season number
 * @param totalEpisodes - Total number of episodes in this season
 */
export const useSeasonProgress = (
  showId: number,
  seasonNumber: number,
  totalEpisodes: number,
): SeasonProgress => {
  const watchedCount = useUserContentStore((s) => {
    const showEpisodes = s.watchedEpisodes[showId] ?? {};
    return Object.values(showEpisodes).filter(
      (metadata) => metadata.season_number === seasonNumber,
    ).length;
  });

  return useMemo(() => {
    const percentage =
      totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

    return {
      watchedCount,
      totalCount: totalEpisodes,
      percentage,
    };
  }, [watchedCount, totalEpisodes]);
};
