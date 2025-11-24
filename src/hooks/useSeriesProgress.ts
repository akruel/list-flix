import { useMemo } from 'react';
import { useStore } from '../store/useStore';

interface SeriesProgress {
  watchedCount: number;
  totalCount: number;
  percentage: number;
}

/**
 * Hook to calculate the overall progress of a TV series
 * @param showId - The TMDB ID of the TV show
 * @param totalEpisodes - Total number of episodes in the series (from TMDB)
 * @returns Progress information including watched count, total count, and percentage
 */
export const useSeriesProgress = (showId: number, totalEpisodes: number): SeriesProgress => {
  const { getSeriesProgress } = useStore();

  const progress = useMemo(() => {
    const { watchedCount } = getSeriesProgress(showId);
    const percentage = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

    return {
      watchedCount,
      totalCount: totalEpisodes,
      percentage,
    };
  }, [showId, totalEpisodes, getSeriesProgress]);

  return progress;
};
