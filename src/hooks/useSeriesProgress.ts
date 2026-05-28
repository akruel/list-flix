import { useMemo } from "react";

import { useUserContentStore } from "../store/useUserContentStore";

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
  const watchedCount = useUserContentStore((s) => {
    const showEpisodes = s.watchedEpisodes[showId] ?? {};
    // Exclude specials (season 0)
    return Object.values(showEpisodes).filter(
      (metadata) => metadata.season_number !== 0,
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
