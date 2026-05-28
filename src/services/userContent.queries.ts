import type {
  ContentItem,
  SeriesMetadata,
  WatchedEpisodeMetadata,
} from "@/types";

import { userContentService } from "./userContent";

export interface UserContent {
  watchlist: ContentItem[];
  watchedIds: number[];
  watchedEpisodes: Record<number, Record<number, WatchedEpisodeMetadata>>;
  seriesMetadata: Record<number, SeriesMetadata>;
}

export const userContentKeys = {
  all: ["userContent"] as const,
};

export const emptyUserContent = (): UserContent => ({
  watchlist: [],
  watchedIds: [],
  watchedEpisodes: {},
  seriesMetadata: {},
});

export const userContentQuery = () => ({
  queryKey: userContentKeys.all,
  queryFn: (): Promise<UserContent> => userContentService.getUserContent(),
});
