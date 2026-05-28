import { create } from "zustand";
import { persist } from "zustand/middleware";

import { userContentService } from "../services/userContent";
import type {
  ContentItem,
  Episode,
  SeriesMetadata,
  WatchedEpisodeMetadata,
} from "../types";
import { NEW_KEYS } from "./migrate";

interface UserContentStore {
  myList: ContentItem[];
  watchedIds: number[];
  watchedEpisodes: Record<number, Record<number, WatchedEpisodeMetadata>>;
  seriesMetadata: Record<number, SeriesMetadata>;

  addToList: (item: ContentItem) => void;
  removeFromList: (id: number) => void;
  isInList: (id: number) => boolean;

  markAsWatched: (id: number) => void;
  markAsUnwatched: (id: number) => void;
  isWatched: (id: number) => boolean;

  markEpisodeAsWatched: (
    showId: number,
    episodeId: number,
    seasonNumber: number,
    episodeNumber: number,
  ) => void;
  markEpisodeAsUnwatched: (showId: number, episodeId: number) => void;
  markSeasonAsWatched: (
    showId: number,
    seasonNumber: number,
    episodes: Episode[],
  ) => void;
  markSeasonAsUnwatched: (showId: number, seasonNumber: number) => void;
  isEpisodeWatched: (showId: number, episodeId: number) => boolean;
  getSeasonProgress: (
    showId: number,
    seasonNumber: number,
  ) => { watchedCount: number };
  getSeriesProgress: (showId: number) => { watchedCount: number };

  saveSeriesMetadata: (showId: number, metadata: SeriesMetadata) => void;
  getSeriesMetadata: (showId: number) => SeriesMetadata | undefined;

  syncWithSupabase: () => Promise<void>;
}

export const useUserContentStore = create<UserContentStore>()(
  persist(
    (set, get) => ({
      myList: [],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},

      addToList: (item) => {
        set((state) => {
          if (state.myList.some((i) => i.id === item.id)) return state;
          userContentService.addToWatchlist(item);
          return { myList: [...state.myList, item] };
        });
      },

      removeFromList: (id) => {
        set((state) => {
          userContentService.removeFromWatchlist(id);
          return {
            myList: state.myList.filter((i) => i.id !== id),
          };
        });
      },

      isInList: (id) => get().myList.some((i) => i.id === id),

      markAsWatched: (id) => {
        set((state) => {
          if (state.watchedIds.includes(id)) return state;

          const item = state.myList.find((i) => i.id === id);
          userContentService.markAsWatched(id, item?.media_type || "movie");

          return { watchedIds: [...state.watchedIds, id] };
        });
      },

      markAsUnwatched: (id) => {
        set((state) => {
          userContentService.markAsUnwatched(id);
          return {
            watchedIds: state.watchedIds.filter(
              (watchedId) => watchedId !== id,
            ),
          };
        });
      },

      isWatched: (id) => get().watchedIds.includes(id),

      markEpisodeAsWatched: (
        showId,
        episodeId,
        seasonNumber,
        episodeNumber,
      ) => {
        set((state) => {
          const currentShowEpisodes = Object.hasOwn(
            state.watchedEpisodes,
            showId,
          )
            ? state.watchedEpisodes[showId]
            : {};
          if (Object.hasOwn(currentShowEpisodes, episodeId)) return state;

          userContentService.markAsWatched(episodeId, "episode", {
            show_id: showId,
            season_number: seasonNumber,
            episode_number: episodeNumber,
          });

          return {
            watchedEpisodes: {
              ...state.watchedEpisodes,
              [showId]: {
                ...currentShowEpisodes,
                [episodeId]: {
                  season_number: seasonNumber,
                  episode_number: episodeNumber,
                },
              },
            },
          };
        });
      },

      markEpisodeAsUnwatched: (showId, episodeId) => {
        set((state) => {
          const currentShowEpisodes = Object.hasOwn(
            state.watchedEpisodes,
            showId,
          )
            ? state.watchedEpisodes[showId]
            : {};
          userContentService.markAsUnwatched(episodeId);

          const remainingEpisodes = Object.fromEntries(
            Object.entries(currentShowEpisodes).filter(
              ([key]) => key !== String(episodeId),
            ),
          );

          return {
            watchedEpisodes: {
              ...state.watchedEpisodes,
              [showId]: remainingEpisodes,
            },
          };
        });
      },

      markSeasonAsWatched: (showId, seasonNumber, episodes) => {
        set((state) => {
          userContentService.markSeasonAsWatched(
            showId,
            seasonNumber,
            episodes,
          );

          const currentShowEpisodes = Object.hasOwn(
            state.watchedEpisodes,
            showId,
          )
            ? state.watchedEpisodes[showId]
            : {};
          const newEpisodes = { ...currentShowEpisodes };

          episodes.forEach((ep) => {
            newEpisodes[ep.id] = {
              season_number: seasonNumber,
              episode_number: ep.episode_number,
            };
          });

          return {
            watchedEpisodes: {
              ...state.watchedEpisodes,
              [showId]: newEpisodes,
            },
          };
        });
      },

      markSeasonAsUnwatched: (showId, seasonNumber) => {
        set((state) => {
          userContentService.markSeasonAsUnwatched(showId, seasonNumber);

          const currentShowEpisodes = Object.hasOwn(
            state.watchedEpisodes,
            showId,
          )
            ? state.watchedEpisodes[showId]
            : {};

          const remaining = Object.fromEntries(
            Object.entries(currentShowEpisodes).filter(
              ([, meta]) => meta.season_number !== seasonNumber,
            ),
          );

          return {
            watchedEpisodes: {
              ...state.watchedEpisodes,
              [showId]: remaining,
            },
          };
        });
      },

      isEpisodeWatched: (showId, episodeId) => {
        const showEpisodes = get().watchedEpisodes[showId];
        return showEpisodes ? episodeId in showEpisodes : false;
      },

      getSeasonProgress: (showId, seasonNumber) => {
        const showEpisodes = get().watchedEpisodes[showId] || {};
        const watchedCount = Object.values(showEpisodes).filter(
          (metadata) => metadata.season_number === seasonNumber,
        ).length;
        return { watchedCount };
      },

      getSeriesProgress: (showId) => {
        const showEpisodes = get().watchedEpisodes[showId] || {};
        // Filter out specials (season 0)
        const watchedCount = Object.values(showEpisodes).filter(
          (metadata) => metadata.season_number !== 0,
        ).length;
        return { watchedCount };
      },

      saveSeriesMetadata: (showId, metadata) => {
        set((state) => ({
          seriesMetadata: {
            ...state.seriesMetadata,
            [showId]: metadata,
          },
        }));
        userContentService.saveSeriesMetadata(showId, metadata);
      },

      getSeriesMetadata: (showId) => {
        return get().seriesMetadata[showId];
      },

      syncWithSupabase: async () => {
        const state = get();
        await userContentService.syncLocalData(
          state.myList,
          state.watchedIds,
          state.watchedEpisodes,
        );

        const { watchlist, watchedIds, watchedEpisodes, seriesMetadata } =
          await userContentService.getUserContent();

        set({ myList: watchlist, watchedIds, watchedEpisodes, seriesMetadata });
      },
    }),
    {
      name: NEW_KEYS.userContent,
    },
  ),
);
