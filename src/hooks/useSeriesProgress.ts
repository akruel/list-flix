import { useMemo } from "react";

import { useShowWatchedEpisodes } from "./userContent";

interface SeriesProgress {
  watchedCount: number;
  totalCount: number;
  percentage: number;
}

/**
 * Hook to calculate the overall progress of a TV series.
 *
 * @param showId - The TMDB ID of the TV show
 * @param totalEpisodes - Total number of episodes in the series (from TMDB)
 */
export const useSeriesProgress = (
  showId: number,
  totalEpisodes: number,
): SeriesProgress => {
  const showEpisodes = useShowWatchedEpisodes(showId);

  return useMemo(() => {
    // Exclude specials (season 0)
    const watchedCount = Object.values(showEpisodes).filter(
      (metadata) => metadata.season_number !== 0,
    ).length;
    const percentage =
      totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

    return {
      watchedCount,
      totalCount: totalEpisodes,
      percentage,
    };
  }, [showEpisodes, totalEpisodes]);
};
