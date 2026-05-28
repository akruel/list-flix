import { useMemo } from "react";

import { useShowWatchedEpisodes } from "./userContent";

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
  const showEpisodes = useShowWatchedEpisodes(showId);

  return useMemo(() => {
    const watchedCount = Object.values(showEpisodes).filter(
      (metadata) => metadata.season_number === seasonNumber,
    ).length;
    const percentage =
      totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

    return {
      watchedCount,
      totalCount: totalEpisodes,
      percentage,
    };
  }, [showEpisodes, seasonNumber, totalEpisodes]);
};
