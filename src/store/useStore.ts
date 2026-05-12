import { create } from "zustand";
import { persist } from "zustand/middleware";

import { partnerService } from "../services/partnerService";
import { userContentService } from "../services/userContent";
import type {
  AvailableUser,
  ContentItem,
  Episode,
  SeasonDetails,
  SeriesMetadata,
  UserListItem,
  UserListTagType,
  WatchedEpisodeMetadata,
  WatchPartner,
} from "../types";

interface ListStore {
  myList: UserListItem[];
  watchedIds: number[];
  watchedEpisodes: Record<number, Record<number, WatchedEpisodeMetadata>>;
  seriesMetadata: Record<number, SeriesMetadata>;
  activeTags: UserListTagType[];

  partners: WatchPartner[];
  availableUsers: AvailableUser[];
  activePartnerId: string | null;

  addToList: (item: ContentItem) => void;
  addToListWithTags: (
    item: ContentItem,
    tags: UserListTagType[],
    partnerUserId?: string,
  ) => void;
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

  seasonCache: Record<string, SeasonDetails>;
  getCachedSeason: (tvId: number, seasonNumber: number) => SeasonDetails | null;
  setCachedSeason: (
    tvId: number,
    seasonNumber: number,
    data: SeasonDetails,
  ) => void;

  setActiveTags: (tags: UserListTagType[]) => void;
  toggleTag: (tag: UserListTagType) => void;

  fetchPartners: () => Promise<void>;
  fetchAvailableUsers: () => Promise<void>;
  addPartner: (userId: string) => Promise<void>;
  removePartner: (partnerId: string) => Promise<void>;
  setActivePartnerId: (partnerId: string | null) => void;

  syncWithSupabase: () => Promise<void>;
}

function itemToUserListItem(item: ContentItem): UserListItem {
  return {
    id: `temp_${item.id}`,
    user_id: "",
    tmdb_id: item.id,
    media_type: item.media_type,
    title: item.title,
    name: item.name,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    vote_average: item.vote_average,
    release_date: item.release_date,
    first_air_date: item.first_air_date,
    overview: item.overview,
    created_at: new Date().toISOString(),
    tags: [],
  };
}

export const useStore = create<ListStore>()(
  persist(
    (set, get) => ({
      myList: [],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},
      seasonCache: {},
      activeTags: [],
      partners: [],
      availableUsers: [],
      activePartnerId: null,

      addToList: (item) => {
        set((state) => {
          if (state.myList.some((i) => i.tmdb_id === item.id)) return state;
          userContentService.addToList(item);
          return { myList: [...state.myList, itemToUserListItem(item)] };
        });
      },

      addToListWithTags: (item, tags, partnerUserId) => {
        set((state) => {
          if (state.myList.some((i) => i.tmdb_id === item.id)) return state;
          const tagInputs = tags.map((t) => ({
            tag: t,
            partner_user_id: t === "assistir_com" ? partnerUserId : undefined,
          }));
          userContentService.addToList(item, tagInputs);
          return {
            myList: [
              ...state.myList,
              {
                ...itemToUserListItem(item),
                tags: tagInputs.map((t) => ({
                  id: "",
                  user_list_id: "",
                  tag: t.tag,
                  partner_user_id: t.partner_user_id,
                  created_at: "",
                })),
              },
            ],
          };
        });
      },

      removeFromList: (id) => {
        set((state) => {
          userContentService.removeFromList(id);
          return {
            myList: state.myList.filter((i) => i.tmdb_id !== id),
          };
        });
      },

      isInList: (id) => get().myList.some((i) => i.tmdb_id === id),

      markAsWatched: (id) => {
        set((state) => {
          if (state.watchedIds.includes(id)) return state;

          const item = state.myList.find((i) => i.tmdb_id === id);
          userContentService.markAsWatched(
            id,
            item?.media_type || "movie",
            (item || {}) as Record<string, unknown>,
          );

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

      getCachedSeason: (tvId, seasonNumber) => {
        const key = `${tvId}-${seasonNumber}`;
        return get().seasonCache[key] || null;
      },

      setCachedSeason: (tvId, seasonNumber, data) => {
        const key = `${tvId}-${seasonNumber}`;
        set((state) => ({
          seasonCache: { ...state.seasonCache, [key]: data },
        }));
      },

      setActiveTags: (tags) => {
        set({ activeTags: tags });
      },

      toggleTag: (tag) => {
        set((state) => {
          const isActive = state.activeTags.includes(tag);
          return {
            activeTags: isActive
              ? state.activeTags.filter((t) => t !== tag)
              : [...state.activeTags, tag],
          };
        });
      },

      fetchPartners: async () => {
        const partners = await partnerService.getAcceptedPartners();
        set({ partners });
      },

      fetchAvailableUsers: async () => {
        const availableUsers = await partnerService.getAvailableUsers();
        set({ availableUsers });
      },

      addPartner: async (userId) => {
        const partner = await partnerService.addPartner(userId);
        if (partner) {
          set((state) => ({
            partners: [...state.partners, partner],
          }));
        }
      },

      removePartner: async (partnerId) => {
        await partnerService.removePartner(partnerId);
        set((state) => ({
          partners: state.partners.filter((p) => p.id !== partnerId),
          activePartnerId:
            state.activePartnerId === partnerId ? null : state.activePartnerId,
        }));
      },

      setActivePartnerId: (partnerId) => {
        set({ activePartnerId: partnerId });
      },

      syncWithSupabase: async () => {
        const state = get();

        const localItems: ContentItem[] = state.myList.map((item) => ({
          id: item.tmdb_id,
          media_type: item.media_type,
          title: item.title,
          name: item.name,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          vote_average: item.vote_average,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
          overview: item.overview,
        }));

        const localTags: Record<
          number,
          { tag: UserListTagType; partner_user_id?: string }[]
        > = {};
        for (const item of state.myList) {
          if (item.tags && item.tags.length > 0) {
            localTags[item.tmdb_id] = item.tags.map((t) => ({
              tag: t.tag,
              partner_user_id: t.partner_user_id,
            }));
          }
        }

        await userContentService.syncLocalData(
          localItems,
          state.watchedIds,
          state.watchedEpisodes,
          localTags,
        );

        const { watchlist, watchedIds, watchedEpisodes, seriesMetadata } =
          await userContentService.getUserContent();

        set({ myList: watchlist, watchedIds, watchedEpisodes, seriesMetadata });
      },
    }),
    {
      name: "listflix-storage",
      partialize: (state) => ({
        myList: state.myList,
        watchedIds: state.watchedIds,
        watchedEpisodes: state.watchedEpisodes,
        seriesMetadata: state.seriesMetadata,
        seasonCache: state.seasonCache,
        activeTags: state.activeTags,
      }),
    },
  ),
);
