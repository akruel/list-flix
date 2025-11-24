import { useMemo } from 'react';
import { useStore } from '../store/useStore';

interface SeasonProgress {
  watchedCount: number;
  totalCount: number;
  percentage: number;
}

/**
 * Hook to calculate the progress of a specific season
 * @param showId - The TMDB ID of the TV show
 * @param seasonNumber - The season number
 * @param totalEpisodes - Total number of episodes in this season
 * @returns Progress information including watched count, total count, and percentage
 */
export const useSeasonProgress = (
  showId: number,
  seasonNumber: number,
  totalEpisodes: number
): SeasonProgress => {
  const { getSeasonProgress } = useStore();

  const progress = useMemo(() => {
    const { watchedCount } = getSeasonProgress(showId, seasonNumber);
    const percentage = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

    return {
      watchedCount,
      totalCount: totalEpisodes,
      percentage,
    };
  }, [showId, seasonNumber, totalEpisodes, getSeasonProgress]);

  return progress;
};
