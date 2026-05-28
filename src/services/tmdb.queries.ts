import { tmdb } from "./tmdb";

export const tmdbKeys = {
  all: ["tmdb"] as const,
  details: (type: "movie" | "tv", id: number) =>
    [...tmdbKeys.all, "details", type, id] as const,
  season: (tvId: number, seasonNumber: number) =>
    [...tmdbKeys.all, "season", tvId, seasonNumber] as const,
};

export const detailsQuery = (type: "movie" | "tv", id: number) => ({
  queryKey: tmdbKeys.details(type, id),
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    tmdb.getDetails(id, type, signal),
});

export const seasonQuery = (tvId: number, seasonNumber: number) => ({
  queryKey: tmdbKeys.season(tvId, seasonNumber),
  queryFn: () => tmdb.getSeasonDetails(tvId, seasonNumber),
});
