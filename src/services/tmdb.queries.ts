import { getMoodDiscoverParams } from "./moods";
import { tmdb } from "./tmdb";

export const tmdbKeys = {
  all: ["tmdb"] as const,
  details: (type: "movie" | "tv", id: number) =>
    [...tmdbKeys.all, "details", type, id] as const,
  season: (tvId: number, seasonNumber: number) =>
    [...tmdbKeys.all, "season", tvId, seasonNumber] as const,
  trending: (timeWindow: "day" | "week") =>
    [...tmdbKeys.all, "trending", timeWindow] as const,
  discover: (params: { mood: string; mediaType: "movie" | "tv" }) =>
    [...tmdbKeys.all, "discover", params.mood, params.mediaType] as const,
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

export const trendingQuery = (timeWindow: "day" | "week" = "week") => ({
  queryKey: tmdbKeys.trending(timeWindow),
  queryFn: () => tmdb.getTrending(timeWindow),
});

export const discoverQuery = (params: {
  mood: string;
  mediaType: "movie" | "tv";
}) => ({
  queryKey: tmdbKeys.discover(params),
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    tmdb.discover(getMoodDiscoverParams(params.mood, params.mediaType), signal),
});
