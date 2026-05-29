import { useQuery } from "@tanstack/react-query";

import {
  type UserContent,
  userContentQuery,
} from "@/services/userContent.queries";
import type {
  ContentItem,
  SeriesMetadata,
  WatchedEpisodeMetadata,
} from "@/types";

type WatchedEpisodesMap = Record<number, WatchedEpisodeMetadata>;
type AllWatchedEpisodes = Record<number, WatchedEpisodesMap>;

// Stable empty references so selectors don't trigger needless re-renders while
// the query is still loading.
const EMPTY_LIST: ContentItem[] = [];
const EMPTY_IDS: number[] = [];
const EMPTY_SHOW_EPISODES: WatchedEpisodesMap = {};
const EMPTY_EPISODES: AllWatchedEpisodes = {};

export function useUserContent(): UserContent | undefined {
  const { data } = useQuery(userContentQuery());
  return data;
}

export function useMyList(): ContentItem[] {
  const { data } = useQuery({
    ...userContentQuery(),
    select: (content) => content.watchlist,
  });
  return data ?? EMPTY_LIST;
}

export function useWatchedIds(): number[] {
  const { data } = useQuery({
    ...userContentQuery(),
    select: (content) => content.watchedIds,
  });
  return data ?? EMPTY_IDS;
}

export function useIsInList(id: number): boolean {
  const { data } = useQuery({
    ...userContentQuery(),
    select: (content) => content.watchlist.some((item) => item.id === id),
  });
  return data ?? false;
}

export function useIsWatched(id: number): boolean {
  const { data } = useQuery({
    ...userContentQuery(),
    select: (content) => content.watchedIds.includes(id),
  });
  return data ?? false;
}

export function useWatchedEpisodes(): AllWatchedEpisodes {
  const { data } = useQuery({
    ...userContentQuery(),
    select: (content) => content.watchedEpisodes,
  });
  return data ?? EMPTY_EPISODES;
}

export function useShowWatchedEpisodes(showId: number): WatchedEpisodesMap {
  const { data } = useQuery({
    ...userContentQuery(),
    select: (content) => content.watchedEpisodes[showId] ?? EMPTY_SHOW_EPISODES,
  });
  return data ?? EMPTY_SHOW_EPISODES;
}

export function useSeriesMetadata(id: number): SeriesMetadata | undefined {
  const { data } = useQuery({
    ...userContentQuery(),
    select: (content) => content.seriesMetadata[id],
  });
  return data;
}
