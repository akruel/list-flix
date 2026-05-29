import { useQuery, useQueryClient } from "@tanstack/react-query";

import { tmdb } from "@/services/tmdb";
import { seasonQuery } from "@/services/tmdb.queries";

export function useTmdbSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) => tmdb.search(query, { page: 1, signal }),
    enabled,
    select: (response) => response.results,
  });
}

export function useSeasonDetails(tvId: number, seasonNumber: number | null) {
  return useQuery({
    ...seasonQuery(tvId, seasonNumber ?? 0),
    enabled: seasonNumber !== null,
    refetchOnMount: false,
  });
}

export function useFetchSeasonDetails(tvId: number) {
  const queryClient = useQueryClient();

  return (seasonNumber: number) =>
    queryClient.fetchQuery(seasonQuery(tvId, seasonNumber));
}
